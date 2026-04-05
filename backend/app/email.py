import resend
from app.config import settings

resend.api_key = settings.resend_api_key

def send_password_reset_email(to_email: str, username: str, token: str):
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"

    resend.Emails.send({
        "from":    "onboarding@resend.dev",  # ← your verified domain
        "to":      to_email,
        "subject": "Reset your password",
        "html":    f"""
            <p>Hi {username},</p>
            <p>You requested a password reset for your Pedalboard account.</p>
            <p>
                <a href="{reset_url}">Click here to reset your password</a>
            </p>
            <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        """
    })