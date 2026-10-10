from hashlib import sha256

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()
_dummy = _hasher.hash("unusable-login-timing-padding")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    try:
        return _hasher.verify(encoded if encoded.startswith("$argon2id$") else _dummy, password)
    except (VerificationError, InvalidHashError):
        return False


def token_digest(token: str) -> str:
    return sha256(token.encode()).hexdigest()
