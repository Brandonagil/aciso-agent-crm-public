# Local setup

The source expects a Firebase project, BigQuery tables and models with the member schema described in `frontend/lib/data/churn-data.ts`, and a Vertex AI retrieval corpus. Supply resources you control. The research data and original cloud credentials are not included.

## Python agent

From the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env.local
```

Set your project IDs and `VERTEXAI_RAG_CORPUS` in `.env.local`. Google clients use Application Default Credentials, or the external key path in `GOOGLE_APPLICATION_CREDENTIALS`. Never place a real key in this repository. The ADK application is `aciso_agent`, matching the package in `backend/aciso_agent/` and the frontend API routes.

After checking that port 8001 is free, start the agent with the environment file loaded:

```bash
python -m uvicorn main:app --env-file .env.local --host 127.0.0.1 --port 8001
```

The pinned dependencies record the thesis environment. Their compatibility with current cloud services has not been checked. The Gemini model identifiers are unchanged.

## Frontend

Follow [the frontend README](../frontend/README.md). Set `DATA_SCIENCE_AGENT_URL` to the agent's base URL and configure Firebase client and Admin credentials. The frontend defaults to port 3000.

## Offline checks

From the repository root:

```bash
python -m pip install pytest pydantic
python -m pytest backend/tests -q
python -m unittest discover -s scripts/tests -v
```

From `frontend/`, after `npm ci`:

```bash
npm run lint
npm run typecheck
npm test
```

The Node component tests live in `frontend/tests/unit/` and use `node:module.registerHooks`; they were checked with Node.js 26.8.2. Browser tests live in `frontend/tests/e2e/` and need configured cloud services and a dedicated test account. `npm run test:e2e -- --list` checks their discovery without starting a server. The offline checks do not authenticate to cloud services or validate model performance.
