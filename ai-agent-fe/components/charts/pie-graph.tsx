'use client';

import * as React from 'react';
import { TrendingUp, AlertTriangle, Target, Brain } from 'lucide-react';
import { Label, Pie, PieChart, Cell } from 'recharts';

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
import { Badge } from '@/components/ui/badge';
import { ChatButton } from '@/components/ui/chat-button';
import { createMetricChatContext } from '@/lib/utils/chat-integration';
import { churnReasons } from '@/lib/data/churn-data';

// Echte Churn-Gründe aus BigQuery Feature-Importance
const chartData = churnReasons.map((item) => ({
  reason: item.reason,
  label: item.label,
  count: item.count,
  percentage: item.percentage,
  fill: `var(--color-${item.reason})`
}));

const chartConfig = {
  count: {
    label: 'Anzahl Kunden'
  },
  price: {
    label: 'Preis zu hoch',
    color: 'var(--chart-1)'
  },
  activity: {
    label: 'Niedrige Aktivität',
    color: 'var(--chart-2)'
  },
  competition: {
    label: 'Wechsel zur Konkurrenz',
    color: 'var(--chart-3)'
  },
  service: {
    label: 'Service unzureichend',
    color: 'var(--chart-4)'
  },
  features: {
    label: 'Fehlende Features',
    color: 'var(--chart-5)'
  }
} satisfies ChartConfig;

export function PieGraph() {
  const totalCount = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, []);

  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);
  const [hoveredSegment, setHoveredSegment] = React.useState<number | null>(null);
  const topReason = chartData[0];

  return (
    <Card className="flex flex-col group">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Beispielhafte Risikogründe
            </CardTitle>
            <CardDescription>
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3" />
                Synthetische Gründe für vier gefährdete Beispielmitglieder
              </div>
            </CardDescription>
          </div>
          <ChatButton
            context={createMetricChatContext('churn_reasons', 'analysis')}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Gründe analysieren
          </ChatButton>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="bg-background/95 backdrop-blur-md border shadow-xl rounded-xl p-3"
                  hideLabel
                  formatter={(value, name, props) => [
                    <div key="value" className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{value} Kunden</span>
                      <span className="text-muted-foreground">({props.payload?.percentage}%)</span>
                    </div>,
                    <span key="label" className="text-muted-foreground">{name}</span>
                  ]}
                />
              }
            />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              dataKey="count"
              nameKey="label"
              innerRadius={70}
              outerRadius={130}
              strokeWidth={0}
              className="cursor-pointer"
              onMouseEnter={(_, index) => {
                setActiveIndex(index);
                setHoveredSegment(index);
              }}
              onMouseLeave={() => {
                setActiveIndex(undefined);
                setHoveredSegment(null);
              }}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => {
                const isActive = activeIndex === index;
                const isHovered = hoveredSegment === index;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    stroke={isActive ? "hsl(var(--background))" : "transparent"}
                    strokeWidth={isActive ? 4 : 0}
                    className="transition-all duration-300"
                    style={{
                      filter: `
                        ${activeIndex !== undefined && !isActive ? 'opacity(0.5)' : 'opacity(1)'}
                        ${isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : ''}
                      `,
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: 'center'
                    }}
                  />
                );
              })}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <g>
                        <circle
                          cx={viewBox.cx}
                          cy={viewBox.cy}
                          r={60}
                          fill="hsl(var(--muted/20))"
                          stroke="hsl(var(--border))"
                          strokeWidth={1}
                          strokeDasharray="5 5"
                        />
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 8}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {totalCount.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 16}
                            className="fill-muted-foreground text-sm font-medium"
                          >
                            Gesamtfälle
                          </tspan>
                        </text>
                      </g>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend
              content={
                <ChartLegendContent
                  className="flex-wrap gap-2 text-sm"
                  nameKey="label"
                />
              }
            />
          </PieChart>
        </ChartContainer>

        {/* Erweiterte Ranking Liste */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h4 className="text-sm font-medium">Kritische Faktoren</h4>
          </div>
          <div className="space-y-2">
            {chartData.slice(0, 3).map((item, index) => {
              const isHighlighted = hoveredSegment === index;
              return (
                <div
                  key={item.reason}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${isHighlighted
                    ? 'bg-primary/10 border border-primary/20 scale-[1.02]'
                    : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  onMouseEnter={() => setHoveredSegment(index)}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                      <div
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${isHighlighted ? 'scale-125 shadow-lg' : ''
                          }`}
                        style={{ backgroundColor: item.fill }}
                      />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{item.count}</span>
                    <Badge
                      variant={isHighlighted ? "default" : "secondary"}
                      className={`text-xs transition-all duration-300 ${isHighlighted ? 'shadow-sm' : ''
                        }`}
                    >
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <div className="w-full space-y-3">
          <div className="p-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full bg-destructive/10">
                  <TrendingUp className="h-3 w-3 text-destructive" />
                </div>
                <span className="text-sm font-medium">Hauptfaktor</span>
              </div>
              <Badge variant="destructive" className="font-mono">
                {topReason?.percentage}%
              </Badge>
            </div>
            <div className="text-sm font-semibold text-destructive">
              {topReason?.label}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {topReason?.count} von {totalCount.toLocaleString()} Fällen
            </div>
          </div>
          {/* BigQuery text removed */}
        </div>
      </CardFooter>
    </Card>
  );
}