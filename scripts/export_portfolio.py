"""Create a reviewable source snapshot without archives, credentials or Git history."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil


ROOT = Path(__file__).resolve().parents[1]
EXACT_FILES = {
    "README.md", ".gitignore",
    "Aciso-Agent_Final/main.py", "Aciso-Agent_Final/requirements.txt",
    "Aciso-Agent_Final/.env.example",
    "ai-agent-fe/README.md", "ai-agent-fe/.env.example",
    "ai-agent-fe/package.json", "ai-agent-fe/package-lock.json",
    "ai-agent-fe/next.config.ts", "ai-agent-fe/next-env.d.ts",
    "ai-agent-fe/tsconfig.json", "ai-agent-fe/eslint.config.mjs",
    "ai-agent-fe/postcss.config.mjs", "ai-agent-fe/components.json",
    "ai-agent-fe/playwright.config.ts", "ai-agent-fe/firestore.indexes.json",
    "ai-agent-fe/firebase.json",
}
SOURCE_TREES = {
    "Aciso-Agent_Final/Aciso_Agent": {".py", ".html"},
    "Aciso-Agent_Final/tests": {".py"},
    "ai-agent-fe/app": {".ts", ".tsx", ".css", ".ico"},
    "ai-agent-fe/components": {".ts", ".tsx"},
    "ai-agent-fe/contexts": {".ts", ".tsx"},
    "ai-agent-fe/lib": {".ts", ".tsx"},
    "ai-agent-fe/public": {".svg"},
    "ai-agent-fe/tests": {".ts", ".tsx", ".mjs"},
    "docs": {".md"},
    "scripts": {".py"},
}
FORBIDDEN_PARTS = {".git", ".adk", "archive", "node_modules", "__pycache__"}
SECRET_PATTERNS = (
    re.compile(r"-----BEGIN " + r"(?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"AIza" + r"[0-9A-Za-z_-]{30,}"),
    re.compile(r"ghp_" + r"[0-9A-Za-z]{20,}"),
    re.compile(r"github_pat_" + r"[0-9A-Za-z_]{30,}"),
    re.compile(r"sk-" + r"[0-9A-Za-z_-]{25,}"),
    re.compile(r"AKIA" + r"[0-9A-Z]{16}"),
)


def is_allowed(relative: Path) -> bool:
    if relative.is_absolute() or ".." in relative.parts:
        return False
    if FORBIDDEN_PARTS.intersection(relative.parts):
        return False
    name = relative.as_posix()
    if name in EXACT_FILES:
        return True
    if any(part.startswith(".") for part in relative.parts):
        return False
    return any(
        name.startswith(prefix + "/") and relative.suffix in suffixes
        for prefix, suffixes in SOURCE_TREES.items()
    )


def check_file(path: Path, relative: Path) -> None:
    if path.is_symlink():
        raise ValueError(f"Symlinks are excluded: {relative}")
    if relative.suffix == ".ico":
        return
    content = path.read_text(encoding="utf-8")
    if any(pattern.search(content) for pattern in SECRET_PATTERNS):
        raise ValueError(f"Possible credential in selected file: {relative}")


def export(root: Path, destination: Path) -> dict:
    root = root.resolve()
    destination = destination.absolute()
    if destination.exists() or destination.is_symlink():
        raise ValueError("Choose a new destination; existing files are never overwritten.")
    if destination.resolve().is_relative_to(root):
        raise ValueError("The export must be outside the source repository.")

    selected = []
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if is_allowed(relative):
            if path.is_symlink():
                raise ValueError(f"Symlinks are excluded: {relative}")
            if path.is_file():
                if any(parent.is_symlink() for parent in path.parents if parent != root):
                    raise ValueError(f"Symlink ancestor in selected path: {relative}")
                check_file(path, relative)
                selected.append((path, relative))

    if not selected:
        raise ValueError("No allowlisted files found.")
    # Validate every selected file before writing any output.
    destination.mkdir(parents=True)
    entries = []
    for path, relative in selected:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        entries.append({
            "path": relative.as_posix(),
            "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        })
    manifest = {
        "purpose": "Clean source snapshot for repository publication review",
        "git_history_included": False,
        "research_data_included": False,
        "credential_pattern_check": "passed for selected text files",
        "files": entries,
    }
    (destination / "export-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    try:
        result = export(ROOT, args.destination)
    except (ValueError, UnicodeError, OSError) as error:
        parser.exit(1, f"Export stopped: {error}\n")
    print(f"Exported {len(result['files'])} files. No publication performed.")
