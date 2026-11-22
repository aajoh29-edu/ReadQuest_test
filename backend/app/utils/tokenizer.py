import re
from collections.abc import Iterable

WORD_PATTERN = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?", re.IGNORECASE)


def tokenize_text(text: str) -> list[str]:
    """Return the canonical lowercase word sequence used for read-aloud scoring."""
    return [match.group(0).lower() for match in WORD_PATTERN.finditer(text)]


def tokenize_pages(pages: Iterable[dict]) -> list[str]:
    words: list[str] = []
    for page in pages:
        for sentence in page.get("sentences", []):
            words.extend(tokenize_text(sentence))
    return words
