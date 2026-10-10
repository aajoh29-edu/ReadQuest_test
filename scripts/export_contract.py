"""Export the API contract and exact ORM ERD for reviewers."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.db.base import Base  # noqa: E402
from app.main import create_app  # noqa: E402


def main():
    app = create_app()
    (ROOT / "docs/architecture/openapi.json").write_text(json.dumps(app.openapi(), indent=2) + "\n")
    relationships = []
    blocks = []
    for name, table in sorted(Base.metadata.tables.items()):
        fields = []
        for column in table.columns:
            flags = []
            if column.primary_key:
                flags.append("PK")
            if column.foreign_keys:
                flags.append("FK")
            if column.unique:
                flags.append("UK")
            datatype = getattr(column.type, "name", None) or str(column.type).split("(")[0].lower().replace(" ", "_")
            fields.append(f"        {datatype} {column.name}" + (" " + ",".join(flags) if flags else ""))
            for foreign_key in column.foreign_keys:
                parent = foreign_key.column.table.name.upper()
                relationships.append(f'    {parent} ||--o{{ {name.upper()} : "{column.name}; {foreign_key.ondelete}"')
        blocks.append(f"    {name.upper()} {{\n" + "\n".join(fields) + "\n    }")
    result = "# Implemented data model\n\nGenerated from SQLAlchemy metadata; migrations 0001–0002 are checked against PostgreSQL. Nullable grade/response/evidence timestamps are detailed in the data dictionary. FK deletion rules appear on relationship labels.\n\n```mermaid\nerDiagram\n" + "\n".join(relationships + blocks) + "\n```\n"
    (ROOT / "docs/models/ERD.md").write_text(result)
    (ROOT / "docs/architecture/ERD.md").write_text(result)


if __name__ == "__main__":
    main()
