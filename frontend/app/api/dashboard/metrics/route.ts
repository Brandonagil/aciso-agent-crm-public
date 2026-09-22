import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { churnAnalysisSummary } from '@/lib/data/churn-data';
import { syntheticActiveMembers, syntheticAverageRisk, syntheticFixtureSource, syntheticFixtureTimestamp } from '@/lib/data/synthetic-members';

/**
 * Dashboard Metrics API
 * 
 * Returns a small synthetic fixture for the existing static dashboard cards.
 * No original customer figures or measured model results are included.
 */

export interface DashboardMetrics {
  source: typeof syntheticFixtureSource;
  total_customers: number;
  active_customers: number;
  total_at_risk: number;
  total_revenue_at_risk: number;
  current_churn_rate: number;
  retention_score: number;
  risk_distribution: {
    KRITISCH: number;
    HOCH: number;
    MITTEL: number;
    NIEDRIG: number;
  };
  churn_model_stats: {
    avg_churn_score: number;
    max_churn_score: number;
    min_churn_score: number;
    model_version?: string;
  };
  last_updated: string;
}

function getSyntheticMetrics(): DashboardMetrics {
  return {
    source: syntheticFixtureSource,
    total_customers: churnAnalysisSummary.total_customers,
    active_customers: churnAnalysisSummary.active_customers,
    total_at_risk: churnAnalysisSummary.total_at_risk,
    total_revenue_at_risk: churnAnalysisSummary.total_revenue_at_risk,
    current_churn_rate: churnAnalysisSummary.current_churn_rate,
    retention_score: churnAnalysisSummary.retention_score,
    risk_distribution: churnAnalysisSummary.risk_distribution,
    churn_model_stats: {
      avg_churn_score: syntheticAverageRisk * 100,
      max_churn_score: Math.max(...syntheticActiveMembers.map(member => member.score)) * 100,
      min_churn_score: Math.min(...syntheticActiveMembers.map(member => member.score)) * 100,
      model_version: 'synthetic_fixture_not_evaluated',
    },
    last_updated: syntheticFixtureTimestamp,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Check for auth header
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);
      } catch (authError) {
        console.error('Auth verification failed:', authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const metrics: DashboardMetrics = getSyntheticMetrics();

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
