import asyncio
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps

DATA_DIR = Path(os.environ.get("NG_DATA", "/opt/nereagonzalez/data"))
WEB_ROOT = Path(os.environ.get("NG_WEB", "/var/www/nereagonzalez.art"))
BACKUP_DIR = DATA_DIR / "backups"
AUTH_FILE = DATA_DIR / "auth.json"
SECRET_FILE = DATA_DIR / "secret.key"
CONTENT_JSON = DATA_DIR / "content.json"
MEDIA_JSON = DATA_DIR / "media.json"
DRAFT_JSON = DATA_DIR / "draft.json"
TRASH_DIR = DATA_DIR / "trash"
REVISION_DIR = BACKUP_DIR / "content"
CONTENT_JS = WEB_ROOT / "js" / "data" / "content.js"
MEDIA_JS = WEB_ROOT / "js" / "data" / "media.js"

SESSION_HOURS = 8
MAX_UPLOAD = 60 * 1024 * 1024
MAX_CONTENT = 4 * 1024 * 1024
MAX_ATTEMPTS = 8
ATTEMPT_WINDOW = 900
REVISIONS_KEPT = 25
GROUP_PATTERN = re.compile(r"^[a-z0-9]+(?:[-/][a-z0-9]+)*$")

# (suffix on file name, key in the media entry, max width in px, webp quality)
IMAGE_VARIANTS = [("", "src", 1600, 80), ("-m", "medium", 1100, 78), ("-t", "thumb", 640, 72)]

DOCUMENTS = {
    "cv-es": {"label": "CV en español", "path": "assets/pdf/cv-es.pdf"},
    "cv-en": {"label": "CV en inglés", "path": "assets/pdf/cv-en.pdf"},
    "portfolio-ilustracion": {"label": "Portfolio de ilustración", "path": "assets/pdf/portfolio-ilustracion.pdf"},
    "portfolio-escultura": {"label": "Portfolio de escultura", "path": "assets/pdf/portfolio-escultura.pdf"},
    "memoria-diorama": {"label": "Memoria del diorama", "path": "assets/pdf/memoria-diorama.pdf"},
    "devil-reign": {"label": "Devil Reign (cómic completo)", "path": "assets/pdf/devil-reign-dr4.pdf"},
}

app = FastAPI(title="nereagonzalez.art", docs_url=None, redoc_url=None, openapi_url=None)
attempts = {}


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1, dklen=32)
    return salt.hex(), digest.hex()


def load_auth():
    if AUTH_FILE.exists():
        return json.loads(AUTH_FILE.read_text())
    salt, digest = hash_password("123123")
    data = {"username": "ren", "salt": salt, "hash": digest, "updated": now()}
    save_auth(data)
    return data


def save_auth(data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    AUTH_FILE.write_text(json.dumps(data, indent=2))
    AUTH_FILE.chmod(0o600)


def secret_key():
    if not SECRET_FILE.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        SECRET_FILE.write_bytes(secrets.token_bytes(32))
        SECRET_FILE.chmod(0o600)
    return SECRET_FILE.read_bytes()


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def check_password(password, data):
    _, digest = hash_password(password, bytes.fromhex(data["salt"]))
    return hmac.compare_digest(digest, data["hash"])


def make_token(username):
    expires = int(time.time()) + SESSION_HOURS * 3600
    payload = "%s|%d" % (username, expires)
    signature = hmac.new(secret_key(), payload.encode(), hashlib.sha256).hexdigest()
    return payload + "|" + signature


def read_token(token):
    try:
        username, expires, signature = token.split("|")
    except (AttributeError, ValueError):
        return None
    payload = "%s|%s" % (username, expires)
    expected = hmac.new(secret_key(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return None
    if int(expires) < time.time():
        return None
    if username != load_auth()["username"]:
        return None
    return username


def current_user(request):
    return read_token(request.cookies.get("ng_session"))


def require_user(request):
    user = current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Sesión no válida")
    return user


def set_session_cookie(response, request, token):
    https = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
    response.set_cookie(
        "ng_session", token,
        max_age=SESSION_HOURS * 3600,
        httponly=True,
        secure=https,
        samesite="lax",
        path="/",
    )


def throttle(ip):
    failures, first = attempts.get(ip, (0, time.time()))
    if time.time() - first > ATTEMPT_WINDOW:
        failures, first = 0, time.time()
    if failures >= MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Espera unos minutos.")
    attempts[ip] = (failures, first)


def register_failure(ip):
    failures, first = attempts.get(ip, (0, time.time()))
    attempts[ip] = (failures + 1, first)


def document_info(key):
    meta = DOCUMENTS[key]
    path = WEB_ROOT / meta["path"]
    exists = path.exists()
    return {
        "key": key,
        "label": meta["label"],
        "url": "/" + meta["path"],
        "filename": Path(meta["path"]).name,
        "size": path.stat().st_size if exists else 0,
        "updated": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(timespec="seconds") if exists else None,
        "exists": exists,
    }


# ---------------------------------------------------------------------------
# Content & media management
# ---------------------------------------------------------------------------

def strip_query(path):
    return path.split("?", 1)[0]


def add_suffix(path, suffix):
    dot = path.rfind(".")
    return path if not suffix else path[:dot] + suffix + path[dot:]


def write_json_atomic(path, data):
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    tmp.replace(path)
    path.chmod(0o600)


def write_text_atomic(path, text, mode=0o644):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text)
    tmp.replace(path)
    path.chmod(mode)


def write_bytes_atomic(path, payload, mode=0o644):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(payload)
    tmp.replace(path)
    path.chmod(mode)


def backup_copy(path, folder, name, suffix, keep=5):
    if not path.exists():
        return
    folder.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copy2(path, folder / ("%s-%s%s" % (name, stamp, suffix)))
    old = sorted(folder.glob("%s-*%s" % (name, suffix)))
    for extra in old[:-keep]:
        extra.unlink()


def load_content():
    return json.loads(CONTENT_JSON.read_text())


def load_media():
    return json.loads(MEDIA_JSON.read_text())


def regenerate_content_js(data):
    body = "window.CONTENT = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    write_text_atomic(CONTENT_JS, body)


def regenerate_media_js(data):
    body = ("window.MEDIA = " + json.dumps(data.get("images", {}), ensure_ascii=False, indent=1) +
            ";\nwindow.MEDIA_VIDEO = " + json.dumps(data.get("videos", {}), ensure_ascii=False, indent=1) + ";\n")
    write_text_atomic(MEDIA_JS, body)


def save_content(data):
    backup_copy(CONTENT_JSON, REVISION_DIR, "content", ".json", keep=REVISIONS_KEPT)
    write_json_atomic(CONTENT_JSON, data)
    regenerate_content_js(data)


def save_media(data):
    backup_copy(MEDIA_JSON, BACKUP_DIR / "content", "media", ".json")
    write_json_atomic(MEDIA_JSON, data)
    regenerate_media_js(data)


def sync_static():
    """Keep the public JS data files in sync with the JSON source of truth."""
    if CONTENT_JSON.exists():
        regenerate_content_js(load_content())
    if MEDIA_JSON.exists():
        regenerate_media_js(load_media())


def scaled(image, max_width):
    width, height = image.size
    if width <= max_width:
        return image
    ratio = max_width / float(width)
    return image.resize((max_width, max(1, round(height * ratio))), Image.LANCZOS)


# ---------------------------------------------------------------------------
# Draft, publishing and revisions
# ---------------------------------------------------------------------------

BUILTIN_PAGES = ("ilustracion", "escultura", "teatro")
PAGE_TEMPLATE = "ilustracion.html"
RESERVED_SLUGS = set(BUILTIN_PAGES) | {
    "index", "home", "login", "dashboard", "editor", "api", "server",
    "js", "css", "images", "video", "assets", "favicon", "robots", "sitemap",
}
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def check_slug(slug):
    slug = (slug or "").strip().lower()
    if not SLUG_PATTERN.match(slug):
        raise HTTPException(status_code=400,
                            detail="La dirección solo admite letras, números y guiones")
    if slug in RESERVED_SLUGS:
        raise HTTPException(status_code=409, detail="Esa dirección está reservada")
    if len(slug) > 40:
        raise HTTPException(status_code=400, detail="La dirección es demasiado larga")
    return slug


def page_html(slug, title, description):
    """Builds the shell of a new page from an existing one, so it inherits
    the current scripts and their cache-busting version."""
    source = WEB_ROOT / PAGE_TEMPLATE
    if not source.exists():
        raise HTTPException(status_code=500, detail="Falta la plantilla de página")
    body = source.read_text()

    body = re.sub(r'data-page="[a-z0-9-]+"', 'data-page="%s"' % slug, body)
    body = re.sub(r"<title>.*?</title>",
                  "<title>%s — Nerea González López</title>" % html_safe(title),
                  body, flags=re.S)
    body = re.sub(r'(<meta name="description"\s+content=")[^"]*(")',
                  lambda m: m.group(1) + html_safe(description) + m.group(2), body, count=1)
    body = re.sub(r'(<meta property="og:title" content=")[^"]*(")',
                  lambda m: m.group(1) + html_safe(title) + m.group(2), body, count=1)
    return body


def html_safe(text):
    return (str(text or "").replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def custom_slugs(data):
    return [slug for slug in (data.get("pages") or {}) if slug not in BUILTIN_PAGES]


def rebuild_pages():
    """Keeps every custom page shell in step with the template."""
    try:
        data = load_content()
    except Exception:
        return
    for slug in custom_slugs(data):
        page = data["pages"][slug]
        target = WEB_ROOT / (slug + ".html")
        try:
            write_text_atomic(target, page_html(slug, page.get("title", slug),
                                                page.get("subtitle", "")))
        except HTTPException:
            return


def drop_links(data, slug):
    """Removes menu and footer links that pointed at a deleted page."""
    target = slug + ".html"
    taken = []
    for holder, key in (("header", "links"), ("footer", "portfolio")):
        block = data.get(holder) or {}
        rows = block.get(key)
        if not isinstance(rows, list):
            continue
        kept = []
        for row in rows:
            if str(row.get("href", "")).split("#")[0] == target:
                taken.append({"holder": holder, "key": key, "row": row})
            else:
                kept.append(row)
        block[key] = kept
    return taken


DEFAULT_CHROME = {
    "header": {
        "brand": "Nerea González",
        "accent": "López",
        "links": [
            {"label": "Inicio", "href": "index.html"},
            {"label": "Ilustración", "href": "ilustracion.html"},
            {"label": "Escultura", "href": "escultura.html"},
            {"label": "Teatro", "href": "teatro.html"},
            {"label": "Sobre mí", "href": "index.html#sobre-mi"},
            {"label": "Descargas", "href": "index.html#descargas"},
            {"label": "Contacto", "href": "index.html#contacto"},
        ],
    },
    "footer": {
        "aboutTitle": "SOBRE MÍ",
        "about": "Soy Nerea González López, artista y diseñadora especializada en ilustración "
                 "y escultura. Este portfolio reúne mi trabajo en las tres disciplinas que me definen.",
        "portfolioTitle": "PORTFOLIO",
        "portfolio": [
            {"label": "Ilustración", "href": "ilustracion.html"},
            {"label": "Escultura", "href": "escultura.html"},
            {"label": "Teatro", "href": "teatro.html"},
            {"label": "CV y portfolios en PDF", "href": "index.html#descargas"},
        ],
        "contactTitle": "CONTACTO",
        "rights": "Todos los derechos reservados.",
    },
    "home": {
        "title": "Nerea González",
        "accent": "López",
        "tagline": "Ilustración · Escultura · Teatro",
        "downloads": {
            "eyebrow": "Descarga directa",
            "title": "Currículums y portfolios",
            "text": "Todo el material en PDF, listo para descargar: el CV de ilustración junto a "
                    "su portfolio y el CV de escultura junto al suyo.",
        },
        "references": {"eyebrow": "Han trabajado conmigo", "title": "Referencias"},
        "contact": {"eyebrow": "Hablemos", "title": "Contacto"},
    },
}


def with_defaults(data):
    """Adds the header, footer and home texts the first time they are missing."""
    changed = False
    for key, value in DEFAULT_CHROME.items():
        if key not in data:
            data[key] = json.loads(json.dumps(value))
            changed = True
    return changed


def seed_chrome():
    if CONTENT_JSON.exists():
        published = load_content()
        if with_defaults(published):
            write_json_atomic(CONTENT_JSON, published)
            regenerate_content_js(published)
    if DRAFT_JSON.exists():
        draft = json.loads(DRAFT_JSON.read_text())
        if with_defaults(draft):
            write_json_atomic(DRAFT_JSON, draft)


def load_draft():
    if DRAFT_JSON.exists():
        return json.loads(DRAFT_JSON.read_text())
    data = load_content()
    write_json_atomic(DRAFT_JSON, data)
    return data


def store_draft(data):
    write_json_atomic(DRAFT_JSON, data)


def file_moment(path):
    if not path.exists():
        return None
    return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(timespec="seconds")


def revision_labels():
    path = REVISION_DIR / "labels.json"
    if path.is_file():
        try:
            return json.loads(path.read_text())
        except ValueError:
            return {}
    return {}


def revision_list():
    if not REVISION_DIR.exists():
        return []
    labels = revision_labels()
    items = []
    for path in sorted(REVISION_DIR.glob("content-*.json"), reverse=True):
        items.append({"name": path.name, "size": path.stat().st_size,
                      "saved": file_moment(path), "label": labels.get(path.name, "")})
    return items


# ---------------------------------------------------------------------------
# Media library
# ---------------------------------------------------------------------------

def check_group(group):
    if not GROUP_PATTERN.match(group or ""):
        raise HTTPException(status_code=400, detail="Nombre de grupo no válido")
    return group


def media_bucket(data, kind):
    if kind not in ("images", "videos"):
        raise HTTPException(status_code=400, detail="Tipo de medio desconocido")
    return data.setdefault(kind, {})


def next_slot(group, folder):
    """Lowest file number not taken inside the group folder."""
    used = set()
    if folder.exists():
        for path in folder.iterdir():
            match = re.match(r"^(\d+)(?:-[a-z])?\.", path.name)
            if match:
                used.add(int(match.group(1)))
    number = 1
    while number in used:
        number += 1
    return number


def store_image(source, payload, rel_base):
    """Write the three WebP variants for an image and return the manifest entry."""
    version = hashlib.sha1(payload).hexdigest()[:8]
    entry = {}
    full_size = source.size
    for suffix, key, max_width, quality in IMAGE_VARIANTS:
        rel = add_suffix(rel_base, suffix)
        target = WEB_ROOT / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        variant = scaled(source, max_width)
        if suffix == "":
            full_size = variant.size
        buffer = BytesIO()
        variant.save(buffer, "WEBP", quality=quality, method=6)
        write_bytes_atomic(target, buffer.getvalue())
        entry[key] = rel + "?v=" + version
    entry["w"], entry["h"] = full_size
    return entry


def decode_image(payload):
    try:
        return ImageOps.exif_transpose(Image.open(BytesIO(payload))).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida")


def transcode_video(payload, rel_base):
    """Re-encode an uploaded clip to web friendly MP4 plus a WebP poster."""
    mp4 = WEB_ROOT / rel_base
    poster_rel = rel_base.rsplit(".", 1)[0] + "-poster.webp"
    mp4.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as work:
        raw = Path(work) / "source"
        raw.write_bytes(payload)
        out = Path(work) / "out.mp4"
        still = Path(work) / "still.png"
        try:
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw),
                            "-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264",
                            "-crf", "26", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
                            str(out)], check=True, capture_output=True, timeout=900)
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", "0.5", "-i", str(raw),
                            "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2",
                            str(still)], check=True, capture_output=True, timeout=120)
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=400, detail="El vídeo tardó demasiado en procesarse")
        except subprocess.CalledProcessError:
            raise HTTPException(status_code=400, detail="No se pudo procesar el vídeo")

        encoded = out.read_bytes()
        write_bytes_atomic(mp4, encoded)
        entry = {"src": rel_base + "?v=" + hashlib.sha1(encoded).hexdigest()[:8]}

        if still.exists():
            image = Image.open(still).convert("RGB")
            buffer = BytesIO()
            scaled(image, 1280).save(buffer, "WEBP", quality=78, method=6)
            write_bytes_atomic(WEB_ROOT / poster_rel, buffer.getvalue())
            entry["poster"] = poster_rel + "?v=" + hashlib.sha1(buffer.getvalue()).hexdigest()[:8]
    return entry


def trash_slot(label):
    """Creates a fresh folder in the trash and returns it."""
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    slot = TRASH_DIR / ("%s-%s" % (stamp, label))
    number = 1
    while slot.exists():
        number += 1
        slot = TRASH_DIR / ("%s-%s-%d" % (stamp, label, number))
    slot.mkdir(parents=True, exist_ok=True)
    return slot


def trash_files(entry, slot):
    """Moves every file behind a manifest entry into the given trash folder."""
    for key in ("src", "medium", "thumb", "poster"):
        rel = strip_query(entry.get(key) or "")
        if not rel:
            continue
        source = WEB_ROOT / rel
        if not source.exists():
            continue
        target = slot / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(source), str(target))


def trash_note(slot, payload):
    payload["saved"] = now()
    (slot / "deleted.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2))


def trash_list():
    if not TRASH_DIR.exists():
        return []
    items = []
    for slot in sorted(TRASH_DIR.iterdir(), reverse=True):
        note = slot / "deleted.json"
        if not note.is_file():
            continue
        try:
            payload = json.loads(note.read_text())
        except ValueError:
            continue
        items.append({
            "id": slot.name,
            "kind": payload.get("kind"),
            "label": payload.get("label", slot.name),
            "saved": payload.get("saved"),
        })
    return items


def restore_files(slot):
    """Puts every file of a trash folder back where it came from."""
    for path in slot.rglob("*"):
        if not path.is_file() or path.name == "deleted.json":
            continue
        rel = path.relative_to(slot)
        target = WEB_ROOT / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(path), str(target))


def walk_blocks(node):
    """Yield every dict inside the content tree."""
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from walk_blocks(value)
    elif isinstance(node, list):
        for value in node:
            yield from walk_blocks(value)


GROUP_KEYS = ("group", "gallery", "videoGroup")


def uses_group(block, group):
    return any(block.get(key) == group for key in GROUP_KEYS)


def freeze_ranges(content, group, length):
    """Turn from/to slices over a group into explicit index lists."""
    for block in walk_blocks(content):
        if block.get("group") != group or "items" in block:
            continue
        if "from" in block or "to" in block:
            start = block.get("from") or 0
            end = block.get("to")
            end = length if end is None else end
            block["items"] = list(range(max(0, start), min(length, end)))
            block.pop("from", None)
            block.pop("to", None)


def remap_indices(content, group, mapping, length):
    """Keep media references pointing at the right entry after a delete or reorder."""
    freeze_ranges(content, group, length)
    remaining = len([v for v in mapping.values() if v is not None])

    for block in walk_blocks(content):
        if not uses_group(block, group):
            continue
        if block.get("group") == group:
            if isinstance(block.get("items"), list):
                block["items"] = [mapping[i] for i in block["items"]
                                  if i in mapping and mapping[i] is not None]
            for key in ("i", "index"):
                if key in block and isinstance(block[key], int):
                    moved = mapping.get(block[key])
                    block[key] = 0 if moved is None else moved
        if block.get("gallery") == group and isinstance(block.get("mainCount"), int):
            block["mainCount"] = max(0, min(block["mainCount"], remaining))


def apply_media_shift(group, mapping, length):
    """Apply an index remap to both the published content and the draft."""
    published = load_content()
    remap_indices(published, group, mapping, length)
    save_content(published)

    draft = load_draft()
    remap_indices(draft, group, mapping, length)
    store_draft(draft)


@app.get("/session")
def session(request: Request):
    user = current_user(request)
    return {"authenticated": bool(user), "username": user}


@app.post("/login")
def login(request: Request, username: str = Form(...), password: str = Form(...)):
    ip = request.headers.get("x-real-ip", request.client.host if request.client else "?")
    throttle(ip)
    data = load_auth()
    if username.strip() != data["username"] or not check_password(password, data):
        register_failure(ip)
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    attempts.pop(ip, None)
    response = JSONResponse({"username": data["username"]})
    set_session_cookie(response, request, make_token(data["username"]))
    return response


@app.post("/logout")
def logout():
    response = Response(status_code=204)
    response.delete_cookie("ng_session", path="/")
    return response


@app.get("/documents")
def documents(request: Request):
    require_user(request)
    return {"documents": [document_info(key) for key in DOCUMENTS]}


@app.post("/documents/{key}")
async def upload_document(key: str, request: Request, file: UploadFile = File(...)):
    require_user(request)
    if key not in DOCUMENTS:
        raise HTTPException(status_code=404, detail="Documento desconocido")

    payload = await file.read(MAX_UPLOAD + 1)
    if len(payload) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="El archivo supera los 60 MB")
    if not payload.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF")

    target = WEB_ROOT / DOCUMENTS[key]["path"]
    target.parent.mkdir(parents=True, exist_ok=True)

    if target.exists():
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        target.replace(BACKUP_DIR / ("%s-%s.pdf" % (key, stamp)))
        copies = sorted(BACKUP_DIR.glob("%s-*.pdf" % key))
        for old in copies[:-3]:
            old.unlink()

    temporary = target.with_suffix(".upload")
    temporary.write_bytes(payload)
    temporary.replace(target)
    target.chmod(0o644)

    return {"document": document_info(key)}


@app.post("/account")
def account(request: Request,
            current_password: str = Form(...),
            username: str = Form(""),
            password: str = Form("")):
    require_user(request)
    data = load_auth()

    if not check_password(current_password, data):
        raise HTTPException(status_code=401, detail="La contraseña actual no es correcta")

    new_username = username.strip() or data["username"]
    if len(new_username) < 3:
        raise HTTPException(status_code=400, detail="El usuario necesita al menos 3 caracteres")

    if password:
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="La contraseña necesita al menos 6 caracteres")
        salt, digest = hash_password(password)
        data["salt"], data["hash"] = salt, digest

    data["username"] = new_username
    data["updated"] = now()
    save_auth(data)

    response = JSONResponse({"username": new_username})
    set_session_cookie(response, request, make_token(new_username))
    return response


@app.on_event("startup")
def on_startup():
    try:
        seed_chrome()
        sync_static()
        rebuild_pages()
    except Exception:
        pass


@app.get("/admin/content")
def admin_get_content(request: Request):
    require_user(request)
    return load_content()


@app.put("/admin/content")
async def admin_put_content(request: Request):
    require_user(request)
    raw = await request.body()
    if len(raw) > MAX_CONTENT:
        raise HTTPException(status_code=413, detail="El contenido es demasiado grande")
    try:
        data = json.loads(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="JSON no válido")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Formato de contenido no válido")
    save_content(data)
    return {"ok": True}


@app.get("/admin/media")
def admin_get_media(request: Request):
    require_user(request)
    return load_media()


def resolve_entry(data, kind, group, index):
    bucket = data.get(kind, {})
    if group not in bucket:
        raise HTTPException(status_code=404, detail="Grupo desconocido")
    items = bucket[group]
    try:
        i = int(index)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Índice no válido")
    if i < 0 or i >= len(items):
        raise HTTPException(status_code=404, detail="Elemento no encontrado")
    return items, i


@app.post("/admin/media/image")
async def admin_replace_image(request: Request, group: str = Form(...), index: str = Form(...),
                              file: UploadFile = File(...)):
    require_user(request)
    data = load_media()
    items, i = resolve_entry(data, "images", group, index)
    entry = items[i]

    payload = await file.read(MAX_UPLOAD + 1)
    if len(payload) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="La imagen supera los 60 MB")
    try:
        source = ImageOps.exif_transpose(Image.open(BytesIO(payload))).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida")

    version = hashlib.sha1(payload).hexdigest()[:8]
    base = strip_query(entry.get("src") or "")
    if not base:
        raise HTTPException(status_code=400, detail="La imagen no tiene una ruta base")

    full_size = source.size
    for suffix, key, max_width, quality in IMAGE_VARIANTS:
        rel = strip_query(entry[key]) if entry.get(key) else add_suffix(base, suffix)
        target = WEB_ROOT / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        variant = scaled(source, max_width)
        if suffix == "":
            full_size = variant.size
        backup_copy(target, BACKUP_DIR / "images", rel.replace("/", "_"), ".webp", keep=3)
        buffer = BytesIO()
        variant.save(buffer, "WEBP", quality=quality, method=6)
        write_bytes_atomic(target, buffer.getvalue())
        entry[key] = rel + "?v=" + version

    entry["w"], entry["h"] = full_size
    if file.filename:
        entry["name"] = file.filename
    save_media(data)
    return {"entry": entry}


@app.post("/admin/media/video")
async def admin_replace_video(request: Request, group: str = Form(...), index: str = Form(...),
                              file: UploadFile = File(...)):
    require_user(request)
    data = load_media()
    items, i = resolve_entry(data, "videos", group, index)
    entry = items[i]

    payload = await file.read(MAX_UPLOAD + 1)
    if len(payload) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="El vídeo supera los 60 MB")
    if payload[4:8] != b"ftyp":
        raise HTTPException(status_code=400, detail="El archivo debe ser un MP4")

    rel = strip_query(entry.get("src") or "")
    if not rel:
        raise HTTPException(status_code=400, detail="El vídeo no tiene una ruta base")
    target = WEB_ROOT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    backup_copy(target, BACKUP_DIR / "videos", rel.replace("/", "_"), ".mp4", keep=2)
    write_bytes_atomic(target, payload)

    entry["src"] = rel + "?v=" + hashlib.sha1(payload).hexdigest()[:8]
    if file.filename:
        entry["name"] = Path(file.filename).stem
    save_media(data)
    return {"entry": entry}


# ---------------------------------------------------------------------------
# Visual editor
# ---------------------------------------------------------------------------

@app.get("/admin/state")
def admin_state(request: Request):
    require_user(request)
    published = load_content()
    draft = load_draft()
    return {
        "draft": draft,
        "published": published,
        "media": load_media(),
        "dirty": draft != published,
        "publishedAt": file_moment(CONTENT_JSON),
        "draftAt": file_moment(DRAFT_JSON),
        "version": draft_version(),
        "revisions": revision_list(),
        "trash": trash_list(),
    }


async def read_content_body(request):
    raw = await request.body()
    if len(raw) > MAX_CONTENT:
        raise HTTPException(status_code=413, detail="El contenido es demasiado grande")
    try:
        data = json.loads(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="JSON no válido")
    if not isinstance(data, dict) or "pages" not in data:
        raise HTTPException(status_code=400, detail="Formato de contenido no válido")
    return data


def draft_version():
    """Plain number that changes on every write, safe to travel in a query string."""
    if not DRAFT_JSON.exists():
        return "0"
    return str(DRAFT_JSON.stat().st_mtime_ns)


@app.get("/admin/draft/version")
def admin_draft_version(request: Request):
    require_user(request)
    return {"version": draft_version(), "draftAt": file_moment(DRAFT_JSON)}


@app.put("/admin/draft")
async def admin_put_draft(request: Request):
    require_user(request)
    base = request.query_params.get("base")
    current = draft_version()

    if base and current != "0" and base != current:
        raise HTTPException(status_code=409, detail="El borrador ha cambiado en otra sesión")

    data = await read_content_body(request)
    store_draft(data)
    return {"ok": True, "version": draft_version(), "draftAt": file_moment(DRAFT_JSON),
            "dirty": data != load_content()}


def apply_area(published, draft, area):
    """Copies one top level area (or one page) from the draft into the published copy."""
    if area.startswith("pages."):
        slug = area.split(".", 1)[1]
        pages = published.setdefault("pages", {})
        source = (draft.get("pages") or {}).get(slug)
        if source is None:
            pages.pop(slug, None)
        else:
            pages[slug] = json.loads(json.dumps(source))
        return
    if area in draft:
        published[area] = json.loads(json.dumps(draft[area]))
    else:
        published.pop(area, None)


@app.post("/admin/publish")
async def admin_publish(request: Request, areas: str = Form("")):
    require_user(request)
    draft = load_draft()

    if areas:
        try:
            wanted = json.loads(areas)
        except ValueError:
            raise HTTPException(status_code=400, detail="Selección no válida")
        if not isinstance(wanted, list) or not wanted:
            raise HTTPException(status_code=400, detail="No hay nada seleccionado")
        published = load_content()
        for area in wanted:
            apply_area(published, draft, str(area))
        save_content(published)
    else:
        save_content(draft)

    rebuild_pages()
    return {"ok": True, "publishedAt": file_moment(CONTENT_JSON),
            "published": load_content(), "revisions": revision_list(),
            "version": draft_version()}


@app.post("/admin/discard")
def admin_discard(request: Request):
    require_user(request)
    published = load_content()
    store_draft(published)
    return {"ok": True, "draft": published, "version": draft_version()}


@app.post("/admin/revisions/label")
def admin_label_revision(request: Request, name: str = Form(...), label: str = Form("")):
    require_user(request)
    if "/" in name or not name.startswith("content-"):
        raise HTTPException(status_code=400, detail="Revisión no válida")
    labels = revision_labels()
    clean = (label or "").strip()[:80]
    if clean:
        labels[name] = clean
    else:
        labels.pop(name, None)
    REVISION_DIR.mkdir(parents=True, exist_ok=True)
    write_json_atomic(REVISION_DIR / "labels.json", labels)
    return {"ok": True, "revisions": revision_list()}


@app.post("/admin/revisions/restore")
def admin_restore(request: Request, name: str = Form(...)):
    require_user(request)
    if "/" in name or not name.startswith("content-") or not name.endswith(".json"):
        raise HTTPException(status_code=400, detail="Revisión no válida")
    path = REVISION_DIR / name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Revisión no encontrada")
    data = json.loads(path.read_text())
    store_draft(data)
    return {"ok": True, "draft": data, "version": draft_version()}


@app.get("/admin/trash")
def admin_trash(request: Request):
    require_user(request)
    return {"items": trash_list()}


@app.post("/admin/trash/restore")
def admin_trash_restore(request: Request, item: str = Form(...)):
    require_user(request)
    if "/" in item or ".." in item:
        raise HTTPException(status_code=400, detail="Elemento no válido")
    slot = TRASH_DIR / item
    note = slot / "deleted.json"
    if not note.is_file():
        raise HTTPException(status_code=404, detail="Ese elemento ya no está en la papelera")

    payload = json.loads(note.read_text())
    kind = payload.get("kind")

    if kind == "media":
        data = load_media()
        bucket = media_bucket(data, payload.get("mediaKind", "images"))
        group = payload["group"]
        items = bucket.setdefault(group, [])
        at = min(max(0, int(payload.get("index", len(items)))), len(items))
        items.insert(at, payload["entry"])
        save_media(data)
        restore_files(slot)

        mapping = {}
        for old_index in range(len(items) - 1):
            mapping[old_index] = old_index if old_index < at else old_index + 1
        apply_media_shift(group, mapping, len(items) - 1)

    elif kind == "page":
        slug = payload["slug"]
        published = load_content()
        draft = load_draft()
        for data in (published, draft):
            data.setdefault("pages", {})[slug] = json.loads(json.dumps(payload["page"]))
            for link in payload.get("links") or []:
                rows = data.setdefault(link["holder"], {}).setdefault(link["key"], [])
                if not any(r.get("href") == link["row"].get("href") for r in rows):
                    rows.append(link["row"])
        restore_files(slot)
        save_content(published)
        store_draft(draft)
        rebuild_pages()
    else:
        raise HTTPException(status_code=400, detail="No se sabe cómo recuperar esto")

    shutil.rmtree(slot, ignore_errors=True)
    return {"ok": True, "kind": kind}


@app.post("/admin/pages")
def admin_create_page(request: Request, slug: str = Form(...), title: str = Form(...),
                      subtitle: str = Form(""), menu: str = Form("")):
    require_user(request)
    slug = check_slug(slug)
    label = (title or "").strip() or slug

    published = load_content()
    draft = load_draft()
    if slug in (published.get("pages") or {}) or slug in (draft.get("pages") or {}):
        raise HTTPException(status_code=409, detail="Ya existe una página con esa dirección")

    page = {
        "title": label,
        "subtitle": (subtitle or "").strip(),
        "hero": {},
        "index": [],
        "blocks": [],
    }

    for data in (published, draft):
        data.setdefault("pages", {})[slug] = json.loads(json.dumps(page))
        if menu == "1":
            links = data.setdefault("header", {}).setdefault("links", [])
            links.append({"label": label, "href": slug + ".html"})

    write_text_atomic(WEB_ROOT / (slug + ".html"),
                      page_html(slug, label, (subtitle or "").strip()))
    save_content(published)
    store_draft(draft)
    return {"ok": True, "slug": slug, "draft": draft, "published": published, "version": draft_version()}


@app.post("/admin/pages/delete")
def admin_delete_page(request: Request, slug: str = Form(...)):
    require_user(request)
    slug = (slug or "").strip().lower()
    if slug in BUILTIN_PAGES:
        raise HTTPException(status_code=400, detail="Las páginas originales no se pueden eliminar")
    if not SLUG_PATTERN.match(slug):
        raise HTTPException(status_code=400, detail="Dirección no válida")

    published = load_content()
    draft = load_draft()
    if slug not in (published.get("pages") or {}) and slug not in (draft.get("pages") or {}):
        raise HTTPException(status_code=404, detail="Esa página no existe")

    page = (published.get("pages") or {}).get(slug) or (draft.get("pages") or {}).get(slug)
    removed = []
    for data in (published, draft):
        (data.get("pages") or {}).pop(slug, None)
        removed = drop_links(data, slug) or removed

    slot = trash_slot("page-" + slug)
    target = WEB_ROOT / (slug + ".html")
    if target.exists():
        trashed = slot / (slug + ".html")
        shutil.move(str(target), str(trashed))
    trash_note(slot, {"kind": "page", "slug": slug, "page": page, "links": removed,
                      "label": "Página: " + (page or {}).get("title", slug)})

    save_content(published)
    store_draft(draft)
    return {"ok": True, "draft": draft, "published": published, "version": draft_version()}


@app.post("/admin/media/group")
def admin_create_group(request: Request, kind: str = Form("images"), group: str = Form(...)):
    require_user(request)
    check_group(group)
    data = load_media()
    bucket = media_bucket(data, kind)
    if group in bucket:
        raise HTTPException(status_code=409, detail="Ese grupo ya existe")
    bucket[group] = []
    save_media(data)
    return {"ok": True, "group": group}


@app.post("/admin/media/image/new")
async def admin_add_image(request: Request, group: str = Form(...), file: UploadFile = File(...)):
    require_user(request)
    check_group(group)
    data = load_media()
    bucket = media_bucket(data, "images")
    items = bucket.setdefault(group, [])

    payload = await file.read(MAX_UPLOAD + 1)
    if len(payload) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="La imagen supera los 60 MB")
    source = decode_image(payload)

    folder = WEB_ROOT / "images" / group
    rel_base = "images/%s/%02d.webp" % (group, next_slot(group, folder))
    entry = store_image(source, payload, rel_base)
    entry["name"] = file.filename or Path(rel_base).name
    items.append(entry)
    save_media(data)
    return {"entry": entry, "index": len(items) - 1, "group": group}


@app.post("/admin/media/video/new")
async def admin_add_video(request: Request, group: str = Form(...), file: UploadFile = File(...)):
    require_user(request)
    check_group(group)
    data = load_media()
    bucket = media_bucket(data, "videos")
    items = bucket.setdefault(group, [])

    payload = await file.read(MAX_UPLOAD + 1)
    if len(payload) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="El vídeo supera los 60 MB")

    folder = WEB_ROOT / "video"
    stem = re.sub(r"[^a-z0-9]+", "-", (group.split("/")[-1] or "clip").lower()).strip("-")
    number = 1
    while (folder / ("%s-%d.mp4" % (stem, number))).exists():
        number += 1
    rel_base = "video/%s-%d.mp4" % (stem, number)

    entry = await asyncio.to_thread(transcode_video, payload, rel_base)
    entry["name"] = Path(file.filename).stem if file.filename else stem
    items.append(entry)
    save_media(data)
    return {"entry": entry, "index": len(items) - 1, "group": group}


@app.post("/admin/media/delete")
def admin_delete_media(request: Request, kind: str = Form("images"),
                       group: str = Form(...), index: str = Form(...)):
    require_user(request)
    data = load_media()
    items, i = resolve_entry(data, kind, group, index)
    entry = items.pop(i)
    save_media(data)

    slot = trash_slot("media")
    trash_files(entry, slot)
    trash_note(slot, {"kind": "media", "mediaKind": kind, "group": group,
                      "index": i, "entry": entry,
                      "label": (entry.get("name") or group) + " · " + group})

    mapping = {}
    for old in range(len(items) + 1):
        if old == i:
            mapping[old] = None
        else:
            mapping[old] = old if old < i else old - 1
    apply_media_shift(group, mapping, len(items) + 1)
    return {"ok": True, "removed": entry}


@app.post("/admin/media/reorder")
def admin_reorder_media(request: Request, kind: str = Form("images"),
                        group: str = Form(...), order: str = Form(...)):
    require_user(request)
    data = load_media()
    bucket = media_bucket(data, kind)
    if group not in bucket:
        raise HTTPException(status_code=404, detail="Grupo desconocido")
    items = bucket[group]

    try:
        sequence = json.loads(order)
    except ValueError:
        raise HTTPException(status_code=400, detail="Orden no válido")
    if sorted(sequence) != list(range(len(items))):
        raise HTTPException(status_code=400, detail="El orden no cubre todos los elementos")

    bucket[group] = [items[old] for old in sequence]
    save_media(data)
    apply_media_shift(group, {old: new for new, old in enumerate(sequence)}, len(items))
    return {"ok": True, "items": bucket[group]}
