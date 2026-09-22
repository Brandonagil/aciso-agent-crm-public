'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Legend,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { Users, Target, Activity, AlertTriangle, Loader2, PieChart as PieChartIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { businessColors, statusColors } from '@/lib/design-tokens';

interface ComprehensiveRetentionData {
  cohort_retention: Array<{
    cohort: string;
    total: number;
    M0: number | null;
    M1: number | null;
    M2: number | null;
    M3: number | null;
    M6: number | null;
    M12: number | null;
    M18: number | null;
    M24: number | null;
  }>;
  risk_distribution: Array<{
    member_id: string;
    membership_months: number;
    churn_score: number;
    churn_score_bias_corrected?: number; // Bias-korrigierter Score
    monthly_fee: number;
    age: number;
    days_inactive: number;
    monthly_checkins: number;
    risk_level: 'critical' | 'high' | 'medium' | 'low';
  }>;
  churn_by_segments: Array<{
    segment: string;
    segment_type: string;
    avg_churn_risk: number;
    avg_engagement: number;
    avg_value: number;
    member_count: number;
  }>;
  monthly_trends: Array<{
    month: string;
    new_members: number;
    churned_members: number;
    avg_risk_score: number;
    net_growth: number;
  }>;
  engagement_analysis: Array<{
    monthly_checkins: number;
    avg_churn_score: number;
    member_count: number;
    avg_revenue: number;
  }>;
}

interface ApiResponse {
  success: boolean;
  data: ComprehensiveRetentionData;
  source: string;
  timestamp: string;
  metadata: unknown;
}

const chartConfig = {
  retention: { label: 'Retention Rate', color: businessColors.retention },
  churn: { label: 'Churn Rate', color: businessColors.churn },
  newMembers: { label: 'Neue Mitglieder', color: statusColors.success },
  critical: { label: 'Kritisch', color: '#dc2626' }, // Kräftiges Rot für kritische Risiken
  high: { label: 'Hoch', color: '#ea580c' },        // Orange-Rot für hohe Risiken  
  medium: { label: 'Mittel', color: statusColors.warning },
  low: { label: 'Niedrig', color: statusColors.success }
} satisfies ChartConfig;

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{label}</span>
          </div>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Kohorten-Churn-Score Heatmap - Durchschnittliche Churn-Scores nach Mitgliedschaftsdauer
const cohortMonths = ['0-1 Mon', '2-3 Mon', '4-6 Mon', '7-12 Mon', '13+ Mon'];
const CohortRetentionHeatmap: React.FC<{ data: ComprehensiveRetentionData['cohort_retention'] }> = ({ data }) => {
  // Filter und sortiere Kohorten
  const validCohorts = data.filter(cohort => cohort.M0 !== null).slice(0, 12);

  // Berechne Heatmap-Farbintensität basierend auf Churn-Score (umgekehrt zu Retention)
  const getHeatmapColor = (value: number | null): string => {
    if (value === null) return '#f1f5f9'; // Grau für keine Daten
    if (value >= 80) return '#dc2626'; // Sehr hohes Risiko (rot)
    if (value >= 60) return '#f97316'; // Hohes Risiko (orange)
    if (value >= 40) return '#fbbf24'; // Mittleres Risiko (gelb)
    if (value >= 20) return '#34d399'; // Niedriges Risiko (hellgrün)
    return '#059669'; // Sehr niedriges Risiko (grün)
  };

  const getTextColor = (value: number | null): string => {
    if (value === null) return '#64748b';
    return value >= 50 ? '#ffffff' : '#000000';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Kohorten-Churn-Score-Analyse (Heatmap)
        </CardTitle>
        <CardDescription>
          Durchschnittliche Churn-Scores der Kohorten nach Mitgliedschaftsdauer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header mit Monaten */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              <div className="text-xs font-medium text-muted-foreground text-center py-2">Kohorte</div>
              <div className="text-xs font-medium text-muted-foreground text-center py-2">Größe</div>
              {cohortMonths.map(month => (
                <div key={month} className="text-xs font-medium text-muted-foreground text-center py-2">
                  {month}
                </div>
              ))}
            </div>

            {/* Heatmap-Zeilen */}
            {validCohorts.map((cohort) => (
              <div key={cohort.cohort} className="grid grid-cols-7 gap-1 mb-1">
                {/* Kohorten-Label */}
                <div className="text-xs font-medium bg-muted rounded px-2 py-1 text-center">
                  {cohort.cohort}
                </div>

                {/* Kohorte-Größe */}
                <div className="text-xs bg-muted rounded px-2 py-1 text-center">
                  {cohort.total.toLocaleString()}
                </div>

                {/* Churn-Score-Werte */}
                {['M0', 'M1', 'M2', 'M3', 'M6'].map((key) => {
                  const value = cohort[key as keyof typeof cohort] as number | null;
                  return (
                    <div
                      key={key}
                      className="text-xs rounded px-2 py-1 text-center font-medium"
                      style={{
                        backgroundColor: getHeatmapColor(value),
                        color: getTextColor(value)
                      }}
                      title={value !== null ? `${value}% Churn-Score` : 'Keine Daten'}
                    >
                      {value !== null ? `${value}%` : '-'}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legende */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-3">Churn-Score Legende:</h4>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#059669' }}></div>
                  <span>&lt;20% (Sehr niedrig)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#34d399' }}></div>
                  <span>20-39% (Niedrig)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
                  <span>40-59% (Mittel)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
                  <span>60-79% (Hoch)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
                  <span>80%+ (Sehr hoch)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f1f5f9' }}></div>
                  <span>Keine Daten</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Zeigt durchschnittliche bias-korrigierte Churn-Scores der Kohorten-Mitglieder nach Mitgliedschaftsdauer
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Aggregation für Stacked Bar Chart
const bucketLabels = ['0–6 Mon', '7–12 Mon', '13–24 Mon', '25–36 Mon', '37–60 Mon', '61+ Mon'];
function getBucketCounts(riskData: ComprehensiveRetentionData['risk_distribution']) {
  return bucketLabels.map(label => {
    const bucketData = riskData.filter((d: ComprehensiveRetentionData['risk_distribution'][number]) => {
      const m = d.membership_months;
      if (label === '0–6 Mon') return m <= 6;
      if (label === '7–12 Mon') return m > 6 && m <= 12;
      if (label === '13–24 Mon') return m > 12 && m <= 24;
      if (label === '25–36 Mon') return m > 24 && m <= 36;
      if (label === '37–60 Mon') return m > 36 && m <= 60;
      return m > 60;
    });
    const total = bucketData.length || 1;
    const counts: { bucket: string;[key: string]: number | string } = { bucket: label };

    // Verwende bias-korrigierte Scores zur Berechnung der Risiko-Level
    const getChurnScore = (d: ComprehensiveRetentionData['risk_distribution'][number]) => d.churn_score_bias_corrected ?? d.churn_score;

    counts['critical'] = bucketData.filter((d: ComprehensiveRetentionData['risk_distribution'][number]) => getChurnScore(d) >= 70).length / total * 100;
    counts['high'] = bucketData.filter((d: ComprehensiveRetentionData['risk_distribution'][number]) => getChurnScore(d) >= 60 && getChurnScore(d) < 70).length / total * 100;
    counts['medium'] = bucketData.filter((d: ComprehensiveRetentionData['risk_distribution'][number]) => getChurnScore(d) >= 40 && getChurnScore(d) < 60).length / total * 100;
    counts['low'] = bucketData.filter((d: ComprehensiveRetentionData['risk_distribution'][number]) => getChurnScore(d) < 40).length / total * 100;

    return counts;
  });
}

// Farblogik für Risiko-Kategorien zentral
const riskColorMap = {
  critical: businessColors.highRisk,
  high: businessColors.highRisk,
  medium: businessColors.mediumRisk,
  low: businessColors.lowRisk,
};

// Risk Distribution Stacked Bar Chart
const RiskDistributionStackedBarChart: React.FC<{ data: ComprehensiveRetentionData['risk_distribution'] }> = ({ data }) => {
  const bucketCounts = getBucketCounts(data);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Risiko-Verteilung
        </CardTitle>
        <CardDescription>
          Bias-korrigierte Churn-Scores nach Mitgliedschaftsdauer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={bucketCounts} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip formatter={(v) => (typeof v === 'number' ? `${v.toFixed(1)}%` : v)} />
            <Legend />
            <Bar dataKey="critical" stackId="a" fill={riskColorMap.critical} name="Kritisch" />
            <Bar dataKey="high" stackId="a" fill={riskColorMap.high} name="Hoch" />
            <Bar dataKey="medium" stackId="a" fill={riskColorMap.medium} name="Mittel" />
            <Bar dataKey="low" stackId="a" fill={riskColorMap.low} name="Niedrig" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Segment Analysis Radar Chart
const SegmentAnalysisChart: React.FC<{ data: ComprehensiveRetentionData['churn_by_segments'] }> = ({ data }) => {
  // Group by segment type for better visualization
  const feeSegments = data.filter(item => item.segment_type === 'Fee');
  const ageSegments = data.filter(item => item.segment_type === 'Age');
  const tenureSegments = data.filter(item => item.segment_type === 'Tenure');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Segment-Analyse
        </CardTitle>
        <CardDescription>
          Durchschnittliche Metriken nach Kundensegmenten
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Fee Segments */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Nach Preissegment</h4>
            {feeSegments.map((segment) => (
              <div key={segment.segment} className="flex justify-between text-sm">
                <span>{segment.segment}</span>
                <Badge variant={segment.avg_churn_risk > 50 ? 'destructive' : 'secondary'}>
                  {Math.round(segment.avg_churn_risk)}% Risiko
                </Badge>
              </div>
            ))}
          </div>

          {/* Age Segments */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Nach Altersgruppe</h4>
            {ageSegments.map((segment) => (
              <div key={segment.segment} className="flex justify-between text-sm">
                <span>{segment.segment}</span>
                <Badge variant={segment.avg_churn_risk > 50 ? 'destructive' : 'secondary'}>
                  {Math.round(segment.avg_churn_risk)}% Risiko
                </Badge>
              </div>
            ))}
          </div>

          {/* Tenure Segments */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Nach Mitgliedsdauer</h4>
            {tenureSegments.map((segment) => (
              <div key={segment.segment} className="flex justify-between text-sm">
                <span>{segment.segment}</span>
                <Badge variant={segment.avg_churn_risk > 50 ? 'destructive' : 'secondary'}>
                  {Math.round(segment.avg_churn_risk)}% Risiko
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Monthly Trends Composed Chart
const ChurnRiskDistributionChart: React.FC<{ data: ComprehensiveRetentionData['risk_distribution'] }> = ({ data }) => {

  // Group data by risk levels using bias-corrected scores - ✅ UNIFIED THRESHOLDS
  const riskLevels = [
    { name: 'Kritisch (≥70%)', value: data.filter(item => (item.churn_score_bias_corrected || item.churn_score) >= 70).length, color: riskColorMap.critical },
    { name: 'Hoch (60-69%)', value: data.filter(item => (item.churn_score_bias_corrected || item.churn_score) >= 60 && (item.churn_score_bias_corrected || item.churn_score) < 70).length, color: riskColorMap.high },
    { name: 'Mittel (40-59%)', value: data.filter(item => (item.churn_score_bias_corrected || item.churn_score) >= 40 && (item.churn_score_bias_corrected || item.churn_score) < 60).length, color: riskColorMap.medium },
    { name: 'Niedrig (<40%)', value: data.filter(item => (item.churn_score_bias_corrected || item.churn_score) < 40).length, color: riskColorMap.low }
  ].filter(level => level.value > 0);

  // Keine Labels mehr - nur Hover-Tooltips

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Churn-Risiko Verteilung
        </CardTitle>
        <CardDescription>
          Aktuelle Risikoverteilung aller Mitglieder
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row items-center gap-4 w-full">
          <div className="flex-1 max-w-[60%] flex justify-center">
            <ChartContainer config={chartConfig} className="h-[260px] w-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskLevels}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskLevels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const total = riskLevels.reduce((sum, level) => sum + level.value, 0);
                        const percentage = ((data.value / total) * 100).toFixed(1);
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-medium text-foreground">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.value} Mitglieder ({percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          <div className="flex flex-col gap-2 max-w-[40%] items-start justify-center pl-2">
            {riskLevels.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: entry.color }}></span>
                <span className="text-sm" style={{ color: entry.color }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Engagement Analysis Chart
const EngagementAnalysisChart: React.FC<{ data: ComprehensiveRetentionData['engagement_analysis'] }> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Engagement vs. Churn-Risiko
        </CardTitle>
        <CardDescription>
          Zusammenhang zwischen Check-in-Häufigkeit und Churn-Wahrscheinlichkeit
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="monthly_checkins"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<CustomTooltip />} />

              <Line
                type="monotone"
                dataKey="avg_churn_score"
                stroke={businessColors.churn}
                strokeWidth={3}
                name="Durchschnittlicher Churn-Score"
                dot={{ fill: '#ffffff', stroke: businessColors.churn, strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component
export function ComprehensiveRetentionDashboard() {
  const [data, setData] = React.useState<ComprehensiveRetentionData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/dashboard/comprehensive-retention');
        const apiResponse: ApiResponse = await response.json();

        if (apiResponse.success && apiResponse.data) {
          setData(apiResponse.data);
          console.log('✅ Comprehensive retention data loaded:', apiResponse.source);
        } else {
          throw new Error('Failed to load comprehensive retention data');
        }
      } catch (err) {
        console.error('❌ Error loading comprehensive retention data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Lade Comprehensive Retention Analytics...
          </CardTitle>
          <CardDescription>
            BigQuery-Daten werden verarbeitet...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Umfassende Retention-Analyse wird geladen...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Comprehensive Retention Analytics (Offline)
          </CardTitle>
          <CardDescription>
            {error ? `Fehler: ${error}` : 'Keine Daten verfügbar'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-8 w-8" />
            <p>BigQuery-Verbindung nicht verfügbar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="cohorts">Kohorten</TabsTrigger>
          <TabsTrigger value="risk">Risiko-Analyse</TabsTrigger>
          <TabsTrigger value="segments">Segmente</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChurnRiskDistributionChart data={data.risk_distribution} />
            <EngagementAnalysisChart data={data.engagement_analysis} />
          </div>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-6">
          <CohortRetentionHeatmap data={data.cohort_retention} />
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <RiskDistributionStackedBarChart data={data.risk_distribution} />
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          <SegmentAnalysisChart data={data.churn_by_segments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}