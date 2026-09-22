'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { TrendingDown, Euro, AlertTriangle, MessageSquare, Brain, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createGlassCard } from '@/lib/styles/glass-morphism';

interface CustomerData {
    customer_id: string;
    name: string;
    churn_probability: number;
    risk_category: string;
    risk_rank: number;
    risk_segment: string;
    profile: {
        age: number;
        gender: string;
        payment_method: string;
        monthly_fee: number;
        activity_status: string;
        contract_duration_months: number;
    };
    business_metrics: {
        days_inactive: number;
        total_checkins: number;
        contract_ltv: number;
        checkins_per_euro: number;
        churn_score_raw: number;
        membership_months: number;
    };
    retention_priority: string;
}

interface ApiResponse {
    success: boolean;
    message?: string;
    error?: string;
    customers: CustomerData[];
    source: string;
    query_info: {
        total_rows: number;
        limit: number;
        offset: number;
        description: string;
        highest_churn_score: number;
        lowest_churn_score: number;
    };
    timestamp: string;
}

interface TopRiskCustomerFilterProps {
    onCustomerSelect?: (customer: CustomerData) => void;
    onChatAction?: (action: string, customer: CustomerData) => void;
}

export function TopRiskCustomerFilter({ onCustomerSelect, onChatAction }: TopRiskCustomerFilterProps) {
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [showMoreCount, setShowMoreCount] = useState(20);

    // Echte BigQuery-Daten laden mit Risiko-Filter
    const fetchCustomers = async () => {
        try {
            setLoading(true);
            setError(null);

            // NUR Top-Risikokunden laden (≥70% Churn-Risiko)
            const response = await fetch('/api/churn/high-risk?limit=50&offset=0&min_risk=0.70');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: ApiResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error || data.message || 'Failed to fetch customer data');
            }

            console.log('🔥 TopRiskCustomerFilter: Loaded real BigQuery data:', {
                totalCustomers: data.customers.length,
                source: data.source,
                highestChurnScore: data.query_info.highest_churn_score,
                lowestChurnScore: data.query_info.lowest_churn_score
            });

            setCustomers(data.customers);
        } catch (err) {
            console.error('❌ Error loading customer data:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    // Lade Daten beim Mount
    useEffect(() => {
        fetchCustomers();
    }, []);

    // Customer Detail Modal öffnen
    const handleCustomerClick = (customer: CustomerData) => {
        console.log('👤 Customer clicked:', customer.customer_id);
        setSelectedCustomer(customer);
        setIsDetailModalOpen(true);

        // Optional: Benachrichtige Parent-Komponente
        if (onCustomerSelect) {
            onCustomerSelect(customer);
        }
    };

    // Quick Actions für Chat
    const handleQuickAction = (action: string, customer: CustomerData) => {
        console.log('⚡ Quick action triggered:', action, 'for customer:', customer.customer_id);

        if (onChatAction) {
            onChatAction(action, customer);
        }

        // Chat-Aktionen basierend auf Action-Type
        let chatMessage = '';
        switch (action) {
            case 'analyze':
                chatMessage = `Zeige mir vollständige Churn-Analyse für Mitglied ${customer.customer_id}`;
                break;
            case 'retention_plan':
                chatMessage = `Erstelle Retention-Plan für Mitglied ${customer.customer_id} (Risiko: ${Math.round(customer.churn_probability * 100)}%)`;
                break;
            case 'explain_risk':
                chatMessage = `Erkläre mir, warum Mitglied ${customer.customer_id} ein hohes Churn-Risiko hat`;
                break;
            case 'business_impact':
                chatMessage = `Berechne den Umsatzwert und Business-Impact für Kunde ${customer.customer_id} (${customer.profile.monthly_fee}€/Monat) - wie viel Umsatz würden wir bei Churn verlieren?`;
                break;
            default:
                chatMessage = `Analysiere Mitglied ${customer.customer_id}`;
        }

        // Trigger Chat-Interface (über Custom Event)
        window.dispatchEvent(new CustomEvent('triggerChatMessage', {
            detail: { message: chatMessage, context: action }
        }));

        // Modal schließen nach Action
        setIsDetailModalOpen(false);
    };

    // Mehr Kunden laden
    const handleLoadMore = () => {
        setShowMoreCount(prev => Math.min(prev + 20, customers.length));
    };

    // Risk Badge Styling
    const getRiskBadgeVariant = (category: string) => {
        switch (category?.toUpperCase()) {
            case 'KRITISCH': return 'destructive' as const;
            case 'HOCH': return 'secondary' as const;
            case 'MITTEL': return 'outline' as const;
            case 'NIEDRIG': return 'default' as const;
            default: return 'outline' as const;
        }
    };

    // Formatiere Inaktivitätszeit
    const formatInactiveTime = (days: number): string => {
        if (days === 0) return 'Aktiv';
        if (days < 30) return `${days} Tage`;
        if (days < 365) {
            const months = Math.floor(days / 30);
            return `${months} Mon`;
        }
        const years = Math.floor(days / 365);
        return `${years}+ Jahre`;
    };

    // Loading State
    if (loading) {
        return (
            <Card className={cn("h-full", createGlassCard('interactive'))}>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingDown className="h-5 w-5" />
                        Top Risiko-Kunden
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[550px] px-4">
                        <div className="space-y-3">
                            {Array(10).fill(0).map((_, i) => (
                                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="h-6 w-16" />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        );
    }

    // Error State
    if (error) {
        return (
            <Card className={cn("h-full", createGlassCard('interactive'))}>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Verbindungsfehler
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="text-center text-red-600">
                        <p className="mb-4">{error}</p>
                        <Button onClick={fetchCustomers} variant="outline">
                            Erneut versuchen
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const displayedCustomers = customers.slice(0, showMoreCount);
    const totalRevenue = customers.reduce((sum, c) => sum + (c.profile?.monthly_fee || 0), 0);
    const avgChurnRisk = customers.length > 0
        ? customers.reduce((sum, c) => sum + c.churn_probability, 0) / customers.length
        : 0;

    return (
        <>
            <Card className={cn("h-full flex flex-col", createGlassCard('interactive', { hover: false }))}>
                <CardHeader className="pb-4 flex-shrink-0">
                    <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-red-500" />
                            Top Risiko-Kunden
                        </div>
                        <Badge variant="destructive" className="text-xs">
                            {customers.length} Kunden
                        </Badge>
                    </CardTitle>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded-lg">
                            <div className="text-xs text-red-600 mb-1">Ø Churn-Risiko</div>
                            <div className="text-lg font-bold text-red-700">
                                {Math.round(avgChurnRisk * 100)}%
                            </div>
                        </div>
                        <div className={cn("p-2 rounded-lg", createGlassCard('subtle', { className: 'bg-muted/50' }))}>
                            <div className="text-xs text-muted-foreground mb-1">Umsatzrisiko</div>
                            <div className="text-lg font-bold text-foreground">
                                €{Math.round(totalRevenue * 12 / 1000)}k
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0 flex-1 min-h-0">
                    <ScrollArea className="h-full px-4" style={{ maxHeight: '550px' }}>
                        <div className="space-y-2 pb-4">
                            {displayedCustomers.map((customer) => (
                                <div
                                    key={customer.customer_id}
                                    className="flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer group"
                                    onClick={() => handleCustomerClick(customer)}
                                >
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                        {/* Risk Indicator */}
                                        <div className="relative flex-shrink-0">
                                            <div className={cn(
                                                "w-3 h-3 rounded-full",
                                                customer.churn_probability > 0.9 ? "bg-red-500 animate-pulse" :
                                                    customer.churn_probability > 0.8 ? "bg-red-400" :
                                                        customer.churn_probability > 0.7 ? "bg-orange-400" : "bg-yellow-400"
                                            )} />
                                            {customer.churn_probability > 0.9 && (
                                                <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
                                            )}
                                        </div>

                                        {/* Customer Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">
                                                    {customer.name}
                                                </span>
                                                <Badge
                                                    variant={getRiskBadgeVariant(customer.risk_category)}
                                                    className="text-xs"
                                                >
                                                    {customer.risk_category}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1">
                                                    <TrendingDown className="h-3 w-3" />
                                                    {Math.round(customer.churn_probability * 100)}%
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Euro className="h-3 w-3" />
                                                    {customer.profile.monthly_fee}€
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatInactiveTime(customer.business_metrics.days_inactive)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions - visible on hover */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleQuickAction('analyze', customer);
                                            }}
                                            title="Vollständige Analyse"
                                        >
                                            <Brain className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleQuickAction('retention_plan', customer);
                                            }}
                                            title="Retention-Plan erstellen"
                                        >
                                            <Sparkles className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleQuickAction('explain_risk', customer);
                                            }}
                                            title="Risiko erklären"
                                        >
                                            <MessageSquare className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Load More Button */}
                        {showMoreCount < customers.length && (
                            <div className="px-4 pb-4">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleLoadMore}
                                >
                                    Mehr laden ({customers.length - showMoreCount} weitere)
                                </Button>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Customer Detail Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className={cn(
                                "w-3 h-3 rounded-full",
                                selectedCustomer && selectedCustomer.churn_probability > 0.9 ? "bg-red-500" :
                                    selectedCustomer && selectedCustomer.churn_probability > 0.8 ? "bg-red-400" :
                                        selectedCustomer && selectedCustomer.churn_probability > 0.7 ? "bg-orange-400" : "bg-yellow-400"
                            )} />
                            {selectedCustomer?.name}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedCustomer && (
                        <div className="space-y-6">
                            {/* Churn Risk Overview */}
                            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-red-700">Churn-Risiko</span>
                                    <Badge variant={getRiskBadgeVariant(selectedCustomer.risk_category)}>
                                        {selectedCustomer.risk_category}
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Wahrscheinlichkeit</span>
                                        <span className="font-medium">{Math.round(selectedCustomer.churn_probability * 100)}%</span>
                                    </div>
                                    <Progress
                                        value={selectedCustomer.churn_probability * 100}
                                        className="h-2"
                                    />
                                </div>
                            </div>

                            {/* Customer Profile */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm">Profil</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Alter:</span>
                                            <span>{selectedCustomer.profile.age} Jahre</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Geschlecht:</span>
                                            <span>{selectedCustomer.profile.gender}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Monatsbeitrag:</span>
                                            <span>€{selectedCustomer.profile.monthly_fee}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Zahlungsart:</span>
                                            <span>{selectedCustomer.profile.payment_method}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm">Aktivität</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Inaktiv seit:</span>
                                            <span>{formatInactiveTime(selectedCustomer.business_metrics.days_inactive)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Besuche gesamt:</span>
                                            <span>{selectedCustomer.business_metrics.total_checkins}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Mitgliedschaft:</span>
                                            <span>{selectedCustomer.business_metrics.membership_months} Monate</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Segment:</span>
                                            <span>{selectedCustomer.risk_segment}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-sm mb-3">Sofortmaßnahmen</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickAction('analyze', selectedCustomer)}
                                        className="justify-start"
                                    >
                                        <Brain className="h-4 w-4 mr-2" />
                                        Vollständige Analyse
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickAction('retention_plan', selectedCustomer)}
                                        className="justify-start"
                                    >
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Retention-Plan
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickAction('explain_risk', selectedCustomer)}
                                        className="justify-start"
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Risiko erklären
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickAction('business_impact', selectedCustomer)}
                                        className="justify-start"
                                    >
                                        <Euro className="h-4 w-4 mr-2" />
                                        Umsatzwert-Analyse
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
} 