import boto3
import os
import uuid
from botocore.exceptions import NoCredentialsError
from dotenv import load_dotenv

load_dotenv(override=True)

def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )

def get_config():
    return {
        "bucket": os.getenv("AWS_BUCKET_NAME"),
        "region": os.getenv("AWS_REGION")
    }

def upload_file_to_s3(file_obj, original_filename: str):
    """
    Uploads a file to AWS S3 and returns the public URL.
    """
    try:
        s3_client = get_s3_client()
        config = get_config()
        
        # Generate a unique filename so users don't overwrite each other's files
        file_extension = original_filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        
        import mimetypes
        content_type = mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

        # Upload the file to S3
        s3_client.upload_fileobj(
            file_obj,
            config["bucket"],
            unique_filename,
            ExtraArgs={
                "ContentType": content_type
            }
        )
        
        # Construct and return the public URL
        file_url = f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{unique_filename}"
        return file_url

    except NoCredentialsError:
        print("S3 ERROR: Credentials not available")
        return None
    except Exception as e:
        print(f"S3 ERROR: Failed to upload {original_filename}. Reason: {e}")
        return None

def get_presigned_url(file_url: str, expiration=3600):
    if not file_url or "amazonaws.com" not in file_url:
        return file_url
    
    try:
        s3_client = get_s3_client()
        config = get_config()
        
        # Extract object key from the full URL
        object_name = file_url.split(".amazonaws.com/")[-1]
        
        response = s3_client.generate_presigned_url('get_object',
                                                    Params={'Bucket': config["bucket"],
                                                            'Key': object_name},
                                                    ExpiresIn=expiration)
        return response
    except Exception as e:
        print(f"Error generating presigned url: {e}")
        return file_url

def generate_presigned_post(file_name: str, file_type: str, expiration=3600):
    """
    Generates a presigned POST URL for direct client-side upload to S3.
    """
    try:
        s3_client = get_s3_client()
        config = get_config()

        file_extension = file_name.split(".")[-1]
        object_name = f"{uuid.uuid4()}.{file_extension}"

        response = s3_client.generate_presigned_post(
            Bucket=config["bucket"],
            Key=object_name,
            Fields={"Content-Type": file_type},
            Conditions=[{"Content-Type": file_type}],
            ExpiresIn=expiration
        )
        
        # Add the full URL for later reference
        response["file_url"] = f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{object_name}"
        response["object_key"] = object_name
        
        return response
    except Exception as e:
        print(f"Error generating presigned post: {e}")
        return None
# --- RESUMABLE MULTIPART UPLOAD LOGIC ---

def initiate_multipart_upload(file_name: str, file_type: str):
    """Initiates a multipart upload and returns the UploadId and Key."""
    try:
        s3_client = get_s3_client()
        config = get_config()
        
        file_extension = file_name.split(".")[-1]
        object_key = f"{uuid.uuid4()}.{file_extension}"
        
        response = s3_client.create_multipart_upload(
            Bucket=config["bucket"],
            Key=object_key,
            ContentType=file_type
        )
        
        return {
            "upload_id": response["UploadId"],
            "object_key": object_key,
            "file_url": f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{object_key}"
        }
    except Exception as e:
        print(f"S3 Multipart Initiation Error: {e}")
        return None

def generate_presigned_part_url(object_key: str, upload_id: str, part_number: int):
    """Generates a presigned URL for a specific part of a multipart upload."""
    try:
        s3_client = get_s3_client()
        config = get_config()
        
        return s3_client.generate_presigned_url(
            'upload_part',
            Params={
                'Bucket': config["bucket"],
                'Key': object_key,
                'UploadId': upload_id,
                'PartNumber': part_number
            },
            ExpiresIn=3600
        )
    except Exception as e:
        print(f"S3 Presign Part Error: {e}")
        return None

def complete_multipart_upload(object_key: str, upload_id: str, parts: list):
    """Finalizes the multipart upload by assembling all parts."""
    try:
        s3_client = get_s3_client()
        config = get_config()
        
        # 'parts' must be a list of dicts: [{'ETag': '...', 'PartNumber': 1}, ...]
        s3_client.complete_multipart_upload(
            Bucket=config["bucket"],
            Key=object_key,
            UploadId=upload_id,
            MultipartUpload={'Parts': parts}
        )
        return True
    except Exception as e:
        print(f"S3 Multipart Completion Error: {e}")
        return False

