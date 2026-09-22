# ACISO frontend

The original application uses Next.js, React, TypeScript, Firebase and a server-side proxy to Google ADK.

## Local setup

Use the committed npm lockfile. The Python agent defaults to port 8001; Next.js defaults to port 3000. Check that the ports are free before starting either service.

```bash
npm ci
cp .env.example .env.local
```

Complete `.env.local` with credentials for an environment you control, then run `npm run dev`. The original frontend initializes Firebase when it loads and requires Firebase configuration.

## Configuration used by the source

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web app configuration |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin project |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account email for Firebase Admin |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Private key; escaped newlines are decoded by `lib/firebase/admin.ts` |
| `DATA_SCIENCE_AGENT_URL` | Agent base URL; defaults to `http://localhost:8001` |
| `USE_CLOUD_ADK` | Cloud Run token handling in the ADK proxy |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Optional raw JSON credentials; the proxy calls `JSON.parse`, not base64 decoding |
| `NEXT_PUBLIC_DEPLOY_URL` | Frontend base URL used by internal requests |
| `NO_ADK_AUTH` | Local-only bypass in the existing proxy; leave false for normal use |
| `DEBUG_ADK_INTEGRATION` | Additional logging; leave false when handling sensitive data |
| `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` | Dedicated account for existing browser tests |

`LOCAL_ADK_URL`, `CLOUD_ADK_URL` and `ADK_PRIMARY_ENDPOINT` are not read by the main `app/api/adk/route.ts` proxy. Set `DATA_SCIENCE_AGENT_URL` instead.

The Firestore database in `lib/firebase/client.ts` and the BigQuery environment variables must match your own resources. See `.env.example`. This repository does not include a provisioned cloud environment.

## Checks

```bash
npm run lint
npx tsc --noEmit
node --test tests/creation-time.test.mjs tests/frontend-components.test.mjs
npm run build
```

Compilation, lint and types passed during source preparation. The build currently stops when collecting page data because Firebase Admin credentials are missing. See [verification notes](../docs/verification.md). The browser tests require configured Firebase services. Use a dedicated test account for the browser tests. The existing Playwright configuration uses port 3000; inspect it before running against a local service.

## Data flow

The browser signs in with Firebase and sends agent requests through the Next.js proxy. The proxy communicates with the Python backend and forwards streamed results. Other API routes read analytics and save retention plans. The Python backend provides PDF rendering for plan exports.

This is thesis prototype code. The local checks do not certify API authorization, cloud deployment, dependency security or model performance.
