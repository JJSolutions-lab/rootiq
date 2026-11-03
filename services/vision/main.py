from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
import io

app = FastAPI(title="RootIQ EL Vision Service", version="1.0.0")

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": False}

@app.post("/analyze/el")
async def analyze_el(file: UploadFile = File(...)):
    if file.content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(415, "Upload a PNG, JPEG, or WebP EL image")
    image = Image.open(io.BytesIO(await file.read())).convert("L")
    # Replace this contract-safe placeholder with a validated PyTorch model.
    # The service intentionally does not fabricate defect detections.
    return {
        "width": image.width,
        "height": image.height,
        "modelStatus": "not_configured",
        "detections": [],
        "message": "Image accepted. Configure a validated PyTorch checkpoint before enabling automated detections."
    }
