from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request
import io
from PIL import Image
import torch
from torchvision import transforms, models
import torch.nn as nn
import os
import uvicorn

app = FastAPI(title="Demographic Analysis API")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

class VGG16Multi(nn.Module):
    def __init__(self):
        super().__init__()
        vgg = models.vgg16(weights=None)
        self.features = vgg.features
        self.avgpool = vgg.avgpool
        self.flatten = nn.Flatten()
        self.fc = nn.Sequential(
            nn.Linear(512*7*7, 512), nn.ReLU(), nn.Dropout(0.5)
        )
        self.gender = nn.Sequential(nn.Linear(512, 1), nn.Sigmoid())
        self.age = nn.Sequential(nn.Linear(512, 1), nn.Sigmoid())

    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = self.flatten(x)
        x = self.fc(x)
        gender = self.gender(x)
        age = self.age(x)
        return gender, age

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = VGG16Multi()

model_path = os.path.join("train", "model.pth")
if os.path.exists(model_path):
    model.load_state_dict(torch.load(model_path, map_location=device))
    print(f"Loaded model weights from {model_path}")
else:
    print(f"Warning: Model weights not found at {model_path}. Using random weights.")

model = model.to(device)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the frontend HTML."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Handle image upload and run inference."""
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File provided is not an image.")

        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        input_tensor = transform(image).unsqueeze(0).to(device)
        
        with torch.no_grad():
            out_gender, out_age = model(input_tensor)
            gender_prob = out_gender.item()
            predicted_gender = "Female" if gender_prob > 0.5 else "Male"
            raw_age = out_age.item()
            predicted_age = raw_age * 75.0
            return {
                "gender": predicted_gender,
                "age": round(predicted_age, 1)
            }
            
    except Exception as e:
        print(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
