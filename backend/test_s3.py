import boto3
import os
from dotenv import load_dotenv

load_dotenv()

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")

print(f"Testing S3 upload to bucket: {BUCKET_NAME} in region: {os.getenv('AWS_REGION')}")

try:
    # Create a small dummy file
    with open("test_upload.txt", "w") as f:
        f.write("Hello S3!")
    
    with open("test_upload.txt", "rb") as f:
        s3_client.upload_fileobj(f, BUCKET_NAME, "test_upload.txt")
    
    print("Upload successful!")
    
    # Clean up
    os.remove("test_upload.txt")
except Exception as e:
    print(f"Upload failed: {e}")
