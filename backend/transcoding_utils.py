import os
import subprocess
import shutil
import uuid
from database import SessionLocal
import models
import s3_utils
import tempfile
import requests

# Maximum time (seconds) allowed for FFmpeg to complete.
# Render free tier aggressively kills long processes, so we impose our own cap.
FFMPEG_TIMEOUT_SECONDS = 480  # 8 minutes


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
        with requests.get(download_url, stream=True, timeout=300) as r:
            with open(input_path, 'wb') as f:
                shutil.copyfileobj(r.raw, f)

        # 2. Run FFmpeg
        print("DEBUG: Executing FFmpeg optimization...")
        
        # Check if ffmpeg exists locally in the backend folder
        ffmpeg_bin = "./ffmpeg.exe" if os.path.exists("./ffmpeg.exe") else "ffmpeg"
        
        # Use -threads 1 and -preset ultrafast to save RAM on Render Free Tier
        ffmpeg_cmd = [
            ffmpeg_bin, "-i", input_path,
            "-vcodec", "libx264", "-crf", "28",
            "-preset", "ultrafast", "-threads", "1",
            "-vf", "scale=-2:720",
            "-acodec", "aac", "-b:a", "96k",
            "-movflags", "+faststart",
            "-y", output_path
        ]

        
        process = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
            timeout=FFMPEG_TIMEOUT_SECONDS  # Hard cap to prevent zombie processes
        )
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

    except subprocess.TimeoutExpired:
        print(f"TRANSCODING TIMEOUT for Project {project_id}: FFmpeg exceeded {FFMPEG_TIMEOUT_SECONDS}s limit.")
        _mark_transcoding_failed(project_id, db)

    except Exception as e:
        print(f"TRANSCODING ERROR for Project {project_id}: {e}")
        _mark_transcoding_failed(project_id, db)
    
    finally:
        # Cleanup temp files regardless of outcome
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir)
        try:
            db.close()
        except Exception:
            pass


def _mark_transcoding_failed(project_id: int, db):
    """
    Robustly marks a project's transcoding as failed.
    Uses a fresh DB session if the primary one is in a broken state.
    """
    # Try with the existing session first
    try:
        p = db.query(models.Project).filter(models.Project.id == project_id).first()
        if p:
            p.transcoding_status = "failed"
            db.commit()
            return
    except Exception:
        pass

    # Fallback: open a brand-new session
    fresh_db = None
    try:
        fresh_db = SessionLocal()
        p = fresh_db.query(models.Project).filter(models.Project.id == project_id).first()
        if p:
            p.transcoding_status = "failed"
            fresh_db.commit()
    except Exception as e2:
        print(f"CRITICAL: Could not mark project {project_id} as failed: {e2}")
    finally:
        if fresh_db:
            try:
                fresh_db.close()
            except Exception:
                pass

