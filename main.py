from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
# On importe la logique métier
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
        # Appel de l'IA
        resultat = traiter_image_segmentation(contents)
        return JSONResponse(content=resultat)
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)