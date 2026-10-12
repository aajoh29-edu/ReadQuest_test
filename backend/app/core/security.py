from hashlib import sha256

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()
_dummy = _hasher.hash("unusable-login-timing-padding")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    try:
        recognized = encoded.startswith("$argon2id$")
        matched = _hasher.verify(encoded if recognized else _dummy, password)
        return recognized and matched
    except (VerificationError, InvalidHashError):
        return False


def token_digest(token: str) -> str:
    return sha256(token.encode()).hexdigest()
