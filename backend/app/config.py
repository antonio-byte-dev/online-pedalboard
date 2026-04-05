from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str
    minio_public_url: str

    class Config:
        env_file = ".env"
    
    resend_api_key: str
    frontend_url:   str = "http://localhost:5173"

settings = Settings()