import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import JSONResponse

DATA_DIR = Path(os.environ.get("NG_DATA", "/opt/nereagonzalez/data"))
WEB_ROOT = Path(os.environ.get("NG_WEB", "/var/www/nereagonzalez.art"))
BACKUP_DIR = DATA_DIR / "backups"
AUTH_FILE = DATA_DIR / "auth.json"
SECRET_FILE = DATA_DIR / "secret.key"

SESSION_HOURS = 8
MAX_UPLOAD = 60 * 1024 * 1024
MAX_ATTEMPTS = 8
ATTEMPT_WINDOW = 900

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
