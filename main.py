import traceback
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.modelia.segmentation import traiter_image_segmentation
from src.modelia.ocr_analysis import analyser_ocr

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
        traceback.print_exc()
        return JSONResponse(
            content={"status": "error", "message": str(e)},
            status_code=500,
        )

@app.post("/ocr")
async def ocr_endpoint(
    file: UploadFile = File(...),
    catalog: str = Form(None),
):
    try:
        contents = await file.read()
        return JSONResponse(content=analyser_ocr(contents, catalog))
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={"status": "error", "message": str(e)},
            status_code=500,
        )
