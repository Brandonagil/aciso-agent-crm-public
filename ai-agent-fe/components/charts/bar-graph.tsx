'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, Cell } from 'recharts';
import { TrendingUp, BarChart3, MousePointer } from 'lucide-react';
import { createGlassCard } from '@/lib/styles/glass-morphism';
import { cn } from '@/lib/utils';

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
import { ChatButton } from '@/components/ui/chat-button';
import { createSegmentChatContext } from '@/lib/utils/chat-integration';
import { riskSegmentation } from '@/lib/data/churn-data';

// Echte Risiko-Segmentierungs-Daten
const chartData = riskSegmentation;

const chartConfig = {
  lowRisk: {
    label: 'Niedriges Risiko',
    color: 'var(--chart-3)'
  },
  mediumRisk: {
    label: 'Mittleres Risiko',
    color: 'var(--chart-2)'
  },
  highRisk: {
    label: 'Hohes Risiko',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig;

export function BarGraph() {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>('lowRisk');
  const [hoveredBar, setHoveredBar] = React.useState<number | null>(null);

  const total = React.useMemo(
    () => ({
      lowRisk: chartData.reduce((acc, curr) => acc + curr.lowRisk, 0),
      mediumRisk: chartData.reduce((acc, curr) => acc + curr.mediumRisk, 0),
      highRisk: chartData.reduce((acc, curr) => acc + curr.highRisk, 0)
    }),
    []
  );

  return (
    <Card className={cn("group", createGlassCard('card', { hover: true, animated: true }))}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Risiko-Segmentierung</CardTitle>
            </div>
            <CardDescription>Synthetische Risikogruppen aus zehn aktiven Beispielmitgliedern.</CardDescription>
          </div>
          <ChatButton
            context={createSegmentChatContext('All Segments', chartData)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Segmente analysieren
          </ChatButton>
        </div>
      </CardHeader>

      {/* Tab-Navigation mit modernem Design */}
      <div className="px-6">
        <div className="flex space-x-1 rounded-xl bg-muted/50 p-1.5 backdrop-blur-sm">
          {['lowRisk', 'mediumRisk', 'highRisk'].map((key) => {
            const chart = key as keyof typeof chartConfig;
            const isActive = activeChart === chart;
            return (
              <button
                key={chart}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-4 
                  text-center transition-all duration-300 font-medium group
                  ${isActive
                    ? 'bg-background text-foreground shadow-lg shadow-primary/10 scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }
                `}
                onClick={() => setActiveChart(chart)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${isActive ? 'scale-125 shadow-lg' : 'group-hover:scale-110'
                      }`}
                    style={{ backgroundColor: chartConfig[chart].color }}
                  />
                  <span className="text-xs font-medium">
                    {chartConfig[chart].label}
                  </span>
                </div>
                <span className={`text-lg font-bold transition-all duration-300 ${isActive ? 'text-xl' : 'group-hover:text-lg'
                  }`}>
                  {total[key as keyof typeof total].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <CardContent className="pt-6">
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 25,
              right: 25,
              bottom: 25,
              left: 25
            }}
            onMouseMove={(e) => {
              if (e && e.activeTooltipIndex !== undefined) {
                setHoveredBar(e.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.4} />
            <XAxis
              dataKey="segment"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <ChartTooltip
              cursor={{
                fill: 'hsl(var(--muted))',
                opacity: 0.2,
                stroke: `var(--color-${activeChart})`,
                strokeWidth: 2,
                strokeDasharray: '5 5'
              }}
              content={
                <ChartTooltipContent
                  className="bg-background/95 backdrop-blur-md border shadow-xl rounded-xl p-3"
                  labelFormatter={(value) => (
                    <div className="flex items-center gap-2 font-medium">
                      <MousePointer className="h-3 w-3" />
                      Segment: {value}
                    </div>
                  )}
                  formatter={(value, name) => [
                    <span key="value" className="font-mono font-semibold">{value} Kunden</span>,
                    <span key="label" className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label}</span>
                  ]}
                />
              }
            />
            <Bar
              dataKey={activeChart}
              fill={`var(--color-${activeChart})`}
              radius={[8, 8, 0, 0]}
              className="transition-all duration-300"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`var(--color-${activeChart})`}
                  opacity={hoveredBar !== null && hoveredBar !== index ? 0.6 : 1}
                  className="transition-all duration-300"
                />
              ))}
              <LabelList
                dataKey={activeChart}
                position="top"
                className="fill-foreground font-medium transition-all duration-300"
                fontSize={12}
                offset={8}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex-col items-start gap-3 text-sm">
        <div className="w-full p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chartConfig[activeChart].color }}
              />
              <span className="font-medium">Aktive Kategorie: {chartConfig[activeChart].label}</span>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-bold">
              {total[activeChart].toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Gesamtkunden</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full">
          {chartData.map((segment) => (
            <Badge
              key={segment.segment}
              variant="outline"
              className="text-xs transition-all duration-200 hover:bg-muted/50"
            >
              {segment.segment}: <span className="font-mono font-medium ml-1">{segment[activeChart as keyof typeof segment]}</span>
            </Badge>
          ))}
        </div>
        {/* Live BQML text removed */}
      </CardFooter>
    </Card>
  );
}