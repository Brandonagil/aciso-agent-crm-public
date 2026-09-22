'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { RadialBarChart, RadialBar } from 'recharts';
import { Target, Loader2 } from 'lucide-react';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { createGlassCard } from '@/lib/styles/glass-morphism';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { churnAnalysisSummary } from '@/lib/data/churn-data';

const getRetentionStatus = (score: number): { label: string; color: string; variant: BadgeProps['variant'] } => {
    if (score >= 90) return { label: 'Exzellent', color: 'text-green-500', variant: 'default' };
    if (score >= 85) return { label: 'Gut', color: 'text-yellow-500', variant: 'secondary' };
    return { label: 'Gefährdet', color: 'text-red-500', variant: 'destructive' };
};

export function CompactMetricsCard() {
    const [metrics, setMetrics] = React.useState<{ risk_distribution: Array<{ name: string; count: number }>; active_customers: number }>({ risk_distribution: [], active_customers: 0 });
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // This card uses the synthetic fixture returned by the metrics endpoint.
    const retention_score = churnAnalysisSummary.retention_score;

    React.useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/dashboard/metrics');
                if (!response.ok) {
                    throw new Error('Metriken konnten nicht geladen werden.');
                }
                const data = await response.json();
                setMetrics({
                    risk_distribution: Object.entries(data.risk_distribution || {}).map(([name, count]) => ({ name, count: Number(count) })),
                    active_customers: data.active_customers || 0
                });
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMetrics();
    }, []);

    const retentionStatus = getRetentionStatus(retention_score);

    return (
        <Card className={cn("h-full flex flex-col", createGlassCard('floating', { hover: true, animated: true }))}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Performance & Risiko (Beispieldaten)
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center p-4">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center text-destructive text-sm">{error}</div>
                ) : (
                    <div className="grid grid-cols-2 gap-6 items-center">
                        {/* Retention Performance */}
                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className="relative w-[120px] h-[120px]">
                                <ChartContainer config={{}} className="w-full h-full">
                                    <RadialBarChart
                                        innerRadius="80%"
                                        outerRadius="100%"
                                        startAngle={90}
                                        endAngle={-270}
                                        data={[{ value: retention_score }]}
                                    >
                                        <RadialBar dataKey="value" fill="hsl(var(--primary))" cornerRadius={8} background={{ fill: 'hsla(var(--muted)/0.2)' }} />
                                    </RadialBarChart>
                                </ChartContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-primary tracking-tighter">
                                        {retention_score.toFixed(1)}%
                                    </span>
                                    <span className="text-xs text-muted-foreground">Retention</span>
                                </div>
                            </div>
                            <Badge variant={retentionStatus.variant}>
                                {retentionStatus.label}
                            </Badge>
                        </div>

                        {/* Risk Distribution */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-center text-muted-foreground">
                                Risiko-Verteilung
                            </h3>
                            <div className="space-y-2">
                                {Array.isArray(metrics.risk_distribution) && metrics.risk_distribution.length > 0 ? (
                                    metrics.risk_distribution.map((item) => (
                                        <div key={item.name} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">{item.name}</span>
                                                <span className="font-mono text-foreground">{item.count.toLocaleString()}</span>
                                            </div>
                                            <Progress value={(item.count / metrics.active_customers) * 100} className="h-2" />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center">Keine Risikodaten verfügbar.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 