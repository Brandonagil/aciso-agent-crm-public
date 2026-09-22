import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/firebase/authUtils';

const ADK_AGENT_URL = process.env.ADK_AGENT_URL || 'http://localhost:8001';

/**
 * GET /api/reports/summary
 * Gets summary statistics for saved reports
 * Query params:
 * - days: Number of days to include in summary (default: 30)
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
    const days = parseInt(url.searchParams.get('days') || '30');

    // Build ADK Agent message
    const message = `Erstelle Report-Zusammenfassung für die letzten ${days} Tage`;

    // Call ADK Agent
    const endpoint = `${ADK_AGENT_URL}/apps/Aciso_Agent/users/${decodedToken.uid}/sessions/reports_summary/invoke`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: message
      })
    });

    if (!response.ok) {
      throw new Error(`ADK Agent request failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      summary: result.summary || {},
      period_days: days,
      metadata: {
        queryTime: result.query_info?.execution_time_seconds || 0,
        bytesProcessed: result.query_info?.bytes_processed || 0
      }
    });

  } catch (error) {
    console.error('Error getting reports summary:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}