import os
import subprocess
import shutil
import uuid
from database import SessionLocal
import models
import s3_utils
import tempfile
import requests

def transcode_video(project_id: int):
    """
    Background task to optimize high-bitrate video for web.
    Creates its own DB session for thread safety.
    """
    db = SessionLocal()
    tmp_dir = tempfile.mkdtemp()
    
    try:
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            print(f"ERROR: Project {project_id} not found.")
            return

        # Update status
        project.transcoding_status = "processing"
        db.commit()

        # 1. Download original file from S3
        source_url = project.raw_media_url or project.media_url
        if not source_url:
            raise Exception("No source media found for transcoding")

        download_url = s3_utils.get_presigned_url(source_url)
        input_filename = "source_" + str(uuid.uuid4())[:8] + ".mov"
        input_path = os.path.join(tmp_dir, input_filename)
        output_path = os.path.join(tmp_dir, "optimized.mp4")

        print(f"DEBUG: Downloading {source_url} for transcoding...")
        with requests.get(download_url, stream=True) as r:
            with open(input_path, 'wb') as f:
                shutil.copyfileobj(r.raw, f)

        # 2. Run FFmpeg
        print("DEBUG: Executing FFmpeg optimization...")
        
        # Check if ffmpeg exists locally in the backend folder
        ffmpeg_bin = "./ffmpeg.exe" if os.path.exists("./ffmpeg.exe") else "ffmpeg"
        
        ffmpeg_cmd = [
            ffmpeg_bin, "-i", input_path,
            "-vcodec", "libx264", "-crf", "23",
            "-preset", "medium", "-maxrate", "5000k", "-bufsize", "10000k",
            "-vf", "scale=-2:1080",
            "-acodec", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            "-y", output_path
        ]

        
        process = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        if process.returncode != 0:
            raise Exception(f"FFmpeg failed: {process.stderr}")

        # 3. Upload Optimized version back to S3
        print("DEBUG: Uploading optimized asset to cloud...")
        with open(output_path, "rb") as f:
            optimized_key = s3_utils.upload_file_to_s3(f, "optimized.mp4")
        
        if not optimized_key:
            raise Exception("Failed to upload optimized version to S3")

        # 4. Update Project Record
        project.optimized_url = optimized_key
        project.transcoding_status = "completed"
        db.commit()
        print(f"SUCCESS: Project {project_id} transcoding complete.")

    except Exception as e:
        print(f"TRANSCODING ERROR for Project {project_id}: {e}")
        # Re-fetch project to ensure we have a fresh state for updating failure
        try:
            p_fail = db.query(models.Project).filter(models.Project.id == project_id).first()
            if p_fail:
                p_fail.transcoding_status = "failed"
                db.commit()
        except:
            pass
    
    finally:
        # Cleanup
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir)
        db.close()
