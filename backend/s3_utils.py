import boto3
import os
import uuid
from botocore.exceptions import NoCredentialsError
from dotenv import load_dotenv

load_dotenv()

# Initialize the S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
REGION = os.getenv("AWS_REGION")

def upload_file_to_s3(file_obj, original_filename: str):
    """
    Uploads a file to AWS S3 and returns the public URL.
    """
    try:
        # Generate a unique filename so users don't overwrite each other's files
        file_extension = original_filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        
        import mimetypes
        content_type = mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

        # Upload the file to S3
        s3_client.upload_fileobj(
            file_obj,
            BUCKET_NAME,
            unique_filename,
            ExtraArgs={
                "ContentType": content_type
            }
        )
        
        # Construct and return the public URL
        # Note: Your S3 bucket must be configured to allow public read access for this to work
        file_url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{unique_filename}"
        return file_url

    except NoCredentialsError:
        print("Credentials not available")
        return None
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        return None

def get_presigned_url(file_url: str, expiration=3600):
    if not file_url or "amazonaws.com" not in file_url:
        return file_url
    
    try:
        # Extract object key from the full URL
        object_name = file_url.split(".amazonaws.com/")[-1]
        
        response = s3_client.generate_presigned_url('get_object',
                                                    Params={'Bucket': BUCKET_NAME,
                                                            'Key': object_name},
                                                    ExpiresIn=expiration)
        return response
    except Exception as e:
        print(f"Error generating presigned url: {e}")
        return file_url