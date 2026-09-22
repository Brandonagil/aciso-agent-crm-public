'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { 
  Bar, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { Users, Target, DollarSign, Activity, AlertTriangle, Loader2, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { businessColors, statusColors } from '@/lib/design-tokens';

interface TrueCohortData {
  cohort_retention: Array<{
    cohort: string;
    total: number;
    M0: number;  // Always 100%
    M1: number;  // Retention after 1 month
    M2: number;  // Retention after 2 months
    M3: number;  // Retention after 3 months
    M6: number;  // Retention after 6 months
    M12: number; // Retention after 12 months
    M18: number; // Retention after 18 months
  }>;
  revenue_cohorts: Array<{
    cohort: string;
    total: number;
    avg_customer_value: number;
    initial_revenue: number;
    revenue_retention_m1: number;
    revenue_retention_m3: number;
    revenue_retention_m6: number;
    revenue_retention_m12: number;
  }>;
  cohort_summary: {
    total_cohorts: number;
    avg_3month_retention: number;
    avg_12month_retention: number;
    avg_customer_value: number;
    total_customers: number;
    analysis_period: string;
  };
  acquisition_quality: Array<{
    cohort: string;
    cohort_size: number;
    avg_monthly_revenue: number;
    retention_6m: number;
    retention_12m: number;
    estimated_ltv: number;
    quality_score: number;
  }>;
}

interface ApiResponse {
  success: boolean;
  data: TrueCohortData;
  source: string;
  timestamp: string;
  metadata: unknown;
}

const chartConfig = {
  retention: { label: 'Retention Rate', color: businessColors.retention },
  revenue: { label: 'Revenue Retention', color: 'var(--primary)' },
  quality: { label: 'Quality Score', color: statusColors.success },
  ltv: { label: 'Lifetime Value', color: statusColors.info }
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
              <span className="text-sm font-medium">
                {(entry.name ?? '').includes('€') || (entry.name ?? '').includes('LTV') ?
                  `€${entry.value}` : 
                  `${entry.value}${(entry.name ?? '').includes('Retention') || (entry.name ?? '').includes('Score') ? '%' : ''}`
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// True Cohort Retention Heatmap Component
const TrueCohortRetentionChart: React.FC<{ data: TrueCohortData['cohort_retention'] }> = ({ data }) => {
  const months = ['M0', 'M1', 'M2', 'M3', 'M6', 'M12', 'M18'];
  
  // Color scale for retention rates (GREEN = high retention, RED = low retention)
  const getRetentionColor = (value: number) => {
    if (value >= 90) return 'hsl(142, 76%, 36%)'; // Dark green (excellent retention)
    if (value >= 80) return 'hsl(142, 65%, 45%)'; // Green (good retention)
    if (value >= 70) return 'hsl(45, 85%, 55%)';  // Yellow (moderate retention)
    if (value >= 60) return 'hsl(25, 85%, 60%)';  // Orange (poor retention)
    if (value > 0) return 'hsl(0, 84%, 60%)';     // Red (very poor retention)
    return 'hsl(var(--muted))'; // No data
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Echte Kohorten-Retention-Analyse
        </CardTitle>
        <CardDescription>
          Prozentsatz der Kunden, die nach X Monaten noch aktiv sind (echte Retention-Raten)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {/* Heatmap visualization */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <div className="w-20"></div>
              {months.map((month) => (
                <div key={month} className="w-12 text-center font-medium">
                  {month}
                </div>
              ))}
              <div className="ml-2">Größe</div>
            </div>
            {data.map((cohort) => (
              <div key={cohort.cohort} className="flex items-center gap-2">
                <div className="w-20 text-sm font-medium text-right">
                  {cohort.cohort}
                </div>
                <div className="flex gap-1">
                  {months.map((month) => {
                    const value = cohort[month as keyof typeof cohort] as number;
                    return (
                      <div
                        key={month}
                        className="w-12 h-8 flex items-center justify-center text-xs font-medium text-white rounded"
                        style={{ backgroundColor: getRetentionColor(value) }}
                        title={`${cohort.cohort} ${month}: ${value}% Retention Rate`}
                      >
                        {value ? Math.round(value) : '-'}
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground ml-2">
                  {cohort.total} Kunden
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }}></div>
              <span>Exzellent (90%+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142, 65%, 45%)' }}></div>
              <span>Gut (80-90%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(45, 85%, 55%)' }}></div>
              <span>Durchschnitt (70-80%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(25, 85%, 60%)' }}></div>
              <span>Schwach (60-70%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }}></div>
              <span>Kritisch (&lt;60%)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Revenue Cohort Chart
const RevenueCohortChart: React.FC<{ data: TrueCohortData['revenue_cohorts'] }> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Revenue-Kohorten-Analyse
        </CardTitle>
        <CardDescription>
          Umsatz-Retention nach Kohorten (wie viel Umsatz bleibt erhalten)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="cohort" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <ReferenceLine y={80} stroke="#fbbf24" strokeDasharray="2 2" />
              
              <Bar dataKey="revenue_retention_m1" fill={statusColors.success} name="1 Monat Revenue Retention" />
              <Bar dataKey="revenue_retention_m3" fill={statusColors.info} name="3 Monate Revenue Retention" />
              <Bar dataKey="revenue_retention_m6" fill={statusColors.warning} name="6 Monate Revenue Retention" />
              
              <Line 
                type="monotone" 
                dataKey="avg_customer_value" 
                stroke="var(--primary)"
                strokeWidth={3}
                name="Ø Kundenwert (€)"
                dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

// Cohort Summary Stats Component
const CohortSummaryStats: React.FC<{ data: TrueCohortData['cohort_summary'] }> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Durchschnittliche 3-Monats-Retention</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.avg_3month_retention}%</div>
          <Badge variant={data.avg_3month_retention >= 80 ? 'default' : data.avg_3month_retention >= 70 ? 'secondary' : 'destructive'}>
            {data.avg_3month_retention >= 80 ? 'Gut' : data.avg_3month_retention >= 70 ? 'Durchschnitt' : 'Verbesserung nötig'}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Durchschnittliche 12-Monats-Retention</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.avg_12month_retention}%</div>
          <Badge variant={data.avg_12month_retention >= 70 ? 'default' : data.avg_12month_retention >= 60 ? 'secondary' : 'destructive'}>
            {data.avg_12month_retention >= 70 ? 'Gut' : data.avg_12month_retention >= 60 ? 'Durchschnitt' : 'Verbesserung nötig'}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ø Kundenwert</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{data.avg_customer_value}</div>
          <p className="text-xs text-muted-foreground">
            Monatlicher Beitrag
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Analysierte Kunden</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.total_customers.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {data.total_cohorts} Kohorten | {data.analysis_period}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Acquisition Quality Analysis Chart
const AcquisitionQualityChart: React.FC<{ data: TrueCohortData['acquisition_quality'] }> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Akquisitionsqualität nach Kohorten
        </CardTitle>
        <CardDescription>
          Welche Kohorten haben die besten Kunden gebracht? (Quality Score = Retention + LTV)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="cohort" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <ReferenceLine yAxisId="left" y={75} stroke="#fbbf24" strokeDasharray="2 2" />
              
              <Bar yAxisId="left" dataKey="retention_6m" fill={statusColors.success} name="6M Retention %" />
              <Bar yAxisId="left" dataKey="retention_12m" fill={statusColors.info} name="12M Retention %" />
              
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="quality_score" 
                stroke="var(--primary)"
                strokeWidth={3}
                name="Quality Score"
                dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 5 }}
              />
              
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="estimated_ltv" 
                stroke={statusColors.warning} 
                strokeWidth={2}
                strokeDasharray="4 4"
                name="Geschätzter LTV (€)"
                dot={{ fill: statusColors.warning, strokeWidth: 1, r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Quality Score Legend */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span><strong>Quality Score:</strong> 40% 6M-Retention + 40% 12M-Retention + 20% Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-warning"></div>
              <span><strong>LTV:</strong> Geschätzter Customer Lifetime Value</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main True Cohort Analysis Dashboard Component
export function TrueCohortAnalysis() {
  const [data, setData] = React.useState<TrueCohortData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/dashboard/true-cohort-retention');
        const apiResponse: ApiResponse = await response.json();

        if (apiResponse.success && apiResponse.data) {
          setData(apiResponse.data);
          console.log('✅ True cohort retention data loaded:', apiResponse.source);
        } else {
          throw new Error('Failed to load true cohort retention data');
        }
      } catch (err) {
        console.error('❌ Error loading true cohort retention data:', err);
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
            Lade Echte Kohorten-Analyse...
          </CardTitle>
          <CardDescription>
            BigQuery-Daten werden verarbeitet...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Echte Retention-Raten werden berechnet...</p>
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
            Echte Kohorten-Analyse (Offline)
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
      {/* Summary Stats */}
      <CohortSummaryStats data={data.cohort_summary} />
      
      <Tabs defaultValue="retention" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="retention">Kunden-Retention</TabsTrigger>
          <TabsTrigger value="revenue">Revenue-Retention</TabsTrigger>
          <TabsTrigger value="quality">Akquisitionsqualität</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="retention" className="space-y-6">
          <TrueCohortRetentionChart data={data.cohort_retention} />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <RevenueCohortChart data={data.revenue_cohorts} />
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <AcquisitionQualityChart data={data.acquisition_quality} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Kohorten-Insights & Empfehlungen
              </CardTitle>
              <CardDescription>
                Handlungsempfehlungen basierend auf der echten Kohorten-Analyse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg bg-success/10">
                  <h4 className="font-medium text-success mb-2">🎯 Retention-Performance</h4>
                  <p className="text-sm text-muted-foreground">
                    Durchschnittlich behalten wir {data.cohort_summary.avg_3month_retention}% der Kunden nach 3 Monaten 
                    und {data.cohort_summary.avg_12month_retention}% nach 12 Monaten.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg bg-info/10">
                  <h4 className="font-medium text-info mb-2">💰 Revenue-Impact</h4>
                  <p className="text-sm text-muted-foreground">
                    Bei einem durchschnittlichen Kundenwert von €{data.cohort_summary.avg_customer_value} 
                    pro Monat führt jede 10%-Verbesserung der 12-Monats-Retention zu erheblichen Umsatzsteigerungen.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg bg-warning/10">
                  <h4 className="font-medium text-warning mb-2">⚡ Sofortmaßnahmen</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Fokus auf die ersten 3 Monate nach Beitritt (kritischer Zeitraum)</li>
                    <li>• Identifizierung der best-performenden Kohorten für Acquisition-Optimierung</li>
                    <li>• Proaktive Intervention bei Kohorten mit niedrigen Retention-Raten</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}