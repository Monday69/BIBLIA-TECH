import traceback
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.modelia.segmentation import traiter_image_segmentation

app = FastAPI(title="API Library Scanner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/segment")
async def segment_endpoint(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        resultat = traiter_image_segmentation(contents)
        return JSONResponse(content=resultat)
    except Exception as e:
        # Log complet dans le terminal du backend
        traceback.print_exc()
        # Retourne le message d'erreur précis au frontend
        return JSONResponse(
            content={"status": "error", "message": str(e)},
            status_code=500,
        )
