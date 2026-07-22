"""Local runner: serves the static site and the API from a single origin."""

import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

import app as api

api.seed_chrome()
api.sync_static()

root = FastAPI()
root.mount("/api", api.app)
root.mount("/", StaticFiles(directory=str(Path(os.environ["NG_WEB"])), html=True))

if __name__ == "__main__":
    uvicorn.run(root, host="127.0.0.1", port=8011, log_level="warning")
