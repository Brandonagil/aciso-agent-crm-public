# Verification, 22 September 2026

These checks cover the source prepared for repository publication. No cloud credentials or original research data were used.

## Results

| Check | Result |
| --- | --- |
| Python configuration and state tests | 35 passed |
| Source export boundary tests | 5 passed |
| Frontend component, timestamp, fixture and cloud configuration tests | 8 passed |
| TypeScript, including generated Next.js route types | Passed |
| ESLint across frontend source and tests | 0 errors; 1 existing warning about a spread dependency array in the breadcrumb helper |
| Playwright test discovery | 7 browser scenarios found in 5 files; not executed against cloud services |
| Next.js production compilation | Passed with GOOGLE_CLOUD_PROJECT=example-project |
| Full production build | Stops while collecting page data because Firebase Admin credentials are absent |

The Python tests include configuration overrides for cloud projects, datasets, model paths and the retrieval corpus. The frontend regression tests render the actual calendar and retention-plan components and check styling selection and timestamp sorting. Two additional checks cover synthetic fixture totals and configurable BigQuery identifiers without cloud access. They ran with Node.js 26.8.2.

These checks were repeated after moving the application to `backend/` and `frontend/`. The Python package and the frontend ADK targets now use `aciso_agent`. Unit tests, browser scenarios and rendering fixtures resolve from their new directories. The source exporter writes its manifest under `docs/`.

The frontend provides `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e`. ESLint excludes generated build and test artifacts. Unused catch and test-fixture parameters were removed; the existing breadcrumb dependency warning remains visible.

## Source cleanup

The npm lockfile matches the manifest. Motion dependencies are pinned to versions from the original pnpm lockfile. Next.js route parameters, React refs, calendar integration, chat-trigger props and shared data types were corrected. The conditional Hook and timer cleanup in the churn card were repaired. Unused imports and unreachable helpers were removed.

The ADK proxies no longer log authentication headers or token prefixes. Cloud project and credential references are configurable. The public source excludes the research archives, datasets, keys, evaluation logs and private Git history. Historical static dashboard values are replaced with labeled synthetic fixtures.

The source exporter selects files explicitly, rejects symlinks and checks selected text for common credential patterns. Its tests verify that excluded files stay out and source files are preserved. This is a packaging check, not a complete security audit.

## Integration still required

The application needs an independently configured Firebase and Google Cloud environment. Saved-plan views still contain `demo-user` and `dummy-token` placeholders; some endpoints only check that an authorization header exists. Other report paths generate sample values. The backend includes development callbacks, broad CORS and fallback behavior.

A full cloud run, production deployment and model-performance validation remain outside these checks. No measured business outcome is claimed.
