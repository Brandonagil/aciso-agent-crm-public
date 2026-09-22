# Source edition

The application was developed for a bachelor's thesis in 2025. This repository presents a maintained, sanitized edition of that work. It is not a byte-for-byte archive of the submitted thesis materials.

The first public snapshot, [`2b7229e`](https://github.com/Brandonagil/aciso-agent-crm-public/commit/2b7229e45313e221ee8b4aa2300e5e6866075fe2), was prepared on 22 September 2026 from the existing development repository. It includes subsequent test additions, configuration changes and frontend fixes. Private history and research artifacts were excluded.

The source tree is now organized into `backend/` and `frontend/`. The Python package and ADK application name are `aciso_agent`. Unit tests, browser scenarios and rendering fixtures have separate folders. Existing application files were moved and their references updated.

## Exporting the public source

From the repository root:

```bash
python3 scripts/export_source.py ../aciso-source-export
```

Choose a destination that does not exist. The exporter selects application source, tests and documentation, rejects symlinks and checks selected text for credential patterns. It does not copy Git history, credentials or research archives.

The resulting `docs/source-manifest.json` records each exported file and its SHA-256 hash. The manifest does not hash itself. This describes the exported source, not the original submission package.
