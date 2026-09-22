import { Timestamp } from 'firebase/firestore';

// Member Report Core Types
export interface MemberProfile {
  mitglied_id: number;
  name?: string;
  email?: string;
  geschlecht: string;
  alter?: number;
  mitglied_seit?: string;
  vertragsart: string;
  vertragslaufzeit_kategorie?: string;
  gekuendigt: number; // 0=aktiv, 1=gekündigt
  studio_standort?: string;
}

export interface ChurnMetrics {
  churn_score_bias_corrected: number; // 0.0-100.0 - Bias-korrigierter Churn-Score
  churned: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  vertragsende_aktuell?: string;
  tage_bis_vertragsende?: number;
  kuendigungswahrscheinlichkeit_prozent: number;
}

export interface ActivityData {
  tage_seit_letztem_checkin: number;
  checkins_pro_monat: number;
  durchschnittliche_sitzungsdauer?: number;
  lieblings_trainingszeiten?: string[];
  activity_trend: ActivityTrendPoint[];
  letzter_besuch?: string;
  gesamtbesuche?: number;
}

export interface ActivityTrendPoint {
  monat: string;
  besuche: number;
  datum: string;
}

export interface PeerComparison {
  visits_vs_avg: number; // Percentage difference from peer average
  churn_score_vs_avg: number;
  rank_in_peer_group?: number;
  peer_group_definition: string;
  peer_group_size: number;
}

export interface RiskFactor {
  factor: string;
  impact_score: number;
  description: string;
  category: 'activity' | 'contract' | 'engagement' | 'demographic' | 'payment';
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'retention' | 'engagement' | 'communication' | 'service';
  estimated_impact?: string;
  suggested_timeline?: string;
}

export interface AIInsights {
  summary: string;
  key_findings: string[];
  recommendations: Recommendation[];
  confidence_score: number;
  analysis_date: string;
}

// Main Report Data Structure
export interface MemberReportData {
  profile: MemberProfile;
  churnAnalysis: ChurnMetrics;
  activityPatterns: ActivityData;
  comparativeMetrics?: PeerComparison;
  aiInsights?: AIInsights;
  riskFactors: RiskFactor[];
  recommendations: Recommendation[];
  generatedAt: Pick<Timestamp, 'seconds' | 'nanoseconds' | 'toDate' | 'toMillis'>;
  reportVersion: string;
}

// API Request/Response Types
export interface MemberReportRequest {
  memberId: number;
  includeComparison?: boolean;
  includeAIInsights?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface MemberReportResponse {
  success: boolean;
  data?: MemberReportData;
  error?: string;
  metadata?: {
    queryTime: number;
    dataSourced: 'bigquery' | 'cache' | 'synthetic_fixture';
    cacheAge?: number;
  };
}

// Export Configuration
export interface ReportExportConfig {
  format: 'pdf' | 'excel' | 'csv';
  template?: string;
  includeCharts?: boolean;
  sections?: string[];
  filename?: string;
}

// Report Templates
export type ReportTemplate =
  | 'standard'
  | 'executive_summary'
  | 'detailed_analytics'
  | 'risk_focused'
  | 'retention_strategy';

export interface ReportMetadata {
  template: ReportTemplate;
  generatedBy: string;
  studioId?: string;
  permissions: string[];
}