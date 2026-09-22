'use client';

import * as React from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { CalendarDays, TrendingDown, TrendingUp, Clock, Target } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
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
import { ActivityData } from '@/lib/types/reports';

interface ActivityTimelineProps {
  activityData: ActivityData;
  className?: string;
}

export function ActivityTimeline({ activityData, className }: ActivityTimelineProps) {
  const { 
    activity_trend, 
    checkins_pro_monat, 
    tage_seit_letztem_checkin, 
    durchschnittliche_sitzungsdauer,
    letzter_besuch,
    gesamtbesuche,
    lieblings_trainingszeiten
  } = activityData;

  // Calculate trend direction
  const calculateTrend = () => {
    if (activity_trend.length < 2) return { direction: 'neutral', percentage: 0 };
    
    const recent = activity_trend.slice(-3);
    const earlier = activity_trend.slice(-6, -3);
    
    const recentAvg = recent.reduce((sum, item) => sum + item.besuche, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, item) => sum + item.besuche, 0) / earlier.length;
    
    const percentage = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
    
    return {
      direction: percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'neutral',
      percentage: Math.abs(percentage)
    };
  };

  const trend = calculateTrend();

  // Get activity status based on recent visits
  const getActivityStatus = () => {
    if (tage_seit_letztem_checkin <= 7) {
      return { label: 'Sehr Aktiv', color: 'bg-green-100 text-green-800 border-green-200', icon: Target };
    } else if (tage_seit_letztem_checkin <= 14) {
      return { label: 'Aktiv', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CalendarDays };
    } else if (tage_seit_letztem_checkin <= 30) {
      return { label: 'Mäßig Aktiv', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock };
    } else {
      return { label: 'Inaktiv', color: 'bg-red-100 text-red-800 border-red-200', icon: TrendingDown };
    }
  };

  const activityStatus = getActivityStatus();
  const StatusIcon = activityStatus.icon;
  const TrendIcon = trend.direction === 'up' ? TrendingUp : 
                    trend.direction === 'down' ? TrendingDown : 
                    CalendarDays;

  const chartConfig = {
    besuche: {
      label: 'Besuche',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  // Add average line to data
  const avgVisits = activity_trend.length > 0 
    ? activity_trend.reduce((sum, item) => sum + item.besuche, 0) / activity_trend.length 
    : 0;

  const chartData = activity_trend.map(item => ({
    ...item,
    average: avgVisits
  }));

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unbekannt';
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5" />
          Aktivitätsverlauf
        </CardTitle>
        <CardDescription>
          Besuchsfrequenz und Trainingsverhalten über die letzten 12 Monate
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Activity Status and Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {checkins_pro_monat}
            </div>
            <div className="text-sm text-muted-foreground">
              Besuche/Monat
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {tage_seit_letztem_checkin}
            </div>
            <div className="text-sm text-muted-foreground">
              Tage seit letztem Besuch
            </div>
          </div>
          
          {durchschnittliche_sitzungsdauer && (
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {durchschnittliche_sitzungsdauer}
              </div>
              <div className="text-sm text-muted-foreground">
                Min. pro Session
              </div>
            </div>
          )}
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {gesamtbesuche || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Gesamtbesuche
            </div>
          </div>
        </div>

        {/* Activity Status Badge */}
        <div className="flex items-center justify-between mb-4">
          <Badge className={`${activityStatus.color} border`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {activityStatus.label}
          </Badge>
          
          {trend.direction !== 'neutral' && (
            <div className="flex items-center gap-1 text-sm">
              <TrendIcon className={`h-4 w-4 ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`} />
              <span className={`font-medium ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.percentage.toFixed(1)}% {trend.direction === 'up' ? 'Zunahme' : 'Abnahme'}
              </span>
              <span className="text-muted-foreground">letzte 3 Monate</span>
            </div>
          )}
        </div>

        {/* Activity Chart */}
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="monat" 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                labelFormatter={(label) => `Monat: ${label}`}
              />
              
              {/* Average line */}
              <Line
                type="monotone"
                dataKey="average"
                stroke="#e5e7eb"
                strokeDasharray="5 5"
                strokeWidth={1}
                dot={false}
                name="Durchschnitt"
              />
              
              {/* Actual visits line */}
              <Line
                type="monotone"
                dataKey="besuche"
                stroke="var(--color-besuche)"
                strokeWidth={3}
                dot={{ fill: "var(--color-besuche)", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "var(--color-besuche)", strokeWidth: 2 }}
                name="Besuche"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Additional Info */}
        <div className="grid gap-4 mt-6">
          {/* Last Visit */}
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">
              Letzter Besuch
            </span>
            <span className="font-medium">
              {formatDate(letzter_besuch)}
            </span>
          </div>

          {/* Favorite Training Times */}
          {lieblings_trainingszeiten && lieblings_trainingszeiten.length > 0 && (
            <div className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                Bevorzugte Trainingszeiten
              </span>
              <div className="flex flex-wrap gap-1">
                {lieblings_trainingszeiten.map((zeit, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {zeit}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}