"""FastAPI entry point for BattVision Offline Edge Backend."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.config import settings
from app.database.connection import init_database
from app.utils.logging_config import emit_log


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_database()
    emit_log(
        "SYSTEM",
        f"BattVision Edge Backend started ({settings.system_id}, pack={settings.battery.pack_id})",
    )
    yield
    emit_log("SYSTEM", "BattVision Edge Backend shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="BattVision Offline Edge Backend",
        version=settings.api_version,
        description="Offline telemetry ingestion, SQLite persistence, diagnostics, and Edge-AI API for BV-PACK-8S4P.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    # Serve built offline React dashboard when dist/ exists (single-process Linux SBC hosting)
    if settings.frontend_dist_dir.exists() and (settings.frontend_dist_dir / "index.html").exists():
        app.mount(
            "/",
            StaticFiles(directory=str(settings.frontend_dist_dir), html=True),
            name="frontend",
        )

    return app


app = create_app()
