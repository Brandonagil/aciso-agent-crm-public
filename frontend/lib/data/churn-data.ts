// Shared types and synthetic fixtures for the static dashboard cards.
// Live-query endpoints use the configured BigQuery project separately.
import {
  syntheticMembers, syntheticActiveMembers, syntheticAtRiskMembers,
  syntheticFixtureSource, syntheticFixtureTimestamp, syntheticRiskDistribution,
  syntheticChurnRate, syntheticAverageRisk, syntheticRevenueAtRisk,
} from '@/lib/data/synthetic-members';

export interface CustomerMetrics {
  zahlweise_risk?: string;
  checkins_per_euro: number;
  contract_ltv: number;
  days_inactive: number;
  total_checkins: number;
}

export interface CustomerProfile {
  age: number;
  gender: string;
  payment_method: string;
  monthly_fee: number;
  activity_status: string;
  contract_duration_months: number;
}

export interface Customer {
  customer_id: string;
  name: string;
  churn_probability: number;
  risk_category: string;
  profile: CustomerProfile;
  business_metrics: CustomerMetrics;
  retention_priority: string;
}


// Type-Only Export für TypeScript
export type { Customer as ChurnCustomer };

// Expected schema for the configurable BigQuery integration.
export const BIGQUERY_SCHEMA = {
  mitglied_id: 'INTEGER NOT NULL',
  alter_jahre: 'INTEGER',
  geschlecht: 'STRING',
  vertragsbeginn: 'STRING',
  laufzeit: 'STRING',
  zahlweise: 'STRING',
  aktueller_beitrag_eur: 'FLOAT64',
  zahlungsart: 'STRING',
  vertragsperiode: 'INTEGER',
  vertragsende_aktuell: 'STRING',
  anzahl_checkins: 'INTEGER',
  durchschn_aufenthalt_min: 'INTEGER',
  letzter_checkin: 'STRING',
  mitgliedschaft_dauer_monate: 'FLOAT64',
  checkins_pro_monat: 'FLOAT64',
  tage_seit_letztem_checkin: 'INTEGER',
  churn_score_prozent: 'FLOAT64 NOT NULL',
  gekuendigt: 'INTEGER NOT NULL',
  kuendigungsdatum: 'STRING',
  kuendigungsart: 'STRING',
  kuendigungsgrund: 'STRING',
  risiko_kategorie: 'STRING NOT NULL',
  engagement_score: 'FLOAT64'
};

// Segment labels used by the dashboard.
export const riskSegments = [
  { id: 'neue-mitglieder', name: 'Neue Mitglieder (0-3 Monate)' },
  { id: 'etablierte-risikokunden', name: 'Etablierte Risikokunden (4-12 Monate)' },
  { id: 'inaktive-langzeitmitglieder', name: 'Inaktive Langzeitmitglieder (>12 Monate)' },
  { id: 'aeltere-risikokunden', name: 'Ältere Risikokunden (55+ Jahre)' },
  { id: 'premium-risikokunden', name: 'Premium-Risikokunden (>100€/Monat)' },
  { id: 'sonstige-risiken', name: 'Sonstige Risikogruppen' },
];

export interface ChurnAnalysisSummary {
  timestamp?: string;
  total_customers: number;
  active_customers: number;
  total_at_risk: number;
  total_revenue_at_risk: number;
  avg_churn_risk: number;
  risk_distribution: {
    KRITISCH: number;
    HOCH: number;
    MITTEL: number;
    NIEDRIG: number;
  };
  zahlweise_risk_analysis: {
    [key: string]: {
      count: number;
      avg_churn_probability: number;
      revenue_at_risk: number;
    };
  };
  current_churn_rate: number;
  retention_score: number;
}

// All numbers below are invented or derived from the twelve synthetic members.
export const churnAnalysisSummary: ChurnAnalysisSummary & { source: string } = {
  source: syntheticFixtureSource,
  timestamp: syntheticFixtureTimestamp,
  total_customers: syntheticMembers.length,
  active_customers: syntheticActiveMembers.length,
  total_at_risk: syntheticAtRiskMembers.length,
  total_revenue_at_risk: syntheticRevenueAtRisk,
  avg_churn_risk: syntheticAverageRisk * 100,
  current_churn_rate: syntheticChurnRate,
  retention_score: 100 - syntheticChurnRate,
  risk_distribution: syntheticRiskDistribution,
  zahlweise_risk_analysis: Object.fromEntries(['F', '1M', '3M', '1T', '24M'].map(payment => {
    const members = syntheticActiveMembers.filter(member => member.payment === payment);
    return [payment, {
      count: members.length,
      avg_churn_probability: members.reduce((sum, member) => sum + member.score, 0) / members.length,
      revenue_at_risk: members.filter(member => member.score >= 0.6).reduce((sum, member) => sum + member.monthlyFee, 0),
    }];
  })),
};

// Example reasons assigned to the four synthetic at-risk members. Not SHAP values.
export const churnReasons = [
  { reason: 'activity_low', label: 'Niedrige Aktivität (Check-ins)', count: 1, percentage: 25, feature: 'checkins_pro_monat' },
  { reason: 'price_sensitivity', label: 'Hoher Beitrag vs. Nutzung', count: 1, percentage: 25, feature: 'aktueller_beitrag_eur' },
  { reason: 'engagement_drop', label: 'Sinkendes Engagement', count: 1, percentage: 25, feature: 'engagement_score' },
  { reason: 'inactivity_period', label: 'Lange Inaktivität', count: 1, percentage: 25, feature: 'tage_seit_letztem_checkin' },
  { reason: 'payment_risk', label: 'Zahlungsweise', count: 0, percentage: 0, feature: 'zahlweise' },
];

// Example cancellation reasons for the two synthetic inactive members.
export const actualChurnReasons = [
  { reason: 'cost', label: 'Zu teuer', count: 1, percentage: 50 },
  { reason: 'time', label: 'Keine Zeit', count: 1, percentage: 50 },
  { reason: 'relocation', label: 'Umzug', count: 0, percentage: 0 },
  { reason: 'dissatisfaction', label: 'Unzufriedenheit', count: 0, percentage: 0 },
  { reason: 'other', label: 'Sonstige Gründe', count: 0, percentage: 0 },
];

// Invented four-month example ending with twelve members, ten of them active.
export const retentionTrends = [
  { month: 'Januar 2026', total: 9, active: 8, new_customers: 9 },
  { month: 'Februar 2026', total: 10, active: 8, new_customers: 1 },
  { month: 'März 2026', total: 11, active: 9, new_customers: 1 },
  { month: 'April 2026', total: 12, active: 10, new_customers: 1 },
].map(period => ({
  month: period.month,
  retention: period.active / period.total * 100,
  churn: (period.total - period.active) / period.total * 100,
  clv: 480,
  new_customers: period.new_customers,
  year: 2026,
  source: syntheticFixtureSource,
}));

export const riskSegmentation = [
  { segment: 'NIEDRIG Risiko', min: 0, max: 0.4, group: 'lowRisk' },
  { segment: 'MITTEL Risiko', min: 0.4, max: 0.6, group: 'mediumRisk' },
  { segment: 'HOCH Risiko', min: 0.6, max: 0.7, group: 'highRisk' },
  { segment: 'KRITISCH Risiko', min: 0.7, max: 1.01, group: 'highRisk' },
].map(segment => {
  const members = syntheticActiveMembers.filter(member => member.score >= segment.min && member.score < segment.max);
  return {
    segment: segment.segment,
    lowRisk: segment.group === 'lowRisk' ? members.length : 0,
    mediumRisk: segment.group === 'mediumRisk' ? members.length : 0,
    highRisk: segment.group === 'highRisk' ? members.length : 0,
    avgPredictedChurn: members.reduce((sum, member) => sum + member.score, 0) / members.length * 100,
    actualChurn: 0,
    count: members.length,
    source: syntheticFixtureSource,
  };
});

// Helper-Funktionen für Chat-Kontext
export function getCustomerChatContext(customer: Customer): string {
  return `Kunde ${customer.name} (ID: ${customer.customer_id}) hat eine Churn-Wahrscheinlichkeit von ${(customer.churn_probability * 100).toFixed(1)}% und ist in der Risikokategorie "${customer.risk_category}". Monatlicher Beitrag: €${customer.profile.monthly_fee}, Zahlweise: ${customer.profile.payment_method}, ${customer.business_metrics.days_inactive} Tage inaktiv.`;
}

export function getAggregateDataChatContext(metric: string, value: number): string {
  const contexts: Record<string, string> = {
    'total_at_risk': `Insgesamt ${value} Kunden sind gefährdet zu kündigen, was einem Umsatzrisiko von €${churnAnalysisSummary.total_revenue_at_risk.toLocaleString()} entspricht.`,
    'churn_rate': `Die aktuelle Churn-Rate liegt bei ${value}%, was ${value > 8 ? 'über' : 'unter'} dem Zielwert liegt.`,
    'avg_clv': `Der durchschnittliche Customer Lifetime Value beträgt €${value}.`
  };
  return contexts[metric] || `Metrik ${metric} hat den Wert ${value}.`;
}

// Public fixture exports contain no original customer records.
const churnData = {
  riskSegments,
  BIGQUERY_SCHEMA,
  churnAnalysisSummary,
  message: 'Static figures are synthetic fixtures. They are not observations or model-evaluation results.'
};

export { churnData };