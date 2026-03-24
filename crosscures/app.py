"""
Stage 1 MVP - FastAPI Application (Controller Layer)
Main entry point for the adaptive questionnaire backend.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from controllers import checkin_router


app = FastAPI(
    title="Stage 1 MVP - Adaptive Questionnaire",
    description="Demo API for pre-visit adaptive symptom questionnaire",
    version="0.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(checkin_router)

# This mounts your views folder so FastAPI serves the HTML/JS/CSS
app.mount("/", StaticFiles(directory="views", html=True), name="views")


@app.on_event("startup")
async def startup():
    """Application startup event"""
    from controllers.checkin import initialize_provider
    initialize_provider()
    print("[STARTUP] Application initialized with MockPatientDataProvider by default")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

