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


def revision_list():
    if not REVISION_DIR.exists():
        return []
    items = []
    for path in sorted(REVISION_DIR.glob("content-*.json"), reverse=True):
        items.append({"name": path.name, "size": path.stat().st_size,
                      "saved": file_moment(path)})
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


def trash_files(entry):
    """Move every file behind a manifest entry into the trash folder."""
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    for key in ("src", "medium", "thumb", "poster"):
        rel = strip_query(entry.get(key) or "")
        if not rel:
            continue
        source = WEB_ROOT / rel
        if not source.exists():
            continue
        target = TRASH_DIR / stamp / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(source), str(target))


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
        "revisions": revision_list(),
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


@app.put("/admin/draft")
async def admin_put_draft(request: Request):
    require_user(request)
    data = await read_content_body(request)
    store_draft(data)
    return {"ok": True, "draftAt": file_moment(DRAFT_JSON), "dirty": data != load_content()}


@app.post("/admin/publish")
async def admin_publish(request: Request):
    require_user(request)
    draft = load_draft()
    save_content(draft)
    return {"ok": True, "publishedAt": file_moment(CONTENT_JSON), "revisions": revision_list()}


@app.post("/admin/discard")
def admin_discard(request: Request):
    require_user(request)
    published = load_content()
    store_draft(published)
    return {"ok": True, "draft": published}


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
    return {"ok": True, "draft": data}


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
    trash_files(entry)

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
