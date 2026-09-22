'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { ChatButton } from '@/components/ui/chat-button';
import { createMetricChatContext } from '@/lib/utils/chat-integration';
import { createGlassCard } from '@/lib/styles/glass-morphism';
import { cn } from '@/lib/utils';

interface RetentionTrendData {
  month: string;
  month_short: string;
  retention: number;
  churn: number;
  clv: number;
  new_customers: number;
  year: number;
}

interface ApiResponse {
  success: boolean;
  data: RetentionTrendData[];
  statistics: {
    total_periods: number;
    total_customers: number;
    avg_retention_rate: number;
    avg_churn_rate: number;
    current_retention_rate: number;
    retention_trend: number;
    best_retention_month?: RetentionTrendData;
    worst_retention_month?: RetentionTrendData;
  };
  source: string;
  timestamp: string;
}

const chartConfig = {
  retention: {
    label: 'Retention Rate',
    color: 'hsl(142, 71%, 45%)' // Soft Green
  },
  churn: {
    label: 'Churn Rate',
    color: 'hsl(0, 70%, 50%)' // Muted Red
  }
} satisfies ChartConfig;

export function AreaGraph() {
  const [chartData, setChartData] = React.useState<RetentionTrendData[]>([]);
  const [statistics, setStatistics] = React.useState<ApiResponse['statistics'] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeDataPoint, setActiveDataPoint] = React.useState<number | null>(null);

  // Lade echte Daten von BigQuery API
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/dashboard/retention-trends');
        const apiResponse: ApiResponse = await response.json();

        if (apiResponse.success && apiResponse.data) {
          setChartData(apiResponse.data);
          setStatistics(apiResponse.statistics);
        } else {
          throw new Error('Failed to load data');
        }
      } catch (err) {
        console.error('Error loading area graph data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const avgRetention = statistics?.avg_retention_rate || 0;
  const retentionTrend = statistics?.retention_trend || 0;

  // Loading State
  if (isLoading) {
    return (
      <Card className={cn("group", createGlassCard('card', { hover: true, animated: true }))}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary animate-pulse" />
                <CardTitle>Lade Trends...</CardTitle>
              </div>
              <CardDescription>
                BigQuery-Daten werden geladen
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Activity className="h-8 w-8 animate-pulse" />
            <p>Lade echte Retention-Daten...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error || chartData.length === 0) {
    return (
      <Card className={cn("group", createGlassCard('card', { hover: true, animated: true }))}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-destructive" />
                <CardTitle>Trends (Offline)</CardTitle>
              </div>
              <CardDescription>
                {error ? `Fehler: ${error}` : 'Keine Daten verfügbar'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Activity className="h-8 w-8" />
            <p>Verwenden Sie das Chat-Interface</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("group", createGlassCard('card', { hover: true, animated: true }))}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Kundenbindungs-Trends</CardTitle>
            </div>
            <CardDescription>
              📊 Live BigQuery-Daten: Retention über {chartData.length} Monate
              (Ø {avgRetention.toFixed(1)}%)
            </CardDescription>
          </div>
          <ChatButton
            context={createMetricChatContext('retention_trends', avgRetention)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Trends analysieren
          </ChatButton>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 20,
              right: 20,
              top: 25,
              bottom: 15
            }}
            onMouseMove={(e) => {
              if (e && e.activeTooltipIndex !== undefined) {
                setActiveDataPoint(e.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setActiveDataPoint(null)}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              opacity={0.3}
              stroke="hsl(var(--muted-foreground))"
              className="transition-opacity duration-300"
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip
              cursor={{
                stroke: "hsl(var(--muted-foreground))",
                strokeWidth: 1,
                strokeDasharray: "5 5",
                opacity: 0.6
              }}
              content={
                <ChartTooltipContent
                  className="bg-background/95 backdrop-blur-md border shadow-xl rounded-xl p-3"
                  labelFormatter={(value) => (
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Activity className="h-3 w-3" />
                      {value}
                    </div>
                  )}
                  formatter={(value, name) => [
                    <span key="value" className="font-mono font-semibold">{Number(value).toFixed(1)}%</span>,
                    <span key="label" className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label}</span>
                  ]}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <defs>
              <linearGradient id="fillRetention" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="#16a34a"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="#16a34a"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="fillChurn" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="#dc2626"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="#dc2626"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="retention"
              type="monotone"
              fill="url(#fillRetention)"
              fillOpacity={activeDataPoint !== null ? 0.3 : 0.2}
              stroke="#16a34a"
              strokeWidth={2}
              className="transition-all duration-300"
              dot={false}
              activeDot={{
                r: 4,
                stroke: "#16a34a",
                strokeWidth: 2,
                fill: "hsl(var(--background))",
                className: "drop-shadow-md"
              }}
            />
            <Area
              dataKey="churn"
              type="monotone"
              fill="url(#fillChurn)"
              fillOpacity={activeDataPoint !== null ? 0.3 : 0.2}
              stroke="#dc2626"
              strokeWidth={2}
              className="transition-all duration-300"
              dot={false}
              activeDot={{
                r: 4,
                stroke: "#dc2626",
                strokeWidth: 2,
                fill: "hsl(var(--background))",
                className: "drop-shadow-md"
              }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-3 text-sm">
        <div className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {retentionTrend >= 0 ? (
              <>
                <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">+{retentionTrend.toFixed(1)}%</span>
                </div>
                <span className="text-muted-foreground">Verbesserung</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-red-700 dark:text-red-400">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-medium">{retentionTrend.toFixed(1)}%</span>
                </div>
                <span className="text-muted-foreground">Rückgang</span>
              </>
            )}
          </div>
          <div className="text-right">
            <div className="font-mono font-semibold">{avgRetention.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Ø Retention</div>
          </div>
        </div>
        {/* BQML text removed */}
      </CardFooter>
    </Card>
  );
}