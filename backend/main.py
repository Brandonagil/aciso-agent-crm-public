import os
import sys
import uvicorn
import importlib.util
import time
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app


# Get the directory where main.py is located
APP_DIR = os.path.dirname(os.path.abspath(__file__))

# Add parent directory to sys.path if it's not there already
# This fixes the module import issue
parent_dir = os.path.abspath(os.path.join(APP_DIR, os.pardir))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Fix for 'data-science' module import
# Needed because the framework expects the code to be importable
# under the app's name.
import types

# Create a proper module for 'data-science'
data_science_module = types.ModuleType('data-science')
sys.modules['data-science'] = data_science_module

# Import the Aciso Agent - the only agent we need
try:
    from aciso_agent.agent import root_agent
    print("SUCCESS: Using Aciso Agent")
    print("   Churn analysis prototype with BigQuery ML")
    
    # Export for ADK framework
    data_science_module.root_agent = root_agent
    print(f"SUCCESS: Exported root_agent: {root_agent.name}")
    
except ImportError as e:
    print(f"ERROR: Failed to import Aciso Agent: {e}")
    print("FALLBACK: Creating fallback agent")
    
    # Create a minimal fallback agent for the framework
    class MinimalAgent:
        def __init__(self):
            self.name = "aciso_fallback_agent"
            self.tools = []
            
        def process_message(self, message: str) -> str:
            return f"Fallback response: {message} (Aciso Agent not available)"
    
    data_science_module.root_agent = MinimalAgent()
    print("SUCCESS: Created minimal fallback agent")

print(f"Registered 'data-science' and 'data-science.agent' in sys.modules")

# Example session DB URL (e.g., SQLite)
SESSION_DB_URL = "sqlite:///./sessions.db"

# Example allowed origins for CORS
ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "*"]

# Set web=True to serve a web interface
SERVE_WEB_INTERFACE = True

# Call the function to get the FastAPI app instance
# Check available parameters for get_fast_api_app
try:
    # Debug: Print what we're trying to create
    print(f"SETUP: Creating ADK FastAPI app with:")
    print(f"   agents_dir: {APP_DIR}")
    print(f"   session_db_url: {SESSION_DB_URL}")
    print(f"   web: {SERVE_WEB_INTERFACE}")
    
    # Try different parameter combinations for get_fast_api_app
    try:
        # First try with all parameters
        app: FastAPI = get_fast_api_app(
            agents_dir=APP_DIR,
            allow_origins=ALLOWED_ORIGINS,
            web=SERVE_WEB_INTERFACE
        )
    except TypeError as param_error:
        print(f"WARNING: Parameter error: {param_error}")
        # Try with minimal parameters
        app: FastAPI = get_fast_api_app(
            agents_dir=APP_DIR
        )
    print("SUCCESS: ADK FastAPI app created successfully")
    
    # Add custom PDF export endpoint
    @app.post("/api/export-pdf")
    async def export_retention_plan_pdf(request: dict):
        """Export retention plan as PDF using our professional PDF generator."""
        try:
            from aciso_agent.tools import save_retention_plan_as_pdf
            from fastapi.responses import FileResponse
            import tempfile
            import os
            
            plan_data = request.get('plan_data', {})
            plan_id = request.get('plan_id', f"plan_{int(time.time())}")
            
            if not plan_data:
                return {"error": "No plan data provided", "status": 400}
            
            # Create temporary directory for PDF
            with tempfile.TemporaryDirectory() as temp_dir:
                result = save_retention_plan_as_pdf(plan_data, temp_dir)
                
                if result.get('success'):
                    pdf_path = result.get('pdf_path')
                    if os.path.exists(pdf_path):
                        # Read the PDF file and return as bytes
                        with open(pdf_path, 'rb') as pdf_file:
                            pdf_content = pdf_file.read()
                        
                        from fastapi.responses import Response
                        return Response(
                            content=pdf_content,
                            media_type='application/pdf',
                            headers={
                                'Content-Disposition': f'attachment; filename="retention-plan-{plan_id}.pdf"'
                            }
                        )
                    else:
                        return {"error": "PDF file not found after generation", "status": 500}
                else:
                    return {"error": result.get('error', 'PDF generation failed'), "status": 500}
                    
        except Exception as e:
            print(f"ERROR: PDF export error: {e}")
            import traceback
            traceback.print_exc()
            return {"error": f"PDF export failed: {str(e)}", "status": 500}
except Exception as e:
    print(f"WARNING: Error creating FastAPI app: {e}")
    print(f"WARNING: Exception details: {type(e).__name__}: {str(e)}")
    import traceback
    print(f"WARNING: Full traceback: {traceback.format_exc()}")
    print("FALLBACK: Using fallback FastAPI app")
    # Fallback to simple FastAPI app
    app = FastAPI(title="Data Science Agent", version="1.0.0")
    
    @app.get("/")
    def root():
        return {"message": "Data Science Agent is running", "version": "1.0.0"}
    
    @app.post("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
    async def create_session(app_name: str, user_id: str, session_id: str, request: dict):
        # Simple session creation endpoint
        return {"message": "Session created", "sessionId": session_id, "appName": app_name, "userId": user_id}
    
    def process_user_message(user_message: str) -> str:
        """Process user message with real BigQuery data - NO MOCK DATA."""
        from data_science import root_agent
        import re
        import json
        
        if not root_agent:
            return "ERROR: Production Agent nicht verfügbar. Bitte prüfen Sie die Google Cloud Konfiguration und installieren Sie: google-adk, google-cloud-bigquery"
        
        # Simple intent recognition
        message_lower = user_message.lower()
        
        # Extract customer ID if present
        customer_id_match = re.search(r'\b(\d{3,})\b', user_message)
        customer_id = int(customer_id_match.group(1)) if customer_id_match else None
        
        try:
            # Route to appropriate tool based on message content
            if customer_id and any(word in message_lower for word in ['kunde', 'mitglied', 'analysiere', 'churn', 'risiko']):
                # Individual customer analysis - find tool by name instead of index
                churn_tool = next((tool for tool in root_agent.tools if hasattr(tool, 'name') and 'churn_prediction' in tool.name), None)
                if churn_tool:
                    result = churn_tool(customer_id)
                else:
                    return "ERROR: Churn-Prediction-Tool nicht verfügbar"
                
                response = f"""## Churn-Analyse für Kunde {result['customer_id']}

**Kunde:** {result['customer_name']}
**Churn-Wahrscheinlichkeit:** {result.get('churn_score_bias_corrected', result.get('churn_probability', 0))}%
**Risiko-Kategorie:** {result['risk_category']}
**Jahresvertragswert:** €{result['contract_value_eur']}

### Empfehlungen:
"""
                for rec in result['recommendations']:
                    response += f"• {rec}\n"
                
                return response
                
            elif any(word in message_lower for word in ['hochrisiko', 'gefährdet', 'kritisch', 'liste', 'top']):
                # High-risk customer list - find tool by name instead of index
                limit = 20
                threshold = 0.7 if 'kritisch' in message_lower else 0.6
                
                risk_tool = next((tool for tool in root_agent.tools if hasattr(tool, 'name') and 'high_risk' in tool.name), None)
                if risk_tool:
                    result = risk_tool(limit, threshold)
                else:
                    return "ERROR: High-Risk-Customers-Tool nicht verfügbar"
                
                response = f"""## Hochrisikokunden ({result['summary']['total_customers']} Kunden)

**Durchschnittliches Churn-Risiko:** {result['summary'].get('average_churn_score_bias_corrected', result['summary'].get('average_churn_probability', 0))}%
**Gesamtes Umsatzrisiko:** €{result['summary']['total_financial_impact_eur']}

### Top Risiko-Kunden:
"""
                for customer in result['customers'][:10]:
                    response += f"• **{customer['name']}** ({customer.get('churn_score_bias_corrected', customer.get('churn_probability', 0))}%) - €{customer['contract_value_eur']}/Jahr\n"
                
                return response
                
            elif any(word in message_lower for word in ['inaktiv', 'neu', 'segment', 'gruppe']):
                # Segment analysis
                if 'inaktiv' in message_lower:
                    segment = 'inactive'
                elif 'neu' in message_lower:
                    segment = 'recent_joiners'
                else:
                    segment = 'high_risk'
                
                # Find query_churn_customers tool by name instead of index
                query_tool = next((tool for tool in root_agent.tools if hasattr(tool, 'name') and 'query' in tool.name.lower() and 'data' in tool.name.lower()), None)
                if query_tool:
                    result = query_tool(segment, 15)
                else:
                    return "ERROR: Query-Data-Tool nicht verfügbar"
                
                response = f"""## Segment-Analyse: {result['query_type']}

**Anzahl Kunden:** {result['customer_count']}

### Kunden im Segment:
"""
                for customer in result['customers']:
                    response += f"• {customer['vorname']} {customer['nachname']} (Risiko: {customer['churn_score']:.1%})\n"
                
                return response
                
            elif any(word in message_lower for word in ['plan', 'maßnahmen', 'retention', 'strategie', 'empfehlung']):
                # Retention plan
                segment = 'high_risk'
                if 'alle' in message_lower:
                    segment = 'all'
                elif 'mittel' in message_lower:
                    segment = 'medium_risk'
                
                # Find generate_retention_plan tool by name instead of index
                retention_tool = next((tool for tool in root_agent.tools if hasattr(tool, 'name') and 'retention' in tool.name.lower() and 'plan' in tool.name.lower()), None)
                if retention_tool:
                    result = retention_tool(segment)
                else:
                    return "ERROR: Retention-Plan-Tool nicht verfügbar"
                plan = result['retention_plan']
                
                response = f"""## Retention-Plan für {segment}

### Segment-Analyse:
• **Zielkunden:** {plan['segment_analysis']['total_customers']}
• **Durchschnittsrisiko:** {plan['segment_analysis']['average_churn_risk']}%
• **Kritische Fälle:** {plan['segment_analysis']['critical_risk_customers']}

### Finanzielle Auswirkung:
• **Potentieller Verlust:** €{plan['financial_impact']['estimated_annual_loss_eur']:,.0f}/Jahr
• **Mögliche Einsparungen:** €{plan['financial_impact']['potential_savings_eur']:,.0f}
• **ROI:** {plan['financial_impact']['estimated_roi_percentage']}%

### Aktionsplan:
"""
                for action in plan['action_plan']:
                    response += f"**{action['phase']}:** {action['action']}\n• {action['description']}\n• Timeline: {action['timeline']}\n\n"
                
                return response
                
            elif 'sql' in message_lower or 'select' in message_lower:
                # SQL query
                # Find execute_simple_sql tool by name instead of index
                sql_tool = next((tool for tool in root_agent.tools if hasattr(tool, 'name') and 'sql' in tool.name.lower()), None)
                if sql_tool:
                    result = sql_tool(user_message)
                else:
                    return "ERROR: SQL-Execution-Tool nicht verfügbar"
                
                response = f"""## SQL-Abfrage Ergebnis

**Zeilen:** {result['row_count']}

### Daten:
"""
                for row in result['data']:
                    response += f"• {json.dumps(row, ensure_ascii=False)}\n"
                
                return response
                
            else:
                # General help
                return f"""## Aciso Agent - Churn-Analyse

Ich kann Ihnen bei folgenden Aufgaben helfen:

**SEARCH: Einzelkunden-Analyse:**
• "Analysiere Kunde 12345"
• "Churn-Risiko für Mitglied 67890"

**CHART: Risiko-Listen:**
• "Zeige Hochrisikokunden"
• "Top 20 kritische Fälle"

**USERS: Segment-Analysen:**
• "Inaktive Kunden"
• "Neue Mitglieder"

**PLAN: Retention-Strategien:**
• "Erstelle Retention-Plan"
• "Maßnahmen für Hochrisikokunden"

**DATA: SQL-Abfragen:**
• "SELECT COUNT(*) FROM mitglieder"

**Ihre Anfrage:** "{user_message}"
**Vorschlag:** Probieren Sie eine der obigen Beispiele aus!
"""
                
        except Exception as e:
            return f"ERROR: Fehler bei der Verarbeitung: {str(e)}\n\nIhre Anfrage: {user_message}"
    
    @app.post("/run")
    async def run_agent(request: dict):
        # Simple agent endpoint
        
        try:
            user_message = request.get('new_message', {}).get('parts', [{}])[0].get('text', '')
            if not user_message:
                return {"error": "No message provided"}
            
            # Try to use the agent intelligently
            response_text = process_user_message(user_message)
            
            return {
                "message": {
                    "content": {
                        "parts": [{"text": response_text}]
                    }
                },
                "sessionId": request.get('session_id', 'default'),
                "role": "assistant"
            }
        except Exception as e:
            return {"error": f"Agent error: {str(e)}"}
    
    @app.post("/run_sse")
    async def run_agent_sse(request: dict):
        from fastapi.responses import StreamingResponse
        import json
        import asyncio
        
        try:
            user_message = request.get('new_message', {}).get('parts', [{}])[0].get('text', '')
            if not user_message:
                return {"error": "No message provided"}
            
            async def generate_sse():
                # Simple SSE response
                response_data = {
                    "id": f"msg-{int(time.time())}",
                    "content": {
                        "parts": [{
                            "text": f"Data Science Agent processed: {user_message}. This is a test response from the migrated agent."
                        }]
                    },
                    "role": "assistant"
                }
                
                yield f"data: {json.dumps(response_data)}\n\n"
                await asyncio.sleep(0.1)
                
                # Send completion signal
                completion_data = {"type": "stream_complete"}
                yield f"data: {json.dumps(completion_data)}\n\n"
            
            return StreamingResponse(
                generate_sse(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*"
                }
            )
        except Exception as e:
            return {"error": f"SSE Agent error: {str(e)}"}

if __name__ == "__main__":
    # Use port 8001 by default for agent, or override with PORT env var
    port = int(os.environ.get("PORT", 8001))
    print(f"Starting  agent server on port {port}...")
    
    # Run the FastAPI app with uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port)
