import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { syntheticMembers, syntheticActiveMembers, syntheticAverageRisk, syntheticFixtureSource } from '@/lib/data/synthetic-members';

/**
 * Churn Analytics API
 * 
 * Returns synthetic score statistics for UI development.
 * This endpoint does not run a live query or measure model performance.
 */

export interface ChurnAnalytics {
  source: typeof syntheticFixtureSource;
  average_churn_risk: {
    percentage: number;
    raw_score: number;
  };
  highest_risk_member: {
    mitglied_id: string;
    churn_score: number;
    risk_percentage: number;
    monthly_fee?: number;
    name?: string;
  };
  risk_summary: {
    total_members: number;
    members_analyzed: number;
    coverage_percentage: number;
  };
  model_performance: {
    score_range: {
      min: number;
      max: number;
    };
    distribution_quartiles: {
      q1: number;
      q2_median: number;
      q3: number;
    };
  };
}

function getSyntheticChurnAnalytics(): ChurnAnalytics {
  const scores = syntheticActiveMembers.map(member => member.score).sort((a, b) => a - b);
  const highest = syntheticActiveMembers.reduce((max, member) => member.score > max.score ? member : max);
  const quartile = (fraction: number) => {
    const position = (scores.length - 1) * fraction;
    const lower = Math.floor(position);
    return scores[lower] + (scores[Math.ceil(position)] - scores[lower]) * (position - lower);
  };
  return {
    source: syntheticFixtureSource,
    average_churn_risk: { percentage: syntheticAverageRisk * 100, raw_score: syntheticAverageRisk },
    highest_risk_member: {
      mitglied_id: highest.id,
      churn_score: highest.score,
      risk_percentage: highest.score * 100,
      monthly_fee: highest.monthlyFee,
      name: `Synthetisches Mitglied ${highest.id}`,
    },
    risk_summary: {
      total_members: syntheticMembers.length,
      members_analyzed: syntheticActiveMembers.length,
      coverage_percentage: syntheticActiveMembers.length / syntheticMembers.length * 100,
    },
    // Score distribution of invented records, not a model-quality evaluation.
    model_performance: {
      score_range: { min: scores[0], max: scores[scores.length - 1] },
      distribution_quartiles: { q1: quartile(0.25), q2_median: quartile(0.5), q3: quartile(0.75) },
    },
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
    
    const analytics: ChurnAnalytics = getSyntheticChurnAnalytics();
    
    return NextResponse.json(analytics);
    
  } catch (error) {
    console.error('Error fetching churn analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch churn analytics' },
      { status: 500 }
    );
  }
}
