'use client';

import * as React from 'react';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Pie, PieChart, Cell } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { ChurnMetrics } from '@/lib/types/reports';

interface ChurnRiskGaugeProps {
  churnAnalysis: ChurnMetrics;
  className?: string;
}

export function ChurnRiskGauge({ churnAnalysis, className }: ChurnRiskGaugeProps) {
  const { churn_score_bias_corrected, risk_level, kuendigungswahrscheinlichkeit_prozent, tage_bis_vertragsende } = churnAnalysis;

  // Format percentage for display
  const percentage = churn_score_bias_corrected < 10
    ? Number(churn_score_bias_corrected.toFixed(1))
    : Math.round(churn_score_bias_corrected);

  // Define risk level colors and icons
  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'critical':
        return {
          color: '#ef4444',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          icon: AlertTriangle,
          label: 'Kritisch',
          description: 'Sofortige Maßnahmen erforderlich'
        };
      case 'high':
        return {
          color: '#f97316',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200',
          icon: TrendingUp,
          label: 'Hoch',
          description: 'Erhöhte Aufmerksamkeit notwendig'
        };
      case 'medium':
        return {
          color: '#eab308',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          icon: TrendingDown,
          label: 'Mittel',
          description: 'Monitoring empfohlen'
        };
      case 'low':
      default:
        return {
          color: '#22c55e',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          icon: CheckCircle,
          label: 'Niedrig',
          description: 'Kunde zufrieden'
        };
    }
  };

  const riskConfig = getRiskConfig(risk_level);
  const RiskIcon = riskConfig.icon;

  // Create gauge data for semicircle
  const gaugeData = [
    {
      name: 'risk',
      value: percentage,
      fill: riskConfig.color,
    },
    {
      name: 'remaining',
      value: 100 - percentage,
      fill: '#e5e7eb', // gray-200
    }
  ];

  const chartConfig = {
    risk: {
      label: 'Churn Risiko',
      color: riskConfig.color,
    },
    remaining: {
      label: 'Verbleibendes Risiko',
      color: '#e5e7eb',
    },
  } satisfies ChartConfig;

  return (
    <Card className={className}>
      <CardHeader className="items-center pb-0">
        <CardTitle className="flex items-center gap-2">
          <RiskIcon className="h-5 w-5" style={{ color: riskConfig.color }} />
          Churn-Risiko Analyse
        </CardTitle>
        <CardDescription>
          Aktuelle Kündigungswahrscheinlichkeit basierend auf Verhalten und Daten
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        <div className="flex flex-col items-center space-y-4">
          {/* Gauge Chart */}
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square w-full max-w-[200px]"
          >
            <PieChart width={200} height={200}>
              <Pie
                data={gaugeData}
                cx={100}
                cy={100}
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip
                content={<ChartTooltipContent hideLabel />}
              />
            </PieChart>
          </ChartContainer>

          {/* Center Score Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div
                className="text-3xl font-bold tabular-nums tracking-tight"
                style={{
                  color: riskConfig.color,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                {percentage}%
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Risiko-Score
              </div>
            </div>
          </div>

          {/* Risk Level Badge */}
          <Badge
            className={`${riskConfig.bgColor} ${riskConfig.textColor} ${riskConfig.borderColor} border`}
          >
            <RiskIcon className="h-3 w-3 mr-1" />
            {riskConfig.label} Risiko
          </Badge>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 gap-4 mt-6">
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">
              Kündigungswahrscheinlichkeit
            </span>
            <span className="font-semibold">
              {kuendigungswahrscheinlichkeit_prozent}%
            </span>
          </div>

          {tage_bis_vertragsende !== undefined && (
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                Tage bis Vertragsende
              </span>
              <span className={`font-semibold ${tage_bis_vertragsende < 30 ? 'text-red-600' :
                tage_bis_vertragsende < 90 ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                {tage_bis_vertragsende}
              </span>
            </div>
          )}

          {churnAnalysis.churned === 1 && (
            <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-sm text-red-700">
                Status
              </span>
              <Badge variant="destructive">
                Bereits gekündigt
              </Badge>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex-col gap-2 text-sm pt-4">
        <div className="flex items-center gap-2 font-medium leading-none">
          <RiskIcon className="h-4 w-4" style={{ color: riskConfig.color }} />
          {riskConfig.description}
        </div>
        <div className="leading-none text-muted-foreground text-center">
          Score basiert auf ML-Analyse • Aktivitätsmuster und Vertragsdaten
        </div>
      </CardFooter>
    </Card>
  );
}