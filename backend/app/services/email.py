import logging
import os
import smtplib
from email.message import EmailMessage
from urllib.parse import quote

logger = logging.getLogger(__name__)


def send_auth_link(email: str, purpose: str, token: str) -> None:
    frontend_url = os.getenv("READQUEST_FRONTEND_URL", "http://localhost:3000").rstrip("/")
    route = "verify-email" if purpose == "verify_email" else "reset-password"
    link = f"{frontend_url}/{route}?token={quote(token)}"
    host = os.getenv("SMTP_HOST")
    sender = os.getenv("SMTP_FROM")
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    if not host or not sender:
        logger.warning(
            "Authentication email delivery is not configured for %s to %s",
            purpose,
            email,
        )
        return
    message = EmailMessage()
    message["From"] = sender
    message["To"] = email
    message["Subject"] = (
        "Verify your ReadQuest email"
        if purpose == "verify_email"
        else "Reset your ReadQuest password"
    )
    message.set_content(f"Open this link: {link}")
    port = int(os.getenv("SMTP_PORT", "587"))
    with smtplib.SMTP(host, port, timeout=15) as smtp:
        smtp.starttls()
        if username:
            smtp.login(username, password or "")
        smtp.send_message(message)
