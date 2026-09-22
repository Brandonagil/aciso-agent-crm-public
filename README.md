# ACISO Agent CRM

An AI-assisted CRM prototype I built for my bachelor's thesis in Business Informatics, in cooperation with ACISO Consulting and ELEMENTS Fitness.

Fitness teams need to understand which members may leave and decide how to follow up. This application combines a dashboard with an agent that retrieves member data, explains churn scores and drafts retention plans for staff to review.

## What I built

The frontend uses Next.js, React and TypeScript. A Python agent built with Google ADK queries BigQuery, retrieves model explanations and searches a retention knowledge corpus. Firebase handles sign-in and stored plans. Staff can inspect a recommendation, save it and export a PDF.

This repository contains the application source. Research datasets, credentials and the private development history are excluded. Static dashboard examples use synthetic values.

## Read the code

| Area | Source |
| --- | --- |
| Agent and tool selection | [agent.py](Aciso-Agent_Final/Aciso_Agent/agent.py) |
| Queries, explanations and retention plans | [tools.py](Aciso-Agent_Final/Aciso_Agent/tools.py) |
| Agent prompts | [instructions.py](Aciso-Agent_Final/Aciso_Agent/instructions.py) |
| Dashboard and chat | [Frontend components](ai-agent-fe/components/dashboard/) |
| Streaming API proxy | [ADK route](ai-agent-fe/app/api/adk/route.ts) |
| Saved plans and exports | [Retention plan routes](ai-agent-fe/app/api/retention-plans/) |

[Project background](docs/case-study.md) · [Architecture](docs/architecture.md)

## Run locally

The application needs your own Firebase and Google Cloud configuration, a BigQuery dataset with the expected member schema, and a Vertex AI retrieval corpus. It does not include access to the original services.

See [setup instructions](docs/setup.md) for the backend and [frontend configuration](ai-agent-fe/README.md).

## Project status

This is thesis prototype code. The offline tests, TypeScript check and lint pass. Next.js compiles; the full build needs Firebase Admin credentials. The cloud workflow has not been retested for this release.

Some authorization and saved-plan paths still use development placeholders. The project has not been validated for production use or for a measured reduction in churn. See [verification notes](docs/verification.md) for the tested scope and remaining integration work.
