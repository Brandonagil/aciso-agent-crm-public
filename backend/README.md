# ACISO agent backend

Python service using Google ADK, BigQuery and Vertex AI. Start with [local setup](../docs/setup.md).

| File | Responsibility |
| --- | --- |
| `main.py` | FastAPI entry point, ADK endpoints and PDF export |
| `aciso_agent/agent.py` | Agent definition and tool selection |
| `aciso_agent/tools.py` | Member queries, model explanations, retrieval and retention plans |
| `aciso_agent/instructions.py` | Instructions supplied to the agent |
| `aciso_agent/config.py` | Cloud resources and query settings |
| `aciso_agent/state.py` | Session state and response models |
| `aciso_agent/pdf_generator.py` | Retention-plan PDF rendering |
| `tests/` | Offline configuration and state tests |

The application name exposed by ADK is `aciso_agent`. The frontend routes use the same name. Cloud resources and credentials must be supplied separately; `.env.example` lists the expected settings.
