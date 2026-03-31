from minio import Minio
from app.config import settings

client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=False  # True en producción con HTTPS
)

def ensure_bucket():
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)

def upload_ir(file_data: bytes, filename: str, content_type: str = "audio/wav") -> str:
    import io
    ensure_bucket()
    client.put_object(
        settings.minio_bucket,
        filename,
        io.BytesIO(file_data),
        length=len(file_data),
        content_type=content_type
    )
    return f"{settings.minio_public_url}/{settings.minio_bucket}/{filename}"

def delete_ir(filename: str):
    client.remove_object(settings.minio_bucket, filename)