import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/firebase/authUtils';
import {
  MemberReportData,
  MemberReportResponse,
  MemberProfile,
  ChurnMetrics,
  ActivityData,
  RiskFactor,
  Recommendation,
  ActivityTrendPoint
} from '@/lib/types/reports';
import { admin } from '@/lib/firebase/admin';
import { getBigQueryTable } from '@/lib/config/google-cloud';

/**
 * GET /api/reports/member/[memberId]
 * Generates a comprehensive report for a specific member
 * Query params:
 * - includeComparison: Include peer comparison data
 * - includeAIInsights: Include AI analysis
 * - saved: Load from saved reports instead of generating new
 * - version: Specific report version/ID to load
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const startTime = Date.now();

  try {
    // Authentication
    const decodedToken = await verifyAuthToken(request);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = await params;

    // Validate memberId
    if (!memberId || isNaN(Number(memberId))) {
      return NextResponse.json({
        error: 'Invalid member ID provided'
      }, { status: 400 });
    }

    const memberIdInt = parseInt(memberId, 10);

    // Query parameters for customization
    const url = new URL(request.url);
    const includeComparison = url.searchParams.get('includeComparison') === 'true';
    const includeAIInsights = url.searchParams.get('includeAIInsights') === 'true';
    const loadSaved = url.searchParams.get('saved') === 'true';
    const reportVersion = url.searchParams.get('version');

    console.log(`Generating report for member ${memberIdInt}, user: ${decodedToken.uid}, saved: ${loadSaved}`);

    let reportData: MemberReportData;
    let dataSourced: 'synthetic_fixture' | 'cache' = 'synthetic_fixture';

    if (loadSaved) {
      // Load from saved reports
      const savedResult = await loadSavedReport(memberIdInt, reportVersion);
      if (savedResult.success && savedResult.data) {
        reportData = savedResult.data;
        dataSourced = 'cache';
      } else {
        // Fallback to generating new report
        console.log(`No saved report found for member ${memberIdInt}, generating new report`);
        reportData = await generateMemberReport(memberIdInt, {
          includeComparison,
          includeAIInsights
        });
      }
    } else {
      // Generate new report
      reportData = await generateMemberReport(memberIdInt, {
        includeComparison,
        includeAIInsights
      });
    }

    const response: MemberReportResponse = {
      success: true,
      data: reportData,
      metadata: {
        queryTime: Date.now() - startTime,
        dataSourced,
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating member report:', error);

    const response: MemberReportResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/reports/member/[memberId]
 * Saves a member report to persistent storage
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    // Authentication
    const decodedToken = await verifyAuthToken(request);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = await params;

    // Validate memberId
    if (!memberId || isNaN(Number(memberId))) {
      return NextResponse.json({
        error: 'Invalid member ID provided'
      }, { status: 400 });
    }

    const memberIdInt = parseInt(memberId, 10);

    // Parse request body
    const body = await request.json();
    const {
      reportData,
      title,
      description,
      reportType = 'standard',
      tags = [],
      expiresAt
    } = body;

    if (!reportData) {
      return NextResponse.json({
        error: 'Report data is required'
      }, { status: 400 });
    }

    console.log(`Saving report for member ${memberIdInt}, user: ${decodedToken.uid}`);

    // Save via ADK Agent
    const saveResult = await saveReportViaAgent(memberIdInt, {
      reportData,
      title,
      description,
      reportType,
      tags,
      expiresAt,
      userId: decodedToken.uid
    });

    if (saveResult.success) {
      return NextResponse.json({
        success: true,
        reportId: saveResult.reportId,
        message: 'Report saved successfully',
        metadata: saveResult.metadata
      });
    } else {
      return NextResponse.json({
        success: false,
        error: saveResult.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error saving member report:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Generate member report data
 * TODO: Replace with actual BigQuery integration
 */
async function generateMemberReport(
  memberId: number,
  options: { includeComparison?: boolean; includeAIInsights?: boolean }
): Promise<MemberReportData> {

  // Mock profile data (replace with BigQuery call)
  const profile: MemberProfile = {
    mitglied_id: memberId,
    name: `Synthetisches Mitglied ${memberId}`,
    email: `synthetic-member-${memberId}@example.com`,
    geschlecht: Math.random() > 0.5 ? 'Weiblich' : 'Männlich',
    alter: Math.floor(Math.random() * 50) + 20,
    mitglied_seit: '2023-01-15',
    vertragsart: Math.random() > 0.5 ? 'Jahresvertrag' : 'Monatsvertrag',
    vertragslaufzeit_kategorie: Math.random() > 0.5 ? 'Langzeit' : 'Kurzzeit',
    gekuendigt: Math.random() > 0.2 ? 0 : 1, // 0=aktiv, 1=gekündigt
    studio_standort: 'Synthetisches Studio'
  };

  // Mock churn analysis
  const churnScore = Math.random() * 100; // Convert to percentage
  const churnAnalysis: ChurnMetrics = {
    churn_score_bias_corrected: churnScore,
    churned: churnScore > 70 ? 1 : 0,
    risk_level: churnScore > 80 ? 'critical' :
      churnScore > 60 ? 'high' :
        churnScore > 30 ? 'medium' : 'low',
    vertragsende_aktuell: '2024-06-30',
    tage_bis_vertragsende: Math.floor(Math.random() * 180),
    kuendigungswahrscheinlichkeit_prozent: Math.round(churnScore * 100)
  };

  // Mock activity data
  const activityPatterns: ActivityData = {
    tage_seit_letztem_checkin: Math.floor(Math.random() * 30),
    checkins_pro_monat: Math.floor(Math.random() * 20) + 2,
    durchschnittliche_sitzungsdauer: Math.floor(Math.random() * 90) + 30,
    lieblings_trainingszeiten: ['18:00-20:00', '07:00-09:00'],
    activity_trend: generateActivityTrend(),
    letzter_besuch: '2024-12-03',
    gesamtbesuche: Math.floor(Math.random() * 200) + 50
  };

  // Mock risk factors
  const riskFactors: RiskFactor[] = [
    {
      factor: 'Sinkende Besuchsfrequenz',
      impact_score: 0.8,
      description: 'Besuche sind in den letzten 3 Monaten um 40% zurückgegangen',
      category: 'activity'
    },
    {
      factor: 'Vertrag läuft bald ab',
      impact_score: 0.6,
      description: 'Aktueller Vertrag endet in weniger als 60 Tagen',
      category: 'contract'
    },
    {
      factor: 'Keine Kursteilnahme',
      impact_score: 0.4,
      description: 'Hat in den letzten 6 Monaten an keinen Gruppenkursen teilgenommen',
      category: 'engagement'
    }
  ];

  // Mock recommendations
  const recommendations: Recommendation[] = [
    {
      id: 'rec-1',
      title: 'Proaktiver Kontakt',
      description: 'Persönliches Gespräch zur Zufriedenheit und möglichen Problemen führen',
      priority: 'high',
      category: 'communication',
      estimated_impact: 'Synthetisches Beispiel; Wirkung nicht gemessen',
      suggested_timeline: 'Innerhalb der nächsten 7 Tage'
    },
    {
      id: 'rec-2',
      title: 'Kostenlose Probestunde',
      description: 'Einladung zu neuen Kursen oder Personal Training Session',
      priority: 'medium',
      category: 'engagement',
      estimated_impact: 'Synthetisches Beispiel; Wirkung nicht gemessen',
      suggested_timeline: 'Innerhalb der nächsten 14 Tage'
    },
    {
      id: 'rec-3',
      title: 'Flexible Vertragsoptionen',
      description: 'Alternative Vertragslaufzeiten oder Pausenregelungen anbieten',
      priority: 'medium',
      category: 'retention',
      estimated_impact: 'Synthetisches Beispiel; Wirkung nicht gemessen',
      suggested_timeline: 'Bei nächstem Kontakt'
    }
  ];

  // Peer comparison (if requested)
  let comparativeMetrics = undefined;
  if (options.includeComparison) {
    comparativeMetrics = {
      visits_vs_avg: Math.random() * 0.6 - 0.3, // -30% to +30%
      churn_score_vs_avg: Math.random() * 0.4 - 0.2, // -20% to +20%
      rank_in_peer_group: Math.floor(Math.random() * 50) + 1,
      peer_group_definition: `${profile.geschlecht}, Alter ${profile.alter}-${(profile.alter || 30) + 10}, ${profile.vertragsart}`,
      peer_group_size: Math.floor(Math.random() * 100) + 50
    };
  }

  // AI insights (if requested)
  let aiInsights = undefined;
  if (options.includeAIInsights) {
    aiInsights = {
      summary: `Synthetisches Beispiel ohne Modellbewertung: ${profile.name} zeigt ein ${churnAnalysis.risk_level} Kündigungsrisiko basierend auf reduzierter Aktivität und bald ablaufendem Vertrag.`,
      key_findings: [
        'Deutlich reduzierte Besuchsfrequenz in den letzten 3 Monaten',
        'Keine Teilnahme an Gruppenkursen',
        'Vertrag läuft in Kürze ab ohne erkennbare Verlängerungsabsicht'
      ],
      recommendations: recommendations,
      confidence_score: 0.85,
      analysis_date: new Date().toISOString()
    };
  }

  return {
    profile,
    churnAnalysis,
    activityPatterns,
    comparativeMetrics,
    aiInsights,
    riskFactors,
    recommendations,
    generatedAt: admin.firestore.Timestamp.now(),
    reportVersion: '1.0.0-synthetic'
  };
}

/**
 * Generate mock activity trend data
 */
function generateActivityTrend(): ActivityTrendPoint[] {
  const trends: ActivityTrendPoint[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  for (let i = 0; i < 12; i++) {
    const month = months[i];
    const baseVisits = Math.floor(Math.random() * 15) + 5;
    // Simulate declining trend for higher churn risk
    const declineFactor = i > 8 ? 0.7 : 1;
    const visits = Math.floor(baseVisits * declineFactor);

    trends.push({
      monat: month,
      besuche: visits,
      datum: `2024-${String(i + 1).padStart(2, '0')}-01`
    });
  }

  return trends;
}

/**
 * Load saved report from BigQuery via ADK Agent
 */
async function loadSavedReport(
  memberId: number,
  reportVersion?: string | null
): Promise<{ success: boolean; data?: MemberReportData; error?: string }> {
  try {
    const ADK_AGENT_URL = process.env.ADK_AGENT_URL || 'http://localhost:8001';

    const message = reportVersion
      ? `Lade gespeicherten Report mit ID ${reportVersion} für Mitglied ${memberId}`
      : `Lade neuesten gespeicherten Report für Mitglied ${memberId}`;

    // Use modern ADK endpoint structure
    const sessionId = `load_report_${Date.now()}`;
    const userId = `system-${memberId}`;

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

    // Parse ADK Agent response
    if (result.success && result.report) {
      return {
        success: true,
        data: result.report.report_data || result.report
      };
    } else {
      return {
        success: false,
        error: result.error || 'No saved report found'
      };
    }

  } catch (error) {
    console.error('Error loading saved report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load saved report'
    };
  }
}

/**
 * Save report via ADK Agent
 */
async function saveReportViaAgent(
  memberId: number,
  options: {
    reportData: MemberReportData;
    title?: string;
    description?: string;
    reportType?: string;
    tags?: string[];
    expiresAt?: string;
    userId: string;
  }
): Promise<{ success: boolean; reportId?: string; error?: string; metadata?: Record<string, unknown> }> {
  try {
    const ADK_AGENT_URL = process.env.ADK_AGENT_URL || 'http://localhost:8001';

    // Prepare save message with all parameters
    const saveParams = {
      member_id: memberId,
      report_data: options.reportData,
      title: options.title,
      description: options.description,
      report_type: options.reportType || 'standard',
      tags: options.tags || [],
      expires_at: options.expiresAt
    };

    const message = `Speichere Report für Mitglied ${memberId}: ${JSON.stringify(saveParams)}`;

    // Use modern ADK endpoint structure
    const sessionId = `save_report_${Date.now()}`;
    const userId = `user-${options.userId.substring(0, 8)}`;

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
      return {
        success: true,
        reportId: result.report_id,
        metadata: result.metadata
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to save report'
      };
    }

  } catch (error) {
    console.error('Error saving report via agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save report'
    };
  }
}

/**
 * TODO: Implement actual BigQuery integration
 * This function will replace the mock data generation above
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchMemberDataFromBigQuery(memberId: number): Promise<unknown> {
  // Placeholder for BigQuery implementation
  // Will use the existing BigQuery tools from the Python backend
  // or implement similar functionality in TypeScript

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const memberQuery = `
    SELECT 
      mitglied_id,
      geschlecht,
      alter,
      vertragsart,
      gekuendigt,
      churned,
      churn_score_bias_corrected,
      vertragsende_aktuell,
      tage_seit_letztem_checkin,
      checkins_pro_monat
    FROM \`${getBigQueryTable(process.env.BQ_DATASET_ID || 'churn_prevention')}\`
    WHERE mitglied_id = ${memberId}
    LIMIT 1
  `;

  // TODO: Execute BigQuery and return results
  // For now, this is a placeholder
  throw new Error('BigQuery integration not yet implemented');
}
