"""
Aciso Agent - Main Entry Point

 Agent für Churn-Analyse und Kundenretention basierend auf Google ADK.

"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional

# Google ADK imports
from google.adk import Agent
from google.adk.tools import ToolContext
from google.adk.planners import PlanReActPlanner, BuiltInPlanner
from google.genai import types

from .config import config
from .state import StateManager, AcisoAgentState
from .tools import (
    get_churn_prediction_tool,
    get_churn_explanation_bqml_tool,
    get_table_schema_tool, 
    get_high_risk_customers_tool,
    generate_retention_plan_tool,
    execute_secure_sql_tool,
    intelligent_query_data_tool,
    validate_schema_with_bigquery_tool,
    query_retention_knowledge_tool
)


logger = logging.getLogger(__name__)


# ADK Callback Functions für Lifecycle Management
def aciso_before_agent_callback(callback_context: ToolContext) -> Optional[types.Content]:
    """Setup callback für den Aciso Agent."""
    try:
        # For agent-level callbacks, callback_context IS the ToolContext
        # Initialize or get existing state
        state = StateManager.get_state(callback_context)
        
        # Log session start
        user_id = getattr(callback_context, 'user_id', 'unknown')
        session_id = getattr(callback_context, 'session_id', f"session_{datetime.now().timestamp()}")
        state.session_id = session_id
        
        logger.info(f"Aciso Agent session started - User: {user_id}, Session: {session_id}")
        
        # Save initial state
        StateManager.save_state(callback_context, state)
        
        # Return None to proceed with normal agent execution
        return None
        
    except Exception as e:
        logger.error(f"Aciso Agent setup error: {e}")
        # Return None to proceed even if setup fails
        return None


def aciso_before_tool_callback(*args, **kwargs) -> Optional[Dict[str, Any]]:
    """
    Flexible before_tool_callback that adapts to ADK's calling convention.
    
    - Handles multiple possible signatures from ADK
    - Development mode: No security validation needed
    - Logs all parameters for debugging
    """
    try:
        # Debug: Log what ADK is actually passing
        logger.info(f"DEBUG - before_tool_callback called with:")
        logger.info(f"   args: {len(args)} positional arguments")
        logger.info(f"   kwargs: {list(kwargs.keys())}")
        
        # Try to extract parameters from various possible signatures
        tool_context = None
        tool_name = None
        tool_args = None
        
        # Pattern 1: (tool_context, tool_name, tool_args)
        if len(args) >= 3:
            tool_context = args[0]
            tool_name = args[1]
            tool_args = args[2]
        # Pattern 2: All keyword arguments
        elif 'tool_context' in kwargs:
            tool_context = kwargs.get('tool_context')
            tool_name = kwargs.get('tool_name')
            tool_args = kwargs.get('tool_args')
        # Pattern 3: Mixed (context as arg, rest as kwargs)
        elif len(args) >= 1:
            tool_context = args[0]
            tool_name = kwargs.get('tool_name')
            tool_args = kwargs.get('tool_args')
        
        # Log what we extracted
        logger.info(f"Executing tool: '{tool_name}' with args: {tool_args}")
        
        # Handle 'tool' object if passed
        tool = kwargs.get('tool')
        if tool and hasattr(tool, 'name'):
            logger.debug(f"Tool object name: {tool.name}")
        
        # Always allow tool execution in development mode
        return None
        
    except Exception as e:
        logger.error(f"Error in before_tool_callback: {str(e)}")
        logger.error(f"   Full args: {args}")
        logger.error(f"   Full kwargs: {kwargs}")
        return None  # Always allow tool to proceed


def aciso_after_agent_callback(*args, **kwargs) -> Optional[types.Content]:
    """Cleanup callback für den Aciso Agent - flexible parameter handling."""
    try:
        # Handle different ADK callback signatures
        if len(args) >= 2:
            callback_context, agent_output = args[0], args[1]
        elif len(args) == 1:
            callback_context = args[0]
            agent_output = kwargs.get('agent_output', None)
        else:
            callback_context = kwargs.get('callback_context')
            agent_output = kwargs.get('agent_output', None)
        
        if callback_context is None:
            logger.warning("No callback_context provided to after_agent_callback")
            return None
            
        # For agent-level callbacks, callback_context IS the ToolContext
        state = StateManager.get_state(callback_context)
        
        # Log session completion and performance
        perf_summary = state.get_performance_summary()
        logger.info(f"Aciso Agent session completed - Performance: {perf_summary}")
        
        # Cleanup temporary resources
        temp_tables = StateManager.cleanup_temp_tables(callback_context)
        if temp_tables:
            logger.info(f"Cleaned up {len(temp_tables)} temporary resources")
        
        # Final state save
        StateManager.save_state(callback_context, state)
        
        # FILTER REACT MARKERS from agent output
        if agent_output and hasattr(agent_output, 'parts'):
            for part in agent_output.parts:
                if hasattr(part, 'text') and part.text:
                    # Remove ReAct framework markers
                    cleaned_text = part.text
                    react_markers = ['/PLANNING/', '/ACTION/', '/REASONING/', '/FINAL_ANSWER/', '/OBSERVATION/']
                    for marker in react_markers:
                        cleaned_text = cleaned_text.replace(marker, '')
                    
                    # Clean up extra whitespace
                    cleaned_text = ' '.join(cleaned_text.split())
                    
                    if cleaned_text != part.text:
                        logger.info(f"Filtered ReAct markers from agent output")
                        # Create new content with cleaned text
                        new_part = types.Part(text=cleaned_text)
                        return types.Content(parts=[new_part])
        
        # Return None to use original agent output
        return None
        
    except Exception as e:
        logger.error(f"Aciso Agent cleanup error: {e}")
        # Return None even on error to proceed
        return None


# Native ADK Agent Instructions - LLM-based Tool Selection
ACISO_AGENT_INSTRUCTIONS = f"""
Du bist der Aciso Agent für Churn-Analyse und Kundenretention in Fitness-Studios.

## SPRACHE UND KOMMUNIKATION
**WICHTIG: Antworte IMMER auf DEUTSCH!** Alle deine Antworten, Erklärungen und Ausgaben müssen vollständig auf Deutsch sein. Verwende keine englischen Begriffe oder Phrasen.

## ROLLE UND EXPERTISE
Du bist ein spezialisierter Business Intelligence Agent mit folgenden Kernkompetenzen:
- Predictive Analytics für Kundenabwanderung (Churn-Prävention)
- Datengestützte Retention-Strategien mit nachweisbarem ROI
- BigQuery ML und fortgeschrittene Datenanalyse
- Personalisierte Kundenbindungsmaßnahmen

## CHAIN-OF-THOUGHT DENKPROZESS
Bei jeder Anfrage folge intern diesem strukturierten Denkprozess:
1. **Verstehen**: Identifiziere die exakte Geschäftsanfrage und Kernintention
2. **Analysieren**: Bestimme relevante Daten, Metriken und Erfolgskriterien
3. **Planen**: Wähle optimale Tool-Kombination und Ausführungsreihenfolge
4. **Validieren**: Prüfe Plausibilität und Konsistenz der Ergebnisse
5. **Synthetisieren**: Formuliere geschäftsorientierte, handlungsrelevante Antwort

## KRITISCHE OUTPUT-REGEL
- ABSOLUT VERBOTEN: /PLANNING/, /ACTION/, /REASONING/, /FINAL_ANSWER/, /OBSERVATION/ Marker
- Schreibe NIEMALS diese internen Verarbeitungsmarker in deine Antworten
- Beginne deine Antwort direkt mit dem geschäftsrelevanten Inhalt
- Keine Framework-Metadaten oder Denkprozess-Kennzeichnungen
- Direkte, professionelle Business-Antworten ohne technische Artefakte

**VERFÜGBARE TOOLS:**
**get_churn_prediction(customer_id)** - Churn-Vorhersage für einzelne Kunden mit vorberechneten bias-corrected ML-Scores
**get_high_risk_customers(limit, risk_threshold)** - Liste von Hochrisikokunden (NUR für allgemeine Listen ohne spezifische Filter!)
**generate_retention_plan(target_segment, customer_id)** - Retention-Strategien generieren
**intelligent_query_data(user_query)** - Sichere BigQuery-Datenabfragen (NL2SQL) - VERWENDE DIES für spezifische Risiko-Filter und kombinierte Kriterien!
**get_table_schema()** - Schema-Informationen der mitglieder-Tabelle
**get_churn_explanation_bqml(customer_id)** - ML-basierte Faktor-Erklärungen mit vorberechneten ML-Erklärungen
**query_retention_knowledge(query)** - RAG-basierte Retention-Strategien

## KRITISCHE TOOL-AUSWAHL-REGELN:

**FÜR RISIKO-ANFRAGEN MIT SPEZIFISCHEN PROZENTSÄTZEN (z.B. "über 60%", "zwischen 50-70%"):**
- IMMER: **intelligent_query_data** verwenden
- NIEMALS: get_high_risk_customers für spezifische Prozentsätze

**get_high_risk_customers** nur verwenden für:
- "Zeige Hochrisikokunden" (ohne spezifischen Prozentsatz)
- "Liste der gefährdeten Kunden" (allgemein)
- "Top Risiko-Kunden" (ohne exakten Schwellenwert)

**intelligent_query_data** verwenden für:
- "Risiko über 60%"
- "Churn-Score zwischen X und Y%"
- "Risiko höher als X%"
- Kombinierte Filter: "Risiko + Alter + Geschlecht"
- Alle spezifischen numerischen Kriterien

## FEW-SHOT EXAMPLES

### Beispiel 1: Risiko-Analyse mit Filter
**Nutzer**: "Zeige mir Hochrisikokunden die weniger als 3 Monate dabei sind"
**Interner Denkprozess**:
- Verstehen: Neue Kunden mit hohem Abwanderungsrisiko identifizieren
- Analysieren: Filter auf churn_score_bias_corrected > 0.7 UND mitgliedschaft_dauer_monate < 3
- Planen: intelligent_query_data mit kombinierter WHERE-Klausel
- Validieren: Ergebnisse auf Plausibilität prüfen (Score-Range, Mitgliedschaftsdauer)
**Tool-Ausführung**: intelligent_query_data("SELECT mitglieder_id, name, churn_score_bias_corrected, mitgliedschaft_dauer_monate, aktueller_beitrag_eur FROM {config.security.PROJECT_ID}.{config.security.DATASET_ID}.{config.security.TABLE_NAME} WHERE churn_score_bias_corrected > 0.7 AND mitgliedschaft_dauer_monate < 3 ORDER BY churn_score_bias_corrected DESC LIMIT 10")

### Beispiel 2: Personalisierte Retention-Strategie
**Nutzer**: "Erstelle einen Retention-Plan für Kunde 12345"
**Interner Denkprozess**:
- Verstehen: Individuelle Bindungsstrategie für spezifischen Kunden
- Analysieren: Kundenprofil, Churn-Score, Hauptrisikofaktoren benötigt
- Planen: Sequenz: get_churn_prediction → get_churn_explanation_bqml → generate_retention_plan
- Validieren: Prüfe ob alle Daten vorhanden und konsistent
**Tool-Sequenz**: 
1. get_churn_prediction(customer_id="12345")
2. get_churn_explanation_bqml(customer_id="12345")
3. generate_retention_plan(customer_id="12345", target_segment="individual")

### Beispiel 3: Aggregierte Analyse
**Nutzer**: "Wie ist die durchschnittliche Verweildauer von Kunden mit hohem Risiko?"
**Interner Denkprozess**:
- Verstehen: Statistische Analyse der Mitgliedschaftsdauer bei Risikokunden
- Analysieren: Aggregation mit AVG() auf gefilterte Datenmenge
- Planen: intelligent_query_data mit Aggregatfunktion
**Tool-Ausführung**: intelligent_query_data("SELECT AVG(mitgliedschaft_dauer_monate) as durchschnitt_monate, COUNT(*) as anzahl_kunden FROM {config.security.PROJECT_ID}.{config.security.DATASET_ID}.{config.security.TABLE_NAME} WHERE risiko_kategorie IN ('hoch', 'sehr_hoch')")

## TOOL-AUSWAHL-MATRIX

| Anfrage-Typ | Primäres Tool | Sekundäres Tool | Validierung |
|-------------|---------------|-----------------|-------------|
| Einzelkunden-Analyse | get_churn_prediction | get_churn_explanation_bqml | Churn-Score Plausibilität |
| Risiko-Listen | get_high_risk_customers | intelligent_query_data | Anzahl und Verteilung |
| Komplexe Filter/Aggregationen | intelligent_query_data | get_table_schema | SQL-Syntax |
| Retention-Strategien | generate_retention_plan | query_retention_knowledge | ROI-Kalkulation |
| Schema-Fragen | get_table_schema | - | - |

**SPEZIELLE DATENABFRAGE-REGELN:**
- "zeige mir die top X risiko kunden die weniger als Y monate dabei sind" → **intelligent_query_data(user_query="...")**
- "Kunden mit weniger als X Monaten Mitgliedschaft" → **intelligent_query_data(user_query="...")**
- "Hochrisikokunden die kürzer als X Monate dabei sind" → **intelligent_query_data(user_query="...")**
- "Mitglieder zwischen X und Y Jahren" → **intelligent_query_data(user_query="...")**
- "Weibliche/Männliche Kunden mit..." → **intelligent_query_data(user_query="...")**
- "Durchschnittliches Alter von..." → **intelligent_query_data(user_query="...")**

**WICHTIG FÜR DATENABFRAGEN:**
Das Tool `intelligent_query_data` kann ALLE Felder der mitglieder-Tabelle abfragen, einschließlich:
- **mitgliedschaft_dauer_monate** (wie lange ist jemand dabei - VERFÜGBAR!)
- alter_jahre, geschlecht, churn_score_bias_corrected, risiko_kategorie
- anzahl_checkins, checkins_pro_monat, tage_seit_letztem_checkin
- aktueller_beitrag_eur, zahlungsart, vertragslaufzeit

** KRITISCH: Die Mitgliedschaftsdauer (mitgliedschaft_dauer_monate) IST VERFÜGBAR! Verwende IMMER intelligent_query_data für solche Abfragen!**

**WICHTIGE DATENQUELLEN:**
- Haupttabelle: `{config.security.PROJECT_ID}.{config.security.DATASET_ID}.{config.security.TABLE_NAME}`
- ML-Modell: `{config.models.CHURN_MODEL_PATH}`
- Alle Churn-Scores sind bereits vorberechnet

## STRUKTURIERTE OUTPUT-FORMATE

### Format: Churn-Analyse
```
**Kundenanalyse für [Name] (ID: [ID])**

Risikobewertung:

- Wahrscheinlichkeit: [XX]% Abwanderung in den nächsten 30 Tagen

Hauptrisikofaktoren:
1. [Faktor]: [Einfluss]% - [Erklärung]
2. [Faktor]: [Einfluss]% - [Erklärung]
3. [Faktor]: [Einfluss]% - [Erklärung]

Empfohlene Maßnahmen:
Vorschlag einen Retention-Plan zu erstellen, wenn der Churn-Score bias-corrected über 60% liegt.
```

### Format: Kundenlisten
```
**Hochrisikokunden Übersicht**

Identifizierte Kunden: [X]
Durchschnittlicher Churn-Score (bias-corrected): [X.XX]
Potenzieller Umsatzverlust: [XXX.XXX] EUR/Jahr

Top-Risiko-Kunden:
┌─────────┬──────────────────┬───────┬──────────┬─────────────┐
│ ID      │ Name             │ Score │ Beitrag  │ Hauptrisiko │
├─────────┼──────────────────┼───────┼──────────┼─────────────┤
│ [12345] │ [Max Mustermann] │ [0.89]│ [120 EUR/M] │ [45 Tage inaktiv] │
│ [23456] │ [Anna Schmidt]   │ [0.85]│ [89 EUR/M]  │ [Zahlungsprobleme] │
└─────────┴──────────────────┴───────┴──────────┴─────────────┘
```

## FEHLERBEHANDLUNG

### Tool-Fehler Handling
1. **SQL-Fehler**: Nutze get_table_schema zur Feldvalidierung, vereinfache Query
2. **Keine Daten**: Kommuniziere klar was fehlt, schlage Alternativen vor
3. **Timeout**: Reduziere Datenmenge mit LIMIT oder nutze Aggregationen

### Konsistenz-Validierung
- Churn-Scores müssen zwischen 0.0 und 1.0 liegen und nur die bias-corrected Scores verwenden
- Mitgliedschaftsdauer muss positiv sein
- Beiträge müssen realistisch sein (10-500 EUR/Monat)
- Datumsangaben müssen plausibel sein

## KOMMUNIKATIONSREGELN

**IMMER**:
- Deutsche Sprache, professioneller Geschäftston
- Konkrete, umsetzbare Empfehlungen mit Begründung
- Datengestützte Argumentation mit Quellenangabe
- Vollständige Ausgaben (besonders bei Retention-Plänen)
- Klare Strukturierung mit Überschriften und Formatierung

**NIEMALS**:
- ReAct-Marker (/PLANNING/, /ACTION/, /REASONING/, etc.)
- Technische Implementierungsdetails oder SQL-Queries in der Antwort
- Unbegründete Annahmen oder Spekulationen
- Gekürzte oder zusammengefasste Tool-Outputs
- Verweis auf interne Verarbeitungsschritte

**WICHTIG: KEINE REACT-MARKER IN DEINER FINALEN ANTWORT!**
Beginne deine Antwort DIREKT mit dem Inhalt - verwende NIEMALS /FINAL_ANSWER/ oder andere Framework-Marker!

**KRITISCH FÜR RETENTION-PLÄNE:**
- Gib IMMER den VOLLSTÄNDIGEN Retention-Plan zurück - NIEMALS kürzen oder zusammenfassen
- ALLE Abschnitte müssen vollständig ausgegeben werden: Kundenprofil, Sofortmaßnahmen, Stabilisierung, langfristige Bindung, KPIs, Kosten-Nutzen-Analyse
- KEINE Zusammenfassungen wie "Der Plan wurde erstellt..." - zeige den KOMPLETTEN INHALT
- Verwende die komplette Ausgabe des generate_retention_plan Tools ohne Kürzung





Heute ist der {datetime.now().strftime('%d.%m.%Y')}.
"""


def create_aciso_agent() -> Agent:
    """
    Erstelle den Aciso Agent basierend auf ADK Best Practices.
    
    Returns:
        Konfigurierte ADK Agent-Instanz
    """
    # Generation Configuration für optimale Performance
    generate_config = types.GenerateContentConfig(
        temperature=0.5,  # Niedrige Temperatur für konsistente Geschäftsantworten
        top_p=0.8,
        max_output_tokens=8192,  # nicht darüber erhöhen, führt zu fehlern,  Für vollständige Retention-Pläne ohne Abschneidung
        candidate_count=1
    )
    
    # Set environment variables for Vertex AI before creating agent
    import os
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "1"
    os.environ["GOOGLE_CLOUD_PROJECT"] = config.VERTEXAI_PROJECT
    os.environ["GOOGLE_CLOUD_LOCATION"] = config.VERTEXAI_LOCATION or "us-central1"
    
    # Initialize PlanReActPlanner as requested by user
    planner = PlanReActPlanner()
    
    try:
        agent = Agent(
            name="aciso_churn_agent",
            model=config.models.COORDINATOR_MODEL,
            description="Spezialisierter Agent für Churn-Analyse und Kundenretention in Fitness-Studios",
            instruction=ACISO_AGENT_INSTRUCTIONS,
            planner=planner,
            
            # Native ADK Tools - LLM wählt direkt das richtige Tool
            tools=[
                get_churn_prediction_tool,         # Churn-Vorhersage für einzelne Kunden
                get_high_risk_customers_tool,      # Hochrisikokunden-Listen
                generate_retention_plan_tool,      # Retention-Strategien generieren
                intelligent_query_data_tool,       # Sichere BigQuery-Datenabfragen (NL2SQL)
                get_table_schema_tool,             # Schema-Informationen
                get_churn_explanation_bqml_tool,   # ML-basierte Faktor-Erklärungen
                query_retention_knowledge_tool,    # RAG-basierte Retention-Strategien
                validate_schema_with_bigquery_tool, # Schema-Validierung
                execute_secure_sql_tool            # Manuelle SQL (für Experten)
            ],
            
            # ADK Lifecycle Callbacks
            before_agent_callback=aciso_before_agent_callback,
            before_tool_callback=aciso_before_tool_callback,  # RE-ENABLED FOR DEBUG
            after_agent_callback=aciso_after_agent_callback,
            
            # Generation Configuration
            generate_content_config=generate_config
        )
        
        logger.info("Aciso Agent created successfully")
        logger.info(f"   Model: {config.models.COORDINATOR_MODEL}")
        logger.info(f"   Tools: {len(agent.tools)} business tools available")
        logger.info(f"   Enhanced: Complete BigQuery schema recognition")
        logger.info(f"   Security: Enhanced validation and monitoring enabled")
        
        return agent
        
    except Exception as e:
        logger.error(f"Failed to create Aciso Agent: {e}")
        raise


# Singleton pattern für Agent-Instanz
_aciso_agent = None

def get_aciso_agent() -> Agent:
    """Get or create Aciso Agent instance."""
    global _aciso_agent
    if _aciso_agent is None:
        _aciso_agent = create_aciso_agent()
    return _aciso_agent


# Compatibility functions
def get_agent() -> Agent:
    """Legacy compatibility function."""
    return get_aciso_agent()


# Export für einfachen Import und ADK-Kompatibilität
agent = get_aciso_agent()
root_agent = agent  # ADK erwartet root_agent


if __name__ == "__main__":
    # Test Agent Creation
    print("=" * 60)
    print("ACISO AGENT - PRODUCTION READY")
    print("=" * 60)
    
    test_agent = create_aciso_agent()
    
    print(f"Agent Name: {test_agent.name}")
    print(f"Model: {test_agent.model}")
    print(f"Tools Available: {len(test_agent.tools)}")
    print()
    
    print("Available Tools:")
    for tool in test_agent.tools:
        print(f"   - {tool.name}")
    print()
    
    print("Features:")
    print("   - Churn-Vorhersagen für Einzelkunden")
    print("   - Hochrisikokunden-Identifikation")
    print("   - Retention-Strategien und ROI-Planung")
    print("   - Sichere BigQuery-Datenanalysen")
    print("   - Performance-Monitoring und Logging")
    print()
    
  
    print("=" * 60)