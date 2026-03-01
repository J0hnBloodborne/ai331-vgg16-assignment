FROM python:3.10-slim

# Set up a working folder
WORKDIR /app

# Copy the requirements and install them, ignoring cache to save space
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your files (including app.py, models, static, etc.)
COPY . /app/

# Give permissions (required by Hugging Face Spaces for Docker)
RUN chmod -R 777 /app

# Expose the mandatory Hugging Face port
EXPOSE 7860

# Start the FastAPI server using Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
