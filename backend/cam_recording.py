import os
import subprocess
import uuid

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import FileResponse

router = APIRouter()


@router.post("/convert")
async def convert_video(file: UploadFile = File(...), format: str = "mp4"):
    temp_id = str(uuid.uuid4())
    input_path = f"/tmp/{temp_id}.webm"
    output_path = f"/tmp/{temp_id}.{format}"

    with open(input_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        if format == "mp4":
            cmd = ["ffmpeg", "-i", input_path, "-c:v", "libx264", "-preset", "fast", output_path]
        elif format == "mov":
            cmd = ["ffmpeg", "-i", input_path, "-c:v", "libx264", "-c:a", "aac", output_path]
        else:
            return {"error": "unsupported format"}

        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        return {"error": f"conversion failed: {e.stderr.decode()}"}
    finally:
        os.remove(input_path)

    return FileResponse(output_path, filename=f"recording.{format}", media_type=f"video/{format}")