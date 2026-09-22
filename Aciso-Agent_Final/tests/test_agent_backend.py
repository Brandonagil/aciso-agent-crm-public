"""
Unit tests for Aciso Agent backend components.

Tests cover configuration, state models, and security logic without
requiring Google Cloud credentials or a live BigQuery connection.
"""

import sys
import os
import importlib.util
import pytest
from datetime import datetime

# Ensure the Aciso-Agent_Final directory is on sys.path so sub-modules can be
# loaded by their file path without triggering the package __init__.py (which
# requires the full Google ADK stack and cloud credentials).
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

_AGENT_DIR = os.path.join(_BACKEND_DIR, "Aciso_Agent")


def _load_module(name: str, filename: str):
    """Load a single .py file as a module without executing the package __init__."""
    spec = importlib.util.spec_from_file_location(name, os.path.join(_AGENT_DIR, filename))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


# Load only the modules that have no heavy cloud dependencies.
_config_mod = _load_module("_aciso_config", "config.py")
_state_mod = _load_module("_aciso_state", "state.py")

SecurityConfig = _config_mod.SecurityConfig
BusinessConfig = _config_mod.BusinessConfig
ModelConfig = _config_mod.ModelConfig
AcisoConfig = _config_mod.AcisoConfig

ChurnPrediction = _state_mod.ChurnPrediction
RetentionPlan = _state_mod.RetentionPlan
QueryResult = _state_mod.QueryResult


# ---------------------------------------------------------------------------
# Configuration tests
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def isolated_cloud_settings(monkeypatch):
    for name in (
        "BQ_PROJECT_ID", "GOOGLE_CLOUD_PROJECT", "BQ_DATASET_ID", "BQ_TABLE_NAME",
        "BQML_MODEL_PATH", "VERTEXAI_PROJECT", "VERTEXAI_LOCATION", "VERTEXAI_RAG_CORPUS",
    ):
        monkeypatch.delenv(name, raising=False)


class TestCloudSettings:
    def test_custom_project_and_dataset_reach_queries_model_and_state(self, monkeypatch):
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project")
        monkeypatch.setenv("BQ_DATASET_ID", "test_members")
        monkeypatch.setenv("BQ_TABLE_NAME", "member_records")
        cfg = AcisoConfig()
        state = _state_mod.AcisoAgentState()
        assert cfg.security.PROJECT_ID == "test-project"
        assert "`test-project.test_members.member_records`" in cfg.security.ALLOWED_TABLES
        assert "member_records" in cfg.security.ALLOWED_TABLES
        assert cfg.models.CHURN_MODEL_PATH == "test-project.test_members.churn_model_v2_balanced"
        assert state.model_name == cfg.models.CHURN_MODEL_PATH
        assert state.dataset_id == "test-project.test_members"

    def test_bigquery_project_can_differ_from_vertex_project(self, monkeypatch):
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "model-project")
        monkeypatch.setenv("BQ_PROJECT_ID", "data-project")
        cfg = AcisoConfig()
        assert cfg.security.PROJECT_ID == "data-project"
        assert cfg.VERTEXAI_PROJECT == "model-project"

    def test_model_path_override_is_preserved(self, monkeypatch):
        monkeypatch.setenv("BQML_MODEL_PATH", "test-project.models.custom_churn")
        assert ModelConfig().CHURN_MODEL_PATH == "test-project.models.custom_churn"
        assert _state_mod.AcisoAgentState().model_name == "test-project.models.custom_churn"

    def test_rag_resource_is_explicit(self, monkeypatch):
        assert AcisoConfig().RAG_CORPUS == ""
        resource = "projects/test-project/locations/us-central1/ragCorpora/test-corpus"
        monkeypatch.setenv("VERTEXAI_RAG_CORPUS", resource)
        assert AcisoConfig().RAG_CORPUS == resource


class TestSecurityConfig:
    """Tests for SecurityConfig defaults and behaviour."""

    def test_default_project_id(self):
        cfg = SecurityConfig()
        assert cfg.PROJECT_ID == "example-project"

    def test_default_dataset_and_table(self):
        cfg = SecurityConfig()
        assert cfg.DATASET_ID == "churn_prevention"
        assert cfg.TABLE_NAME == "mitglieder"

    def test_allowed_tables_populated(self):
        cfg = SecurityConfig()
        assert len(cfg.ALLOWED_TABLES) > 0
        assert "mitglieder" in cfg.ALLOWED_TABLES

    def test_blocked_sql_keywords_present(self):
        cfg = SecurityConfig()
        dangerous_keywords = {"DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE"}
        blocked = set(cfg.BLOCKED_SQL_KEYWORDS)
        assert dangerous_keywords.issubset(blocked), (
            f"Missing dangerous keywords: {dangerous_keywords - blocked}"
        )

    def test_max_query_bytes_reasonable(self):
        cfg = SecurityConfig()
        # Must allow at least 1 MB but cap at 10 GB
        assert 1024 * 1024 <= cfg.MAX_QUERY_BYTES <= 10 * 1024 * 1024 * 1024

    def test_max_result_rows_positive(self):
        cfg = SecurityConfig()
        assert cfg.MAX_RESULT_ROWS > 0


class TestBusinessConfig:
    """Tests for BusinessConfig defaults."""

    def test_risk_thresholds_ordered(self):
        cfg = BusinessConfig()
        assert cfg.DEFAULT_RISK_THRESHOLD < cfg.HIGH_RISK_THRESHOLD < cfg.CRITICAL_RISK_THRESHOLD

    def test_risk_thresholds_in_valid_range(self):
        cfg = BusinessConfig()
        for threshold in (cfg.DEFAULT_RISK_THRESHOLD, cfg.HIGH_RISK_THRESHOLD, cfg.CRITICAL_RISK_THRESHOLD):
            assert 0.0 < threshold < 1.0, f"Threshold {threshold} out of (0, 1) range"

    def test_contract_values_populated(self):
        cfg = BusinessConfig()
        assert len(cfg.CONTRACT_VALUES) > 0
        for tier, value in cfg.CONTRACT_VALUES.items():
            assert value > 0, f"Contract value for '{tier}' must be positive"

    def test_default_retention_budget_positive(self):
        cfg = BusinessConfig()
        assert cfg.DEFAULT_RETENTION_BUDGET > 0


class TestModelConfig:
    """Tests for ModelConfig defaults."""

    def test_churn_model_path_contains_project(self):
        cfg = ModelConfig()
        assert "example-project" in cfg.CHURN_MODEL_PATH
        assert cfg.CHURN_MODEL_NAME in cfg.CHURN_MODEL_PATH

    def test_coordinator_model_set(self):
        cfg = ModelConfig()
        assert cfg.COORDINATOR_MODEL, "Coordinator model must not be empty"


class TestAcisoConfig:
    """Integration tests for the top-level AcisoConfig."""

    def test_sub_configs_initialised(self):
        cfg = AcisoConfig()
        assert cfg.security is not None
        assert cfg.performance is not None
        assert cfg.business is not None
        assert cfg.models is not None

    def test_google_cloud_project_default(self):
        cfg = AcisoConfig()
        assert cfg.GOOGLE_CLOUD_PROJECT == "example-project"


# ---------------------------------------------------------------------------
# State model tests
# ---------------------------------------------------------------------------

class TestChurnPrediction:
    """Tests for the ChurnPrediction Pydantic model."""

    def _make_prediction(self, **overrides):
        defaults = dict(
            customer_id=42,
            churn_score_bias_corrected=0.75,
            risk_level="high",
            recommended_actions=["Anruf", "Rabatt"],
            financial_impact=599.88,
            prediction_date=datetime(2025, 1, 15, 10, 0, 0),
        )
        defaults.update(overrides)
        return ChurnPrediction(**defaults)

    def test_valid_prediction_created(self):
        pred = self._make_prediction()
        assert pred.customer_id == 42
        assert pred.risk_level == "high"

    def test_churn_score_stored_correctly(self):
        pred = self._make_prediction(churn_score_bias_corrected=0.55)
        assert abs(pred.churn_score_bias_corrected - 0.55) < 1e-9

    def test_recommended_actions_list(self):
        pred = self._make_prediction(recommended_actions=["A", "B", "C"])
        assert len(pred.recommended_actions) == 3


class TestRetentionPlan:
    """Tests for the RetentionPlan Pydantic model."""

    def _make_plan(self, **overrides):
        defaults = dict(
            plan_id="plan-001",
            target_segment="high_risk",
            strategies="Persönliche Beratung + Sonderkonditionen",
            created_at=datetime(2025, 3, 1, 9, 0, 0),
        )
        defaults.update(overrides)
        return RetentionPlan(**defaults)

    def test_valid_plan_created(self):
        plan = self._make_plan()
        assert plan.plan_id == "plan-001"
        assert plan.target_segment == "high_risk"

    def test_optional_customer_id_none(self):
        plan = self._make_plan()
        assert plan.customer_id is None

    def test_optional_customer_id_set(self):
        plan = self._make_plan(customer_id=123)
        assert plan.customer_id == 123

    def test_implementation_steps_default_empty(self):
        plan = self._make_plan()
        assert plan.implementation_steps == []

    def test_expected_roi_default_zero(self):
        plan = self._make_plan()
        assert plan.expected_roi == 0.0


class TestQueryResult:
    """Tests for the QueryResult Pydantic model."""

    def _make_result(self, **overrides):
        defaults = dict(
            query="SELECT COUNT(*) FROM mitglieder",
            executed_at=datetime(2025, 3, 1, 12, 0, 0),
            row_count=5,
        )
        defaults.update(overrides)
        return QueryResult(**defaults)

    def test_valid_result_created(self):
        result = self._make_result()
        assert result.row_count == 5

    def test_data_default_empty(self):
        result = self._make_result()
        assert result.data == []

    def test_row_count_zero_allowed(self):
        result = self._make_result(row_count=0)
        assert result.row_count == 0


# ---------------------------------------------------------------------------
# SQL security tests (logic only, no BigQuery connection required)
# ---------------------------------------------------------------------------

class TestSQLSecurityLogic:
    """Verify that blocked SQL keywords are properly detected."""

    def _has_blocked_keyword(self, sql: str) -> bool:
        """Replicate the keyword-blocking logic from config."""
        cfg = SecurityConfig()
        sql_upper = sql.upper()
        return any(kw in sql_upper for kw in cfg.BLOCKED_SQL_KEYWORDS)

    def test_select_is_allowed(self):
        assert not self._has_blocked_keyword("SELECT * FROM mitglieder LIMIT 10")

    def test_drop_is_blocked(self):
        assert self._has_blocked_keyword("DROP TABLE mitglieder")

    def test_delete_is_blocked(self):
        assert self._has_blocked_keyword("DELETE FROM mitglieder WHERE mitglied_id = 1")

    def test_insert_is_blocked(self):
        assert self._has_blocked_keyword("INSERT INTO mitglieder VALUES (1, 'Test')")

    def test_update_is_blocked(self):
        assert self._has_blocked_keyword("UPDATE mitglieder SET churn_score = 0")

    def test_mixed_case_blocked(self):
        assert self._has_blocked_keyword("dRoP TABLE mitglieder")
