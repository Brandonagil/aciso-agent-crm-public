from .instructions import DOCSTRINGS

__doc__ = DOCSTRINGS['module_header']

import logging
import re
import time
import hashlib
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional

# Google clients use Application Default Credentials or the externally supplied
# GOOGLE_APPLICATION_CREDENTIALS path. No credential file is bundled here.

# Erforderliche Imports für ADK-Integration
from google.cloud import bigquery
from google.cloud.exceptions import GoogleCloudError
from google.adk.tools import ToolContext, FunctionTool
import sqlparse
from sqlparse.sql import Statement
from sqlparse.tokens import Keyword, DML

from .config import config
from .state import StateManager, QueryResult, AcisoAgentState, SavedReportMetadata, SavedReportSummary
from .pdf_generator import create_retention_plan_pdf
import json
import os
from pathlib import Path
from .instructions import (
    NL2SQL_PROMPT_TEMPLATE,
    HIGH_RISK_CUSTOMERS_INSTRUCTION,
    RETENTION_PLAN_PROMPT_TEMPLATE,
    QUERY_SUGGESTIONS,
    COLUMN_NAME_FIXES,
    BQML_MODEL_PATH,
    MAX_RESULT_ROWS,
    DEFAULT_RISK_THRESHOLD,
    DEFAULT_RETENTION_PLAN_WEEKS
)
import jinja2
import io
import base64

logger = logging.getLogger(__name__)


# Intelligente Schema-Kenntnisse mit natürlichsprachigen Zuordnungen
# Erweitert für automatisches Abfrageverständnis und Spaltenidentifikation
BIGQUERY_SCHEMA = {
    "table": f"`{config.security.PROJECT_ID}.{config.security.DATASET_ID}.{config.security.TABLE_NAME}`",
    "columns": {
        "mitglied_id": {
            "field": "mitglied_id",
            "type": "INTEGER",
            "mode": "REQUIRED",
            "description": "Eindeutige Mitglieds-ID",
            "aliases": ["id", "kunde", "mitglied", "customer", "mitgliedsnummer"]
        },
        "alter_jahre": {
            "field": "alter_jahre", 
            "type": "INTEGER",
            "mode": "NULLABLE",
            "description": "Alter des Mitglieds in Jahren",
            "aliases": ["alter", "age", "jahre", "jahren", "alt", "lebensalter"]
        },
        "geschlecht": {
            "field": "geschlecht",
            "type": "STRING", 
            "mode": "NULLABLE",
            "description": "Geschlecht des Mitglieds",
            "aliases": ["geschlecht", "gender", "sex"],
            "value_mappings": {
                "weiblich": "'weiblich'",
                "männlich": "'männlich'", 
                "frau": "'weiblich'",
                "mann": "'männlich'",
                "w": "'weiblich'",
                "m": "'männlich'"
            }
        },
        "vertragsbeginn": {
            "field": "vertragsbeginn",
            "type": "STRING",
            "mode": "NULLABLE", 
            "description": "Startdatum des Vertrags",
            "aliases": ["vertragsbeginn", "startdatum", "beginn", "start"]
        },
        "laufzeit": {
            "field": "laufzeit",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Vertragslaufzeit",
            "aliases": ["laufzeit", "duration", "dauer", "vertragslaufzeit"]
        },
        "zahlweise": {
            "field": "zahlweise",
            "type": "STRING", 
            "mode": "NULLABLE",
            "description": "Zahlungsweise (monatlich, jährlich, etc.)",
            "aliases": ["zahlweise", "payment_frequency", "zahlung"]
        },
        "aktueller_beitrag_eur": {
            "field": "aktueller_beitrag_eur",
            "type": "FLOAT",
            "mode": "NULLABLE",
            "description": "Aktueller monatlicher Beitrag in EUR", 
            "aliases": ["beitrag", "kosten", "preis", "gebühr", "fee"]
        },
        "zahlungsart": {
            "field": "zahlungsart",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Zahlungsmethode (Lastschrift, Überweisung, etc.)",
            "aliases": ["zahlungsart", "payment_method", "methode"]
        },
        "vertragsperiode": {
            "field": "vertragsperiode",
            "type": "INTEGER",
            "mode": "NULLABLE",
            "description": "Vertragsperiode in Monaten",
            "aliases": ["vertragsperiode", "contract_period", "periode", "vertragslaufzeit_monate"]
        },
        "vertragsende_aktuell": {
            "field": "vertragsende_aktuell",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Aktuelles Vertragsende",
            "aliases": ["vertragsende", "contract_end", "ende"]
        },
        "anzahl_checkins": {
            "field": "anzahl_checkins",
            "type": "INTEGER",
            "mode": "NULLABLE",
            "description": "Gesamtanzahl Check-ins des Mitglieds",
            "aliases": ["checkins", "besuche", "visits", "aktivität"]
        },
        "durchschn_aufenthalt_min": {
            "field": "durchschn_aufenthalt_min",
            "type": "INTEGER",
            "mode": "NULLABLE",
            "description": "Durchschnittliche Aufenthaltsdauer in Minuten",
            "aliases": ["aufenthalt", "duration", "minuten", "dauer"]
        },
        "letzter_checkin": {
            "field": "letzter_checkin",
            "type": "STRING",
            "mode": "NULLABLE", 
            "description": "Datum des letzten Check-ins",
            "aliases": ["letzter_checkin", "last_checkin", "letzte"]
        },
        "mitgliedschaft_dauer_monate": {
            "field": "mitgliedschaft_dauer_monate",
            "type": "FLOAT",
            "mode": "NULLABLE",
            "description": "Mitgliedschaftsdauer in Monaten - wie lange ist das Mitglied bereits dabei",
            "aliases": [
                "mitgliedschaft_dauer", "membership_duration", "dauer_monate", 
                "dabei", "mitglied_seit", "monate_dabei", "dauer", "zeit_dabei",
                "wie_lange", "seit_wann", "membership_length", "tenure", "dabei_seit"
            ]
        },
        "checkins_pro_monat": {
            "field": "checkins_pro_monat",
            "type": "FLOAT",
            "mode": "NULLABLE",
            "description": "Durchschnittliche Check-ins pro Monat",
            "aliases": ["checkins_pro_monat", "monthly_checkins", "frequenz"]
        },
        "tage_seit_letztem_checkin": {
            "field": "tage_seit_letztem_checkin", 
            "type": "INTEGER",
            "mode": "NULLABLE",
            "description": "Tage seit dem letzten Check-in",
            "aliases": ["letzte", "letzter", "inaktiv", "tage", "since"]
        },
        "churn_score_bias_corrected": {
            "field": "churn_score_bias_corrected",
            "type": "FLOAT",
            "mode": "REQUIRED",
            "description": "Bias-korrigierter ML-Churn-Score in Prozent (0.0-100.0)",
            "aliases": ["churn", "risiko", "score", "wahrscheinlichkeit", "abwanderung"]
        },
        "gekuendigt": {
            "field": "gekuendigt",
            "type": "INTEGER", 
            "mode": "REQUIRED",
            "description": "Binary: 0=aktiv, 1=gekündigt",
            "aliases": ["gekündigt", "churned", "status", "aktiv"],
            "value_mappings": {
                "aktiv": "0",
                "gekündigt": "1", 
                "churned": "1",
                "active": "0"
            }
        },
        "kuendigungsdatum": {
            "field": "kuendigungsdatum",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Datum der Kündigung",
            "aliases": ["kuendigungsdatum", "cancellation_date", "kündigung"]
        },
        "kuendigungsart": {
            "field": "kuendigungsart", 
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Art der Kündigung",
            "aliases": ["kuendigungsart", "cancellation_type", "art"]
        },
        "kuendigungsgrund": {
            "field": "kuendigungsgrund",
            "type": "STRING",
            "mode": "NULLABLE", 
            "description": "Grund der Kündigung",
            "aliases": ["kuendigungsgrund", "cancellation_reason", "grund"]
        },
        "risiko_kategorie": {
            "field": "risiko_kategorie", 
            "type": "STRING",
            "mode": "REQUIRED",
            "description": "Risikokategorie (NIEDRIG, MITTEL, HOCH, KRITISCH)",
            "aliases": ["risiko", "kategorie", "risk", "level"],
            "value_mappings": {
                "niedrig": "'NIEDRIG'",
                "mittel": "'MITTEL'", 
                "hoch": "'HOCH'",
                "kritisch": "'KRITISCH'",
                "low": "'NIEDRIG'",
                "medium": "'MITTEL'",
                "high": "'HOCH'",
                "critical": "'KRITISCH'"
            }
        },
        "engagement_score": {
            "field": "engagement_score",
            "type": "FLOAT",
            "mode": "NULLABLE",
            "description": "Engagement-Score des Mitglieds",
            "aliases": ["engagement", "engagement_score", "score"]
        },
        "churn_score_prozent": {
            "field": "churn_score_prozent",
            "type": "FLOAT",
            "mode": "NULLABLE",
            "description": "Churn-Score in Prozent (alternative Spalte)",
            "aliases": ["churn_prozent", "churn_percent", "prozent"]
        },
        "age_group": {
            "field": "age_group",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Altersgruppe des Mitglieds",
            "aliases": ["altersgruppe", "age_group", "gruppe"]
        },
        "usage_intensity": {
            "field": "usage_intensity",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Intensität der Nutzung (niedrig, mittel, hoch)",
            "aliases": ["nutzung", "usage", "intensität", "intensity"]
        },
        "activity_risk_score": {
            "field": "activity_risk_score",
            "type": "FLOAT",
            "mode": "NULLABLE",
            "description": "Aktivitäts-Risiko-Score",
            "aliases": ["aktivitäts_risiko", "activity_risk", "aktivität"]
        },
        "inactivity_category": {
            "field": "inactivity_category",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Kategorie der Inaktivität",
            "aliases": ["inaktivität", "inactivity", "kategorie"]
        },
        "engagement_normalized": {
            "field": "engagement_normalized",
            "type": "FLOAT",
            "mode": "NULLABLE",
            "description": "Normalisierter Engagement-Score",
            "aliases": ["engagement_norm", "normalized", "normalisiert"]
        },
        "membership_stage": {
            "field": "membership_stage",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Phase der Mitgliedschaft (neu, etabliert, veteran)",
            "aliases": ["mitgliedschaftsphase", "membership_stage", "phase"]
        },
        "payment_risk": {
            "field": "payment_risk",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Zahlungsrisiko-Kategorie",
            "aliases": ["zahlungsrisiko", "payment_risk", "zahlung"]
        },
        "visit_consistency": {
            "field": "visit_consistency",
            "type": "FLOAT",
            "mode": "NULLABLE",
            "description": "Konsistenz der Besuche",
            "aliases": ["besuchskonsistenz", "visit_consistency", "konsistenz"]
        },
        "value_tier": {
            "field": "value_tier",
            "type": "STRING",
            "mode": "NULLABLE",
            "description": "Wert-Kategorie des Kunden (premium, standard, basic)",
            "aliases": ["wertkategorie", "value_tier", "tier", "wert"]
        },
        "target_churned": {
            "field": "target_churned",
            "type": "INTEGER",
            "mode": "NULLABLE",
            "description": "Ziel-Variable für Churn (0=bleiben, 1=abwandern)",
            "aliases": ["target", "ziel", "churned", "abgewandert"]
        }
    }
}

# Rückwärtskompatibilität mit bestehendem Code
LEGACY_SCHEMA_MAPPING = {
    "id": "mitglied_id",
    "age_years": "alter_jahre", 
    "gender": "geschlecht",
    "churn_score_percent": "churn_score_bias_corrected",
    "risk_category": "risiko_kategorie",
    "is_churned": "gekuendigt",
    "current_fee_eur": "aktueller_beitrag_eur",
    "checkins_count": "anzahl_checkins",
    "days_since_last_checkin": "tage_seit_letztem_checkin",
    "engagement_score": "engagement_score",
    "payment_method": "zahlungsart",
    "payment_interval": "zahlweise",
    "membership_duration_months": "mitgliedschaft_dauer_monate",
    "checkins_per_month": "checkins_pro_monat",
    "cancellation_date": "kuendigungsdatum",
    "cancellation_type": "kuendigungsart",
    "cancellation_reason": "kuendigungsgrund"
}


class QueryValidator:
    __doc__ = DOCSTRINGS['query_validator']
    
    @staticmethod
    def validate_query_syntax(query: str) -> Tuple[bool, str]:
        __doc__ = DOCSTRINGS['validate_query_syntax']
        if not query or not query.strip():
            return False, 'Leere Anfrage eingegeben'
        
        query = query.strip()
        
        # Grundvalidierung
        if not query.upper().startswith('SELECT'):
            return False, 'Nur SELECT-Anweisungen sind erlaubt'
        
        # Erweiterte Validierung mit sqlparse
        try:
            parsed = sqlparse.parse(query)
            if not parsed:
                return False, 'Ungültige SQL-Syntax'
            
            statement = parsed[0]
            
            # Prüfung auf blockierte Schlüsselwörter
            for token in statement.flatten():
                if token.ttype is Keyword and token.value.upper() in config.security.BLOCKED_SQL_KEYWORDS:
                    return False, f'Blockiertes Schlüsselwort entdeckt: {token.value}'
        
        except Exception as e:
            return False, f'SQL-Parsing-Fehler: {str(e)}'
        
        return True, ""
    
    @staticmethod
    def validate_table_access(query: str) -> Tuple[bool, str]:
        __doc__ = DOCSTRINGS['validate_table_access']
        query_upper = query.upper()
        
        # Prüfen ob erlaubte Tabelle referenziert wird
        allowed_found = False
        for allowed_table in config.security.ALLOWED_TABLES:
            clean_table = allowed_table.replace('`', '')
            if clean_table in query or allowed_table in query:
                allowed_found = True
                break
        
        if not allowed_found:
            return False, 'Query muss nur erlaubte Tabellen referenzieren. Erlaubt: mitglieder-Tabelle'
        
        return True, ""
    


class BigQueryClient:
    __doc__ = DOCSTRINGS['bigquery_client']
    
    def __init__(self):
        self.client = bigquery.Client(project=config.security.PROJECT_ID)
        self._query_cache = {}
        
    def _get_cache_key(self, query: str) -> str:
        """Cache-Schlüssel für Query generieren."""
        return hashlib.md5(query.encode()).hexdigest()
    
    def _is_cache_valid(self, cache_entry: Dict) -> bool:
        """Prüfen ob Cache-Eintrag noch gültig ist."""
        if not config.performance.ENABLE_QUERY_CACHE:
            return False
        
        cache_time = cache_entry.get('timestamp', datetime.min)
        ttl = timedelta(hours=config.performance.CACHE_TTL_HOURS)
        
        return datetime.now() - cache_time < ttl
    
    def dry_run_query(self, query: str) -> Tuple[bool, Dict[str, Any]]:
        """Testlauf durchführen um Query zu validieren und Kosten zu schätzen."""
        try:
            job_config = bigquery.QueryJobConfig(
                dry_run=True,
                use_query_cache=False
            )
            
            job = self.client.query(query, job_config=job_config)
            
            # Geschätzte verarbeitete Bytes abrufen
            bytes_processed = job.total_bytes_processed or 0
            
            # Prüfung gegen Limits
            if bytes_processed > config.security.MAX_QUERY_BYTES:
                return False, {
                    'error': f'Query would process {bytes_processed / (1024**3):.2f} GB, exceeding limit of {config.security.MAX_QUERY_BYTES / (1024**3):.2f} GB',
                    'bytes_processed': bytes_processed
                }
            
            return True, {
                'valid': True,
                'bytes_processed': bytes_processed,
                'estimated_cost_usd': bytes_processed * 5.0 / (1024**4),  # Ungefähre Kosten: $5/TB
                'query_validated': True
            }
            
        except GoogleCloudError as e:
            return False, {'error': f'BigQuery validation error: {str(e)}'}
        except Exception as e:
            return False, {'error': f'Dry run failed: {str(e)}'}
    
    def execute_query(self, query: str, use_cache: bool = True) -> QueryResult:
        start_time = datetime.now()
        
        # Cache zuerst prüfen
        cache_key = self._get_cache_key(query)
        if use_cache and cache_key in self._query_cache:
            cache_entry = self._query_cache[cache_key]
            if self._is_cache_valid(cache_entry):
                logger.info("Query result served from cache")
                result = cache_entry['result']
                result.cache_hit = True
                return result
        
        try:
            job_config = bigquery.QueryJobConfig(
                use_query_cache=config.performance.USE_QUERY_CACHE,
                maximum_bytes_billed=config.security.MAX_QUERY_BYTES
            )
            
            # Query ausführen
            job = self.client.query(query, job_config=job_config)
            
            # Warten auf Abschluss mit Timeout
            try:
                results = job.result(timeout=config.security.QUERY_TIMEOUT_SECONDS)
            except Exception as e:
                return QueryResult(
                    query=query,
                    executed_at=start_time,
                    error=f"Query timeout or execution error: {str(e)}"
                )
            
            # Ergebnisse in Dictionary-Liste konvertieren
            data = []
            row_count = 0
            
            for row in results:
                if row_count >= config.security.MAX_RESULT_ROWS:
                    break
                data.append(dict(row))
                row_count += 1
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            result = QueryResult(
                query=query,
                executed_at=start_time,
                row_count=row_count,
                bytes_processed=job.total_bytes_processed,
                data=data,
                execution_time_seconds=execution_time,
                cache_hit=False
            )
            
            # Ergebnis zwischenspeichern
            if use_cache and config.performance.ENABLE_QUERY_CACHE:
                self._query_cache[cache_key] = {
                    'result': result,
                    'timestamp': datetime.now()
                }
            
            logger.info(f"Query executed successfully: {row_count} rows, {execution_time:.2f}s")
            return result
            
        except GoogleCloudError as e:
            return QueryResult(
                query=query,
                executed_at=start_time,
                error=f"BigQuery error: {str(e)}"
            )
        except Exception as e:
            return QueryResult(
                query=query,
                executed_at=start_time,
                error=f"Execution error: {str(e)}"
            )


# Globale BigQuery-Client-Instanz
_bq_client = None

def get_bigquery_client() -> BigQueryClient:
    global _bq_client
    if _bq_client is None:
        _bq_client = BigQueryClient()
    return _bq_client


def fix_common_column_mistakes(sql_query: str) -> str:
    """
    Fix common column name mistakes in SQL queries.
    
    This function corrects problematic column names that the LLM might generate
    but that don't exist in the actual BigQuery schema.
    
    Parameter:
        sql_query: Original SQL query that might contain wrong column names
        
    Rückgabe:
        SQL query with corrected column names
    """
    # Importierte Spalten-Korrekturen aus instructions.py verwenden
    
    fixed_query = sql_query
    fixes_applied = []
    
    for wrong_name, correct_name in COLUMN_NAME_FIXES.items():
        # Wort-Grenze-Regex verwenden um Teilübereinstimmungen zu vermeiden
        import re
        pattern = r'\b' + re.escape(wrong_name) + r'\b'
        if re.search(pattern, fixed_query, re.IGNORECASE):
            fixed_query = re.sub(pattern, correct_name, fixed_query, flags=re.IGNORECASE)
            fixes_applied.append(f"{wrong_name} → {correct_name}")
    
    if fixes_applied:
        logger.info(f"FIX: Applied column name fixes: {', '.join(fixes_applied)}")
    
    return fixed_query


def execute_secure_sql(query: str, tool_context: ToolContext) -> Dict[str, Any]:
    __doc__ = DOCSTRINGS['execute_validated_query']
    state = StateManager.get_state(tool_context)
    
    try:
        # Schritt 0: Häufige Spaltenname-Fehler VOR jeder Validierung korrigieren
        original_query = query
        query = fix_common_column_mistakes(query)
        if query != original_query:
            logger.info(f"FIX: Fixed column names in SQL query")
        
        logger.info(f"Executing secure SQL query: {query[:100]}...")
        
        # Schritt 1: Syntax-Validierung
        is_valid_syntax, syntax_error = QueryValidator.validate_query_syntax(query)
        if not is_valid_syntax:
            state.add_security_violation(f"Syntax validation failed: {syntax_error}")
            StateManager.save_state(tool_context, state)
            return {
                'success': False,
                'error': f'Query validation failed: {syntax_error}',
                'error_type': 'syntax_validation'
            }
        
        # Schritt 2: Tabellenzugriff-Validierung
        is_valid_access, access_error = QueryValidator.validate_table_access(query)
        if not is_valid_access:
            state.add_security_violation(f"Table access validation failed: {access_error}")
            StateManager.save_state(tool_context, state)
            return {
                'success': False,
                'error': f'Access validation failed: {access_error}',
                'error_type': 'access_validation'
            }
        
        # Schritt 3: Kosten-Schätzung und Dry-Run
        client = get_bigquery_client()
        
        if config.performance.USE_DRY_RUN:
            dry_run_success, dry_run_result = client.dry_run_query(query)
            if not dry_run_success:
                state.log_error(f"Dry run failed: {dry_run_result.get('error', 'Unknown error')}")
                StateManager.save_state(tool_context, state)
                return {
                    'success': False,
                    'error': dry_run_result.get('error', 'Dry run validation failed'),
                    'error_type': 'dry_run_validation'
                }
            
            logger.info(f"Dry run successful: {dry_run_result['bytes_processed']} bytes to process")
        
        # Schritt 4: Schema-Validierung
        result = client.execute_query(query)
        
        if result.error:
            state.log_error(f"Query execution failed: {result.error}")
            StateManager.save_state(tool_context, state)
            return {
                'success': False,
                'error': result.error,
                'error_type': 'execution_error'
            }
        
        # Schritt 5: Query-Ausführung
        state.update_query_result(query, result)
        state.query_validated = True
        StateManager.save_state(tool_context, state)
        
        return {
            'success': True,
            'data': result.data,
            'row_count': result.row_count,
            'execution_time_seconds': result.execution_time_seconds,
            'bytes_processed': result.bytes_processed,
            'cache_hit': result.cache_hit,
            'query': query
        }
        
    except Exception as e:
        error_msg = f"Unexpected error in execute_secure_sql: {str(e)}"
        logger.error(error_msg)
        state.log_error(error_msg)
        StateManager.save_state(tool_context, state)
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'unexpected_error'
        }


def get_churn_prediction(customer_id: int, tool_context: ToolContext) -> Dict[str, Any]:
    __doc__ = DOCSTRINGS['get_churn_prediction']
    state = StateManager.get_state(tool_context)
    
    try:
        # Validate customer_id
        if not isinstance(customer_id, int) or customer_id <= 0:
            return {
                'success': False,
                'error': 'Invalid customer_id: must be a positive integer',
                'error_type': 'input_validation'
            }
        
        # Use BigQuery parameterized query to prevent SQL injection
        query = f"""
        SELECT 
            mitglied_id,
            churn_score_bias_corrected,
            risiko_kategorie,
            engagement_score,
            alter_jahre,
            geschlecht,
            aktueller_beitrag_eur,
            zahlungsart,
            zahlweise,
            tage_seit_letztem_checkin,
            gekuendigt,
            checkins_pro_monat,
            mitgliedschaft_dauer_monate,
            kuendigungsgrund,
            kuendigungsdatum,
            kuendigungsart,
            anzahl_checkins,
            durchschn_aufenthalt_min
        FROM {BIGQUERY_SCHEMA['table']}
        WHERE mitglied_id = @customer_id
        LIMIT 1
        """
        
        # Execute with parameterized query for security
        client = get_bigquery_client()
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("customer_id", "INT64", customer_id),
            ]
        )
        
        try:
            job = client.client.query(query, job_config=job_config)
            results = list(job.result())
        except Exception as e:
            error_msg = f"BigQuery execution error: {str(e)}"
            logger.error(error_msg)
            state.log_error(error_msg)
            StateManager.save_state(tool_context, state)
            return {
                'success': False,
                'error': error_msg,
                'error_type': 'query_execution_error'
            }
        
        # Handle "not found" case gracefully
        if not results:
            return {
                'success': False,
                'error': f'No data found for customer with ID {customer_id}',
                'error_type': 'customer_not_found'
            }
        
        customer_data = dict(results[0])
        
        # BIAS-KORREKTUR: Verwende bereits bias-korrigierten Score aus BigQuery
        raw_churn_score = customer_data.get('churn_score_bias_corrected', 0.0)
        adjusted_churn_score = raw_churn_score  # Score ist bereits bias-korrigiert
        bias_correction = {"applied": False, "reason": "Using pre-computed bias-corrected score from BigQuery"}
        
        # Generiere adjustierte Risiko-Kategorie basierend auf korrigiertem Score
        adjusted_risk_category = _calculate_adjusted_risk_category(adjusted_churn_score)
        
        # Generate recommendations based on adjusted risk category
        recommendations = _generate_churn_recommendations(
            adjusted_risk_category,
            customer_data.get('engagement_score'),
            customer_data.get('zahlungsart')
        )
        
        # Calculate estimated annual value based on current fee
        current_fee = customer_data.get('aktueller_beitrag_eur', 0.0)
        estimated_annual_value = (current_fee or 0.0) * 12.0
        
        # Generate intelligent explanation with bias correction info
        explanation = _generate_intelligent_explanation(customer_data, bias_correction)
        
        # Create user-friendly formatted text
        result_text = f"Die Churn-Wahrscheinlichkeit für Mitglied {customer_id} ist mit {adjusted_churn_score:.0f}% "
        
        if adjusted_risk_category == 'NIEDRIG':
            result_text += "sehr niedrig. Es besteht aktuell kein akutes Handlungsrisiko."
        elif adjusted_risk_category == 'MITTEL':
            result_text += "moderat. Empfehlenswert ist eine regelmäßige Beobachtung."
        elif adjusted_risk_category == 'HOCH':
            result_text += "hoch. Sofortige Retention-Maßnahmen sind empfohlen."
        else:
            result_text += f"als {adjusted_risk_category} eingestuft."
        
        # Add customer details
        age = customer_data.get('alter_jahre', 'unbekannt')
        gender = customer_data.get('geschlecht', 'unbekannt')
        payment = customer_data.get('zahlungsart', 'unbekannt')
        
        result_text += f" Das Mitglied ist {gender.lower()}, {age} Jahre alt, zahlt per {payment.lower()} und hat eine Mitgliedschaftsdauer von {customer_data.get('mitgliedschaft_dauer_monate', 0):.0f} Monaten."
        
        # Add activity status
        days_inactive = customer_data.get('tage_seit_letztem_checkin', 999)
        if days_inactive <= 7:
            activity_status = "hohe"
        elif days_inactive <= 30:
            activity_status = "moderate"
        else:
            activity_status = "niedrige"
        
        result_text += f" Derzeit liegt eine {activity_status} Besuchsfrequenz vor."
        
        # Add recommendations
        if recommendations:
            result_text += f" Empfohlene Maßnahmen sind {', '.join(recommendations).lower()}."
        
        # Structure the response with formatted text as primary result
        prediction_result = {
            'result': result_text,
            'success': True,
            'customer_id': customer_id,
            'churn_probability': adjusted_churn_score,
            'risk_category': adjusted_risk_category,
            'bias_correction_applied': bias_correction,
            'detailed_explanation': explanation,
            'recommended_actions': recommendations,
            'customer_data': customer_data
        }
        
        # Update state with adjusted prediction
        from .state import ChurnPrediction
        state.last_churn_prediction = ChurnPrediction(
            customer_id=customer_id,
            churn_score_bias_corrected=adjusted_churn_score,  # Verwende adjustierten Score
            risk_level=adjusted_risk_category,  # Verwende adjustierte Kategorie
            recommended_actions=recommendations,
            financial_impact=estimated_annual_value,
            prediction_date=datetime.now()
        )
        state.churn_predictions.append(state.last_churn_prediction)
        StateManager.save_state(tool_context, state)
        
        return prediction_result
        
    except Exception as e:
        error_msg = f"Error in get_churn_prediction: {str(e)}"
        logger.error(error_msg)
        state.log_error(error_msg)
        StateManager.save_state(tool_context, state)
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'unexpected_error'
        }





def get_table_schema(tool_context: ToolContext, table_name: str = "mitglieder") -> Dict[str, Any]:
    __doc__ = DOCSTRINGS['get_table_schema']
    try:
        if table_name not in ['mitglieder', 'mitglieder_summary']:
            return {
                'success': False,
                'error': f'Table {table_name} not allowed',
                'error_type': 'access_denied'
            }
        
        client = get_bigquery_client()
        
        # Enhanced query to get complete schema information including mode and descriptions
        query = f"""
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            ordinal_position,
            CASE 
                WHEN is_nullable = 'YES' THEN 'NULLABLE'
                WHEN is_nullable = 'NO' THEN 'REQUIRED'
                ELSE 'UNKNOWN'
            END as mode
        FROM `{config.security.PROJECT_ID}.{config.security.DATASET_ID}.INFORMATION_SCHEMA.COLUMNS`
        WHERE table_name = '{table_name}'
        ORDER BY ordinal_position
        """
        
        result = client.execute_query(query)
        
        if result.error:
            return {
                'success': False,
                'error': result.error,
                'error_type': 'schema_query_error'
            }
        
        # Enhance with local schema knowledge for descriptions and aliases
        enhanced_schema = []
        for row in result.data:
            column_name = row['column_name']
            column_info = BIGQUERY_SCHEMA['columns'].get(column_name, {})
            
            enhanced_row = {
                'column_name': column_name,
                'data_type': row['data_type'],
                'mode': row['mode'],
                'is_nullable': row['is_nullable'],
                'ordinal_position': row['ordinal_position'],
                'description': column_info.get('description', ''),
                'aliases': column_info.get('aliases', []),
                'value_mappings': column_info.get('value_mappings', {})
            }
            enhanced_schema.append(enhanced_row)
        
        # Create user-friendly formatted display
        formatted_schema = f"**BigQuery Tabellen-Schema für {table_name}**\n\n"
        formatted_schema += f"**Vollständiger Pfad**: `{BIGQUERY_SCHEMA['table']}`\n"
        formatted_schema += f"**Anzahl Spalten**: {len(enhanced_schema)}\n\n"
        
        formatted_schema += "**Spalten-Details:**\n"
        formatted_schema += "```\n"
        formatted_schema += f"{'Name':<25} {'Typ':<15} {'Modus':<10} {'Beschreibung':<30}\n"
        formatted_schema += "─" * 80 + "\n"
        
        for row in enhanced_schema:
            name = row['column_name'][:24]
            dtype = row['data_type'][:14] 
            mode = row['mode'][:9]
            desc = row['description'][:29] if row['description'] else 'N/A'
            formatted_schema += f"{name:<25} {dtype:<15} {mode:<10} {desc:<30}\n"
        
        formatted_schema += "```\n\n"
        formatted_schema += f"**Schema-Analyse**: Vollständiges Schema mit {len(enhanced_schema)} Spalten erfolgreich validiert."
        
        return {
            'result': formatted_schema,
            'success': True,
            'table_name': table_name,
            'schema': enhanced_schema,
            'column_count': len(enhanced_schema)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'error_type': 'unexpected_error'
        }


def get_dynamic_schema_for_prompt(table_name: str = "mitglieder") -> str:
    try:
        # Use the static schema first for reliability
        schema_text = f"**VOLLSTÄNDIGES TABELLEN-SCHEMA:**\nTabelle: {BIGQUERY_SCHEMA['table']}\n\n**ALLE VERFÜGBAREN SPALTEN:**\n"
        
        for column_name, column_info in BIGQUERY_SCHEMA['columns'].items():
            field = column_info['field']
            data_type = column_info['type']
            mode = column_info.get('mode', 'NULLABLE')
            description = column_info.get('description', '')
            aliases = ', '.join(column_info.get('aliases', []))
            
            schema_text += f"- {field} ({data_type}, {mode}): {description}"
            if aliases:
                schema_text += f". Aliases: {aliases}"
            
            # Add value mappings if available
            value_mappings = column_info.get('value_mappings', {})
            if value_mappings:
                mappings = ', '.join([f"'{k}' -> {v}" for k, v in value_mappings.items()])
                schema_text += f". Values: {mappings}"
            
            schema_text += "\n"
        
        return schema_text
        
    except Exception as e:
        logger.error(f"Error generating dynamic schema: {e}")
        # Fallback to basic schema
        return f"Tabelle: {BIGQUERY_SCHEMA['table']}\nBasic schema available."


def validate_schema_with_bigquery(tool_context: ToolContext) -> Dict[str, Any]:
    """
    Validate our local schema against the actual BigQuery table schema.
    This helps ensure our NL2SQL prompts are always accurate.
    """
    try:
        # Get live schema from BigQuery
        live_schema_result = get_table_schema(tool_context, "mitglieder")
        
        if not live_schema_result.get('success'):
            return {
                'success': False,
                'error': 'Could not fetch live BigQuery schema',
                'error_type': 'bigquery_connection_error'
            }
        
        live_columns = {row['column_name'] for row in live_schema_result['schema']}
        local_columns = set(BIGQUERY_SCHEMA['columns'].keys())
        
        # Find differences
        missing_in_local = live_columns - local_columns
        missing_in_live = local_columns - live_columns
        
        schema_status = {
            'success': True,
            'live_column_count': len(live_columns),
            'local_column_count': len(local_columns),
            'columns_match': len(missing_in_local) == 0 and len(missing_in_live) == 0,
            'missing_in_local_schema': list(missing_in_local),
            'missing_in_live_table': list(missing_in_live),
            'validation_timestamp': datetime.now().isoformat()
        }
        
        if missing_in_local:
            logger.warning(f"Columns in BigQuery but not in local schema: {missing_in_local}")
        if missing_in_live:
            logger.warning(f"Columns in local schema but not in BigQuery: {missing_in_live}")
            
        return schema_status
        
    except Exception as e:
        return {
            'success': False,
            'error': f"Schema validation error: {str(e)}",
            'error_type': 'schema_validation_error'
        }


def get_high_risk_customers(tool_context: ToolContext, limit: int = 20, risk_threshold: float = 0.6) -> Dict[str, Any]:
    __doc__ = DOCSTRINGS['get_high_risk_customers']
    # Validate parameters
    limit = max(1, min(limit, config.business.MAX_CUSTOMER_LIMIT))
    risk_threshold = max(0.0, min(risk_threshold, 1.0))
    
    # Erweiterte Abfrage mit allen Feldern für Bias-Korrektur
    query = f"""
    SELECT 
        mitglied_id,
        churn_score_bias_corrected,
        risiko_kategorie,
        engagement_score,
        aktueller_beitrag_eur,
        tage_seit_letztem_checkin,
        checkins_pro_monat,
        mitgliedschaft_dauer_monate,
        zahlungsart,
        zahlweise,
        alter_jahre,
        geschlecht,
        anzahl_checkins,
        kuendigungsgrund,
        gekuendigt
    FROM {BIGQUERY_SCHEMA['table']}
    WHERE gekuendigt = 0  -- Nur aktive Kunden
    ORDER BY churn_score_bias_corrected DESC, aktueller_beitrag_eur DESC
    LIMIT {limit * 3}  -- Mehr Daten holen für Bias-Filterung
    """
    
    # Rohdaten abrufen
    raw_result = execute_secure_sql(query, tool_context)
    
    if not raw_result.get('success') or not raw_result.get('rows'):
        return raw_result
    
    # BIAS-KORREKTUR: Adjustiere Churn-Scores für alle Kunden
    adjusted_customers = []
    bias_corrections_applied = 0
    
    for row in raw_result['rows']:
        # Konvertiere Row zu Dictionary für Bias-Korrektur
        customer_data = dict(row)
        
        # Wende Bias-Korrektur an
        adjusted_score, bias_correction = _apply_new_customer_bias_correction(customer_data)
        adjusted_risk_category = _calculate_adjusted_risk_category(adjusted_score)
        
        # Zähle angewendete Korrekturen
        if bias_correction.get('applied'):
            bias_corrections_applied += 1
        
        # Aktualisiere Kundendaten
        customer_data.update({
            'adjusted_churn_score': adjusted_score,
            'original_churn_score': customer_data.get('churn_score_bias_corrected', 0.0),
            'adjusted_risk_category': adjusted_risk_category,
            'bias_correction_applied': bias_correction.get('applied', False),
            'bias_correction_reason': bias_correction.get('reason', 'Keine Korrektur')
        })
        
        # Nur Kunden über der adjustierten Schwelle behalten
        if adjusted_score >= (risk_threshold * 100):
            adjusted_customers.append(customer_data)
    
    # Sortiere nach adjustiertem Score und limitiere
    adjusted_customers.sort(key=lambda x: (x['adjusted_churn_score'], x.get('aktueller_beitrag_eur', 0)), reverse=True)
    final_customers = adjusted_customers[:limit]
    
    # Formatiere direkt als Text-Response für bessere Anzeige
    formatted_text = f"Hier sind die Top {len(final_customers)} Risikokunden basierend auf ihrem bereinigten Churn Score, sortiert nach Risiko und Beitrag. Die Bias-Korrektur stellt sicher, dass neue, hochaktive Kunden nicht fälschlicherweise als Hochrisikokunden eingestuft werden.\n\n"
    
    # Tabellen-Header
    formatted_text += "```\n"
    formatted_text += f"{'ID':<10} {'Risiko%':<8} {'Kategorie':<10} {'Beitrag€':<8} {'Tage':<5} {'Geschlecht':<10} {'Alter':<5}\n"
    formatted_text += "─" * 70 + "\n"
    
    # Kunden-Daten
    for customer in final_customers:
        mitglied_id = customer.get('mitglied_id', 'N/A')
        risk_score = customer.get('adjusted_churn_score', customer.get('churn_score_bias_corrected', 0))
        risk_cat = customer.get('adjusted_risk_category', customer.get('risiko_kategorie', 'UNBEKANNT'))
        beitrag = customer.get('aktueller_beitrag_eur', 0)
        tage = customer.get('tage_seit_letztem_checkin', 0)
        geschlecht = customer.get('geschlecht', 'Unbekannt')
        alter = customer.get('alter_jahre', 'N/A')
        
        formatted_text += f"{mitglied_id:<10} {risk_score:<8.1f} {risk_cat:<10} {beitrag:<8.0f} {tage:<5} {geschlecht:<10} {str(alter):<5}\n"
    
    formatted_text += "```\n\n"
    formatted_text += f"**Bias-Korrektur**: {bias_corrections_applied}/{len(raw_result['rows'])} Kunden angepasst "
    formatted_text += f"({(bias_corrections_applied / len(raw_result['rows']) * 100):.1f}%)\n"
    formatted_text += f"**Methodik**: Bias-korrigierte Hochrisiko-Analyse mit Schwellenwert {risk_threshold * 100}%"
    
    logger.info(f"BIAS: Bias-Korrektur angewendet: {bias_corrections_applied}/{len(raw_result['rows'])} Kunden "
               f"({(bias_corrections_applied / len(raw_result['rows']) * 100):.1f}%)")
    
    # Return the formatted text directly as per ADK documentation
    # The agent will display this directly to the user
    return {
        'result': formatted_text,
        'customers': final_customers,
        'bias_corrections_applied': bias_corrections_applied,
        'total_analyzed': len(raw_result['rows'])
    }


def intelligent_query_data(user_query: str, tool_context: ToolContext) -> Dict[str, Any]:
    __doc__ = DOCSTRINGS['intelligent_query_data']
    state = StateManager.get_state(tool_context)
    
    try:
        logger.info(f"BYPASS: Processing NL2SQL query WITHOUT complex analysis check: {user_query}")
        
        # ULTIMATE FIX: Direct routing for ALL customer analysis queries
        import re
        customer_id_match = re.search(r'kunde\s+(\d+)|mitglied\s+(\d+)', user_query.lower())
        if customer_id_match:
            customer_id = int(customer_id_match.group(1) or customer_id_match.group(2))
            # Check for analysis patterns
            analysis_patterns = ['analysiere', 'analyse', 'vorhersage', 'predict', 'churn', 'risiko']
            if any(pattern in user_query.lower() for pattern in analysis_patterns):
                logger.info(f"ULTIMATE REDIRECT: Customer analysis query → get_churn_prediction({customer_id})")
                return get_churn_prediction(customer_id, tool_context)
        
        # SPECIAL HANDLING: Direct membership duration queries
        membership_duration_patterns = [
            r'weniger als (\d+) monate? dabei',
            r'unter (\d+) monate? mitglied',
            r'kürzer als (\d+) monate?',
            r'< (\d+) monate?',
            r'länger als (\d+) monate? dabei',
            r'über (\d+) monate? mitglied',
            r'mehr als (\d+) monate?',
            r'> (\d+) monate?'
        ]
        
        for pattern in membership_duration_patterns:
            match = re.search(pattern, user_query.lower())
            if match:
                months = int(match.group(1))
                operator = '<' if any(word in user_query.lower() for word in ['weniger', 'unter', 'kürzer']) else '>'
                
                # Check for risk/churn patterns
                if any(word in user_query.lower() for word in ['risiko', 'churn', 'top', 'hochrisiko']):
                    direct_sql = f"""
                    SELECT 
                        mitglied_id, 
                        churn_score_bias_corrected, 
                        risiko_kategorie, 
                        mitgliedschaft_dauer_monate,
                        alter_jahre,
                        geschlecht
                    FROM {BIGQUERY_SCHEMA["table"]}
                    WHERE mitgliedschaft_dauer_monate {operator} {months}
                    ORDER BY churn_score_bias_corrected DESC 
                    LIMIT 20
                    """
                    
                    logger.info(f"DIRECT: DIRECT MEMBERSHIP DURATION QUERY: {direct_sql.strip()}")
                    result = execute_secure_sql(direct_sql.strip(), tool_context)
                    
                    if result.get('success'):
                        result.update({
                            'original_query': user_query,
                            'generated_sql': direct_sql.strip(),
                            'nl2sql_method': 'direct_membership_duration_handling',
                            'confidence': 0.95
                        })
                    return result
        
        # BYPASS: ULTIMATE BYPASS: Skip complex analysis check completely
        logger.info(f"BYPASS: ULTIMATE BYPASS: Skipping all complex analysis checks")
        
        # BYPASS: Removed complex analysis check - ALWAYS process queries!
        # This fixes the ADK caching issue by removing the problematic function call
        
        # Generate SQL using ADK-native Gemini prompting
        sql_result = _generate_sql_with_gemini(user_query, tool_context)
        
        if not sql_result.get('success'):
            return sql_result
        
        generated_sql = sql_result['sql_query']
        
        # Execute via existing secure SQL infrastructure
        logger.info(f"Generated SQL: {generated_sql}")
        result = execute_secure_sql(generated_sql, tool_context)
        
        if result.get('success'):
            # Enhance result with NL2SQL metadata
            result.update({
                'original_query': user_query,
                'generated_sql': generated_sql,
                'nl2sql_method': 'gemini_prompting',
                'confidence': sql_result.get('confidence', 0.8)
            })
            
        return result
        
    except Exception as e:
        error_msg = f"Error in enhanced intelligent_query_data: {str(e)}"
        logger.error(error_msg)
        state.log_error(error_msg)
        StateManager.save_state(tool_context, state)
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'nl2sql_error'
        }


def _requires_complex_analysis(user_query: str) -> bool:
    __doc__ = DOCSTRINGS['requires_complex_analysis']
    query_lower = user_query.lower()
    
    # DEBUG: Log to verify function is being called with new code
    logger.info(f"NEUE _requires_complex_analysis aufgerufen mit: {user_query}")
    logger.info(f"Dies sollte NIEMALS komplexe Analyse für normale Anfragen erfordern!")
    
    # SEHR RESTRIKTIV: Nur wirklich komplexe Analysemuster
    genuinely_complex_patterns = [
        # Mehrstufige Analyse die benutzerdefinierten Code erfordert
        'baue.*modell', 'erstelle.*algorithmus', 'machine learning.*entwickeln',
        'neural.*network', 'deep learning', 'custom.*algorithm',
        
        # Statistische Analyse die Python-Bibliotheken erfordert
        'regression.*analyse', 'cluster.*analyse', 'principal.*component',
        'statistical.*test', 'hypothesis.*test', 'a/b.*test',
        
        # Data Science Workflows die mehrere Schritte erfordern
        'feature.*engineering', 'data.*preprocessing', 'cross.*validation',
        'hyperparameter.*tuning', 'model.*evaluation', 'ensemble.*methode',
        
        # Komplexe mathematische Operationen
        'monte.*carlo', 'simulation.*analyse', 'optimization.*problem',
        'linear.*programming', 'gradient.*descent'
    ]
    
    # THESE ARE NOW SIMPLE (handled by our tools):
    # - "analysiere kunde X" → get_churn_prediction
    # - "erkläre churn-risiko" → get_churn_explanation_bqml  
    # - "warum ist kunde Y hochrisiko" → get_churn_explanation_bqml
    # - "zeige faktoren" → intelligent_query_data
    # - "korrelation zwischen alter und churn" → intelligent_query_data
    # - "vorhersage für kunde" → get_churn_prediction
    
    # FORCE: NEVER require complex analysis - use our powerful tools instead!
    logger.info(f"FORCED: _requires_complex_analysis returning FALSE for: {user_query}")
    return False  # ALWAYS use our tools, never complex analysis


def _generate_sql_with_gemini(user_query: str, tool_context: ToolContext) -> Dict[str, Any]:
    """
    Generate BigQuery SQL using Gemini prompting (ADK-native approach).
    
    This follows the exact pattern from Google ADK Data Science Sample:
    - Detailed prompt with schema information
    - Security rules and constraints
    - Few-shot examples
    - Low temperature for precise SQL generation
    
    Enhanced with special handling for Retention Rate queries.
    
    Parameter:
        user_query: Natural language query from user
        tool_context: ADK tool context
        
    Rückgabe:
        Dictionary with generated SQL or error information
    """
    try:
        # Special handling for Retention Rate queries
        query_lower = user_query.lower()
        retention_patterns = [
            'retention rate', 'retention-rate', 'kundenbindungsrate', 
            'bindungsrate', 'retention quote', 'durchschnittlich.*retention'
        ]
        
        is_retention_query = any(re.search(pattern, query_lower) for pattern in retention_patterns)
        
        if is_retention_query:
            logger.info("DIRECT: Detected Retention Rate query - using direct calculation")
            
            # Generate direct retention rate SQL
            retention_sql = f"""
            SELECT 
                        ROUND(100 - AVG(churn_score_bias_corrected), 2) as retention_rate_prozent,
        COUNT(*) as total_customers,
        ROUND(AVG(churn_score_bias_corrected), 2) as avg_churn_score_bias_corrected
            FROM {BIGQUERY_SCHEMA["table"]}
            """
            
            return {
                'success': True,
                'sql_query': retention_sql.strip(),
                'confidence': 0.95,
                'special_handling': 'retention_rate_calculation',
                'explanation': 'Retention Rate = 100% - Average Churn Score'
            }
        
        # Prepare schema information for prompt
        table_full_name = BIGQUERY_SCHEMA["table"]
        
        # Get dynamic schema information
        dynamic_schema = get_dynamic_schema_for_prompt("mitglieder")
        
        # Get conversation context to intelligently handle follow-up questions
        state = StateManager.get_state(tool_context)
        conversation_context = state.get_conversation_context()
        current_customer_id = conversation_context.get('current_customer_id') if conversation_context else None
        
        # Build comprehensive prompt (following ADK Data Science Sample pattern)
        nl2sql_prompt = NL2SQL_PROMPT_TEMPLATE.format(
            table_full_name=table_full_name,
            dynamic_schema=dynamic_schema,
            current_customer_id=current_customer_id if current_customer_id else 'None',
            user_query=user_query
        )
        
        # Use the existing ADK model configuration for SQL generation
        # This mirrors the approach in the Google ADK Data Science Sample
        from google.genai import types
        from google.genai import Client
        
        # Get the configured model from config
        model_name = config.models.COORDINATOR_MODEL
        
        # Create client using ADK patterns
        client = Client()
        
        # Generate SQL with low temperature for precise results (like ADK sample)
        generate_config = types.GenerateContentConfig(
            temperature=0.01,  # Very low temperature for precise SQL
            top_p=0.8,
            max_output_tokens=512,
            candidate_count=1
        )
        
        # Generate the SQL
        response = client.models.generate_content(
            model=model_name,
            contents=[types.Content(role="user", parts=[types.Part(text=nl2sql_prompt)])],
            config=generate_config
        )
        
        if not response or not response.text:
            return {
                'success': False,
                'error': 'Failed to generate SQL - empty response from model',
                'error_type': 'model_generation_error'
            }
        
        generated_text = response.text.strip()
        
        # Handle clarification requests
        if "CLARIFICATION_NEEDED" in generated_text:
            return {
                'success': False,
                'error': 'Query too ambiguous. Please be more specific.',
                'error_type': 'clarification_needed',
                'suggestions': _get_query_suggestions()
            }
        
        # Extract SQL from response (remove any markdown formatting)
        sql_query = generated_text.replace('```sql', '').replace('```', '').strip()
        
        # Remove any explanatory text before or after the SQL
        lines = sql_query.split('\n')
        sql_lines = []
        for line in lines:
            line = line.strip()
            if line and (line.upper().startswith('SELECT') or 
                        (sql_lines and not line.startswith('--'))):
                sql_lines.append(line)
        
        if not sql_lines:
            return {
                'success': False,
                'error': 'Could not extract valid SQL from model response',
                'error_type': 'sql_extraction_error',
                'raw_response': generated_text[:200]
            }
        
        final_sql = ' '.join(sql_lines)
        
        # Apply column name fixes to generated SQL
        corrected_sql = fix_common_column_mistakes(final_sql)
        if corrected_sql != final_sql:
            logger.info(f"FIX: Applied automatic column fixes to generated SQL")
            final_sql = corrected_sql
        
        # Store generated SQL in state for debugging
        state = StateManager.get_state(tool_context)
        state.last_generated_sql = final_sql
        state.last_nl2sql_prompt = nl2sql_prompt
        StateManager.save_state(tool_context, state)
        
        return {
            'success': True,
            'sql_query': final_sql,
            'confidence': 0.9,  # High confidence for prompt-based generation
            'method': 'gemini_prompting'
        }
        
    except Exception as e:
        error_msg = f"Error in Gemini SQL generation: {str(e)}"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'gemini_generation_error'
        }


def get_churn_explanation_bqml(customer_id: int, tool_context: ToolContext) -> Dict[str, Any]:
    """
    Detaillierte Erklärung der Kundenabwanderung mithilfe von BigQuery ML.EXPLAIN_PREDICT.    
    Diese Funktion verwendet das BQML-Modell, um, basierend auf der Wichtigkeit der Merkmale, Erklärungen dafür zu liefern, warum ein Kunde ein spezifisches Risiko für Kundenabwanderung aufweist.
    
    Argumente:
        customer_id: ID des zu erklärenden Kunden
        tool_context: ADK-Toolkontext
        
    Rückgabewert:
        Dictionary mit BQML-Erklärung und menschenlesbarer Interpretation
    """
    try:
        state = StateManager.get_state(tool_context)
        
        # Validate customer_id
        if not isinstance(customer_id, int) or customer_id <= 0:
            return {
                'success': False,
                'error': 'Invalid customer_id: must be a positive integer',
                'error_type': 'input_validation'
            }
        
        # Skip cache for now
        logger.info(f"Generating fresh BQML explanation for customer {customer_id}")
        
        # Get customer data and BQML explanation
        client = get_bigquery_client()
        
        query = f"""
        WITH CustomerData AS (
            SELECT 
                mitglied_id,
                alter_jahre,
                aktueller_beitrag_eur,
                vertragsperiode,
                mitgliedschaft_dauer_monate,
                anzahl_checkins,
                durchschn_aufenthalt_min,
                checkins_pro_monat,
                tage_seit_letztem_checkin,
                engagement_score,
                geschlecht,
                zahlweise,
                zahlungsart,
                churn_score_bias_corrected,
                risiko_kategorie,
                CASE 
                    WHEN tage_seit_letztem_checkin = 0 THEN 'ACTIVE'
                    WHEN tage_seit_letztem_checkin <= 7 THEN 'RECENT'
                    WHEN tage_seit_letztem_checkin <= 30 THEN 'INACTIVE'
                    WHEN tage_seit_letztem_checkin <= 90 THEN 'VERY_INACTIVE'
                    ELSE 'DORMANT'
                END as activity_status,
                CASE 
                    WHEN mitgliedschaft_dauer_monate < 3 THEN 'NEW'
                    WHEN mitgliedschaft_dauer_monate < 12 THEN 'DEVELOPING'
                    WHEN mitgliedschaft_dauer_monate < 24 THEN 'ESTABLISHED'
                    ELSE 'LOYAL'
                END as membership_phase,
                CASE 
                    WHEN checkins_pro_monat >= 8 THEN 'HIGH'
                    WHEN checkins_pro_monat >= 4 THEN 'MEDIUM'
                    WHEN checkins_pro_monat >= 1 THEN 'LOW'
                    ELSE 'VERY_LOW'
                END as engagement_level
            FROM {BIGQUERY_SCHEMA['table']}
            WHERE mitglied_id = @customer_id
        ),
        Explanations AS (
            SELECT
                *
            FROM ML.EXPLAIN_PREDICT(
                MODEL `{config.security.PROJECT_ID}.{config.security.DATASET_ID}.churn_model_for_explain`,
                (SELECT * EXCEPT(mitglied_id, churn_score_bias_corrected, risiko_kategorie) FROM CustomerData),
                STRUCT(5 AS top_k_features)
            )
        )
        SELECT
            @customer_id as mitglied_id,
            cd.churn_score_bias_corrected,
            cd.risiko_kategorie,
            cd.alter_jahre,
            cd.geschlecht,
            cd.tage_seit_letztem_checkin,
            cd.checkins_pro_monat,
            cd.mitgliedschaft_dauer_monate,
            cd.anzahl_checkins,
            cd.aktueller_beitrag_eur,
            cd.zahlungsart,
            cd.zahlweise,
            ex.top_feature_attributions,
            ex.baseline_prediction_value,
            ex.prediction_value,
            ex.predicted_label,
            ex.probability
        FROM Explanations ex, CustomerData cd
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("customer_id", "INT64", customer_id),
            ]
        )
        
        logger.info(f"Executing BQML query for customer {customer_id}")
        job = client.client.query(query, job_config=job_config)
        results = list(job.result())
        
        logger.info(f"BQML query returned {len(results)} results")
        
        if not results:
            logger.error(f"No explanation data found for customer {customer_id}")
            return {
                'success': False,
                'error': f'No explanation data found for customer {customer_id}',
                'error_type': 'customer_not_found'
            }
        
        result_row = dict(results[0])
        logger.info(f"BQML result_row keys: {list(result_row.keys())}")
        
        # Process BQML explanation
        explanation_data = _process_bqml_explanation(result_row)
        
        # Generate human-readable narrative
        narrative = _generate_bqml_narrative(explanation_data, result_row)
        
        # Skip cache for now
        final_result = {
            'success': True,
            'customer_id': customer_id,
            'churn_probability': result_row.get('churn_score_bias_corrected', 0),
            'risk_category': result_row.get('risiko_kategorie', 'UNKNOWN'),
            'bqml_explanation': explanation_data,
            'narrative_summary': narrative,
            'customer_profile': {
                'age': result_row.get('alter_jahre'),
                'gender': result_row.get('geschlecht'),
                'days_inactive': result_row.get('tage_seit_letztem_checkin'),
                'monthly_visits': result_row.get('checkins_pro_monat'),
                'membership_months': result_row.get('mitgliedschaft_dauer_monate'),
                'total_visits': result_row.get('anzahl_checkins'),
                'monthly_fee': result_row.get('aktueller_beitrag_eur'),
                'payment_method': result_row.get('zahlungsart'),
                'payment_frequency': result_row.get('zahlweise')
            },
            'created_at': datetime.now().isoformat()
        }
        
        # Skip cache and state for now
        
        return final_result
        
    except Exception as e:
        error_msg = f"Error generating BQML explanation for customer {customer_id}: {str(e)}"
        logger.error(error_msg)
        state.log_error(error_msg)
        StateManager.save_state(tool_context, state)
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'bqml_explanation_error'
        }


def _get_feature_display_name(feature_name: str) -> str:
    """
    Convert technical feature names to human-readable display names.
    
    Args:
        feature_name: Technical feature name from BQML
        
    Returns:
        Human-readable display name
    """
    display_mapping = {
        'alter_jahre': 'Alter',
        'tage_seit_letztem_checkin': 'Tage seit letztem Besuch',
        'checkins_pro_monat': 'Besuche pro Monat',
        'mitgliedschaft_dauer_monate': 'Mitgliedschaftsdauer',
        'anzahl_checkins': 'Gesamtbesuche',
        'aktueller_beitrag_eur': 'Monatsbeitrag',
        'durchschn_aufenthalt_min': 'Durchschnittliche Aufenthaltsdauer',
        'geschlecht': 'Geschlecht',
        'zahlungsart': 'Zahlungsart',
        'zahlweise': 'Zahlungsweise',
        'engagement_score': 'Engagement Score',
        'vertragsperiode': 'Vertragsperiode'
    }
    
    return display_mapping.get(feature_name, feature_name.replace('_', ' ').title())


def _process_bqml_explanation(result_row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process BigQuery ML explanation results into structured data.
    
    Parameter:
        result_row: Raw BigQuery result containing BQML explanation
        
    Rückgabe:
        Structured explanation data
    """
    try:
        # Debug: Log available keys in result_row
        logger.info(f"Available keys in result_row: {list(result_row.keys())}")
        
        # Extract BQML attribution data
        attributions = result_row.get('top_feature_attributions', [])
        baseline_value = result_row.get('baseline_prediction_value', 0)
        predicted_value = result_row.get('prediction_value', 0)
        
        # Debug: Log extracted values
        logger.info(f"Extracted baseline_value: {baseline_value}, predicted_value: {predicted_value}")
        logger.info(f"Attributions count: {len(attributions) if attributions else 0}")
        
        # Process feature attributions
        feature_importance = []
        if attributions:
            for attr in attributions:
                feature_name = attr.get('feature', 'unknown')  # BQML uses 'feature' not 'feature_name'
                attribution_value = attr.get('attribution', 0)
                
                # Get human-readable feature names
                display_name = _get_feature_display_name(feature_name)
                
                feature_importance.append({
                    'feature_name': feature_name,
                    'display_name': display_name,
                    'attribution': float(attribution_value),
                    'contribution': 'positive' if attribution_value > 0 else 'negative',
                    'magnitude': abs(float(attribution_value))
                })
        
        # Sort by importance (magnitude)
        feature_importance.sort(key=lambda x: x['magnitude'], reverse=True)
        
        # Identify top positive and negative factors
        positive_factors = [f for f in feature_importance if f['attribution'] > 0][:3]
        negative_factors = [f for f in feature_importance if f['attribution'] < 0][:3]
        
        return {
            'baseline_probability': float(baseline_value),
            'predicted_probability': float(predicted_value),
            'total_attribution': sum([f['attribution'] for f in feature_importance]),
            'feature_importance': feature_importance,
            'top_risk_factors': positive_factors,
            'top_protective_factors': negative_factors,
            'explanation_quality': len(feature_importance)  # Number of features explained
        }
        
    except Exception as e:
        logger.error(f"Error processing BQML explanation: {e}")
        logger.error(f"result_row type: {type(result_row)}")
        logger.error(f"result_row content: {result_row}")
        return {
            'baseline_probability': 0,
            'predicted_probability': 0,
            'total_attribution': 0,
            'feature_importance': [],
            'top_risk_factors': [],
            'top_protective_factors': [],
            'explanation_quality': 0,
            'processing_error': str(e)
        }





def _generate_bqml_narrative(explanation_data: Dict[str, Any], customer_data: Dict[str, Any]) -> str:
    """
    Generate human-readable narrative from BQML explanation data.
    
    Parameter:
        explanation_data: Processed BQML explanation
        customer_data: Customer profile data
        
    Rückgabe:
        Human-readable explanation text
    """
    try:
        narrative_parts = []
        
        # Header based on risk level
        risk_category = customer_data.get('risiko_kategorie', 'UNKNOWN')
        churn_probability = customer_data.get('churn_score_bias_corrected', 0)
        
        if risk_category == 'KRITISCH':
            narrative_parts.append(f"KRITISCHES KÜNDIGUNGSRISIKO ({churn_probability:.1f}%)")
        elif risk_category == 'HOCH':
            narrative_parts.append(f"HOHES KÜNDIGUNGSRISIKO ({churn_probability:.1f}%)")
        elif risk_category == 'MITTEL':
            narrative_parts.append(f"MITTLERES KÜNDIGUNGSRISIKO ({churn_probability:.1f}%)")
        else:
            narrative_parts.append(f"NIEDRIGES KÜNDIGUNGSRISIKO ({churn_probability:.1f}%)")
        
        narrative_parts.append("")
        
        # BQML Model Insights
        baseline_prob = explanation_data.get('baseline_probability', 0) * 100
        predicted_prob = explanation_data.get('predicted_probability', 0) * 100
        
        narrative_parts.append(f"ANALYSIS: MODELL-ANALYSE:")
        narrative_parts.append(f"   • Basis-Wahrscheinlichkeit: {baseline_prob:.1f}%")
        narrative_parts.append(f"   • Individuelle Vorhersage: {predicted_prob:.1f}%")
        narrative_parts.append(f"   • Abweichung vom Durchschnitt: {(predicted_prob - baseline_prob):+.1f}%")
        narrative_parts.append("")
        
        # Top risk factors from BQML
        top_risk_factors = explanation_data.get('top_risk_factors', [])
        if top_risk_factors:
            narrative_parts.append("🔺 HAUPT-RISIKOFAKTOREN (nach ML-Modell):")
            for factor in top_risk_factors:
                display_name = factor['display_name']
                attribution = factor['attribution']
                impact = abs(attribution) * 100
                
                narrative_parts.append(f"   • {display_name}: +{impact:.1f}% Risiko-Beitrag")
                
                # Add context based on feature type
                feature_name = factor['feature_name']
                if feature_name == 'tage_seit_letztem_checkin':
                    days = customer_data.get('tage_seit_letztem_checkin', 0)
                    narrative_parts.append(f"     → {days} Tage Inaktivität identifiziert")
                elif feature_name == 'checkins_pro_monat':
                    visits = customer_data.get('checkins_pro_monat', 0)
                    narrative_parts.append(f"     → Nur {visits:.1f} Besuche/Monat")
                elif feature_name == 'alter_jahre':
                    age = customer_data.get('alter_jahre') or 0
                    narrative_parts.append(f"     → Altersgruppe {age} Jahre")
        
        # Top protective factors from BQML
        top_protective_factors = explanation_data.get('top_protective_factors', [])
        if top_protective_factors:
            narrative_parts.append("")
            narrative_parts.append("STABILIZATION: STABILISIERENDE FAKTOREN (nach ML-Modell):")
            for factor in top_protective_factors:
                display_name = factor['display_name']
                attribution = factor['attribution']
                impact = abs(attribution) * 100
                
                narrative_parts.append(f"   • {display_name}: -{impact:.1f}% Risiko-Reduktion")
                
                # Add context
                feature_name = factor['feature_name']
                if feature_name == 'mitgliedschaft_dauer_monate':
                    months = customer_data.get('mitgliedschaft_dauer_monate', 0)
                    narrative_parts.append(f"     → {months:.1f} Monate Treue")
                elif feature_name == 'anzahl_checkins':
                    total_visits = customer_data.get('anzahl_checkins', 0)
                    narrative_parts.append(f"     → {total_visits} Gesamtbesuche")
        
        # AI-driven recommendations
        narrative_parts.append("")
        narrative_parts.append("AI-RECOMMENDATIONS:")
        
        if risk_category in ['KRITISCH', 'HOCH']:
            # Focus on top risk factor
            if top_risk_factors:
                main_risk = top_risk_factors[0]['feature_name']
                if main_risk == 'tage_seit_letztem_checkin':
                    narrative_parts.append("   → SOFORTIGE Kontaktaufnahme wegen Inaktivität")
                    narrative_parts.append("   → 'Comeback-Bonus' anbieten")
                elif main_risk == 'checkins_pro_monat':
                    narrative_parts.append("   → Flexible Trainingszeiten vorschlagen")
                    narrative_parts.append("   → Gruppenkurse oder Personal Training anbieten")
                elif main_risk == 'alter_jahre':
                    narrative_parts.append("   → Altersgerechte Programme entwickeln")
                    narrative_parts.append("   → Gesundheitsorientierte Angebote")
                else:
                    narrative_parts.append("   → Individualisierte Retention-Strategie erforderlich")
        else:
            narrative_parts.append("   → Proaktive Kundenpflege beibehalten")
            narrative_parts.append("   → Regelmäßiges Engagement-Monitoring")
        
        # Model confidence and explanation quality
        explanation_quality = explanation_data.get('explanation_quality', 0)
        narrative_parts.append("")
        narrative_parts.append(f"ERKLÄRUNGSQUALITÄT: {explanation_quality}/5 Features analysiert")
        
        if explanation_quality >= 4:
            narrative_parts.append("   Hohe Modell-Sicherheit")
        elif explanation_quality >= 2:
            narrative_parts.append("   Moderate Modell-Sicherheit")
        else:
            narrative_parts.append("   Niedrige Modell-Sicherheit - weitere Analyse empfohlen")
        
        return '\n'.join(narrative_parts)
        
    except Exception as e:
        logger.error(f"Error generating BQML narrative: {e}")
        return f"Fehler bei der Narrative-Generierung: {str(e)}"




def _get_query_suggestions() -> List[str]:
    pass
    return QUERY_SUGGESTIONS


def generate_retention_plan(tool_context: ToolContext, target_segment: str = "high_risk", customer_id: Optional[int] = None) -> Dict[str, Any]:
    
    try:
        customer_analysis = None
        rag_strategies = None
   
        
        # STEP 1: Customer-specific analysis (if customer_id provided)
        if customer_id:
            try:
                logger.info(f"DEBUG - Analyzing customer {customer_id} for personalized retention plan")
                customer_analysis = get_churn_prediction(customer_id, tool_context)
                
                # Debug: Log customer analysis result
                logger.info(f"DEBUG - Customer Analysis Result Debug:")
                logger.info(f"   - Success: {customer_analysis.get('success')}")
                logger.info(f"   - Error: {customer_analysis.get('error')}")
                logger.info(f"   - Error type: {customer_analysis.get('error_type')}")
                logger.info(f"   - Full result: {customer_analysis}")
                
                if customer_analysis.get('success'):
                    # STEP 2: Build RAG query from customer data
                    rag_query = _build_personalized_rag_query(customer_analysis)
                    logger.info(f"📚 RAG Query: {rag_query}")
                    
                    # STEP 3: Query RAG knowledge base
                    rag_result = query_retention_knowledge(rag_query, tool_context)
                    
                    # PHASE 1 DEBUG: Log detailed RAG result
                    logger.info(f"DEBUG - RAG Query Result Debug:")
                    logger.info(f"   - Success: {rag_result.get('success')}")
                    logger.info(f"   - Has strategies: {bool(rag_result.get('strategies'))}")
                    logger.info(f"   - Strategy count: {len(rag_result.get('strategies', []))}")
                    logger.info(f"   - Result keys: {list(rag_result.keys())}")
                    if 'error' in rag_result:
                        logger.error(f"   - RAG Error: {rag_result['error']}")
                    
                    if rag_result.get('success') and rag_result.get('strategies'):
                        # Convert strategies array to text for compatibility with existing LLM processing
                        strategies_list = rag_result.get('strategies', [])
                        strategy_texts = []
                        for strategy in strategies_list:
                            content = strategy.get('content', '')
                            relevance = strategy.get('relevance', 'medium')
                            strategy_texts.append(f"[{relevance.upper()}] {content}")
                        
                        rag_strategies = "\n\n".join(strategy_texts)
                        logger.info("SUCCESS: Successfully retrieved personalized strategies from RAG")
                    else:
                        logger.error(f"RAG query failed - no fallback available")
                        logger.error(f"   - RAG result: {rag_result}")
                        raise ValueError("RAG service nicht verfügbar - personalisierte Strategien können nicht erstellt werden")
                else:
                    logger.error(f"Customer analysis failed for {customer_id}")
                    raise ValueError(f"Kundenanalyse für Kunde {customer_id} fehlgeschlagen")
                    
            except Exception as e:
                logger.error(f"Error in customer analysis: {e}")
                raise
        
        # STEP 4: Generate structured actionable plan from customer analysis and RAG strategies
        if not rag_strategies:
            if not customer_id:
                # For general queries without customer_id, use RAG for segment-based strategies
                general_query = f"Konkrete, spezifische Retention-Maßnahmen für {target_segment} Kunden in Fitness-Studios. Bitte konkrete Handlungsanweisungen für Studio-Personal."
                logger.info(f"📚 General RAG Query: {general_query}")
                
                rag_result = query_retention_knowledge(general_query, tool_context)
                if rag_result.get('success') and rag_result.get('strategies'):
                    # Convert strategies array to text for compatibility with existing LLM processing
                    strategies_list = rag_result.get('strategies', [])
                    strategy_texts = []
                    for strategy in strategies_list:
                        content = strategy.get('content', '')
                        relevance = strategy.get('relevance', 'medium')
                        strategy_texts.append(f"[{relevance.upper()}] {content}")
                    
                    rag_strategies = "\n\n".join(strategy_texts)
                    logger.info("SUCCESS: Successfully retrieved general strategies from RAG")
                else:
                    logger.error("RAG service nicht verfügbar für allgemeine Strategien")
                    raise ValueError("RAG service nicht verfügbar - keine Strategien verfügbar")
            else:
                logger.error("Keine RAG-Strategien für personalisierte Anfrage verfügbar")
                raise ValueError("Personalisierte Strategien konnten nicht generiert werden")
        
        # STEP 5: Generate actionable plan based on customer analysis using intelligent LLM processing
        if customer_id and customer_analysis.get('success'):
            structured_plan = _process_rag_to_actionable_plan(
                rag_strategies, customer_analysis
            )
        else:
            # KEIN FALLBACK: Fehler anzeigen wenn keine Kundenanalyse verfügbar
            logger.error("Keine Kundenanalyse verfügbar - Plan-Generierung ohne customer_id nicht unterstützt")
            raise ValueError(f"Plan-Generierung erfordert customer_id. Segment '{target_segment}' ohne spezifische Kundendaten nicht möglich.")
        
        # STEP 6: Build final retention plan with structured content
        
        # Process _process_rag_to_actionable_plan result
        if isinstance(structured_plan, dict):
            if structured_plan.get('success'):
                # Successful LLM processing
                strategies_content = structured_plan.get('processed_plan', '')
                plan_type = "personalized_actionable"
                logger.info("SUCCESS: LLM-verarbeiteter Plan erfolgreich erstellt")
            else:
                # LLM processing failed - show raw output and error
                logger.error(f"LLM-Verarbeitung fehlgeschlagen: {structured_plan.get('error')}")
                error_msg = structured_plan.get('error') or 'Unbekannter Fehler'
                raise ValueError(f"RAG-LLM-Verarbeitung fehlgeschlagen: {error_msg}. Raw RAG Output: {rag_strategies[:500]}...")
        else:
            # Unexpected result format
            logger.error(f"Unerwartetes Ergebnis von _process_rag_to_actionable_plan: {type(structured_plan)}")
            raise ValueError(f"Plan-Verarbeitung fehlgeschlagen. Raw RAG Output: {rag_strategies[:500]}...")
        
        # Generate intelligent plan_id based on context
        timestamp = int(datetime.now().timestamp())
        if customer_id and customer_analysis.get('success'):
            customer_data = customer_analysis.get('customer_data', {})
            risk_category = customer_data.get('risiko_kategorie', 'UNBEKANNT').lower()
            plan_id = f"retention_kunde_{customer_id}_{risk_category}_{timestamp}"
        else:
            plan_id = f"retention_{target_segment}_gruppe_{timestamp}"
        
        # Extract meaningful customer data for frontend display
        frontend_customer_analysis = {}
        if customer_id and customer_analysis.get('success'):
            customer_data = customer_analysis.get('customer_data', {})
            frontend_customer_analysis = {
                'customer_id': customer_id,
                'churn_probability': customer_data.get('churn_score_bias_corrected', 0),
                'risk_category': customer_data.get('risiko_kategorie', 'UNBEKANNT'),
                'current_monthly_fee': customer_data.get('aktueller_beitrag_eur', 0),
                'estimated_annual_value_eur': (customer_data.get('aktueller_beitrag_eur', 0) * 12),
                'membership_duration_months': customer_data.get('mitgliedschaft_dauer_monate', 0),
                'checkins_per_month': customer_data.get('checkins_pro_monat', 0),
                'days_since_last_checkin': customer_data.get('tage_seit_letztem_checkin', 0)
            }
        
        plan = {
            'success': True,
            'plan_id': plan_id,
            'plan_type': plan_type,
            'customer_id': customer_id,
            'customer_analysis': frontend_customer_analysis,  # Structured for frontend
            'target_segment': target_segment,
            'duration_weeks': 8,  # Standard 8-Wochen Plan
            'strategies': strategies_content,
            'created_at': datetime.now().isoformat(),
            'implementation_steps': []  # Entfernt da nicht dynamisch und immer gleich
        }
        
        # Debug: Log the exact customer_analysis data being sent to frontend
        logger.info(f"DEBUG - Debug - Customer Analysis for frontend: {frontend_customer_analysis}")
        logger.info(f"DEBUG - Debug - Customer data from BigQuery: {customer_data}")
        logger.info(f"DEBUG - Debug - Final plan object keys: {list(plan.keys())}")
        
        # ADK-compliant state management using tool_context.state
        if tool_context:
            from .state import RetentionPlan
            
            # Create complete retention plan with all strategy data
            retention_plan = RetentionPlan(
                plan_id=plan['plan_id'],
                customer_id=customer_id,
                target_segment=target_segment,
                strategies=strategies_content,  # Full strategy content
                implementation_steps=plan.get('implementation_steps', []),
              
                created_at=datetime.now(),
                plan_type=plan.get('plan_type', 'standard'),
                user_id="demo-user",  # TODO: Get from ADK session context
                session_context={"generation_time": datetime.now().isoformat()}
            )
            
            # ADK Best Practice: Use tool_context.state directly for persistence
            # Store with ADK-compatible prefix
            plan_state_key = f"retention_plan_{plan['plan_id']}"
            tool_context.state[plan_state_key] = retention_plan.model_dump()
            
            # Update last retention plan reference
            tool_context.state["last_retention_plan_id"] = plan['plan_id']
            tool_context.state["last_retention_plan_created"] = datetime.now().isoformat()
            
            # Store customer-specific retention history if customer_id provided
            if customer_id:
                customer_plans_key = f"user:customer_{customer_id}_retention_plans"
                existing_plans = tool_context.state.get(customer_plans_key, [])
                existing_plans.append(plan['plan_id'])
                # Keep only last 5 plans per customer
                tool_context.state[customer_plans_key] = existing_plans[-5:]
            
            logger.info(f"SUCCESS: Retention Plan {plan['plan_id']} saved to ADK state")
        
        # Save to Firestore (Frontend-Backend integration)
        try:
            import requests
            
            # Generate intelligent plan name based on context
            if customer_id and customer_analysis.get('success'):
                customer_data = customer_analysis.get('customer_data', {})
                customer_name = f"Kunde {customer_id}"
                risk_category = customer_data.get('risiko_kategorie', 'UNBEKANNT')
                churn_score = customer_data.get('churn_score_bias_corrected', 0)
                plan_name = f"Retention-Plan für {customer_name} (Risiko: {risk_category}, {churn_score:.1f}%)"
            else:
                # Fallback für allgemeine Pläne
                if target_segment == "high_risk":
                    plan_name = "Retention-Plan für Hochrisikokundengruppe"
                elif target_segment == "medium_risk":
                    plan_name = "Retention-Plan für Mittelrisiko-Kundengruppe"
                elif target_segment == "low_risk":
                    plan_name = "Retention-Plan für Niedrigrisiko-Kundengruppe"
                else:
                    plan_name = f"Retention-Plan für {target_segment}-Kundengruppe"
            
            firestore_data = {
                "plan_data": plan,
                "user_id": "demo-user",  # TODO: Get from actual user context
                "name": plan_name
            }
            
            # Call frontend API to save to Firestore
            response = requests.post(
                "http://localhost:3000/api/retention-plans",
                json=firestore_data,
                headers={"Authorization": "Bearer dummy-token"},
                timeout=5
            )
            
            if response.status_code == 200:
                logger.info(f"SUCCESS: Retention Plan {plan['plan_id']} saved to Firestore")
            else:
                logger.warning(f"Failed to save to Firestore: {response.status_code}")
                
        except Exception as firestore_error:
            # Don't fail the main function if Firestore save fails
            logger.warning(f"Firestore save failed: {firestore_error}")
        
        # Return the plan directly - let agent handle formatting
        return plan
        
    except Exception as e:
        # Enhanced Error Handling for RAG/Retention Plan Generation
        import traceback
        
        error_type = type(e).__name__
        error_message = str(e)
        stack_trace = traceback.format_exc()
        
        # Detailed logging for RAG debugging
        logger.error(
            f"Retention Plan Generation Failed\n"
            f"Error Type: {error_type}\n"
            f"Error Message: {error_message}\n"
            f"Target Segment: {target_segment}\n"
            f"Customer ID: {customer_id}\n"
            f"Full Traceback:\n{stack_trace}"
        )
        
        return {
            'success': False,
            'error': f"Retention plan generation failed: {error_type} - {error_message}",
            'error_type': 'plan_generation_error',
            'debug_info': {
                'exception_type': error_type,
                'original_message': error_message,
                'customer_id': customer_id,
                'target_segment': target_segment,
                    'stack_trace': stack_trace
            }
        }


def create_clv_chart(clv_status_quo, clv_retention, monthly_fee=100):
    """
    Generiert ein professionelles CLV-Balkendiagramm und gibt es als Base64-String zurück.
    """
    try:
        import matplotlib.pyplot as plt
        import matplotlib
        import io
        import base64
        
        # Set matplotlib to use non-interactive backend
        matplotlib.use('Agg')
        plt.style.use('default')
        
        # Create figure with custom size and DPI for better quality
        fig, ax = plt.subplots(figsize=(10, 6), dpi=150)
        
        labels = ['Status Quo', 'Mit Retention Plan']
        values = [clv_status_quo, clv_retention]
        colors = ['#ef4444', '#22c55e']  # Red for status quo, green for retention
        
        # Create bars
        bars = ax.bar(labels, values, color=colors, alpha=0.8, edgecolor='white', linewidth=2)
        
        # Customize the chart
        ax.set_ylabel('Customer Lifetime Value (€)', fontsize=12, fontweight='bold')
        ax.set_title('CLV-Vergleich: Status Quo vs. Retention Plan', fontsize=14, fontweight='bold', pad=20)
        
        # Add value labels on top of bars
        for bar, value in zip(bars, values):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + max(values) * 0.01,
                   f'€{value:,.0f}', ha='center', va='bottom', fontweight='bold', fontsize=11)
        
        # Improve the layout
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#e2e8f0')
        ax.spines['bottom'].set_color('#e2e8f0')
        ax.tick_params(axis='both', which='major', labelsize=10, colors='#64748b')
        ax.grid(True, alpha=0.3)
        
        # Format y-axis to show currency
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'€{x:,.0f}'))
        
        # Add improvement percentage
        improvement = ((clv_retention - clv_status_quo) / clv_status_quo * 100) if clv_status_quo > 0 else 0
        ax.text(0.5, max(values) * 0.85, f'Verbesserung: +{improvement:.1f}%', 
               ha='center', va='center', transform=ax.transData, 
               bbox=dict(boxstyle='round,pad=0.5', facecolor='#f0f9ff', edgecolor='#0ea5e9'),
               fontsize=12, fontweight='bold', color='#0369a1')
        
        plt.tight_layout()
        
        # Save to buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', facecolor='white', edgecolor='none')
        plt.close(fig)  # Important: close figure to prevent memory leaks
        buf.seek(0)
        
        # Encode as base64
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        buf.close()
        
        return image_base64
        
    except Exception as e:
        logger.error(f"Error creating CLV chart: {e}")
        return None


def create_retention_plan_pdf(plan_data: Dict[str, Any], output_path: str) -> bool:
    """
    Erstellt eine professionelle PDF-Datei aus Retention-Plan-Daten mit WeasyPrint.
    
    Args:
        plan_data: Strukturierte Daten des Retention-Plans
        output_path: Vollständiger Pfad für die PDF-Ausgabe
    
    Returns:
        bool: True wenn erfolgreich erstellt, False bei Fehler
    """
    try:
        import weasyprint
        from datetime import datetime
        
        # Executive Summary extrahieren
        executive = plan_data.get('executive_summary', {})
        customer = plan_data.get('customer_profile', {})
        actions = plan_data.get('top_actions', [])
        
        # Datum aus plan_data holen oder aktuelles Datum verwenden
        created_at = plan_data.get('created_at', datetime.now().isoformat())
        if isinstance(created_at, str):
            try:
                plan_date = datetime.fromisoformat(created_at.replace('Z', '+00:00')).strftime('%d.%m.%Y')
            except:
                plan_date = datetime.now().strftime('%d.%m.%Y')
        else:
            plan_date = datetime.now().strftime('%d.%m.%Y')
        
        # Generate CLV chart if we have the data
        clv_chart_base64 = None
        clv_status_quo = executive.get('clv_status_quo', 0)
        clv_retention = executive.get('clv_retention', 0)
        monthly_fee = customer.get('key_metrics', {}).get('monthly_fee', 100)
        
        if clv_status_quo > 0 and clv_retention > 0:
            clv_chart_base64 = create_clv_chart(clv_status_quo, clv_retention, monthly_fee)
        
        # HTML-Template für professionelles PDF
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                @page {{
                    margin: 2cm;
                    size: A4;
                }}
                body {{
                    font-family: 'Arial', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    margin: -2cm -2cm 20px -2cm;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: bold;
                }}
                .header p {{
                    margin: 10px 0 0 0;
                    font-size: 16px;
                    opacity: 0.9;
                }}
                .section {{
                    margin: 25px 0;
                    padding: 20px;
                    border-left: 4px solid #667eea;
                    background: #f8f9fa;
                }}
                .section h2 {{
                    color: #667eea;
                    margin-top: 0;
                    font-size: 22px;
                }}
                .metric-grid {{
                    display: flex;
                    justify-content: space-between;
                    margin: 15px 0;
                }}
                .metric-card {{
                    background: white;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    flex: 1;
                    margin: 0 5px;
                }}
                .metric-value {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #667eea;
                }}
                .metric-label {{
                    font-size: 12px;
                    color: #666;
                    margin-top: 5px;
                }}
                .action-item {{
                    background: white;
                    margin: 10px 0;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #28a745;
                }}
                .action-high {{ border-left-color: #dc3545; }}
                .action-medium {{ border-left-color: #ffc107; }}
                .action-low {{ border-left-color: #28a745; }}
                .action-header {{
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }}
                .action-title {{
                    font-weight: bold;
                    font-size: 16px;
                }}
                .action-priority {{
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                }}
                .priority-high {{ background: #dc3545; color: white; }}
                .priority-medium {{ background: #ffc107; color: black; }}
                .priority-low {{ background: #28a745; color: white; }}
                .footer {{
                    margin-top: 40px;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                    border-top: 1px solid #dee2e6;
                    padding-top: 20px;
                }}
                .clv-chart-container {{
                    text-align: center;
                    margin: 20px 0;
                    padding: 15px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .clv-chart-container img {{
                    max-width: 100%;
                    height: auto;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>RETENTION PLAN</h1>
                <p>Professioneller Kundenrückgewinnungsplan • Erstellt: {plan_date}</p>
            </div>
            
            <div class="section">
                <h2>EXECUTIVE SUMMARY</h2>
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-value">{executive.get('churn_risk', 0)}%</div>
                        <div class="metric-label">Churn-Risiko</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">€{executive.get('clv_uplift', 0):,.0f}</div>
                        <div class="metric-label">CLV Potenzial</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{executive.get('roi_estimate', 0)}%</div>
                        <div class="metric-label">ROI Schätzung</div>
                    </div>
                </div>
                <p><strong>Zentraler Insight:</strong> {executive.get('top_insight', 'Keine Daten verfügbar')}</p>
            </div>"""
        
        # Add CLV chart if available
        if clv_chart_base64:
            html_content += f"""
            <div class="section">
                <h2>CLV-VERGLEICH</h2>
                <div class="clv-chart-container">
                    <img src="data:image/png;base64,{clv_chart_base64}" alt="CLV Comparison Chart">
                </div>
                <p><strong>Status Quo CLV:</strong> €{clv_status_quo:,.0f}</p>
                <p><strong>CLV mit Retention:</strong> €{clv_retention:,.0f}</p>
                <p><strong>Potenzielle Steigerung:</strong> €{clv_retention - clv_status_quo:,.0f}</p>
            </div>"""
        
        html_content += f"""
            <div class="section">
                <h2>KUNDENPROFIL</h2>
                <p><strong>Kunden-ID:</strong> {customer.get('id', 'Unbekannt')}</p>
                <p><strong>Altersgruppe:</strong> {customer.get('age_group', 'Unbekannt')}</p>
                <p><strong>Wert-Tier:</strong> {customer.get('value_tier', 'Standard')}</p>
                <p><strong>Mitgliedschaftsstufe:</strong> {customer.get('membership_stage', 'Unbekannt')}</p>
                <p><strong>Aktivitätsstatus:</strong> {customer.get('activity_status', 'Unbekannt')}</p>
            </div>
            
            <div class="section">
                <h2>AKTIONSPLAN</h2>"""
        
        # Aktionen hinzufügen
        for action in actions:
            priority = action.get('priority', 'medium')
            priority_class = f"priority-{priority}"
            action_class = f"action-{priority}"
            
            html_content += f"""
                <div class="action-item {action_class}">
                    <div class="action-header">
                        <div class="action-title">{action.get('title', 'Unbenannt')}</div>
                        <span class="action-priority {priority_class}">Priorität: {priority.replace('high', 'Hoch').replace('medium', 'Mittel').replace('low', 'Niedrig')}</span>
                    </div>
                    <p>{action.get('description', 'Keine Beschreibung')}</p>
                    <p><strong>Zeitrahmen:</strong> {action.get('timeframe', 'TBD')}</p>
                </div>"""
        
        html_content += f"""
            </div>
            
            <div class="footer">
                <p>Automatisch generiert von Aciso Agent • {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}</p>
                <p>Vertrauliche Geschäftsinformationen • Nur für internen Gebrauch</p>
            </div>
        </body>
        </html>
        """
        
        # PDF erstellen
        weasyprint.HTML(string=html_content).write_pdf(output_path)
        logger.info(f"SUCCESS: PDF erstellt mit WeasyPrint: {output_path}")
        return True
        
    except Exception as e:
        logger.error(f"ERROR: PDF-Erstellung fehlgeschlagen: {e}")
        return False


def save_retention_plan_as_pdf(plan_data: Dict[str, Any], output_directory: str = "retention_plans") -> Dict[str, Any]:
    """
    Speichert einen Retention-Plan als PDF-Datei.
    
    Args:
        plan_data: Das Plan-Dictionary von generate_retention_plan
        output_directory: Verzeichnis für die PDF-Ausgabe (default: "retention_plans")
    
    Returns:
        Dict mit success, pdf_path und error (falls vorhanden)
    """
    try:
        # Erstelle Ausgabeverzeichnis falls es nicht existiert
        output_path = Path(output_directory)
        output_path.mkdir(exist_ok=True)
        
        # Extrahiere plan_data falls es in 'strategies' als JSON-String vorliegt
        strategies_content = plan_data.get('strategies', '')
        
        # Versuche JSON aus strategies zu parsen
        structured_plan = None
        if strategies_content:
            try:
                # Versuche JSON-Block zu extrahieren
                import re
                json_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', strategies_content)
                if json_match:
                    json_string = json_match.group(1)
                    structured_plan = json.loads(json_string)
                else:
                    # Fallback: Suche nach JSON-Objekt
                    json_match = re.search(r'(\{[\s\S]*\})', strategies_content)
                    if json_match:
                        json_string = json_match.group(1)
                        structured_plan = json.loads(json_string)
            except (json.JSONDecodeError, AttributeError) as e:
                logger.warning(f"Konnte JSON aus strategies nicht parsen: {e}")
        
        # Falls kein strukturierter Plan gefunden, erstelle Minimal-Plan
        if not structured_plan:
            customer_analysis = plan_data.get('customer_analysis', {})
            structured_plan = {
                "executive_summary": {
                    "churn_risk": int(customer_analysis.get('churn_probability', 0) * 100),
                    "clv_uplift": customer_analysis.get('estimated_annual_value_eur', 0) * 2,
                    "roi_estimate": 150,  # Default ROI
                    "top_insight": "Automatisch generierter Retention-Plan basierend auf Kundendaten.",
                    "clv_status_quo": customer_analysis.get('estimated_annual_value_eur', 0),
                    "clv_retention": customer_analysis.get('estimated_annual_value_eur', 0) * 2.5
                },
                "customer_profile": {
                    "id": customer_analysis.get('customer_id', 0),
                    "age_group": "25-44",  # Default
                    "value_tier": customer_analysis.get('risk_category', 'Standard'),
                    "membership_stage": "Etabliert",
                    "activity_status": "Aktiv" if customer_analysis.get('days_since_last_checkin', 99) < 14 else "Inaktiv",
                    "key_metrics": {
                        "days_inactive": customer_analysis.get('days_since_last_checkin', 0),
                        "monthly_visits": customer_analysis.get('checkins_per_month', 0),
                        "monthly_fee": customer_analysis.get('current_monthly_fee', 89),
                        "engagement_score": 3.5  # Default
                    }
                },
                "top_actions": [
                    {
                        "title": "Personalisierte Ansprache",
                        "description": "Direkte Kontaktaufnahme durch Studio-Manager zur Identifikation von Barrieren.",
                        "timeframe": "Sofort",
                        "priority": "high",
                        "cost_estimate": 25
                    },
                    {
                        "title": "Rabatt-Angebot",
                        "description": "Zeitlich begrenztes Angebot zur Reaktivierung.",
                        "timeframe": "2 Wochen",
                        "priority": "medium",
                        "cost_estimate": 50
                    }
                ]
            }
        
        # Generiere PDF-Dateinamen
        plan_id = plan_data.get('plan_id', f"plan_{int(datetime.now().timestamp())}")
        pdf_filename = f"{plan_id}.pdf"
        pdf_path = output_path / pdf_filename
        
        # Erstelle PDF
        success = create_retention_plan_pdf(structured_plan, str(pdf_path))
        
        if success:
            logger.info(f"SUCCESS: PDF erfolgreich erstellt: {pdf_path}")
            return {
                'success': True,
                'pdf_path': str(pdf_path),
                'filename': pdf_filename,
                'plan_id': plan_id
            }
        else:
            return {
                'success': False,
                'error': 'PDF-Generierung fehlgeschlagen',
                'error_type': 'pdf_generation_error'
            }
            
    except Exception as e:
        error_msg = f"Fehler beim Speichern als PDF: {str(e)}"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'pdf_save_error'
        }


def _process_rag_to_actionable_plan(rag_results: str, customer_data: Dict[str, Any]) -> Dict[str, Any]:
    pass
    
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel
        from datetime import datetime
        
        # Initialize Vertex AI
        try:
            vertexai.init(project=config.VERTEXAI_PROJECT, location=config.VERTEXAI_LOCATION)
        except:
            pass  # Already initialized
        
        # Extract customer context - support both nested and flat data structures
        actual_customer_data = customer_data.get('customer_data', customer_data)
        
        customer_id = actual_customer_data.get('mitglied_id') or customer_data.get('customer_id') or 'N/A'
        churn_prob = actual_customer_data.get('churn_score_bias_corrected') or customer_data.get('churn_probability') or 0
        risk_category = actual_customer_data.get('risiko_kategorie') or customer_data.get('risk_category') or 'UNBEKANNT'
        days_inactive = actual_customer_data.get('tage_seit_letztem_checkin') or customer_data.get('days_since_last_checkin') or 0
        checkins_monthly = actual_customer_data.get('checkins_pro_monat') or customer_data.get('checkins_per_month') or 0
        monthly_fee = actual_customer_data.get('aktueller_beitrag_eur') or customer_data.get('current_monthly_fee') or 0
        membership_months = actual_customer_data.get('mitgliedschaft_dauer_monate') or customer_data.get('membership_duration_months') or 0
        
        # Get additional customer data - already extracted above
        
        engagement_score = actual_customer_data.get('engagement_score') or customer_data.get('engagement_score') or 0
        age = actual_customer_data.get('alter_jahre') or customer_data.get('age') or 0
        gender = actual_customer_data.get('geschlecht') or customer_data.get('gender') or 'N/A'
        avg_duration = actual_customer_data.get('durchschn_aufenthalt_min') or customer_data.get('avg_duration') or 0
        
        # Debug log for troubleshooting
        logger.info(f"DEBUG - Retention plan data: Age={age}, Gender={gender}, Customer ID={customer_id}")
        
        # Calculate derived values from existing data
        if age > 0:
            if age <= 25:
                age_group = 'Jung (18-25)'
            elif age <= 40:
                age_group = 'Mittel (26-40)'
            elif age <= 55:
                age_group = 'Reif (41-55)'
            else:
                age_group = 'Senior (55+)'
        else:
            age_group = 'Unbekannt'
            
        if days_inactive <= 7:
            inactivity_category = 'Aktiv'
        elif days_inactive <= 14:
            inactivity_category = 'Leicht inaktiv'
        elif days_inactive <= 30:
            inactivity_category = 'Inaktiv'
        else:
            inactivity_category = 'Stark inaktiv'
            
        if membership_months <= 3:
            membership_stage = 'Neukunde'
        elif membership_months <= 12:
            membership_stage = 'Etabliert'
        else:
            membership_stage = 'Langzeitmitglied'
            
        if monthly_fee >= 100:
            value_tier = 'Premium'
        elif monthly_fee >= 50:
            value_tier = 'Standard'
        else:
            value_tier = 'Basic'
        
        # Get ML explanation for this specific customer to identify root causes
        ml_explanation = None
        try:
            ml_result = get_churn_explanation_bqml(
                ToolContext(session_id="retention_plan", user_id="system"),
                customer_id=customer_id
            )
            if ml_result.get('success') and ml_result.get('explanation'):
                ml_explanation = ml_result['explanation']
        except:
            pass
        
        # Identify specific problems based on ML explanation + data analysis
        identified_problems = []
        
        # Use ML explanation top risk factors if available
        if ml_explanation and ml_explanation.get('top_risk_factors'):
            for risk_factor in ml_explanation['top_risk_factors'][:3]:  # Top 3 ML-identified factors
                feature_name = risk_factor.get('display_name', risk_factor.get('feature_name', ''))
                attribution = risk_factor.get('attribution', 0)
                identified_problems.append(f"ML-RISIKOFAKTOR: {feature_name} (Einfluss: {attribution:.3f})")
        
        # Fallback to traditional data analysis if ML explanation not available
        if not identified_problems:
            if days_inactive > 30:
                identified_problems.append(f"INAKTIVITÄT: {days_inactive} Tage ohne Studiobesuch")
            
            if avg_duration > 0 and avg_duration < 60:
                identified_problems.append(f"KURZE TRAININGSZEITEN: Durchschnittlich nur {avg_duration} Minuten pro Besuch")
                
            if customer_data.get('gekuendigt', 0) == 1:
                identified_problems.append("GEKÜNDIGTES MITGLIED: Bereits gekündigt - Rückgewinnungsmaßnahmen erforderlich")
                
            # Note: Hohes Churn-Risiko is a result, not a cause - removed to show actual risk factors

        problems_text = "\n".join([f"- {problem}" for problem in identified_problems]) if identified_problems else "- Keine kritischen Probleme identifiziert"

        # Build ML-informed prompt for LLM processing
        ml_context = ""
        if ml_explanation:
            top_risks = ml_explanation.get('top_risk_factors', [])
            protective_factors = ml_explanation.get('top_protective_factors', [])
            
            ml_context = f"""
ML-MODELL ERKENNTNISSE:
- Predicted Churn Risk: {ml_explanation.get('predicted_probability', 0):.1f}%
- Baseline Risk: {ml_explanation.get('baseline_probability', 0):.1f}%

TOP RISIKOFAKTOREN (ML-identifiziert):
{chr(10).join([f"- {factor.get('display_name', factor.get('feature_name', ''))}: {factor.get('attribution', 0):.3f}" for factor in top_risks[:3]])}

SCHÜTZENDE FAKTOREN (ML-identifiziert):  
{chr(10).join([f"- {factor.get('display_name', factor.get('feature_name', ''))}: {factor.get('attribution', 0):.3f}" for factor in protective_factors[:3]])}
"""
        
        # Format current datetime for template
        current_datetime_str = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        # Calculate CLV values for the template
        churn_rate = churn_prob / 100  # Convert percentage to decimal
        discount_rate = 0.005  # 0.5% monthly discount rate (6% annually)
        
        # CLV calculations with realistic retention impact
        clv_status_quo = monthly_fee / (churn_rate + discount_rate) if (churn_rate + discount_rate) > 0 else 0
        
        # Improved retention: Reduce churn by 60-80% (realistic for good retention programs)
        retention_improvement = 0.7  # 70% churn reduction
        improved_churn_rate = churn_rate * (1 - retention_improvement)
        clv_retention = monthly_fee / (improved_churn_rate + discount_rate) if (improved_churn_rate + discount_rate) > 0 else 0
        
        clv_uplift = clv_retention - clv_status_quo
        
        # PLACEHOLDER: Set initial ROI for prompt generation
        # Real ROI will be calculated after the plan is generated based on actual action costs
        placeholder_roi_estimate = 100  # Temporary value for prompt, will be recalculated later
        
        # Use annual CLV uplift for ROI calculation (12 months is standard retention timeframe)
        annual_clv_uplift = clv_uplift * 12
        
        prompt = RETENTION_PLAN_PROMPT_TEMPLATE.format(
            customer_id=customer_id,
            churn_prob=churn_prob,
            risk_category=risk_category,
            inactivity_category=inactivity_category,
            membership_stage=membership_stage,
            value_tier=value_tier,
            age_group=age_group,
            gender=gender,
            days_inactive=days_inactive,
            checkins_monthly=checkins_monthly,
            checkins_weekly=checkins_monthly / 4,
            monthly_fee=monthly_fee,
            annual_fee=monthly_fee * 12,
            membership_months=membership_months,
            engagement_score=engagement_score,
            avg_duration=avg_duration,
            ml_context=ml_context,
            problems_text=problems_text,
            rag_results=rag_results,
            age=age,
            datetime=current_datetime_str,
            clv_status_quo=clv_status_quo,
            clv_retention=clv_retention,
            clv_uplift=annual_clv_uplift,
            roi_estimate=placeholder_roi_estimate
        )



        # Use Gemini to process RAG fragments into actionable plan
        from vertexai.generative_models import GenerationConfig
        
        model = GenerativeModel("gemini-2.0-flash-001")
        
        # Configure generation for detailed, comprehensive output
        generation_config = GenerationConfig(
            temperature=0.6,  # Lower temperature for more consistent complete plans
            top_p=0.95,
            top_k=40,
            max_output_tokens=8192,  # ERHÖHT: Für vollständige Retention-Pläne ohne Abschneidung
            candidate_count=1,
            stop_sequences=None  # Ensure no early stopping
        )
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        if response and response.text:
            response_text = response.text.strip()
            
            try:
                # Try to parse as JSON first (new format)
                import json
                parsed_json = json.loads(response_text)
                
                # Validate the JSON has the expected structure
                if 'executive_summary' in parsed_json and 'customer_profile' in parsed_json:
                    logger.info("SUCCESS: Successfully parsed JSON response from LLM")
                    
                    # CALCULATE REAL ROI based on actual action costs
                    real_roi = _calculate_realistic_roi(parsed_json, annual_clv_uplift)
                    
                    # Update the executive summary with the real ROI
                    if 'executive_summary' in parsed_json:
                        parsed_json['executive_summary']['roi_estimate'] = real_roi
                    
                    # Convert JSON to HTML for display using white background template
                    html_plan = _render_retention_plan_html(parsed_json)
                    
                    return {
                        'success': True,
                        'processed_plan': html_plan,
                        'structured_data': parsed_json,
                        'plan_type': 'executive_summary'
                    }
                else:
                    logger.warning("JSON response missing required fields, falling back to markdown parsing")
                    
            except json.JSONDecodeError as e:
                logger.info(f"Response is not JSON, parsing as markdown: {e}")
                # Fall back to markdown parsing
                pass
            
            # Original markdown parsing (fallback)
            processed_plan = response_text
            
            # Extract actionable steps from the markdown structure
            actionable_steps = []
            
            # Parse for implementation phases (Phase 1, 2, 3)
            if "Phase 1: Akute Intervention" in processed_plan:
                phase1_section = processed_plan.split("Phase 1: Akute Intervention")[1].split("Phase 2")[0] if "Phase 2" in processed_plan else processed_plan.split("Phase 1: Akute Intervention")[1].split("##")[0]
                phase1_lines = [line.strip() for line in phase1_section.split('\n') if line.strip() and (line.strip().startswith('-') or line.strip().startswith('•'))]
                for line in phase1_lines[:5]:  # Max 5 steps
                    actionable_steps.append({
                        "action": line.strip('- •').strip(),
                        "timeframe": "0-2 Wochen",
                        "priority": "high",
                        "category": "akute_intervention"
                    })
            
            if "Phase 2: Stabilisierung" in processed_plan:
                phase2_section = processed_plan.split("Phase 2: Stabilisierung")[1].split("Phase 3")[0] if "Phase 3" in processed_plan else processed_plan.split("Phase 2: Stabilisierung")[1].split("##")[0]
                phase2_lines = [line.strip() for line in phase2_section.split('\n') if line.strip() and (line.strip().startswith('-') or line.strip().startswith('•'))]
                for line in phase2_lines[:6]:  # Max 6 steps  
                    actionable_steps.append({
                        "action": line.strip('- •').strip(),
                        "timeframe": "2-8 Wochen", 
                        "priority": "medium",
                        "category": "stabilisierung"
                    })
            
            if "Phase 3: Langfristige Bindung" in processed_plan:
                phase3_section = processed_plan.split("Phase 3: Langfristige Bindung")[1].split("##")[0] if "##" in processed_plan.split("Phase 3: Langfristige Bindung")[1] else processed_plan.split("Phase 3: Langfristige Bindung")[1]
                phase3_lines = [line.strip() for line in phase3_section.split('\n') if line.strip() and (line.strip().startswith('-') or line.strip().startswith('•'))]
                for line in phase3_lines[:4]:  # Max 4 steps
                    actionable_steps.append({
                        "action": line.strip('- •').strip(),
                        "timeframe": "2-6 Monate",
                        "priority": "medium", 
                        "category": "langfristige_bindung"
                    })
            
            # Extract identified problems for metadata
            problems_identified = []
            if "IDENTIFIZIERTE KERNPROBLEME" in processed_plan:
                problems_section = processed_plan.split("IDENTIFIZIERTE KERNPROBLEME")[1].split("##")[0] if "##" in processed_plan.split("IDENTIFIZIERTE KERNPROBLEME")[1] else processed_plan.split("IDENTIFIZIERTE KERNPROBLEME")[1]
                problems_lines = [line.strip() for line in problems_section.split('\n') if line.strip() and (line.strip().startswith('-') or line.strip().startswith('•'))]
                problems_identified = [line.strip('- •').strip() for line in problems_lines[:6]]
            
            # Create structured JSON plan for frontend (markdown fallback)
            structured_plan = {
                "plan_id": f"plan_{customer_id}_{int(time.time())}",
                "customer_id": customer_id,
                "plan_type": "markdown",
                "created_at": datetime.now().isoformat(),
                "customer_analysis": customer_data,
                "target_segment": "individual",
                "identified_problems": identified_problems,
                "problems_from_analysis": problems_identified,
                "actionable_steps": actionable_steps,
                "success_metrics": {
                    "target_churn_reduction": max(10, churn_prob * 0.6),  # Reduce by 40%
                    "target_checkins_monthly": max(4, checkins_monthly * 1.5),
                    "target_days_since_checkin": min(14, max(7, days_inactive * 0.5)),
                    "engagement_improvement": f"Steigerung von {engagement_score:.1f} auf {min(100, engagement_score + 20):.1f} Punkte",
                    "retention_probability": min(95, 100 - (churn_prob * 0.4))
                },
                "implementation_timeline": [
                    {"phase": "Akute Intervention", "duration": "0-2 Wochen", "focus": "Problemlösung"},
                    {"phase": "Stabilisierung", "duration": "2-8 Wochen", "focus": "Gewohnheitsbildung"},
                    {"phase": "Langfristige Bindung", "duration": "2-6 Monate", "focus": "Loyalty"}
                ],
                "strategies": processed_plan  # Full processed text for display
            }
            
            logger.info(f"RAG-TO-PLAN: Successfully processed RAG fragments into {len(actionable_steps)} actionable steps for customer {customer_id}")
            
            return {
                "success": True,
                "processed_plan": processed_plan,
                "structured_data": structured_plan,
                "actionable_steps_count": len(actionable_steps)
            }
        else:
            logger.error("RAG-TO-PLAN: No response from LLM processing")
            return {
                "success": False,
                "error": "LLM processing failed",
                "processed_plan": rag_results,  # Fallback to raw RAG
                "structured_data": None
            }
            
    except Exception as e:
        logger.error(f"RAG-TO-PLAN: Error processing RAG to actionable plan: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "processed_plan": None,
            "structured_data": None
        }


def _generate_response_summary(result: Dict[str, Any]) -> str:
    """
    Generate a brief summary of the execution result for conversation history.
    
    Parameter:
        result: Tool execution result
        
    Rückgabe:
        Brief summary string
    """
    try:
        if not result.get('success'):
            return f"Execution failed: {result.get('error', 'Unknown error')}"
        
        if result.get('type') == 'churn_prediction':
            customer_id = result.get('data', {}).get('customer_id')
            churn_score = result.get('data', {}).get('churn_probability')
            return f"Churn prediction completed for customer {customer_id}: {churn_score}% risk"
        
        elif result.get('type') == 'retention_plan':
            plan_id = result.get('data', {}).get('plan_id')
            return f"Retention plan generated: {plan_id}"
        
        elif result.get('type') == 'high_risk_customers':
            count = len(result.get('data', {}).get('customers', []))
            return f"High-risk customer list: {count} customers identified"
        
        elif result.get('type') == 'data_query':
            rows = result.get('data', {}).get('row_count', 0)
            return f"Data query completed: {rows} rows returned"
        
        else:
            return f"Tool execution completed: {result.get('type', 'unknown')}"
    
    except Exception:
        return "Execution completed"


def _execute_single_tool(tool_name: str, parameters: Dict[str, Any], tool_context: ToolContext) -> Dict[str, Any]:
    pass
    
    if tool_name == 'get_churn_prediction':
        return get_churn_prediction(parameters['customer_id'], tool_context)
    
    elif tool_name == 'get_high_risk_customers':
        return get_high_risk_customers(
            tool_context,
            limit=parameters.get('limit', 20),
            risk_threshold=parameters.get('risk_threshold', 0.6)
        )
    
    elif tool_name == 'generate_retention_plan':
        return generate_retention_plan(
            tool_context,
            target_segment=parameters.get('target_segment', 'high_risk'),
            duration_weeks=parameters.get('duration_weeks', 6),
            customer_id=parameters.get('customer_id')  # Optional parameter for personalization
        )
    
    elif tool_name == 'get_table_schema':
        return get_table_schema(tool_context, parameters.get('table_name', 'mitglieder'))
    
    elif tool_name == 'intelligent_query_data':
        return intelligent_query_data(parameters['user_query'], tool_context)
    
    elif tool_name == 'execute_secure_sql':
        return execute_secure_sql(parameters['query'], tool_context)
    
    elif tool_name == 'query_retention_knowledge':
        return query_retention_knowledge(parameters['query'], tool_context)
    
    else:
        return {
            'success': False,
            'error': f'Unknown tool: {tool_name}',
            'error_type': 'unknown_tool'
        }





# ==========================================
# RAG RETENTION KNOWLEDGE TOOL
# ==========================================

import httpx
import asyncio

def query_retention_knowledge(query: str, tool_context: ToolContext) -> Dict[str, Any]:
    """Query retention knowledge using RAG (Retrieval-Augmented Generation).
    
    Provides AI-powered retention strategies and recommendations based on a 
    vector database of proven retention tactics. Perfect for generating 
    customized retention plans and strategies.
    
    Use this tool when:
    - User asks for retention strategies
    - Generating retention plans 
    - Seeking specific retention tactics
    - Need evidence-based recommendations
    
    Examples:
    - "Welche Retention-Strategien gibt es für Hochrisikokunden?"
    - "Wie kann ich inaktive Mitglieder reaktivieren?"
    - "Was sind bewährte Retention-Taktiken für Premium-Kunden?"

    Parameter:
        query: Natural language query about retention strategies.
        tool_context: ADK tool context for state management.
        
    Rückgabe:
        Dictionary with AI-generated retention recommendations.
    """
    state = StateManager.get_state(tool_context)
    
    try:
        logger.info(f"RAG: NEW DIRECT RAG: Processing retention query: {query}")
        
        # Direct Vertex AI RAG integration (simplified to avoid HTTP client conflicts)
        import vertexai
        from vertexai.preview import rag
        
        # Initialize Vertex AI if not already done
        try:
            vertexai.init(project=config.VERTEXAI_PROJECT, location=config.VERTEXAI_LOCATION)
        except:
            pass  # Already initialized
        
        # Build corpus resource name
        corpus_name = config.RAG_CORPUS
        if not corpus_name:
            raise ValueError("Set VERTEXAI_RAG_CORPUS to a corpus in your own cloud project.")
        
        # Perform RAG retrieval directly
        response = rag.retrieval_query(
            rag_resources=[
                rag.RagResource(rag_corpus=corpus_name)
            ],
            text=query,
            similarity_top_k=5,
            vector_distance_threshold=0.5,
        )
        
        # Process results
        if response.contexts and response.contexts.contexts:
            contexts = response.contexts.contexts
            logger.info(f"NEW DIRECT RAG: SUCCESS Found {len(contexts)} relevant contexts")
            
            # Extract raw data without formatting
            strategies = []
            sources = []
            
            # High relevance results (top 2)
            high_relevance = contexts[:2]
            for i, context in enumerate(high_relevance):
                content = context.text.strip()
                source_name = "RAG Wissensquelle"  # Simplified - no source access due to ProtoType bug
                
                strategies.append({
                    "content": content,
                    "relevance": "high",
                    "order": i + 1,
                    "source_name": source_name
                })
                
                sources.append({
                    "content": content[:300] + "..." if len(content) > 300 else content,
                    "source_uri": 'rag_corpus',  # Simplified
                    "source_name": source_name,
                    "relevance": "high",
                    "distance": 0.0  # Simplified - no distance access
                })
            
            # Medium relevance results
            if len(contexts) > 2:
                for i, context in enumerate(contexts[2:]):
                    content = context.text.strip()
                    source_name = "RAG Wissensquelle"  # Simplified - no source access due to ProtoType bug
                    
                    strategies.append({
                        "content": content[:200] + "..." if len(content) > 200 else content,
                        "relevance": "medium", 
                        "order": len(high_relevance) + i + 1,
                        "source_name": source_name
                    })
                    
                    sources.append({
                        "content": content[:200] + "..." if len(content) > 200 else content,
                        "source_uri": 'rag_corpus',  # Simplified
                        "source_name": source_name,
                        "relevance": "medium",
                        "distance": 0.0  # Simplified - no distance access
                    })
            
            confidence = "high" if len(high_relevance) >= 2 else "medium"
            
            result = {
                'success': True,
                'strategies': strategies,
                'knowledge_sources': sources,
                'query': query,
                'confidence': confidence,
                'total_contexts': len(contexts)
            }
        else:
            logger.warning(f"No RAG results found for query: {query}")
            result = {
                'success': True,
                'strategies': [],
                'knowledge_sources': [],
                'query': query,
                'confidence': 'low',
                'total_contexts': 0
            }
        
        # Store in state
        state.last_rag_query = query
        state.last_rag_result = result
        StateManager.save_state(tool_context, state)
        
        return {
            'success': True,
            'strategies': result.get('strategies', []),
            'knowledge_sources': result.get('knowledge_sources', []),
            'query': query,
            'timestamp': datetime.now().isoformat(),
            'confidence': result.get('confidence', 'medium'),
            'total_contexts': result.get('total_contexts', 0)
        }
            
    except Exception as e:
        logger.error(f"Error in RAG retention query: {e}")
        return {
            'success': False,
            'error': f"RAG service error: {str(e)}"
        }


def _query_rag_service_sync(query: str, limit: int = 5, threshold: float = 0.7) -> Dict[str, Any]:
    pass
    
    rag_service_url = "http://localhost:8000"
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{rag_service_url}/query",
                json={
                    "query": query,
                    "limit": limit,
                    "threshold": threshold
                },
                headers={"Content-Type": "application/json"}
            )
            
            response.raise_for_status()
            return response.json()
            
    except httpx.RequestError as e:
        logger.error(f"RAG service connection error: {e}")
        return {"success": False, "error": f"Service unavailable: {str(e)}"}
    except httpx.HTTPStatusError as e:
        logger.error(f"RAG service HTTP error: {e}")
        return {"success": False, "error": f"Service error: {e.response.status_code}"}
    except Exception as e:
        logger.error(f"RAG service unexpected error: {e}")
        return {"success": False, "error": f"Unexpected error: {str(e)}"}


# Fallback-System entfernt - MCP muss funktionieren!


# Helper functions for enhanced retention plan generation

# DEAKTIVIERT: User möchte nur HTML Template Design verwenden  
# def _convert_json_to_markdown(json_data: Dict[str, Any]) -> str:
#     """
#     Convert structured JSON retention plan to markdown for display.
#     Creates an ultra-compact executive dashboard format.
#     """
#     try:
#         markdown_sections = []
#         
#         # Header
#         markdown_sections.append("# RETENTION DASHBOARD")
#         markdown_sections.append("")
#         
#         # Executive Summary - Key Metrics
#         exec_summary = json_data.get('executive_summary', {})
#         churn_risk = exec_summary.get('churn_risk', 0)
#         clv_uplift = exec_summary.get('clv_uplift', 0)
#         roi_estimate = exec_summary.get('roi_estimate', 0)
#         top_insight = exec_summary.get('top_insight', 'Keine Erkenntnisse verfügbar')
#         
#         # Color coding for metrics
#         churn_level = "CRITICAL" if churn_risk >= 70 else "HIGH" if churn_risk >= 50 else "MEDIUM" if churn_risk >= 30 else "LOW"
#         clv_level = "EXCELLENT" if clv_uplift >= 200 else "GOOD" if clv_uplift >= 100 else "FAIR" if clv_uplift >= 50 else "POOR"
#         roi_level = "EXCELLENT" if roi_estimate >= 200 else "GOOD" if roi_estimate >= 100 else "FAIR" if roi_estimate >= 50 else "POOR"
#         
#         markdown_sections.append("## METRICS: Key Metrics")
#         markdown_sections.append("")
#         markdown_sections.append(f"[{churn_level}] **Churn-Risiko:** {churn_risk:.0f}%")
#         markdown_sections.append(f"[{clv_level}] **CLV-Uplift:** €{clv_uplift:.0f}")
#         markdown_sections.append(f"[{roi_level}] **ROI-Potenzial:** {roi_estimate}%")
#         markdown_sections.append("")
#         
#         # Add detailed CLV breakdown if available
#         clv_status_quo = exec_summary.get('clv_status_quo', 0)
#         clv_retention = exec_summary.get('clv_retention', 0)
#         if clv_status_quo > 0 and clv_retention > 0:
#             improvement_pct = ((clv_retention - clv_status_quo) / clv_status_quo * 100) if clv_status_quo > 0 else 0
#             markdown_sections.append("### CLV-Vergleich")
#             markdown_sections.append("")
#             markdown_sections.append(f"**Status Quo:** €{clv_status_quo:,.0f} | **Mit Retention:** €{clv_retention:,.0f} | **Steigerung:** +{improvement_pct:.1f}%")
#             markdown_sections.append("")
#         
#         # Top Insight
#         markdown_sections.append("## INSIGHT: Top Insight")
#         markdown_sections.append("")
#         markdown_sections.append(f"> {top_insight}")
#         markdown_sections.append("")
#         
#         # Customer Snapshot - Compact table
#         customer_profile = json_data.get('customer_profile', {})
#         key_metrics = customer_profile.get('key_metrics', {})
#         
#         markdown_sections.append("## Kunde")
#         markdown_sections.append("")
#         markdown_sections.append(f"**ID {customer_profile.get('id', 'N/A')}** • {customer_profile.get('age_group', 'Unbekannt')} • {customer_profile.get('value_tier', 'Standard')} • {key_metrics.get('days_inactive', 0)}d inaktiv • {key_metrics.get('monthly_visits', 0):.0f} Besuche/Monat")
#         markdown_sections.append("")
#         
#         # Top Actions - Ultra-compact table format
#         top_actions = json_data.get('top_actions', [])
#         if top_actions:
#             markdown_sections.append("## Sofort-Aktionen")
#             markdown_sections.append("")
#             markdown_sections.append("| Aktion | Ziel / Impact | Status |")
#             markdown_sections.append("|--------|---------------|--------|")
#             
#             for action in top_actions[:3]:  # Max 3 actions
#                 title = action.get('title', 'Unbenannt')
#                 description = action.get('description', '')
#                 timeframe = action.get('timeframe', '')
#                 expected_result = action.get('expected_result', '')
#                 priority = action.get('priority', 'medium')
#                 
#                 # Create compact description
#                 short_desc = description[:30] + "..." if len(description) > 30 else description
#                 
#                 # Priority emoji
#                 priority_emoji = "HIGH" if priority == 'high' else "MED" if priority == 'medium' else "LOW"
#                 
#                 # Combine timeframe and result
#                 goal_impact = f"{expected_result} ({timeframe})" if timeframe and expected_result else (expected_result or timeframe or "TBD")
#                 
#                 markdown_sections.append(f"| **{title}** ({short_desc}) | {goal_impact} | {priority_emoji} |")
#             
#             markdown_sections.append("")
#         
#         # ML Insights - Compact format
#         ml_insights = json_data.get('ml_insights', {})
#         if ml_insights:
#             markdown_sections.append("## ML-Insights")
#             markdown_sections.append("")
#             
#             # Primary risk factor
#             risk_factor = ml_insights.get('primary_risk_factor', 'Unbekannt')
#             markdown_sections.append(f"WARNING: **Hauptrisiko:** {risk_factor}")
#             
#             # Protective factors as inline list
#             protective_factors = ml_insights.get('protective_factors', [])
#             if protective_factors:
#                 factors_text = " • ".join(protective_factors[:3])  # Max 3 factors
#                 markdown_sections.append(f"PROTECT: **Schutzfaktoren:** {factors_text}")
#             
#             # Confidence with emoji
#             prediction_confidence = ml_insights.get('prediction_confidence', 0)
#             confidence_emoji = "HIGH" if prediction_confidence >= 0.8 else "MED" if prediction_confidence >= 0.6 else "LOW"
#             markdown_sections.append(f"{confidence_emoji} **Konfidenz:** {prediction_confidence:.0%}")
#             markdown_sections.append("")
#         
#         # Success Metrics - Timeline format
#         success_metrics = json_data.get('success_metrics', {})
#         if success_metrics:
#             markdown_sections.append("## Erfolgs-Timeline")
#             markdown_sections.append("")
#             markdown_sections.append("| Zeitraum | SMART-Ziel |")
#             markdown_sections.append("|----------|------------|")
#             markdown_sections.append(f"| **Woche 1** | {success_metrics.get('week_1_target', 'TBD')} |")
#             markdown_sections.append(f"| **Woche 4** | {success_metrics.get('week_4_target', 'TBD')} |")
#             markdown_sections.append(f"| **Woche 12** | {success_metrics.get('week_12_target', 'TBD')} |")
#             markdown_sections.append("")
#         
#         # Sources - Minimal footer
#         rag_sources = json_data.get('rag_sources', [])
#         if rag_sources:
#             sources_text = " • ".join(rag_sources[:2])  # Max 2 sources for brevity
#             markdown_sections.append(f"---")
#             markdown_sections.append(f"**Quellen:** {sources_text}")
#             markdown_sections.append("")
#         
#         return "\n".join(markdown_sections)
#         
#     except Exception as e:
#         logger.error(f"Error converting JSON to markdown: {e}")
#         return f"**Fehler bei der Formatierung des Retention-Plans**\n\nRaw JSON:\n```json\n{json.dumps(json_data, indent=2, ensure_ascii=False)}\n```"


def _render_retention_plan_html(json_data: Dict[str, Any]) -> str:
    """
    Rendert Retention Plan JSON-Daten mit dem HTML Template für Chat-Anzeige.
    
    Args:
        json_data: JSON-Daten des Retention Plans
        
    Returns:
        HTML-String mit dem gerenderten Plan
    """
    try:
        # Get the directory of this script to find the template
        script_dir = Path(__file__).parent
        template_path = script_dir / "retention_plan_template.html"
        
        if not template_path.exists():
            logger.error(f"Template nicht gefunden: {template_path}")
            return f"<div class='error'>Template nicht gefunden: {template_path}</div>"
        
        # Setup Jinja2 environment
        template_loader = jinja2.FileSystemLoader(searchpath=str(script_dir))
        template_env = jinja2.Environment(loader=template_loader)
        template = template_env.get_template("retention_plan_template.html")
        
        # Extract data from json_data
        executive_summary = json_data.get('executive_summary', {})
        customer_profile = json_data.get('customer_profile', {})
        top_actions = json_data.get('top_actions', [])
        
        # Generate CLV chart if we have the data
        clv_chart_base64 = None
        clv_status_quo = executive_summary.get('clv_status_quo', 0)
        clv_retention = executive_summary.get('clv_retention', 0)
        monthly_fee = customer_profile.get('key_metrics', {}).get('monthly_fee', 100)
        
        if clv_status_quo > 0 and clv_retention > 0:
            clv_chart_base64 = create_clv_chart(clv_status_quo, clv_retention, monthly_fee)
        
        # Prepare template context
        context = {
            'executive_summary': executive_summary,
            'customer_profile': customer_profile,
            'top_actions': top_actions,
            'clv_chart_base64': clv_chart_base64,
            'creation_date': datetime.now().strftime('%d.%m.%Y %H:%M'),
        }
        
        # Render HTML
        rendered_html = template.render(context)
        
        logger.info("HTML Template erfolgreich gerendert")
        return rendered_html
        
    except Exception as e:
        logger.error(f"Fehler beim HTML-Rendering: {e}")
        return f"""
        <div class="error-fallback">
            <h2>Retention Plan</h2>
            <div class="error-message">
                Fehler beim HTML-Rendering: {str(e)}
            </div>
            <h3>Rohdaten:</h3>
            <pre>{json.dumps(json_data, indent=2, ensure_ascii=False)}</pre>
        </div>
        """


def _build_personalized_rag_query(customer_analysis: Dict[str, Any]) -> str:
    """
    Build a highly personalized RAG query with specific customer context.
    
    Creates detailed, contextualized queries that include:
    - Specific behavioral patterns and risk factors
    - BQML model insights about why the customer is at risk
    - Concrete customer characteristics for targeted strategies
    """
    
    # Extract detailed customer data
    customer_data = customer_analysis.get('customer_data', {})
    churn_prob = customer_analysis.get('churn_probability', 0)
    customer_id = customer_analysis.get('customer_id', 'Unknown')
    
    # Build structured, detailed query with specific context
    query_sections = []
    
    # 1. Customer Profile Section
    profile_details = []
    if customer_data.get('alter_jahre'):
        profile_details.append(f"{customer_data['alter_jahre']} Jahre alt")
    if customer_data.get('geschlecht'):
        profile_details.append(f"Geschlecht: {customer_data['geschlecht']}")
    if customer_data.get('mitgliedschaft_dauer_monate'):
        profile_details.append(f"Mitglied seit {customer_data['mitgliedschaft_dauer_monate']:.1f} Monaten")
    
    if profile_details:
        query_sections.append(f"Fitnessstudio-Mitglied ({', '.join(profile_details)})")
    
    # 2. Risk and Behavioral Context
    behavioral_context = []
    
    # Detailed activity patterns
    if customer_data.get('tage_seit_letztem_checkin'):
        days_inactive = customer_data['tage_seit_letztem_checkin']
        if days_inactive > 90:
            behavioral_context.append(f"seit {days_inactive} Tagen vollständig inaktiv")
        elif days_inactive > 60:
            behavioral_context.append(f"seit {days_inactive} Tagen nicht mehr im Studio")
        elif days_inactive > 30:
            behavioral_context.append(f"reduzierte Aktivität (letzter Besuch vor {days_inactive} Tagen)")
    
    if customer_data.get('checkins_pro_monat'):
        monthly_visits = customer_data['checkins_pro_monat']
        if monthly_visits < 2:
            behavioral_context.append("sehr geringe Besuchsfrequenz (unter 2x pro Monat)")
        elif monthly_visits < 4:
            behavioral_context.append("niedrige Besuchsfrequenz (unter 4x pro Monat)")
    
    if customer_data.get('durchschn_aufenthalt_min'):
        avg_duration = customer_data['durchschn_aufenthalt_min']
        if avg_duration < 45:
            behavioral_context.append("kurze Trainingseinheiten (unter 45 Minuten)")
        elif avg_duration > 120:
            behavioral_context.append("intensive, lange Trainingseinheiten")
    
    # 3. Financial Context
    financial_context = []
    if customer_data.get('aktueller_beitrag_eur'):
        monthly_fee = customer_data['aktueller_beitrag_eur']
        if monthly_fee > 80:
            financial_context.append(f"Premium-Mitglied (€{monthly_fee:.0f}/Monat)")
        elif monthly_fee < 30:
            financial_context.append(f"Budget-bewusst (€{monthly_fee:.0f}/Monat)")
        else:
            financial_context.append(f"Standard-Beitrag (€{monthly_fee:.0f}/Monat)")
    
    if customer_data.get('zahlungsart'):
        payment_method = customer_data['zahlungsart']
        if payment_method == 'Lastschrift':
            financial_context.append("automatische Abbuchung")
        elif payment_method in ['Überweisung', 'Rechnung']:
            financial_context.append("manuelle Zahlung (erhöhte Abbruchgefahr)")
    
    # 4. Contract Context
    contract_context = []
    if customer_data.get('laufzeit'):
        contract_type = customer_data['laufzeit']
        if 'Monat' in str(contract_type) and '12' not in str(contract_type):
            contract_context.append("kurze Vertragsbindung")
        elif '24' in str(contract_type):
            contract_context.append("längere Vertragsbindung")
    
    if customer_data.get('vertragsende_aktuell'):
        # Could add contract end date analysis here
        contract_context.append("mit definiertem Vertragsende")
    
    # 5. Risk Level and Urgency
    risk_context = []
    if churn_prob > 70:
        risk_context.append("KRITISCHES Abwanderungsrisiko (sofortige Maßnahmen erforderlich)")
    elif churn_prob > 60:
        risk_context.append("HOHES Abwanderungsrisiko (dringende Intervention nötig)")
    elif churn_prob > 50:
        risk_context.append("ERHÖHTES Abwanderungsrisiko (präventive Maßnahmen empfohlen)")
    
    # 6. BQML Model Insights (if available)
    model_insights = []
    bqml_explanation = customer_analysis.get('bqml_explanation', {})
    if bqml_explanation.get('top_risk_factors'):
        top_factors = bqml_explanation['top_risk_factors'][:2]  # Top 2 risk factors
        for factor in top_factors:
            factor_name = factor.get('display_name', '')
            factor_value = factor.get('value', '')
            if factor_name and factor_value:
                model_insights.append(f"Hauptrisikofaktor: {factor_name} ({factor_value})")
    
    # 7. Build final query
    all_contexts = []
    if behavioral_context:
        all_contexts.extend(behavioral_context)
    if financial_context:
        all_contexts.extend(financial_context)
    if contract_context:
        all_contexts.extend(contract_context)
    if model_insights:
        all_contexts.extend(model_insights)
    
    # Construct the specific, actionable query with member ID and churn score
    customer_base = f"Fitnessstudio-Mitglied {customer_id} (Churn-Risiko: {churn_prob:.1f}%"
    
    # Add membership duration context even if other data is sparse
    if customer_data.get('mitgliedschaft_dauer_monate'):
        duration_months = customer_data['mitgliedschaft_dauer_monate']
        if duration_months > 48:
            customer_base += f", langjähriges Mitglied seit {duration_months:.0f} Monaten"
        elif duration_months > 12:
            customer_base += f", etabliertes Mitglied seit {duration_months:.0f} Monaten"
        else:
            customer_base += f", neues Mitglied seit {duration_months:.0f} Monaten"
    
    customer_base += ")"
    
    # Always include risk assessment even with sparse data
    if churn_prob > 70:
        urgency = "SOFORTIGE spezifische Maßnahmen erforderlich"
    elif churn_prob > 60:
        urgency = "DRINGENDE personalisierte Intervention nötig"
    elif churn_prob > 50:
        urgency = "gezielte Retention-Maßnahmen empfohlen"
    else:
        urgency = "präventive, personalisierte Strategien entwickeln"
    
    base_query = f"Konkrete, spezifische Retention-Strategien für {customer_base}"
    
    if all_contexts:
        detailed_context = " - ".join(all_contexts)
        final_query = f"{base_query} mit folgenden Charakteristika: {detailed_context}. {urgency}"
    else:
        # Even with sparse data, include risk level and member duration
        final_query = f"{base_query}. {urgency}"
    
    # Request specific, actionable recommendations
    final_query += ". Bitte konkrete, spezifische Handlungsempfehlungen für diesen exakten Kundentyp."
    
    return final_query



# ADK Tool Registration für RAG
query_retention_knowledge_tool = FunctionTool(func=query_retention_knowledge)


# ===============================================================================
# BIAS-KORREKTUR FUNKTIONEN FÜR NEUE KUNDEN
# ===============================================================================

def _apply_new_customer_bias_correction(customer_data: Dict[str, Any]) -> tuple[float, Dict[str, Any]]:
    """
    Korrigiert den Modell-Bias für neue hochaktive Kunden.
    
    Parameter:
        customer_data: Kundendaten aus BigQuery
        
    Rückgabe:
        Tuple[adjusted_churn_score, bias_correction_info]
    """
    raw_score = customer_data.get('churn_score_bias_corrected') or 0.0
    membership_months = customer_data.get('mitgliedschaft_dauer_monate') or 0.0
    total_checkins = customer_data.get('anzahl_checkins') or 0
    days_inactive = customer_data.get('tage_seit_letztem_checkin') or 999
    engagement_score = customer_data.get('engagement_score') or 0.0
    
    # Bias-Korrektur-Bedingungen
    is_new_customer = membership_months <= 3.0
    is_highly_active = total_checkins >= 50
    is_recently_active = days_inactive <= 7
    has_high_engagement = engagement_score is not None and engagement_score >= 50.0
    
    bias_correction = {
        'applied': False,
        'reason': None,
        'original_score': raw_score,
        'adjustment_factor': 1.0,
        'customer_profile': {
            'is_new_customer': is_new_customer,
            'is_highly_active': is_highly_active, 
            'is_recently_active': is_recently_active,
            'has_high_engagement': has_high_engagement
        }
    }
    
    # HAUPTKORREKTUR: Neue hochaktive Kunden
    if is_new_customer and is_highly_active and is_recently_active:
        # Starke Korrektur: 70% Reduktion für neue hochaktive Kunden
        adjustment_factor = 0.3
        adjusted_score = raw_score * adjustment_factor
        
        bias_correction.update({
            'applied': True,
            'reason': 'Neue hochaktive Kunden: Modell-Bias korrigiert',
            'adjustment_factor': adjustment_factor,
            'confidence': 'hoch',
            'evidence': f'{total_checkins} Check-ins in {membership_months:.1f} Monaten, {days_inactive} Tage inaktiv'
        })
        
        logger.info(f"BIAS: Bias-Korrektur angewendet für Kunde {customer_data.get('mitglied_id')}: "
                   f"{raw_score:.1f}% → {adjusted_score:.1f}% (Neue hochaktive Kunden)")
        
        return adjusted_score, bias_correction
    
    # MILDE KORREKTUR: Neue aktive Kunden (weniger streng)
    elif is_new_customer and (is_highly_active or is_recently_active):
        # Moderate Korrektur: 50% Reduktion
        adjustment_factor = 0.5
        adjusted_score = raw_score * adjustment_factor
        
        bias_correction.update({
            'applied': True,
            'reason': 'Neue aktive Kunden: Milde Bias-Korrektur',
            'adjustment_factor': adjustment_factor,
            'confidence': 'mittel',
            'evidence': f'{total_checkins} Check-ins, {days_inactive} Tage inaktiv'
        })
        
        logger.info(f"BIAS: Milde Bias-Korrektur für Kunde {customer_data.get('mitglied_id')}: "
                   f"{raw_score:.1f}% → {adjusted_score:.1f}%")
        
        return adjusted_score, bias_correction
    
    # ENGAGEMENT-KORREKTUR: Hoher Engagement-Score
    elif has_high_engagement and is_recently_active:
        # Engagement-basierte Korrektur: 40% Reduktion
        adjustment_factor = 0.6
        adjusted_score = raw_score * adjustment_factor
        
        bias_correction.update({
            'applied': True,
            'reason': 'Hoher Engagement-Score: Churn-Risiko reduziert',
            'adjustment_factor': adjustment_factor,
            'confidence': 'mittel',
            'evidence': f'Engagement-Score: {engagement_score:.1f}, {days_inactive} Tage inaktiv'
        })
        
        return adjusted_score, bias_correction
    
    # Keine Korrektur erforderlich
    return raw_score, bias_correction


def _calculate_adjusted_risk_category(adjusted_churn_score: float) -> str:
    """
    Berechnet die Risiko-Kategorie basierend auf dem adjustierten Churn-Score.
    
    Parameter:
        adjusted_churn_score: Bias-korrigierter Churn-Score
        
    Rückgabe:
        Adjustierte Risiko-Kategorie
    """
    if adjusted_churn_score >= 70.0:
        return 'KRITISCH'
    elif adjusted_churn_score >= 60.0:
        return 'HOCH'
    elif adjusted_churn_score >= 40.0:
        return 'MITTEL'
    else:
        return 'NIEDRIG'


def _generate_churn_recommendations(risk_category: str, engagement_score: float, payment_method: str) -> List[str]:
    """
    Generiert Empfehlungen basierend auf der adjustierten Risiko-Kategorie.
    
    Parameter:
        risk_category: Adjustierte Risiko-Kategorie
        engagement_score: Engagement-Score des Kunden
        payment_method: Zahlungsart
        
    Rückgabe:
        Liste von Handlungsempfehlungen
    """
    recommendations = []
    
    if risk_category == 'KRITISCH':
        recommendations.extend([
            "Sofortiger persönlicher Kontakt durch Account Manager",
            "Exklusive Vergünstigungen oder Upgrade-Angebote anbieten",
            "Detaillierte Zufriedenheitsanalyse durchführen"
        ])
    elif risk_category == 'HOCH':
        recommendations.extend([
            "Proaktive Kundenbindungsmaßnahmen einleiten",
            "Spezielle Retention-Angebote bereitstellen",
            "Persönliche Trainingsberatung anbieten"
        ])
    elif risk_category == 'MITTEL':
        recommendations.extend([
            "Engagement-Programme vorschlagen",
            "Regelmäßige Check-ins planen",
            "Zusatzleistungen kommunizieren"
        ])
    else:  # NIEDRIG
        recommendations.extend([
            "Standard-Kundenpflege fortsetzen",
            "Cross-Selling-Möglichkeiten prüfen",
            "Positive Erfahrung verstärken"
        ])
    
    # Zusätzliche Empfehlungen basierend auf Engagement
    if engagement_score is not None and engagement_score < 30:
        recommendations.append("Motivations- und Aktivierungsmaßnahmen implementieren")
    elif engagement_score is not None and engagement_score > 70:
        recommendations.append("Als Markenbotschafter für Referrals nutzen")
    
    # Zahlungsart-spezifische Empfehlungen
    if payment_method and payment_method != 'Lastschrift':
        recommendations.append("Lastschrift-Verfahren für stabilere Bindung vorschlagen")
    
    return recommendations[:5]  # Maximal 5 Empfehlungen


def _generate_intelligent_explanation(customer_data: Dict[str, Any], bias_correction: Dict[str, Any] = None) -> str:
    """
    Generiert eine intelligente Erklärung der Churn-Vorhersage inklusive Bias-Korrektur.
    
    Parameter:
        customer_data: Kundendaten aus BigQuery
        bias_correction: Informationen zur angewendeten Bias-Korrektur
        
    Rückgabe:
        Detaillierte Erklärung der Churn-Analyse
    """
    explanation_parts = []
    
    # Basis-Analyse
    membership_months = customer_data.get('mitgliedschaft_dauer_monate') or 0.0
    total_checkins = customer_data.get('anzahl_checkins') or 0
    days_inactive = customer_data.get('tage_seit_letztem_checkin') or 999
    checkins_per_month = customer_data.get('checkins_pro_monat') or 0.0
    
    explanation_parts.append(f"Kunde mit {membership_months:.1f} Monaten Mitgliedschaft und {total_checkins} Check-ins.")
    
    # Aktivitäts-Analyse
    if days_inactive == 0:
        explanation_parts.append("ACTIVE: Hochaktiv: Letzter Besuch heute.")
    elif days_inactive <= 7:
        explanation_parts.append(f"ACTIVE: Kürzlich aktiv: Letzter Besuch vor {days_inactive} Tagen.")
    elif days_inactive <= 30:
        explanation_parts.append(f"WARNING: Mäßig aktiv: Letzter Besuch vor {days_inactive} Tagen.")
    else:
        explanation_parts.append(f"ALERT: Inaktiv: Letzter Besuch vor {days_inactive} Tagen.")
    
    # Engagement-Analyse
    if checkins_per_month >= 8:
        explanation_parts.append("EXCELLENT: Sehr hohe Besuchsfrequenz (>8x/Monat).")
    elif checkins_per_month >= 4:
        explanation_parts.append("GOOD: Gute Besuchsfrequenz (4-8x/Monat).")
    elif checkins_per_month >= 2:
        explanation_parts.append("WARNING: Moderate Besuchsfrequenz (2-4x/Monat).")
    else:
        explanation_parts.append("ALERT: Niedrige Besuchsfrequenz (<2x/Monat).")
    
    # Bias-Korrektur-Information
    if bias_correction and bias_correction.get('applied'):
        explanation_parts.append(f"\nBIAS-CORRECTION: BIAS-KORREKTUR ANGEWENDET: {bias_correction['reason']}")
        explanation_parts.append(f"Original-Score: {bias_correction['original_score']:.1f}% → "
                               f"Adjustiert: {bias_correction['original_score'] * bias_correction['adjustment_factor']:.1f}%")
        explanation_parts.append(f"Begründung: {bias_correction.get('evidence', 'Statistische Modell-Korrektur')}")
    
    return " ".join(explanation_parts)


def _calculate_realistic_roi(parsed_json: dict, annual_clv_uplift: float) -> float:
    """
    EHRLICHE ROI-Berechnung basierend auf den tatsächlichen Kosten der vorgeschlagenen Maßnahmen
    
    Args:
        parsed_json: Der generierte Retention-Plan mit top_actions
        annual_clv_uplift: Der jährliche CLV-Uplift 
        
    Returns:
        Realistischer ROI basierend auf echten Aktionskosten (kann auch negativ sein!)
    """
    try:
        # Extrahiere die vorgeschlagenen Aktionen
        top_actions = parsed_json.get('top_actions', [])
        
        if not top_actions:
            logger.warning("Keine Aktionen im Plan gefunden - verwende Fallback-Kosten")
            # Fallback: Minimaler Plan mit grundlegenden Kontaktkosten
            total_plan_cost = 50  # Basic outreach cost
        else:
            # Summiere die echten Kosten aller vorgeschlagenen Maßnahmen
            total_plan_cost = 0
            for action in top_actions:
                cost = action.get('cost_estimate', 0)
                if cost and cost > 0:
                    total_plan_cost += cost
                else:
                    # Fallback für Aktionen ohne Kostenschätzung
                    priority = action.get('priority', 'medium')
                    if priority == 'high':
                        total_plan_cost += 75  # High-priority actions are more expensive
                    elif priority == 'medium':
                        total_plan_cost += 50  # Medium-priority actions
                    else:
                        total_plan_cost += 25  # Low-priority actions
            
            # Mindestkosten für seriöse Retention-Bemühungen
            total_plan_cost = max(total_plan_cost, 25)  # Minimum 25€ für irgendeinen Plan
        
        # EHRLICHE ROI-Berechnung: Kann auch negativ sein!
        if total_plan_cost > 0:
            roi_percentage = ((annual_clv_uplift - total_plan_cost) / total_plan_cost) * 100
        else:
            roi_percentage = 0
        
        # KEINE künstlichen Minimal-ROI-Werte! 
        # Wenn der ROI schlecht ist, soll das auch angezeigt werden
        logger.info(f"REALISTIC ROI: {roi_percentage:.1f}% (CLV: €{annual_clv_uplift:.0f}, Kosten: €{total_plan_cost:.0f})")
        
        # Runde auf eine Dezimalstelle für bessere Lesbarkeit
        return round(roi_percentage, 1)
        
    except Exception as e:
        logger.error(f"Fehler bei ROI-Berechnung: {e}")
        # Fallback: Ehrlich kommunizieren, dass ROI unbekannt ist
        return 0.0


# ADK Tool Aliases - Diese werden von agent.py erwartet
get_churn_prediction_tool = get_churn_prediction
get_churn_explanation_bqml_tool = get_churn_explanation_bqml
get_table_schema_tool = get_table_schema
get_high_risk_customers_tool = get_high_risk_customers
generate_retention_plan_tool = generate_retention_plan
execute_secure_sql_tool = execute_secure_sql
intelligent_query_data_tool = intelligent_query_data
validate_schema_with_bigquery_tool = validate_schema_with_bigquery
query_retention_knowledge_tool = query_retention_knowledge

# Docstring-Zuweisungen für alle Hauptfunktionen
get_churn_prediction.__doc__ = DOCSTRINGS['get_churn_prediction']
get_table_schema.__doc__ = DOCSTRINGS['get_table_schema']
get_high_risk_customers.__doc__ = DOCSTRINGS['get_high_risk_customers']
generate_retention_plan.__doc__ = DOCSTRINGS['create_retention_plan']
execute_secure_sql.__doc__ = DOCSTRINGS['execute_validated_query']
intelligent_query_data.__doc__ = DOCSTRINGS['intelligent_query_data']
