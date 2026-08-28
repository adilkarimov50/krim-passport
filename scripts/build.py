"""Сборка данных сайта: data/*.json -> site/assets/js/data.js.

Данные встраиваются в JS-файл, а не загружаются через fetch, чтобы паспорт
открывался как с GitHub Pages, так и напрямую с диска (протокол file://).
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
TARGET = ROOT / "docs" / "assets" / "js" / "data.js"

# Порядок населённых пунктов в интерфейсе.
ORDER = ["kaskelen", "irgeli", "chundzha"]


def load_passports() -> list[dict]:
    files = {path.stem: path for path in DATA.glob("*.json") if not path.stem.startswith("_")}
    files.pop("geo", None)
    ordered = [name for name in ORDER if name in files]
    ordered += sorted(name for name in files if name not in ORDER)
    return [json.loads(files[name].read_text(encoding="utf-8")) for name in ordered]


def main() -> None:
    payload = {
        "passports": load_passports(),
        "geo": json.loads((DATA / "geo.json").read_text(encoding="utf-8")),
    }
    body = json.dumps(payload, ensure_ascii=False, indent=1)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(
        "/* Сформировано scripts/build.py — не редактировать вручную. */\n"
        f"window.KRIM_DATA = {body};\n",
        encoding="utf-8",
    )
    names = ", ".join(p["name"] for p in payload["passports"])
    print(f"{TARGET.relative_to(ROOT)} — паспортов: {len(payload['passports'])} ({names})")


if __name__ == "__main__":
    main()
