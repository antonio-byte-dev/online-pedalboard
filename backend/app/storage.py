import io
import json
from minio import Minio
from app.config import settings

client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=False   # True in production with HTTPS
)

# S3 bucket policy that allows anyone to GET objects
_PUBLIC_READ_POLICY = json.dumps({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect":    "Allow",
            "Principal": {"AWS": ["*"]},
            "Action":    ["s3:GetObject"],
            "Resource":  [f"arn:aws:s3:::{settings.minio_bucket}/*"],
        }
    ]
})


def ensure_bucket():
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)

    # Always re-apply the policy — idempotent, cheap, survives restarts
    client.set_bucket_policy(settings.minio_bucket, _PUBLIC_READ_POLICY)


def upload_ir(
    file_data: bytes,
    filename: str,
    content_type: str = "audio/wav"
) -> str:
    ensure_bucket()
    client.put_object(
        settings.minio_bucket,
        filename,
        io.BytesIO(file_data),
        length=len(file_data),
        content_type=content_type,
    )
    return f"{settings.minio_public_url}/{settings.minio_bucket}/{filename}"


def delete_ir(filename: str):
    client.remove_object(settings.minio_bucket, filename)