import { NextResponse } from 'next/server';

const dataScAgentURL = process.env.DATA_SCIENCE_AGENT_URL || 'http://localhost:8001';

export async function GET() {
  try {
    // Try to ping the ADK service using docs endpoint (since health doesn't exist)
    const response = await fetch(`${dataScAgentURL}/docs`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      return NextResponse.json({
        status: 'connected',
        adk_url: dataScAgentURL,
        adk_status: 'online'
      });
    } else {
      return NextResponse.json({
        status: 'disconnected',
        adk_url: dataScAgentURL,
        adk_status: 'error',
        error: `HTTP ${response.status}`
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'disconnected',
      adk_url: dataScAgentURL,
      adk_status: 'offline',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}