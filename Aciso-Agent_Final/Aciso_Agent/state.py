"""
Aciso Agent State Management

Umfassendes State Management für Multi-Agent-Systeme basierend auf ADK Best Practices.
"""

import json
import logging
import os
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# Pydantic Models für strukturiertes State Management
class ChurnPrediction(BaseModel):
    """Churn-Vorhersage-Daten."""
    customer_id: int
    churn_score_bias_corrected: float
    risk_level: str
    recommended_actions: List[str]
    financial_impact: float
    prediction_date: datetime


class RetentionPlan(BaseModel):
    """ADK-compliant Retention-Plan-Daten mit vollständiger Strategy Storage."""
    plan_id: str
    customer_id: Optional[int] = None
    target_segment: str
    strategies: str  # Vollständige RAG-basierte Strategien als String
    implementation_steps: List[str] = Field(default_factory=list)
    expected_roi: float = 0.0
    created_at: datetime
    plan_type: str = "standard"  # "personalized_actionable", "segment_actionable", etc.
    # ADK State Management compatible fields
    user_id: Optional[str] = None
    session_context: Dict[str, Any] = Field(default_factory=dict)




class SavedReportMetadata(BaseModel):
    """Metadaten für gespeicherte Member-Reports."""
    report_id: str
    member_id: int
    title: Optional[str] = None
    description: Optional[str] = None
    report_type: str = "standard"
    created_at: datetime
    created_by: str
    report_version: str = "1.0"
    tags: List[str] = Field(default_factory=list)
    expires_at: Optional[datetime] = None
    file_size_bytes: Optional[int] = None
    generation_time_seconds: Optional[float] = None
    data_source_timestamp: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SavedReportSummary(BaseModel):
    """Zusammenfassung gespeicherter Reports für einen Member."""
    member_id: int
    total_reports: int
    latest_report_id: Optional[str] = None
    latest_report_date: Optional[datetime] = None
    report_types: List[str] = Field(default_factory=list)
    total_storage_bytes: int = 0


class QueryResult(BaseModel):
    """BigQuery-Abfrage-Ergebnis."""
    query: str
    executed_at: datetime
    row_count: int = 0
    bytes_processed: Optional[int] = None
    data: List[Dict[str, Any]] = Field(default_factory=list)
    execution_time_seconds: float = 0.0
    cache_hit: bool = False
    error: Optional[str] = None


class AgentInvocation(BaseModel):
    """Agent-Invocation-Tracking."""
    agent_name: str
    invocation_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    success: bool = False
    error_message: Optional[str] = None
    duration_seconds: float = 0.0


class AcisoAgentState(BaseModel):
    """Hauptstate für den Aciso Agent basierend auf ADK Best Practices."""
    
    # Session Information
    session_id: Optional[str] = None
    user_intent: Optional[str] = None
    original_query: Optional[str] = None
    
    # CONVERSATION CONTEXT für Follow-up-Fragen
    current_customer_id: Optional[int] = None  # Aktuell diskutierter Kunde
    conversation_topic: Optional[str] = None   # "customer_analysis", "retention_plan", etc.
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list)  # Letzte Nachrichten
    pending_action: Optional[str] = None       # "churn_prediction", "retention_plan"
    last_mentioned_entities: Dict[str, Any] = Field(default_factory=dict)  # Kunden-IDs, Limits, etc.
    
    # Query History
    last_sql_query: Optional[str] = None
    last_generated_sql: Optional[str] = None
    last_nl2sql_prompt: Optional[str] = None
    last_analysis_query: Optional[str] = None
    last_analysis_code: Optional[str] = None
    last_analysis_result: Optional[Dict[str, Any]] = None
    query_results: List[QueryResult] = Field(default_factory=list)
    query_validated: bool = False
    
    # Predictions & Plans
    last_churn_prediction: Optional[ChurnPrediction] = None
    churn_predictions: List[ChurnPrediction] = Field(default_factory=list)
    last_retention_plan: Optional[RetentionPlan] = None
    retention_plans: List[RetentionPlan] = Field(default_factory=list)
    
    # SHAP Explanations
    last_shap_explanation: Optional[Dict[str, Any]] = None
    shap_explanations: List[Dict[str, Any]] = Field(default_factory=list)
    
    # RAG Knowledge Queries
    last_rag_query: Optional[str] = None
    last_rag_result: Optional[Dict[str, Any]] = None
    rag_queries: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Saved Reports
    current_report_metadata: Optional[SavedReportMetadata] = None
    saved_reports_cache: List[SavedReportMetadata] = Field(default_factory=list)
    last_saved_report_id: Optional[str] = None
    
    # Agent Invocations
    agent_invocations: List[AgentInvocation] = Field(default_factory=list)
    current_invocation: Optional[AgentInvocation] = None
    
    # Error Handling
    error_messages: List[str] = Field(default_factory=list)
    security_violations: List[str] = Field(default_factory=list)
    
    # Performance Metrics
    total_queries_executed: int = 0
    total_bytes_processed: int = 0
    total_execution_time: float = 0.0
    cache_hit_rate: float = 0.0
    
    # Business Context
    model_name: str = Field(default_factory=lambda: os.getenv("BQML_MODEL_PATH") or (
        f"{os.getenv('BQ_PROJECT_ID') or os.getenv('GOOGLE_CLOUD_PROJECT', 'example-project')}."
        f"{os.getenv('BQ_DATASET_ID', 'churn_prevention')}.churn_model_v2_balanced"
    ))
    dataset_id: str = Field(default_factory=lambda: (
        f"{os.getenv('BQ_PROJECT_ID') or os.getenv('GOOGLE_CLOUD_PROJECT', 'example-project')}."
        f"{os.getenv('BQ_DATASET_ID', 'churn_prevention')}"
    ))
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # CONVERSATION CONTEXT METHODS
    def set_conversation_context(self, customer_id: Optional[int] = None, topic: Optional[str] = None, 
                               pending_action: Optional[str] = None, entities: Optional[Dict] = None) -> None:
        """Set conversation context for follow-up questions."""
        if customer_id:
            self.current_customer_id = customer_id
        if topic:
            self.conversation_topic = topic
        if pending_action:
            self.pending_action = pending_action
        if entities:
            self.last_mentioned_entities.update(entities)
        
        self.updated_at = datetime.now()
        logger.info(f"CONTEXT: Conversation context set: customer_id={customer_id}, topic={topic}, pending={pending_action}")
    
    def add_conversation_turn(self, user_message: str, agent_response: str, intent: str) -> None:
        """Add a conversation turn to history."""
        turn = {
            'timestamp': datetime.now().isoformat(),
            'user_message': user_message,
            'agent_response': agent_response,
            'intent': intent,
            'customer_id': self.current_customer_id,
            'topic': self.conversation_topic
        }
        
        self.conversation_history.append(turn)
        
        # Keep only last 10 turns for performance
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]
        
        self.updated_at = datetime.now()
    
    def get_conversation_context(self) -> Dict[str, Any]:
        """Get current conversation context for routing decisions."""
        return {
            'current_customer_id': self.current_customer_id,
            'conversation_topic': self.conversation_topic,
            'pending_action': self.pending_action,
            'last_mentioned_entities': self.last_mentioned_entities,
            'recent_history': self.conversation_history[-3:] if self.conversation_history else []
        }
    
    def clear_conversation_context(self) -> None:
        """Clear conversation context (e.g., when topic changes completely)."""
        self.current_customer_id = None
        self.conversation_topic = None
        self.pending_action = None
        self.last_mentioned_entities = {}
        self.updated_at = datetime.now()
        logger.info("CLEARED: Conversation context cleared")
    
    def update_query_result(self, query: str, result: QueryResult) -> None:
        """Update state with new query result."""
        self.last_sql_query = query
        self.query_results.append(result)
        
        # Memory-Leak-Fix: Begrenzen auf 20 Query-Ergebnisse
        if len(self.query_results) > 20:
            self.query_results = self.query_results[-20:]
        
        # Update performance metrics
        self.total_queries_executed += 1
        if result.bytes_processed:
            self.total_bytes_processed += result.bytes_processed
        self.total_execution_time += result.execution_time_seconds
        
        # Calculate cache hit rate
        cache_hits = sum(1 for r in self.query_results if r.cache_hit)
        self.cache_hit_rate = cache_hits / len(self.query_results) if self.query_results else 0.0
        
        self.updated_at = datetime.now()
    
    def start_agent_invocation(self, agent_name: str) -> str:
        """Start tracking a new agent invocation."""
        invocation_id = f"{agent_name}_{datetime.now().timestamp()}"
        invocation = AgentInvocation(
            agent_name=agent_name,
            invocation_id=invocation_id,
            started_at=datetime.now()
        )
        
        self.agent_invocations.append(invocation)
        
        # Memory-Leak-Fix: Begrenzen auf 50 Agent-Invocations
        if len(self.agent_invocations) > 50:
            self.agent_invocations = self.agent_invocations[-50:]
        
        self.current_invocation = invocation
        self.updated_at = datetime.now()
        
        return invocation_id
    
    def end_agent_invocation(self, success: bool, error_message: Optional[str] = None) -> None:
        """End the current agent invocation."""
        if self.current_invocation:
            now = datetime.now()
            self.current_invocation.completed_at = now
            self.current_invocation.success = success
            self.current_invocation.error_message = error_message
            
            # Calculate duration
            if self.current_invocation.started_at:
                duration = (now - self.current_invocation.started_at).total_seconds()
                self.current_invocation.duration_seconds = duration
            
            self.current_invocation = None
            self.updated_at = now
    
    def log_error(self, error_message: str) -> None:
        """Log an error message."""
        self.error_messages.append(f"{datetime.now().isoformat()}: {error_message}")
        
        # Memory-Leak-Fix: Begrenzen auf 100 Fehlermeldungen
        if len(self.error_messages) > 100:
            self.error_messages = self.error_messages[-100:]
        
        self.updated_at = datetime.now()
    
    def add_security_violation(self, violation: str) -> None:
        """Add a security violation."""
        self.security_violations.append(f"{datetime.now().isoformat()}: {violation}")
        self.updated_at = datetime.now()
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary."""
        successful_invocations = sum(1 for inv in self.agent_invocations if inv.success)
        total_invocations = len(self.agent_invocations)
        
        return {
            "total_queries": self.total_queries_executed,
            "total_bytes_processed_mb": self.total_bytes_processed / (1024 * 1024),
            "total_execution_time_seconds": self.total_execution_time,
            "cache_hit_rate_percent": round(self.cache_hit_rate * 100, 2),
            "agent_success_rate_percent": round(
                (successful_invocations / total_invocations * 100) if total_invocations > 0 else 0, 2
            ),
            "total_errors": len(self.error_messages),
            "security_violations": len(self.security_violations)
        }


class StateManager:
    """ADK-kompatibles State Management."""
    
    # State key prefixes following ADK best practices
    APP_PREFIX = "aciso_agent"
    USER_PREFIX = "user"
    TEMP_PREFIX = "temp"
    
    @classmethod
    def get_state_key(cls, key: str) -> str:
        """Get state key with appropriate prefix."""
        return f"{cls.APP_PREFIX}_{key}"
    
    @classmethod
    def get_state(cls, tool_context: Any) -> AcisoAgentState:
        """Get or create agent state from tool context."""
        state_key = cls.get_state_key("main_state")
        
        if hasattr(tool_context, 'session') and hasattr(tool_context.session, 'state'):
            # ADK ToolContext with session.state
            state_data = tool_context.session.state.get(state_key)
            if state_data:
                if isinstance(state_data, dict):
                    return AcisoAgentState(**state_data)
                elif isinstance(state_data, AcisoAgentState):
                    return state_data
        else:
            # Fallback to in-memory cache for evaluation endpoints
            if hasattr(cls, '_state_cache') and state_key in cls._state_cache:
                state_data = cls._state_cache[state_key]
                if isinstance(state_data, dict):
                    return AcisoAgentState(**state_data)
        
        # Create new state
        return AcisoAgentState()
    
    @classmethod
    def save_state(cls, tool_context: Any, state: AcisoAgentState) -> None:
        """Save agent state to tool context."""
        state_key = cls.get_state_key("main_state")
        state.updated_at = datetime.now()
        
        if hasattr(tool_context, 'session') and hasattr(tool_context.session, 'state'):
            # Convert to dict for ADK compatibility
            tool_context.session.state[state_key] = state.model_dump()
            logger.debug(f"State saved successfully to session.state with key: {state_key}")
        else:
            # Graceful fallback - don't log warning for evaluation endpoints
            # ADK evaluation endpoints may not have full session context
            logger.debug("Tool context without session.state - using in-memory fallback")
            # Store in class-level cache as fallback
            if not hasattr(cls, '_state_cache'):
                cls._state_cache = {}
            cls._state_cache[state_key] = state.model_dump()
    
    @classmethod
    def cleanup_temp_tables(cls, tool_context: Any) -> List[str]:
        """Cleanup temporary tables and resources."""
        # Implementation for cleaning up temporary BigQuery tables
        # This would connect to BigQuery and drop any temp tables created during the session
        return []
    
    @classmethod
    def get_user_preference(cls, tool_context: Any, key: str, default: Any = None) -> Any:
        """Get user preference with proper prefix."""
        pref_key = f"{cls.USER_PREFIX}_{key}"
        if hasattr(tool_context, 'session') and hasattr(tool_context.session, 'state'):
            return tool_context.session.state.get(pref_key, default)
        return default
    
    @classmethod
    def set_user_preference(cls, tool_context: Any, key: str, value: Any) -> None:
        """Set user preference with proper prefix."""
        pref_key = f"{cls.USER_PREFIX}_{key}"
        if hasattr(tool_context, 'session') and hasattr(tool_context.session, 'state'):
            tool_context.session.state[pref_key] = value
    
    @classmethod
    def update_saved_report_cache(cls, tool_context: Any, report_metadata: SavedReportMetadata) -> None:
        """Update saved reports cache in state."""
        state = cls.get_state(tool_context)
        
        # Add to cache, keeping only most recent 10 reports
        state.saved_reports_cache.insert(0, report_metadata)
        state.saved_reports_cache = state.saved_reports_cache[:10]
        state.current_report_metadata = report_metadata
        state.last_saved_report_id = report_metadata.report_id
        
        cls.save_state(tool_context, state)
    
    @classmethod
    def get_saved_reports_cache(cls, tool_context: Any, member_id: Optional[int] = None) -> List[SavedReportMetadata]:
        """Get cached saved reports, optionally filtered by member_id."""
        state = cls.get_state(tool_context)
        
        if member_id is not None:
            return [report for report in state.saved_reports_cache if report.member_id == member_id]
        
        return state.saved_reports_cache
