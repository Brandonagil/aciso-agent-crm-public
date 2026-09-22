import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/firebase/authUtils';

const ADK_AGENT_URL = process.env.ADK_AGENT_URL || 'http://localhost:8001';

/**
 * GET /api/reports/saved
 * Lists saved reports with optional filtering
 * Query params:
 * - memberId: Filter by specific member
 * - reportType: Filter by report type
 * - limit: Number of reports to return (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const decodedToken = await verifyAuthToken(request);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query parameters
    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');
    const reportType = url.searchParams.get('reportType');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Build ADK Agent message
    let message = 'Liste alle gespeicherten Reports';
    
    if (memberId) {
      message += ` für Mitglied ${memberId}`;
    }
    
    if (reportType) {
      message += ` vom Typ ${reportType}`;
    }
    
    message += ` (maximal ${limit} Reports)`;

    // Call ADK Agent using modern endpoint structure (same as /api/adk)
    const sessionId = `reports_${Date.now()}`;
    const userId = `user-${decodedToken.uid.substring(0, 8)}`;
    
    const response = await fetch(`${ADK_AGENT_URL}/run_sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        app_name: "data-science",
        user_id: userId,
        session_id: sessionId,
        new_message: {
          role: "user",
          parts: [{ text: message }]
        },
        streaming: false
      })
    });

    if (!response.ok) {
      throw new Error(`ADK Agent request failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      reports: result.reports || [],
      total: result.total_reports || 0,
      metadata: {
        memberId: memberId ? parseInt(memberId) : null,
        reportType,
        limit,
        queryTime: result.query_info?.execution_time_seconds || 0
      }
    });

  } catch (error) {
    console.error('Error listing saved reports:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/reports/saved
 * Deletes a saved report
 * Query params:
 * - reportId: ID of the report to delete
 * - hardDelete: Whether to permanently delete (default: false for soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentication
    const decodedToken = await verifyAuthToken(request);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query parameters
    const url = new URL(request.url);
    const reportId = url.searchParams.get('reportId');
    const hardDelete = url.searchParams.get('hardDelete') === 'true';

    if (!reportId) {
      return NextResponse.json({ 
        error: 'Report ID is required' 
      }, { status: 400 });
    }

    // Build ADK Agent message
    const message = `Lösche Report ${reportId}${hardDelete ? ' permanent' : ''}`;

    // Call ADK Agent using modern endpoint structure (same as /api/adk)
    const sessionId = `delete_report_${Date.now()}`;
    const userId = `user-${decodedToken.uid.substring(0, 8)}`;
    
    const response = await fetch(`${ADK_AGENT_URL}/run_sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        app_name: "data-science",
        user_id: userId,
        session_id: sessionId,
        new_message: {
          role: "user",
          parts: [{ text: message }]
        },
        streaming: false
      })
    });

    if (!response.ok) {
      throw new Error(`ADK Agent request failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        reportId,
        deleted: true,
        hardDelete,
        message: result.message || 'Report deleted successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to delete report'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error deleting saved report:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}