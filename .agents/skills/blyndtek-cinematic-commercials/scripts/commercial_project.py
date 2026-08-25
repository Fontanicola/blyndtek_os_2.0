#!/usr/bin/env python3
"""Scaffold and validate reproducible Blyndtek Higgsfield commercial projects."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


DEFAULT_ROOT = Path("creative-production/higgsfield")
DIRECTORIES = (
    "manifests",
    "references",
    "prompts",
    "generations",
    "selects",
    "edit",
    "audio",
    "qa",
)


def safe_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not slug:
        raise ValueError("El slug debe contener letras o números.")
    return slug


def write_new(path: Path, content: str) -> None:
    if path.exists():
        return
    path.write_text(content, encoding="utf-8")


def write_json_new(path: Path, payload: object) -> None:
    write_new(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def init_project(args: argparse.Namespace) -> int:
    slug = safe_slug(args.slug)
    root = Path(args.root).expanduser().resolve()
    project = root / slug
    project.mkdir(parents=True, exist_ok=True)
    for directory in DIRECTORIES:
        (project / directory).mkdir(exist_ok=True)

    title = args.title or slug.replace("-", " ").title()
    write_new(
        project / "brief.md",
        f"""# {title}

## Objetivo de marca

[recordación / autoridad / reconocimiento / consideración]

## Audiencia y país

[audiencia concreta]

## Mensaje permanente

[medimos antes / construimos lo diagnosticado / el software se adapta]

## Idea rectora

[una frase]

## Sinopsis

[estado inicial, fricción, cambio]

## Formatos

- Master: [duración y relación]
- Adaptaciones: [30s / 15s / 6s / 9:16 / 1:1]

## CTA

[uno]

## Pruebas y claims

[real / ilustrativo declarado / metáfora]

## Restricciones

- No inventar números, clientes ni resultados.
- Aplicar el brand lock audiovisual de Blyndtek.
""",
    )
    write_new(
        project / "continuity.md",
        """# Continuity bible

## Reglas globales

- Momento y dirección de luz:
- Paleta y textura:
- Eje de acción:
- Estado inicial de personajes:
- Props persistentes:
- Geografía entre escenas:
- Arco emocional:

## Escenas

### S01

- Entrada:
- Salida:
- Vestuario:
- Blocking:
- Sonido continuo:
""",
    )
    write_json_new(
        project / "manifests/assets.json",
        {
            "campaign": slug,
            "assets": [
                {
                    "tag": "@example",
                    "type": "character|location|prop|style|interface",
                    "source": "path-or-higgsfield-id",
                    "status": "planned",
                    "approved_by": None,
                    "constraints": [],
                }
            ],
        },
    )
    write_json_new(
        project / "manifests/shots.json",
        {
            "campaign": slug,
            "shots": [
                {
                    "id": "S01_SH01",
                    "purpose": "",
                    "duration_seconds": 0,
                    "aspect_ratio": "16:9",
                    "model": "",
                    "references": [],
                    "prompt_file": "prompts/S01_SH01.txt",
                    "success_criteria": [],
                    "status": "planned",
                    "jobs": [],
                    "selects": [],
                    "qa_score": None,
                }
            ],
        },
    )
    print(project)
    return 0


def load_json(path: Path, errors: list[str]) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        errors.append(f"Falta {path}")
        return {}
    except json.JSONDecodeError as exc:
        errors.append(f"JSON inválido en {path}: {exc}")
        return {}
    if not isinstance(value, dict):
        errors.append(f"{path} debe contener un objeto JSON.")
        return {}
    return value


def validate_project(args: argparse.Namespace) -> int:
    project = Path(args.project).expanduser().resolve()
    errors: list[str] = []
    for required in ("brief.md", "continuity.md"):
        path = project / required
        if not path.exists() or not path.read_text(encoding="utf-8").strip():
            errors.append(f"Falta contenido en {path}")

    assets = load_json(project / "manifests/assets.json", errors).get("assets", [])
    shots = load_json(project / "manifests/shots.json", errors).get("shots", [])
    if not isinstance(assets, list) or not assets:
        errors.append("assets.json debe incluir al menos un asset.")
    if not isinstance(shots, list) or not shots:
        errors.append("shots.json debe incluir al menos una toma.")

    tags: set[str] = set()
    for index, asset in enumerate(assets if isinstance(assets, list) else []):
        if not isinstance(asset, dict):
            errors.append(f"Asset {index + 1} no es un objeto.")
            continue
        tag = asset.get("tag")
        if not isinstance(tag, str) or not re.fullmatch(r"@[a-z0-9_]+", tag):
            errors.append(f"Asset {index + 1}: tag inválido {tag!r}.")
        elif tag in tags:
            errors.append(f"Tag duplicado: {tag}")
        else:
            tags.add(tag)

    shot_ids: set[str] = set()
    for index, shot in enumerate(shots if isinstance(shots, list) else []):
        if not isinstance(shot, dict):
            errors.append(f"Toma {index + 1} no es un objeto.")
            continue
        shot_id = shot.get("id")
        if not isinstance(shot_id, str) or not re.fullmatch(r"S\d{2}_SH\d{2}", shot_id):
            errors.append(f"Toma {index + 1}: id inválido {shot_id!r}.")
        elif shot_id in shot_ids:
            errors.append(f"ID de toma duplicado: {shot_id}")
        else:
            shot_ids.add(shot_id)
        unknown = set(shot.get("references", [])) - tags
        if unknown:
            errors.append(f"{shot_id or index + 1}: referencias desconocidas {sorted(unknown)}")
        duration = shot.get("duration_seconds")
        if not isinstance(duration, (int, float)) or duration <= 0:
            errors.append(f"{shot_id or index + 1}: duration_seconds debe ser mayor a cero.")
        if not shot.get("purpose"):
            errors.append(f"{shot_id or index + 1}: falta purpose.")
        if not shot.get("success_criteria"):
            errors.append(f"{shot_id or index + 1}: faltan success_criteria.")

    if errors:
        print("Proyecto incompleto:")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"Proyecto válido: {project}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Crear una campaña reproducible.")
    init_parser.add_argument("slug")
    init_parser.add_argument("--title")
    init_parser.add_argument("--root", default=str(DEFAULT_ROOT))
    init_parser.set_defaults(handler=init_project)

    validate_parser = subparsers.add_parser("validate", help="Validar manifests y archivos base.")
    validate_parser.add_argument("project")
    validate_parser.set_defaults(handler=validate_project)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return args.handler(args)
    except ValueError as exc:
        parser.error(str(exc))
    return 2


if __name__ == "__main__":
    sys.exit(main())
