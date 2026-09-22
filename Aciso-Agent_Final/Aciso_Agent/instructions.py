"""
Aciso Agent Instructions
Zentrale Sammlung aller Prompts und Anweisungen für die Tools.
Alle Prompts sind ins Deutsche übersetzt.
"""

import os
from .config import config

# NL2SQL Prompt für die intelligente Abfragegenerierung
NL2SQL_PROMPT_TEMPLATE = """Du bist ein Experte für BigQuery SQL-Generierung für Churn-Analyse in Fitness-Studios.

SICHERHEITSREGELN - BEFOLGE DIESE UNBEDINGT:
1. Verwende nur SELECT-Statements (keine DDL/DML Operationen)
2. Verwende nur die Tabelle: {table_full_name}
3. Füge immer LIMIT hinzu (maximal 100 Zeilen für Datenabfragen)
4. Aggregations-Queries (COUNT, AVG, SUM) benötigen kein LIMIT
5. Bei WIRKLICH unklaren Anfragen antworte mit "CLARIFICATION_NEEDED" - aber die meisten Anfragen SIND KLAR!

{dynamic_schema}

KRITISCHE SPALTENNAMEN-REGELN:
- NIEMALS "vertragslaufzeit" verwenden – IMMER "laufzeit" verwenden!
- NIEMALS "customer_id" oder "kunde_id" – IMMER "mitglied_id"!
- NIEMALS "age" – IMMER "alter_jahre"!
- NIEMALS "gender" – IMMER "geschlecht"!
- NIEMALS "check_ins" oder "visits" – IMMER "anzahl_checkins"!
- Für Vertragslaufzeit in Monaten – "vertragsperiode" (INTEGER)
- Für Vertragslaufzeit als Text – "laufzeit" (STRING)

KONTEXT-BEWUSSTE SQL-GENERIERUNG:
- Aktueller Kunden-ID im Kontext: {current_customer_id}
- Wenn Kontext verfügbar: Nutze die Kunden-ID für spezifische Abfragen
- Beispiel: "hat das mitglied gekündigt?" – SQL für mitglied_id = {current_customer_id}

SPEZIELLE BERECHNUNGEN:
- Retention Rate: IMMER als `100 - AVG(churn_score_bias_corrected)` berechnen
- Churn Rate: AVG(churn_score_bias_corrected) für ML-Scores ODER (SUM(gekuendigt)/COUNT(*))*100 für tatsächliche Rate
- Kündigungsstatus: gekuendigt = 0 (aktiv), gekuendigt = 1 (gekündigt)

BEISPIEL-ÜBERSETZUNGEN:

Benutzer: "Wie viele Mitglieder sind 50 Jahre alt und haben höchstes Kündigungsrisiko?"
SQL: SELECT COUNT(*) as anzahl FROM {table_full_name} WHERE alter_jahre = 50 AND risiko_kategorie = 'KRITISCH';

Benutzer: "hat das mitglied 1001 gekündigt?"
SQL: SELECT mitglied_id, gekuendigt, CASE WHEN gekuendigt = 0 THEN 'Aktiv' WHEN gekuendigt = 1 THEN 'Gekündigt' END as status FROM {table_full_name} WHERE mitglied_id = 1001;

Benutzer: "Zeige die 10 aktivsten Frauen über 40"
SQL: SELECT mitglied_id, anzahl_checkins, alter_jahre FROM {table_full_name} WHERE geschlecht = 'weiblich' AND alter_jahre > 40 AND gekuendigt = 0 ORDER BY anzahl_checkins DESC LIMIT 10;

Benutzer: "Durchschnittliches Alter aller Mitglieder"
SQL: SELECT AVG(alter_jahre) as durchschnittsalter FROM {table_full_name};

Benutzer: "Was ist die durchschnittliche Retention Rate?"
SQL: SELECT ROUND(100 - AVG(churn_score_bias_corrected), 2) as retention_rate_prozent, COUNT(*) as total_customers FROM {table_full_name};

Benutzer: "Alle weiblichen Kunden zwischen 25 und 35"
SQL: SELECT mitglied_id, alter_jahre, geschlecht, risiko_kategorie FROM {table_full_name} WHERE geschlecht = 'weiblich' AND alter_jahre BETWEEN 25 AND 35 LIMIT 50;

Benutzer: "zeige mir die top 10 risiko kunden die weniger als 5 monate dabei sind"
SQL: SELECT mitglied_id, churn_score_bias_corrected, risiko_kategorie, mitgliedschaft_dauer_monate FROM {table_full_name} WHERE mitgliedschaft_dauer_monate < 5 ORDER BY churn_score_bias_corrected DESC LIMIT 10;

Benutzer: "Zeige mir 10 Mitglieder mit einem Risiko über 60 % und Vertragsdauer unter 5 Monaten"
SQL: SELECT mitglied_id, churn_score_bias_corrected, risiko_kategorie, mitgliedschaft_dauer_monate, alter_jahre, geschlecht FROM {table_full_name} WHERE churn_score_bias_corrected > 0.6 AND mitgliedschaft_dauer_monate < 5 ORDER BY churn_score_bias_corrected DESC LIMIT 10;

Benutzer: "Hochrisikokunden mit weniger als 3 Monaten Mitgliedschaft"
SQL: SELECT mitglied_id, churn_score_bias_corrected, risiko_kategorie, mitgliedschaft_dauer_monate FROM {table_full_name} WHERE risiko_kategorie IN ('HOCH', 'KRITISCH') AND mitgliedschaft_dauer_monate < 3 ORDER BY churn_score_bias_corrected DESC LIMIT 20;

Benutzer: "Mitglieder die länger als 12 Monate dabei sind"
SQL: SELECT mitglied_id, mitgliedschaft_dauer_monate, risiko_kategorie FROM {table_full_name} WHERE mitgliedschaft_dauer_monate > 12 ORDER BY mitgliedschaft_dauer_monate DESC LIMIT 50;

INTELLIGENTE KONTEXT-NUTZUNG:
- Wenn eine Mitgliedsnummer im Kontext ist und die Frage sich darauf bezieht, nutze sie automatisch
- Beispiele mit Kontext (Customer ID {current_customer_id}):
  - "hat das mitglied gekündigt?" – WHERE mitglied_id = {current_customer_id}
  - "ist aktiv?" – WHERE mitglied_id = {current_customer_id} AND gekuendigt = 0
  - "churn score?" – WHERE mitglied_id = {current_customer_id}

AKTUELLE ANFRAGE:
Benutzer: "{user_query}"

Generiere die entsprechende BigQuery SQL-Query:"""

# Hochrisikokunden Anzeige-Hinweis
HIGH_RISK_CUSTOMERS_INSTRUCTION = """
Gibt eine Liste von Hochrisikokunden zurück, bei der die Bias-Korrektur angewendet wurde.
Zeige bei Aufruf immer die Komplette Liste Direkt an und bestätige nicht nur die Anfrage. 
Formatiere die Liste in einer Tabelle mit Der Score, der Id und ein paar anderen Daten.
"""

# Retention Plan Generation Prompt
RETENTION_PLAN_PROMPT_TEMPLATE = """Du bist ein Senior Retention-Strategist mit 15+ Jahren Erfahrung in Fitness-Studios und ML-Analytics.

SPRACHE: Antworte AUSSCHLIESSLICH auf DEUTSCH - alle Texte, Beschreibungen und Inhalte müssen auf Deutsch sein!

KRITISCHE AUSGABEFORMAT-REGEL: 
Antworte AUSSCHLIESSLICH mit gültigem JSON im folgenden Schema - KEIN anderer Text davor oder danach!

AUFGABE: Erstelle einen hochpersonalisierten, datengetriebenen Retention-Plan für Mitglied {customer_id}.

REALITÄTS-REGELN:
- NUR verwenden: Spezifische RAG-Strategien aus den Datenquellen, ML-identifizierte Risikofaktoren, messbare Kundendaten
- NIEMALS erfinden: Standardmaßnahmen, allgemeine Strategien, deterministische Meilensteine
- JEDE Maßnahme MUSS: Personalisiert, messbar (SMART), kosteneffizient und datenbasiert sein und sollte als Empfehulng formuliert sein. 

JSON SCHEMA (EXAKT einhalten):
{{
  "executive_summary": {{
    "churn_risk": {churn_prob:.1f},
    "clv_status_quo": {clv_status_quo:.0f},
    "clv_retention": {clv_retention:.0f},
    "clv_uplift": {clv_uplift:.0f},
    "roi_estimate": number,
    "top_insight": "string (1 prägnanter Satz: Kernproblem + konkrete Lösung)"
  }},
  "customer_profile": {{
    "id": {customer_id},
    "age_group": "{age_group}",
    "value_tier": "{value_tier}",
    "membership_stage": "{membership_stage}",
    "activity_status": "{inactivity_category}",
    "key_metrics": {{
      "days_inactive": {days_inactive},
      "monthly_visits": {checkins_monthly:.1f},
      "monthly_fee": {monthly_fee},
      "engagement_score": {engagement_score:.1f}
    }}
  }},
  "top_actions": [
    {{
      "title": "string (max 5 Wörter, ultra-spezifisch auf DEUTSCH)",
      "description": "string (2-3 Sätze Freitext auf DEUTSCH: WAS konkret + WARUM basierend auf Daten + personalisierte Begründung + relevante Referenzen in APA-Format in Klammern)",
      "timeframe": "string (exakt: 'Innerhalb 48h', 'Tag 3-5')",
      "target_metric": "string (messbare KPI auf DEUTSCH)",
      "expected_result": "string (Zahl + Einheit auf DEUTSCH: '+2 Besuche/Woche', '-30% Inaktivität')",
      "cost_estimate": number,
      "priority": "high|medium|low"
    }}
  ],
  "ml_insights": {{
    "primary_risk_factor": "string (spezifisches Verhaltensmuster auf DEUTSCH)",
    "protective_factors": ["string (max 3, konkrete positive Signale auf DEUTSCH)"],
    "prediction_confidence": number
  }},
  "success_metrics": {{
    "week_1_target": "string (SMART: z.B. 'Mind. 2 Check-ins, 1 Kursbesuch')",
    "week_4_target": "string (SMART: z.B. 'Aktivitätslevel >60%, 8+ Check-ins')",
    "week_12_target": "string (SMART: z.B. 'CLV +20%, Churn <30%')"
  }},
  "rag_sources": ["string (nur tatsächlich verwendete Quellen mit Relevanz)"]
}}

KUNDENDATEN:
Mitglied {customer_id}: {churn_prob:.1f}% Churn-Risiko, {days_inactive} Tage inaktiv, {checkins_monthly:.1f} Besuche/Monat, {monthly_fee}€/Monat, {age} Jahre, {gender}

{ml_context}

PROBLEME:
{problems_text}

RAG-STRATEGIEN:
{rag_results}

ANWEISUNGEN:
1. **EXECUTIVE SUMMARY**: 4 Kennzahlen + 1 prägnanter Insight (Kernproblem→Lösung)
2. **TOP ACTIONS**: Max. 3 ultra-spezifische Maßnahmen (NUR aus RAG-Daten!)
3. **SMART-ZIELE**: Konkrete Zahlen+Zeiträume (z.B. "2 Check-ins in 48h", nicht "mehr Aktivität")
4. **ML-FOKUS**: Höchste Attribution Scores = Höchste Priorität
5. **AUSFÜHRLICHER FREITEXT**: 2-3 Sätze pro Beschreibung für detaillierte, personalisierte Begründungen
6. **PERSONALISIERUNG**: Jede Maßnahme MUSS kundenspezifisch sein basierend auf:
   - Alter, Geschlecht, Mitgliedschaftsstatus
   - Bisheriges Verhalten (Check-ins, Kurse)
   - ML-identifizierte Risikofaktoren
   - Spezifische RAG-Strategien für diesen Kundentyp

DEUTSCHE SPRACHE REGEL: Alle Texte im JSON müssen auf DEUTSCH sein - keine englischen Begriffe oder Phrasen, außerdem immer mitglied sagen nicht Frau oder Herr sondern Mitglied!

ERSTELLE JETZT DAS JSON (KEIN anderer Text):"""

# Query Suggestions für unklare Anfragen
QUERY_SUGGESTIONS = [
    "Wie viele Kunden sind zwischen 20 und 30 Jahre alt?",
    "Zeige aktive Mitglieder",
    "Anzahl der weiblichen Kunden", 
    "Durchschnittliches Alter der Mitglieder",
    "Top 10 Kunden mit höchstem Churn-Risiko",
    "Wie viele Kunden sind gekündigt?"
]

# Fehlerhafte Spaltennamen-Mappings
COLUMN_NAME_FIXES = {
    'vertragslaufzeit': 'laufzeit',
    'Vertragslaufzeit': 'laufzeit',
    'VERTRAGSLAUFZEIT': 'laufzeit',
    'contract_duration': 'laufzeit',
    'vertragsdauer': 'laufzeit',
    'laufzeit_monate': 'vertragsperiode',
    'contract_months': 'vertragsperiode',
    'kunde_id': 'mitglied_id',
    'customer_id': 'mitglied_id',
    'age': 'alter_jahre',
    'gender': 'geschlecht',
    'check_ins': 'anzahl_checkins',
    'visits': 'anzahl_checkins',
    'last_visit': 'letzter_checkin',
    'monthly_fee': 'aktueller_beitrag_eur',
    'membership_fee': 'aktueller_beitrag_eur',
    'talter_jahre_seit_letztem_checkin': 'tage_seit_letztem_checkin',
    'alter_jahre_seit_letztem_checkin': 'tage_seit_letztem_checkin',
    'engalter_jahrement_score': 'engagement_score',
    'eng_alter_jahre_ment_score': 'engagement_score',
    'churn_score_prozent': 'churn_score_bias_corrected',
    'churn_score': 'churn_score_bias_corrected',
    'churn_probability': 'churn_score_bias_corrected'
}

# Weitere Konstanten und Konfigurationen
BQML_MODEL_PATH = os.getenv("BQML_EXPLAIN_MODEL_PATH") or (
    f"{config.security.PROJECT_ID}.{config.security.DATASET_ID}.churn_model_for_explain"
)
MAX_RESULT_ROWS = 100
DEFAULT_RISK_THRESHOLD = 0.6
DEFAULT_RETENTION_PLAN_WEEKS = 8

# Deutsche Kommentare und Meldungen
KOMMENTARE = {
    'google_cloud_fix': '# Google Cloud Anmeldedaten-Pfad ZUERST korrigieren',
    'required_imports': '# Erforderliche Imports für ADK-Integration',
    'backwards_compatibility': '# Rückwärtskompatibilität mit bestehendem Code',
    'basic_validation': '# Grundvalidierung',
    'advanced_validation': '# Erweiterte Validierung mit sqlparse',
    'blocked_keywords': '# Prüfung auf blockierte Schlüsselwörter',
    'table_reference_check': '# Prüfen ob erlaubte Tabelle referenziert wird',
    'estimated_bytes': '# Geschätzte verarbeitete Bytes abrufen',
    'cost_check': '# Prüfung gegen Limits',
    'cache_check': '# Cache zuerst prüfen',
    'execute_query': '# Query ausführen',
    'wait_completion': '# Warten auf Abschluss mit Timeout',
    'convert_results': '# Ergebnisse in Dictionary-Liste konvertieren',
    'cache_result': '# Ergebnis zwischenspeichern',
    'global_client': '# Globale BigQuery-Client-Instanz',
    'column_fixes': '# Importierte Spalten-Korrekturen aus instructions.py verwenden',
    'word_boundary': '# Wort-Grenze-Regex verwenden um Teilübereinstimmungen zu vermeiden'
}

# Deutsche Docstrings 
DOCSTRINGS = {
    'generate_cache_key': '''Generiert einen Cache-Schlüssel für BigQuery-Abfragen.
    
    Parameter:
        query: Die SQL-Abfrage für die ein Cache-Schlüssel erstellt werden soll
        
    Rückgabe:
        Dictionary mit 'cache_key' Feld (MD5-Hash der Abfrage)''',
        
    'is_cache_valid': '''Prüft ob ein Cache-Eintrag noch gültig und nicht abgelaufen ist.
    
    Parameter:
        cache_key: Cache-Schlüssel zum Prüfen
        
    Rückgabe:
        Dictionary mit 'valid' (boolean) und 'age_minutes' (float) Feldern''',
        
    'dry_run_query': '''Führt einen BigQuery Dry-Run durch um Kosten zu schätzen und Syntax zu validieren.
    
    Parameter:
        query: Die zu validierende SQL-Abfrage
        
    Rückgabe:
        Dictionary mit 'valid' (boolean), 'estimated_cost_usd' (float) und 'bytes_processed' (int) Feldern''',
        
    'intelligent_query_data': '''Generiert BigQuery SQL-Abfragen aus natürlichsprachigen Anfragen mit ML-Unterstützung.
    
    Nutzt den Google ADK Data Science Ansatz mit:
    - Detailliertem Schema-Prompting
    - Sicherheitsvalidierung  
    - Few-Shot-Beispielen
    - Temperatur-optimierter Generierung
    
    Parameter:
        user_query: Natürlichsprachige Benutzeranfrage (z.B. "Zeige alle Hochrisiko-Kunden")
        
    Rückgabe:
        Dictionary mit 'result' (formatierte Abfrageergebnisse), 'sql_query' (generierte SQL), 
        'rows_returned' (int) und 'execution_time_ms' (float) Feldern''',
    
    'module_header': '''Aciso Agent Tools
Validierte BigQuery-Tools für Churn-Analyse und Kundenretention in Fitness-Studios.''',
    
    'query_validator': '''Validiert SQL-Abfragen mit mehrschichtigen Sicherheitsprüfungen.
    
    Parameter:
        query: Die zu validierende SQL-Abfrage
        
    Rückgabe:
        Dictionary mit 'valid' (boolean) und 'error_details' (string) Feldern''',
        
    'validate_query_syntax': '''Validiert SQL-Syntax und Struktur mit sqlparse.
    
    Parameter:
        query: SQL-Abfrage zum Syntaxprüfung
        
    Rückgabe:
        Dictionary mit 'syntax_valid' (boolean) und 'parse_errors' (list) Feldern''',
        
    'validate_table_access': '''Validiert dass Abfrage nur erlaubte Tabellen referenziert.
    
    Parameter:
        query: SQL-Abfrage für Tabellenzugriffs-Validierung
        
    Rückgabe:
        Dictionary mit 'access_valid' (boolean) und 'unauthorized_tables' (list) Feldern''',
    
    'bigquery_client': '''Sicherer BigQuery-Client mit Fehlerbehandlung und Kostenkontrolle.
    
    Rückgabe:
        Dictionary mit 'client_ready' (boolean) und 'connection_status' (string) Feldern''',
    
    'requires_complex_analysis': '''Prüft ob Benutzeranfrage komplexe Analyse außerhalb verfügbarer Tools benötigt.
    
    OPTIMIERT: Weniger restriktive Prüfung - die meisten Anfragen sollten verfügbare Tools nutzen!
    
    Parameter:
        user_query: Natürlichsprachige Benutzeranfrage zum Analysieren
        
    Rückgabe:
        Dictionary mit 'requires_complex' (boolean) und 'reasoning' (string) Feldern''',
        
    'execute_validated_query': '''Führt eine validierte BigQuery-Anfrage mit Sicherheitsprüfungen aus.
    
    Parameter:
        query: Vollständig validierte SQL-Anfrage
        
    Rückgabe:
        Dictionary mit 'result' (formatierte Ergebnisse), 'rows_count' (int), 
        'execution_time_ms' (float) und 'bytes_processed' (int) Feldern''',
        
    'get_table_schema': '''Ruft das vollständige BigQuery-Tabellenschema ab und zeigt es formatiert an.
    
    Zeigt Struktur der Churn-Analysedaten inklusive Spaltentypen und Beschreibungen.
    
    Rückgabe:
        Dictionary mit 'result' (formatierte Schema-Tabelle), 'column_count' (int) 
        und 'table_name' (string) Feldern''',
        
    'get_churn_prediction': '''Generiert ML-basierte Churn-Vorhersage für spezifisches Fitnessstudio-Mitglied.
    
    Nutzt BigQuery ML Modell für Risikobewertung und Erklärungen.
    
    Parameter:
        mitglied_id: Eindeutige Mitglieds-ID für Churn-Vorhersage (z.B. 12345)
        
    Rückgabe:
        Dictionary mit 'result' (formatierte Vorhersage), 'churn_probability' (float 0-1), 
        'risk_category' (string), 'top_factors' (list) und 'confidence_score' (float) Feldern''',
        
    'get_high_risk_customers': '''Identifiziert Hochrisiko-Kunden mit Bias-Korrekturen und Fairness-Anpassungen.
    
    Wendet demografische Bias-Korrekturen an für faire Churn-Vorhersagen.
    
    Parameter:
        risk_threshold: Risikoschwellenwert zwischen 0.0-1.0 (Standard: 0.6)
        
    Rückgabe:
        Dictionary mit 'result' (formatierte Kundenliste), 'total_high_risk' (int),
        'bias_corrections_applied' (int) und 'avg_risk_score' (float) Feldern''',
        
    'create_retention_plan': '''Erstellt personalisierte, datenbasierte Retention-Pläne für gefährdete Mitglieder.
    
    Generiert maßgeschneiderte Strategien basierend auf ML-Insights und Kundenprofil.
    
    Parameter:
        mitglied_id: ID des Mitglieds für Retention-Plan (z.B. 12345)
        weeks: Planungshorizont in Wochen (Standard: 8)
        
    Rückgabe:
        Dictionary mit 'result' (vollständiger Retention-Plan), 'plan_duration_weeks' (int),
        'estimated_cost' (float), 'success_probability' (float) und 'key_strategies' (list) Feldern''',
        
    'bias_correction_functions': '''Bias-Korrektur-Algorithmen für faire ML-Vorhersagen.
    
    Sammlung von Korrekturfunktionen um demografische und Verhaltensbias 
    in Churn-Vorhersagen zu reduzieren und Fairness sicherzustellen.
    
    Rückgabe:
        Dictionary mit verfügbaren Korrekturmethoden und deren Beschreibungen'''
}

# Deutsche Fehlermeldungen
FEHLERMELDUNGEN = {
    'empty_query': 'Leere Anfrage eingegeben',
    'only_select': 'Nur SELECT-Anweisungen sind erlaubt',
    'invalid_syntax': 'Ungültige SQL-Syntax',
    'blocked_keyword': 'Blockiertes Schlüsselwort entdeckt: {}',
    'parsing_error': 'SQL-Parsing-Fehler: {}',
    'table_access': 'Query muss nur erlaubte Tabellen referenzieren. Erlaubt: mitglieder-Tabelle',
    'cost_estimate': 'Ungefähre Kosten: $5/TB'
}

# Deutsche Schritt-Kommentare
SCHRITTE = {
    'step_0': 'Schritt 0: Häufige Spaltenname-Fehler VOR jeder Validierung korrigieren',
    'step_1': 'Schritt 1: Syntax-Validierung',
    'step_2': 'Schritt 2: Tabellenzugriff-Validierung',
    'step_3': 'Schritt 3: Kosten-Schätzung und Dry-Run',
    'step_4': 'Schritt 4: Schema-Validierung',
    'step_5': 'Schritt 5: Query-Ausführung',
    'step_6': 'Schritt 6: Ergebnis-Formatierung',
    'step_7': 'Schritt 7: Erfolgreiche Antwort-Generierung'
}
