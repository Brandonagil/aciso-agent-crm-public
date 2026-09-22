"""
Aciso Agent Saved Reports Tools

Tools für die Speicherung und Verwaltung von Member-Reports in BigQuery.
"""

import json
import uuid
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

# Required imports for ADK integration
from google.cloud import bigquery
from google.cloud.exceptions import GoogleCloudError
from google.adk.tools import ToolContext

from .config import config
from .state import StateManager, QueryResult, SavedReportMetadata

logger = logging.getLogger(__name__)


def save_member_report(
    member_id: int, 
    report_data: Dict[str, Any], 
    tool_context: ToolContext,
    title: Optional[str] = None,
    description: Optional[str] = None,
    report_type: str = "standard",
    tags: Optional[List[str]] = None,
    expires_at: Optional[str] = None
) -> Dict[str, Any]:
    """
    Speichert einen Member-Report dauerhaft in BigQuery.
    
    Args:
        member_id: ID des Mitglieds
        report_data: Vollständige Report-Daten (MemberReportData JSON)
        tool_context: ADK Tool Context
        title: Optionaler Titel für den Report
        description: Optionale Beschreibung
        report_type: Report-Typ (standard, executive_summary, etc.)
        tags: Optionale Tags für Kategorisierung
        expires_at: Optionales Ablaufdatum (ISO string)
    
    Returns:
        Dict mit Speicher-Status und Report-Metadaten
    """
    try:
        state = StateManager.get_state(tool_context)
        
        # Generate unique report ID
        report_id = str(uuid.uuid4())
        current_time = datetime.now()
        
        # Get user ID from context (fallback to 'system')
        created_by = getattr(tool_context, 'user_id', 'system')
        
        # Calculate report size
        report_json = json.dumps(report_data, default=str)
        file_size_bytes = len(report_json.encode('utf-8'))
        
        # Parse expiration date if provided
        expires_timestamp = None
        if expires_at:
            try:
                expires_timestamp = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            except ValueError:
                logger.warning(f"Invalid expires_at format: {expires_at}")
        
        # Prepare data for BigQuery insertion
        insert_data = {
            'report_id': report_id,
            'member_id': member_id,
            'report_data': report_json,
            'report_type': report_type,
            'created_at': current_time.isoformat(),
            'created_by': created_by,
            'report_version': '1.0',
            'title': title,
            'description': description,
            'tags': tags or [],
            'expires_at': expires_timestamp.isoformat() if expires_timestamp else None,
            'is_active': True,
            'file_size_bytes': file_size_bytes,
            'generation_time_seconds': None,  # Could be calculated if timing info available
            'data_source_timestamp': current_time.isoformat(),
            'metadata': {
                'source': 'aciso_agent',
                'session_id': state.session_id,
                'original_query': state.original_query
            }
        }
        
        # Insert into BigQuery
        client = bigquery.Client(project=config.security.PROJECT_ID)
        table_ref = f"{config.security.PROJECT_ID}.{config.security.DATASET_ID}.saved_member_reports"
        
        # Execute insert
        insert_query = f"""
        INSERT INTO `{table_ref}` (
            report_id, member_id, report_data, report_type, created_at, created_by,
            report_version, title, description, tags, expires_at, is_active,
            file_size_bytes, data_source_timestamp, metadata
        ) VALUES (
            @report_id, @member_id, PARSE_JSON(@report_data), @report_type, 
            PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', @created_at), @created_by,
            @report_version, @title, @description, @tags,
            {f"PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', @expires_at)" if expires_timestamp else "NULL"},
            @is_active, @file_size_bytes,
            PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', @data_source_timestamp),
            PARSE_JSON(@metadata)
        )
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("report_id", "STRING", report_id),
                bigquery.ScalarQueryParameter("member_id", "INTEGER", member_id),
                bigquery.ScalarQueryParameter("report_data", "STRING", report_json),
                bigquery.ScalarQueryParameter("report_type", "STRING", report_type),
                bigquery.ScalarQueryParameter("created_at", "STRING", current_time.isoformat()),
                bigquery.ScalarQueryParameter("created_by", "STRING", created_by),
                bigquery.ScalarQueryParameter("report_version", "STRING", "1.0"),
                bigquery.ScalarQueryParameter("title", "STRING", title),
                bigquery.ScalarQueryParameter("description", "STRING", description),
                bigquery.ArrayQueryParameter("tags", "STRING", tags or []),
                bigquery.ScalarQueryParameter("expires_at", "STRING", expires_timestamp.isoformat() if expires_timestamp else None),
                bigquery.ScalarQueryParameter("is_active", "BOOL", True),
                bigquery.ScalarQueryParameter("file_size_bytes", "INTEGER", file_size_bytes),
                bigquery.ScalarQueryParameter("data_source_timestamp", "STRING", current_time.isoformat()),
                bigquery.ScalarQueryParameter("metadata", "STRING", json.dumps(insert_data['metadata']))
            ]
        )
        
        query_job = client.query(insert_query, job_config=job_config)
        query_job.result()  # Wait for completion
        
        # Create metadata object
        report_metadata = SavedReportMetadata(
            report_id=report_id,
            member_id=member_id,
            title=title,
            description=description,
            report_type=report_type,
            created_at=current_time,
            created_by=created_by,
            report_version="1.0",
            tags=tags or [],
            expires_at=expires_timestamp,
            file_size_bytes=file_size_bytes,
            data_source_timestamp=current_time,
            metadata=insert_data['metadata']
        )
        
        # Update state cache
        StateManager.update_saved_report_cache(tool_context, report_metadata)
        
        return {
            'success': True,
            'report_id': report_id,
            'member_id': member_id,
            'title': title,
            'report_type': report_type,
            'created_at': current_time.isoformat(),
            'file_size_bytes': file_size_bytes,
            'message': f'Report successfully saved with ID: {report_id}',
            'metadata': report_metadata.model_dump()
        }
        
    except Exception as e:
        error_msg = f"Error saving member report: {str(e)}"
        logger.error(error_msg)
        
        state = StateManager.get_state(tool_context)
        state.log_error(error_msg)
        StateManager.save_state(tool_context, state)
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'save_report_error'
        }


def get_saved_reports(
    member_id: int, 
    tool_context: ToolContext,
    limit: int = 10,
    report_type: Optional[str] = None,
    include_data: bool = False
) -> Dict[str, Any]:
    """
    Lädt gespeicherte Reports für einen Member aus BigQuery.
    
    Args:
        member_id: ID des Mitglieds
        tool_context: ADK Tool Context
        limit: Maximale Anzahl Reports
        report_type: Optionaler Filter nach Report-Typ
        include_data: Ob vollständige Report-Daten geladen werden sollen
    
    Returns:
        Dict mit Report-Liste und Metadaten
    """
    try:
        state = StateManager.get_state(tool_context)
        
        # Check cache first
        cached_reports = StateManager.get_saved_reports_cache(tool_context, member_id)
        
        # Build query
        select_fields = """
            report_id, member_id, report_type, created_at, created_by,
            title, description, tags, expires_at, file_size_bytes,
            generation_time_seconds, report_version
        """
        
        if include_data:
            select_fields += ", report_data"
        
        where_clause = "WHERE member_id = @member_id AND is_active = TRUE"
        
        if report_type:
            where_clause += " AND report_type = @report_type"
        
        query = f"""
        SELECT {select_fields}
        FROM `{config.security.PROJECT_ID}.{config.security.DATASET_ID}.saved_member_reports`
        {where_clause}
        ORDER BY created_at DESC
        LIMIT @limit
        """
        
        # Execute query
        client = bigquery.Client(project=config.security.PROJECT_ID)
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("member_id", "INTEGER", member_id),
                bigquery.ScalarQueryParameter("limit", "INTEGER", limit)
            ]
        )
        
        if report_type:
            job_config.query_parameters.append(
                bigquery.ScalarQueryParameter("report_type", "STRING", report_type)
            )
        
        query_job = client.query(query, job_config=job_config)
        results = list(query_job.result())
        
        # Format results
        reports = []
        for row in results:
            report_dict = dict(row)
            
            # Convert datetime objects to ISO strings
            if report_dict.get('created_at'):
                report_dict['created_at'] = report_dict['created_at'].isoformat()
            if report_dict.get('expires_at'):
                report_dict['expires_at'] = report_dict['expires_at'].isoformat()
            
            # Parse JSON data if included
            if include_data and report_dict.get('report_data'):
                try:
                    report_dict['report_data'] = json.loads(report_dict['report_data'])
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse report_data for report_id: {report_dict.get('report_id')}")
                    report_dict['report_data'] = None
            
            reports.append(report_dict)
        
        # Update query metrics
        query_result = QueryResult(
            query=query,
            executed_at=datetime.now(),
            row_count=len(results),
            bytes_processed=query_job.total_bytes_processed,
            execution_time_seconds=(query_job.ended - query_job.started).total_seconds() if query_job.ended and query_job.started else 0.0,
            data=[dict(row) for row in results]
        )
        
        state.update_query_result(query, query_result)
        StateManager.save_state(tool_context, state)
        
        return {
            'success': True,
            'member_id': member_id,
            'total_reports': len(reports),
            'reports': reports,
            'cached_reports_available': len(cached_reports),
            'query_info': {
                'execution_time_seconds': query_result.execution_time_seconds,
                'bytes_processed': query_result.bytes_processed,
                'row_count': query_result.row_count
            }
        }
        
    except Exception as e:
        error_msg = f"Error getting saved reports: {str(e)}"
        logger.error(error_msg)
        
        state = StateManager.get_state(tool_context)
        state.log_error(error_msg)
        StateManager.save_state(tool_context, state)
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'get_reports_error'
        }


def get_latest_saved_report(
    member_id: int, 
    tool_context: ToolContext,
    include_data: bool = True
) -> Dict[str, Any]:
    """
    Lädt den neuesten gespeicherten Report für einen Member.
    
    Args:
        member_id: ID des Mitglieds
        tool_context: ADK Tool Context
        include_data: Ob vollständige Report-Daten geladen werden sollen
    
    Returns:
        Dict mit dem neuesten Report oder Fehlermeldung
    """
    try:
        # Use get_saved_reports with limit=1
        result = get_saved_reports(
            member_id=member_id,
            tool_context=tool_context,
            limit=1,
            include_data=include_data
        )
        
        if not result.get('success'):
            return result
        
        reports = result.get('reports', [])
        
        if not reports:
            return {
                'success': False,
                'error': f'No saved reports found for member {member_id}',
                'error_type': 'no_reports_found'
            }
        
        latest_report = reports[0]
        
        return {
            'success': True,
            'member_id': member_id,
            'report': latest_report,
            'message': f'Latest report found for member {member_id}'
        }
        
    except Exception as e:
        error_msg = f"Error getting latest saved report: {str(e)}"
        logger.error(error_msg)
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'get_latest_report_error'
        }


def delete_saved_report(
    report_id: str, 
    tool_context: ToolContext,
    hard_delete: bool = False
) -> Dict[str, Any]:
    """
    Löscht einen gespeicherten Report (soft delete standardmäßig).
    
    Args:
        report_id: ID des zu löschenden Reports
        tool_context: ADK Tool Context
        hard_delete: Ob der Report physisch gelöscht werden soll
    
    Returns:
        Dict mit Lösch-Status
    """
    try:
        state = StateManager.get_state(tool_context)
        
        if hard_delete:
            # Physical deletion
            query = f"""
            DELETE FROM `{config.security.PROJECT_ID}.{config.security.DATASET_ID}.saved_member_reports`
            WHERE report_id = @report_id
            """
        else:
            # Soft deletion
            query = f"""
            UPDATE `{config.security.PROJECT_ID}.{config.security.DATASET_ID}.saved_member_reports`
            SET is_active = FALSE
            WHERE report_id = @report_id
            """
        
        client = bigquery.Client(project=config.security.PROJECT_ID)
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("report_id", "STRING", report_id)
            ]
        )
        
        query_job = client.query(query, job_config=job_config)
        query_job.result()  # Wait for completion
        
        # Remove from cache
        state.saved_reports_cache = [
            report for report in state.saved_reports_cache 
            if report.report_id != report_id
        ]
        
        if state.last_saved_report_id == report_id:
            state.last_saved_report_id = None
            state.current_report_metadata = None
        
        StateManager.save_state(tool_context, state)
        
        return {
            'success': True,
            'report_id': report_id,
            'deleted': True,
            'hard_delete': hard_delete,
            'message': f'Report {report_id} {"permanently deleted" if hard_delete else "deactivated"}'
        }
        
    except Exception as e:
        error_msg = f"Error deleting saved report: {str(e)}"
        logger.error(error_msg)
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'delete_report_error'
        }


def get_reports_summary(tool_context: ToolContext, days: int = 30) -> Dict[str, Any]:
    """
    Erstellt eine Zusammenfassung der Report-Aktivitäten.
    
    Args:
        tool_context: ADK Tool Context
        days: Anzahl Tage für die Zusammenfassung
    
    Returns:
        Dict mit Report-Statistiken
    """
    try:
        query = f"""
        SELECT 
            COUNT(*) as total_reports,
            COUNT(DISTINCT member_id) as unique_members,
            COUNT(DISTINCT created_by) as unique_users,
            AVG(file_size_bytes) as avg_file_size_bytes,
            SUM(file_size_bytes) as total_storage_bytes,
            AVG(generation_time_seconds) as avg_generation_time,
            ARRAY_AGG(DISTINCT report_type) as report_types,
            DATE_DIFF(CURRENT_DATE(), DATE(MIN(created_at)), DAY) as days_since_first_report
        FROM `{config.security.PROJECT_ID}.{config.security.DATASET_ID}.saved_member_reports`
        WHERE is_active = TRUE
          AND DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
        """
        
        client = bigquery.Client(project=config.security.PROJECT_ID)
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("days", "INTEGER", days)
            ]
        )
        
        query_job = client.query(query, job_config=job_config)
        results = list(query_job.result())
        
        if results:
            summary = dict(results[0])
            
            # Convert bytes to MB for readability
            if summary.get('avg_file_size_bytes'):
                summary['avg_file_size_mb'] = summary['avg_file_size_bytes'] / (1024 * 1024)
            if summary.get('total_storage_bytes'):
                summary['total_storage_mb'] = summary['total_storage_bytes'] / (1024 * 1024)
            
            return {
                'success': True,
                'period_days': days,
                'summary': summary,
                'query_info': {
                    'execution_time_seconds': (query_job.ended - query_job.started).total_seconds() if query_job.ended and query_job.started else 0.0,
                    'bytes_processed': query_job.total_bytes_processed
                }
            }
        else:
            return {
                'success': True,
                'period_days': days,
                'summary': {
                    'total_reports': 0,
                    'unique_members': 0,
                    'unique_users': 0,
                    'message': 'No reports found in the specified period'
                }
            }
        
    except Exception as e:
        error_msg = f"Error getting reports summary: {str(e)}"
        logger.error(error_msg)
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': 'summary_error'
        }