# Local setup

The source expects a Firebase project, BigQuery tables and models with the member schema described in `ai-agent-fe/lib/data/churn-data.ts`, and a Vertex AI retrieval corpus. Supply resources you control. The research data and original cloud credentials are not included.

## Python agent

From `Aciso-Agent_Final/`, create a virtual environment and install the recorded dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env.local
```

Set your project IDs and `VERTEXAI_RAG_CORPUS` in `.env.local`. Google clients use Application Default Credentials, or the external key path in `GOOGLE_APPLICATION_CREDENTIALS`. Never place a real key in this repository.

After checking that port 8001 is free, start the agent with the environment file loaded:

```bash
python -m uvicorn main:app --env-file .env.local --host 127.0.0.1 --port 8001
```

The pinned dependencies record the thesis environment. Their compatibility with current cloud services has not been checked. The Gemini model identifiers are unchanged.

## Frontend

Follow [the frontend README](../ai-agent-fe/README.md). Set `DATA_SCIENCE_AGENT_URL` to the agent's base URL and configure Firebase client and Admin credentials. The frontend defaults to port 3000.

## Offline checks

From the repository root:

```bash
python -m pip install pytest pydantic
python -m pytest Aciso-Agent_Final/tests -q
python -m unittest discover -s scripts/tests -v
```

From `ai-agent-fe/`, after `npm ci`:

```bash
npm run lint
npx tsc --noEmit
node --test tests/creation-time.test.mjs tests/frontend-components.test.mjs
```

The Node component tests use `node:module.registerHooks`; they were checked with Node.js 26.8.2. These checks do not authenticate to cloud services or validate model performance.
