"""
Aciso Agent Configuration

Zentrale Konfiguration für den Aciso Agent mit Sicherheits-, Performance- und Business-Einstellungen.
"""

import os
from typing import List, Dict, Any
from dataclasses import dataclass, field


def cloud_project_id() -> str:
    return os.getenv("BQ_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT", "example-project")


def bigquery_dataset_id() -> str:
    return os.getenv("BQ_DATASET_ID", "churn_prevention")


@dataclass
class SecurityConfig:
    """Sicherheitseinstellungen für BigQuery und Tools."""
    
    # BigQuery Security
    PROJECT_ID: str = field(default_factory=cloud_project_id)
    DATASET_ID: str = field(default_factory=bigquery_dataset_id)
    TABLE_NAME: str = field(default_factory=lambda: os.getenv("BQ_TABLE_NAME", "mitglieder"))
    ALLOWED_TABLES: List[str] = None
    
    # Query Security
    BLOCKED_SQL_KEYWORDS: List[str] = None
    MAX_QUERY_BYTES: int = 1024 * 1024 * 1024  # 1GB
    MAX_RESULT_ROWS: int = 10000
    QUERY_TIMEOUT_SECONDS: int = 900  
    
    def __post_init__(self):
        if self.ALLOWED_TABLES is None:
            self.ALLOWED_TABLES = [
                f"`{self.PROJECT_ID}.{self.DATASET_ID}.{self.TABLE_NAME}`",
                f"{self.PROJECT_ID}.{self.DATASET_ID}.{self.TABLE_NAME}",
                self.TABLE_NAME
            ]
        
        if self.BLOCKED_SQL_KEYWORDS is None:
            self.BLOCKED_SQL_KEYWORDS = [
                "DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE",
                "TRUNCATE", "REPLACE", "MERGE", "GRANT", "REVOKE"
            ]


@dataclass 
class PerformanceConfig:
    """Performance-Einstellungen für Caching und Optimierung."""
    
    # Query Caching
    ENABLE_QUERY_CACHE: bool = True
    USE_QUERY_CACHE: bool = True
    CACHE_TTL_HOURS: int = 2
    USE_DRY_RUN: bool = False
    
    # Agent Performance - Generous timeouts for development
    MAX_TOOL_EXECUTION_TIME: int = 600  # 10 minutes (generous for development)
    MAX_AGENT_INVOCATION_TIME: int = 900  # 15 minutes (generous for development)


@dataclass
class BusinessConfig:
    """Business-spezifische Einstellungen."""
    
    # Customer Limits
    MAX_CUSTOMER_LIMIT: int = 50
    DEFAULT_RISK_THRESHOLD: float = 0.6
    HIGH_RISK_THRESHOLD: float = 0.7
    CRITICAL_RISK_THRESHOLD: float = 0.8
    
    # Retention Planning
    DEFAULT_RETENTION_BUDGET: float = 2000.0  # EUR
    DEFAULT_CAMPAIGN_DURATION: int = 6  # Wochen
    
    # Contract Values (Annual EUR)
    CONTRACT_VALUES: Dict[str, float] = None
    
    def __post_init__(self):
        if self.CONTRACT_VALUES is None:
            self.CONTRACT_VALUES = {
                "Premium": 79.99 * 12,
                "Standard": 49.99 * 12, 
                "Basic": 29.99 * 12
            }


@dataclass
class ModelConfig:
    """AI Model Konfiguration."""
    
    # ADK Agent Models
    COORDINATOR_MODEL: str = "gemini-2.0-flash-001"
    BIGQUERY_AGENT_MODEL: str = "gemini-2.0-flash-001"
    STRATEGY_AGENT_MODEL: str = "gemini-2.0-flash-001"
    
    # BQML Model
    CHURN_MODEL_NAME: str = "churn_model_v2_balanced"
    CHURN_MODEL_PATH: str = None
    
    def __post_init__(self):
        if self.CHURN_MODEL_PATH is None:
            self.CHURN_MODEL_PATH = os.getenv("BQML_MODEL_PATH") or (
                f"{cloud_project_id()}.{bigquery_dataset_id()}.{self.CHURN_MODEL_NAME}"
            )


@dataclass
class AcisoConfig:
    """Hauptkonfiguration für den Aciso Agent."""
    
    # Sub-Configurations
    security: SecurityConfig = None
    performance: PerformanceConfig = None
    business: BusinessConfig = None
    models: ModelConfig = None
    
    # Environment
    GOOGLE_APPLICATION_CREDENTIALS: str = None
    GOOGLE_CLOUD_PROJECT: str = None
    VERTEXAI_PROJECT: str = None
    VERTEXAI_LOCATION: str = None
    RAG_CORPUS: str = None
    ADK_DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    def __post_init__(self):
        # Initialize sub-configs
        if self.security is None:
            self.security = SecurityConfig()
        if self.performance is None:
            self.performance = PerformanceConfig()
        if self.business is None:
            self.business = BusinessConfig()
        if self.models is None:
            self.models = ModelConfig()
            
        # Load from environment
        if self.GOOGLE_APPLICATION_CREDENTIALS is None:
            self.GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if self.GOOGLE_CLOUD_PROJECT is None:
            self.GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT") or cloud_project_id()
        if self.VERTEXAI_PROJECT is None:
            self.VERTEXAI_PROJECT = os.getenv("VERTEXAI_PROJECT", self.GOOGLE_CLOUD_PROJECT)
        if self.VERTEXAI_LOCATION is None:
            self.VERTEXAI_LOCATION = os.getenv("VERTEXAI_LOCATION", "us-central1")
        if self.RAG_CORPUS is None:
            self.RAG_CORPUS = os.getenv("VERTEXAI_RAG_CORPUS", "")
        
        self.ADK_DEBUG = os.getenv("ADK_DEBUG", "false").lower() == "true"
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")


# Global configuration instance
config = AcisoConfig()
