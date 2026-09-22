'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadialBarChart, RadialBar, PolarAngleAxis, PolarGrid, PolarRadiusAxis } from 'recharts';
import { TrendingUp, AlertTriangle, Target, Activity, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChatTrigger, InsightTrigger } from '@/components/ui/chat-trigger';
import { createMetricChatContext } from '@/lib/utils/chat-integration';
import { churnAnalysisSummary } from '@/lib/data/churn-data';
import { createGlassCard } from '@/lib/styles/glass-morphism';
import { cn } from '@/lib/utils';

// Interface für Live-Metriken von API
interface RiskDistributionMember {
  churn_score: number;
  churn_score_bias_corrected?: number;
  monthly_fee?: number;
}

interface LiveMetrics {
  total_customers: number;
  active_customers: number;
  total_at_risk: number;
  total_revenue_at_risk: number;
  current_churn_rate: number;
  retention_score: number;
  avg_ml_risk_score: number;
  risk_distribution: {
    KRITISCH: number;
    HOCH: number;
    MITTEL: number;
    NIEDRIG: number;
  };
}

function createChurnRiskData(metrics: LiveMetrics) {
  const { risk_distribution, active_customers } = metrics;
  return [
    {
      name: 'Niedrig',
      value: Math.round((risk_distribution.NIEDRIG / active_customers) * 100),
      count: risk_distribution.NIEDRIG,
      color: '#10b981', // Grün
      bgColor: 'hsl(142, 71%, 45%)',
      order: 1
    },
    {
      name: 'Mittel',
      value: Math.round((risk_distribution.MITTEL / active_customers) * 100),
      count: risk_distribution.MITTEL,
      color: '#f59e0b', // Orange
      bgColor: 'hsl(45, 93%, 47%)',
      order: 2
    },
    {
      name: 'Hoch',
      value: Math.round((risk_distribution.HOCH / active_customers) * 100),
      count: risk_distribution.HOCH,
      color: '#ef4444', // Rot
      bgColor: 'hsl(0, 84%, 60%)',
      order: 3
    },
    {
      name: 'Kritisch',
      value: Math.round((risk_distribution.KRITISCH / active_customers) * 100),
      count: risk_distribution.KRITISCH,
      color: '#dc2626', // Dunkelrot
      bgColor: 'hsl(0, 84%, 40%)',
      order: 4
    }
  ].sort((a, b) => a.order - b.order);
}

function createRetentionData(metrics: LiveMetrics) {
  const retentionValue = Math.round(metrics.retention_score);
  // Einheitliche, gedämpfte Farbe
  const fillColor = 'hsl(142, 40%, 50%)'; // Gedämpftes Grün, passt zu anderen Komponenten

  return [
    {
      name: 'Retention',
      value: retentionValue,
      fill: fillColor,
      actualChurn: metrics.current_churn_rate
    }
  ];
}

const chartConfig = {
  value: {
    label: 'Score'
  },
  retention: {
    label: 'Retention Score',
    color: 'var(--chart-3)'
  }
} satisfies ChartConfig;

export function ChurnMetricsCard() {
  const [animatedScore, setAnimatedScore] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(false);
  const [selectedRiskFilter, setSelectedRiskFilter] = React.useState<string>('all');
  const [metrics, setMetrics] = React.useState<LiveMetrics | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch live data from comprehensive-retention API
  React.useEffect(() => {
    const fetchLiveData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/dashboard/comprehensive-retention');
        const apiResponse = await response.json();
        
        if (apiResponse.success && apiResponse.data) {
          const { risk_distribution } = apiResponse.data;
          
          // Calculate live metrics from risk_distribution array
          const getChurnScore = (member: RiskDistributionMember) => member.churn_score_bias_corrected ?? member.churn_score;
          
          // Use unified thresholds: KRITISCH ≥70%, HOCH 60-69%, at-risk ≥60%
          const critical = risk_distribution.filter((m: RiskDistributionMember) => getChurnScore(m) >= 70).length;
          const high = risk_distribution.filter((m: RiskDistributionMember) => getChurnScore(m) >= 60 && getChurnScore(m) < 70).length;
          const medium = risk_distribution.filter((m: RiskDistributionMember) => getChurnScore(m) >= 40 && getChurnScore(m) < 60).length;
          const low = risk_distribution.filter((m: RiskDistributionMember) => getChurnScore(m) < 40).length;
          
          const total_at_risk = critical + high;
          const total_revenue_at_risk = risk_distribution
            .filter((m: RiskDistributionMember) => getChurnScore(m) >= 60)
            .reduce((sum: number, m: RiskDistributionMember) => sum + (m.monthly_fee || 0), 0);
          
          const liveMetrics: LiveMetrics = {
            total_customers: risk_distribution.length,
            active_customers: risk_distribution.length,
            total_at_risk,
            total_revenue_at_risk,
            current_churn_rate: churnAnalysisSummary.current_churn_rate, // Synthetic, not queried here
            retention_score: churnAnalysisSummary.retention_score, // Synthetic, not queried here
            avg_ml_risk_score: risk_distribution.reduce((sum: number, m: RiskDistributionMember) => sum + getChurnScore(m), 0) / risk_distribution.length,
            risk_distribution: {
              KRITISCH: critical,
              HOCH: high,
              MITTEL: medium,
              NIEDRIG: low
            }
          };
          
          setMetrics(liveMetrics);
        }
      } catch (error) {
        console.error('Error fetching live metrics:', error);
        // Keep null metrics to show loading state
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveData();
  }, []);

  const retentionScore = metrics ? Math.round(metrics.retention_score) : 0;

  React.useEffect(() => {
    if (isLoading) return;
    setIsVisible(true);
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      interval = setInterval(() => {
        setAnimatedScore(prev => {
          const next = Math.min(prev + 2, retentionScore);
          if (next >= retentionScore) clearInterval(interval);
          return next;
        });
      }, 30);
    }, 200);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isLoading, retentionScore]);

  // Show loading state while fetching data
  if (isLoading || !metrics) {
    return (
      <Card className={cn("group flex flex-col h-full", createGlassCard('floating', { hover: true, animated: true }))}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="relative">
              <Target className="h-5 w-5 text-primary" />
              <Zap className="h-2 w-2 text-yellow-400 absolute -top-0.5 -right-0.5 animate-pulse" />
            </div>
            Churn Intelligence
          </CardTitle>
          <CardDescription className="flex items-center gap-2 text-xs">
            <Activity className="h-3 w-3 text-muted-foreground" />
            Lade Live-Daten...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="animate-pulse">BigQuery-Daten werden verarbeitet...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const churnRiskData = createChurnRiskData(metrics);
  const retentionData = createRetentionData(metrics);

  // Filter data based on selection
  const filteredRiskData = churnRiskData.filter(item =>
    selectedRiskFilter === 'all' || item.name.toLowerCase() === selectedRiskFilter
  );

  // Bestimme Retention-Status
  const getRetentionStatus = (score: number) => {
    if (score >= 85) return { label: 'Gut', color: 'text-green-600', icon: Target };
    if (score >= 80) return { label: 'Durchschnitt', color: 'text-amber-600', icon: TrendingUp };
    return { label: 'Kritisch', color: 'text-red-600', icon: AlertTriangle };
  };

  const retentionStatus = getRetentionStatus(retentionScore);
  const StatusIcon = retentionStatus.icon;

  return (
    <Card className={cn("group flex flex-col h-full", createGlassCard('floating', { hover: true, animated: true }))}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="relative">
                <Target className="h-5 w-5 text-primary" />
                <Zap className="h-2 w-2 text-yellow-400 absolute -top-0.5 -right-0.5 animate-pulse" />
              </div>
              Churn Intelligence
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-xs">
              <Activity className="h-3 w-3 text-muted-foreground" />
              BigQuery-Risikodaten; Retention-Kennzahl synthetisch
            </CardDescription>
          </div>
          <ChatTrigger
            context={createMetricChatContext('churn_overview', metrics.current_churn_rate)}
            prompt="Analysiere die Churn-Übersicht und gib strategische Empfehlungen"
            position="top-right"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-2 overflow-auto p-3">
        {/* Kompaktes Retention Gauge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${retentionStatus.color}`} />
              Retention Performance
            </h4>
            <Badge variant={retentionScore >= 90 ? 'default' : retentionScore >= 85 ? 'secondary' : 'destructive'} className="text-xs px-2 py-0.5">
              {retentionStatus.label}
            </Badge>
          </div>

          <div className="relative h-[150px]">
            <ChartContainer config={chartConfig} className="w-full h-full">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="95%"
                startAngle={180}
                endAngle={0}
                data={[{ ...retentionData[0], value: isVisible ? retentionData[0].value : 0 }]}
              >
                <defs>
                  <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 40%, 50%)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(142, 40%, 50%)" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <PolarGrid gridType="polygon" radialLines={false} className="opacity-10 stroke-muted-foreground" />
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <PolarRadiusAxis tick={false} tickCount={6} domain={[0, 100]} className="text-xs fill-muted-foreground" />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      className="bg-background/95 backdrop-blur-md border shadow-xl rounded-xl p-2"
                      hideLabel
                      formatter={(value) => [
                        <span key="value" className="font-mono font-semibold text-sm">{value}%</span>,
                        <span key="label" className="text-muted-foreground text-xs">Retention Score</span>
                      ]}
                    />
                  }
                />
                <RadialBar
                  dataKey="value"
                  fill="url(#retentionFill)"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                  cornerRadius={8}
                  className="transition-all duration-700 ease-out"
                />
              </RadialBarChart>
            </ChartContainer>

            {/* Zentraler Score */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-4xl font-bold transition-all duration-500 text-foreground ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                  {animatedScore}%
                </div>
                <div className={`text-xs text-muted-foreground mt-1 transition-all duration-500 delay-100 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                  Retention Score
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 p-2 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <p className="text-xs font-semibold text-destructive">Churn Rate</p>
            </div>
            <InsightTrigger
              context={createMetricChatContext('churn_rate', metrics.current_churn_rate)}
              prompt="Erstelle Aktionsplan zur Churn-Reduktion"
              className="text-xl font-bold text-destructive"
            >
              {metrics.current_churn_rate.toFixed(1)}%
            </InsightTrigger>
          </div>

          <div className="space-y-1 p-2 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-primary" />
              <p className="text-xs font-semibold text-primary">Umsatzrisiko</p>
            </div>
            <InsightTrigger
              context={createMetricChatContext('revenue_at_risk', metrics.total_revenue_at_risk)}
              prompt="Berechne ROI für Retention-Investitionen"
              className="text-xl font-bold text-primary"
            >
              €{(metrics.total_revenue_at_risk / 1000).toFixed(0)}k
            </InsightTrigger>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Risiko-Verteilung
            </h4>
            <Select value={selectedRiskFilter} onValueChange={setSelectedRiskFilter}>
              <SelectTrigger className="w-auto h-7 text-xs">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                {churnRiskData.map((item) => (
                  <SelectItem key={item.name.toLowerCase()} value={item.name.toLowerCase()}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            {filteredRiskData.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    {item.name}
                  </span>
                  <span className="font-mono">{item.count.toLocaleString()}</span>
                </div>
                <Progress value={item.value} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}