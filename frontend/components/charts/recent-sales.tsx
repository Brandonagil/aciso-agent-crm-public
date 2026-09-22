'use client';

import { useState, useEffect } from 'react';
// import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Clock, Loader2, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { InsightTrigger } from '@/components/ui/chat-trigger';
import { createCustomerChatContext } from '@/lib/utils/chat-integration';

interface Customer {
  customer_id: string;
  name: string;
  churn_probability: number;
  risk_category: string;
  risk_rank?: number;
  risk_factors?: string[];
  risk_segment?: string;
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
    churn_score_raw?: number;
  };
  retention_priority: string;
}

export function RecentSales() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopRiskCustomers = async () => {
      try {
        setLoading(true);
        // TOP 10 Kunden mit höchstem Churn-Risiko (segmentiert)
        const response = await fetch('/api/churn/high-risk?limit=10&risk_threshold=0');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setCustomers(data.customers);
          setError(null);
          console.log('Top 10 segmentierte Risiko-Kunden geladen:', data.query_info);
        } else {
          throw new Error(data.error || 'Failed to fetch customer data');
        }
      } catch (err) {
        console.error('Error fetching top risk customers:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopRiskCustomers();
  }, []);

  const formatInactiveTime = (days: number): string => {
    if (days === 0) return 'Aktiv';
    if (days < 30) return `${days} Tage inaktiv`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} ${months === 1 ? 'Monat' : 'Monate'} inaktiv`;
    }
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    if (remainingMonths === 0) {
      return `${years} ${years === 1 ? 'Jahr' : 'Jahre'} inaktiv`;
    }
    return `${years}J ${remainingMonths}M inaktiv`;
  };

  const getRiskColor = (category: string): string => {
    switch (category?.toUpperCase()) {
      case 'KRITISCH': return 'bg-red-500';
      case 'HOCH': return 'bg-orange-500';
      case 'ERHÖHT': return 'bg-yellow-500';
      case 'MODERAT': return 'bg-blue-500';
      case 'NIEDRIG': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskBadgeVariant = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'KRITISCH': return 'destructive' as const;
      case 'HOCH': return 'secondary' as const;
      case 'ERHÖHT': return 'secondary' as const;
      case 'MODERAT': return 'outline' as const;
      case 'NIEDRIG': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-3 w-3 text-yellow-500" />;
    if (rank === 2) return <Trophy className="h-3 w-3 text-gray-400" />;
    if (rank === 3) return <Trophy className="h-3 w-3 text-orange-600" />;
    return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Lade TOP 10 Risiko-Kunden...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300" style={{animationDelay: `${i * 100}ms`}}>
                <div className="w-10 h-10 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-pulse" />
                  <div className="h-3 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Fehler beim Laden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90"
          >
            Erneut versuchen
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            TOP 10 Risiko-Kunden (Segmentiert)
          </span>
          <Badge variant="outline" className="text-xs">
            Verschiedene Risiko-Segmente
          </Badge>
        </CardTitle>
        <CardDescription>
          Die 10 risikoreichsten Kunden aus verschiedenen Segmenten
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {customers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Keine Kunden gefunden
              </p>
            </div>
          ) : (
            customers.map((customer, index) => (
              <div key={customer.customer_id} className="flex items-center space-x-4 motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:fade-in motion-safe:duration-300" style={{animationDelay: `${index * 75}ms`}}>
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold ${getRiskColor(customer.risk_category)}`}>
                    {customer.customer_id.slice(-2)}
                  </div>
                  {customer.retention_priority === 'URGENT' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                    {getRankIcon(index + 1)}
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium leading-none flex items-center gap-2">
                        {customer.name}
                        <span className="text-xs text-muted-foreground">
                          (Rang #{index + 1})
                        </span>
                      </p>
                      {customer.risk_segment && (
                        <span className="text-xs text-blue-600 font-medium mt-0.5">
                          {customer.risk_segment}
                        </span>
                      )}
                    </div>
                    <Badge variant={getRiskBadgeVariant(customer.risk_category)} className="text-xs">
                      {customer.risk_category}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatInactiveTime(customer.business_metrics.days_inactive)}
                    </span>
                    <span className="font-semibold text-red-600">
                      {(customer.churn_probability * 100).toFixed(1)}% Churn-Score
                    </span>
                  </div>

                  <Progress
                    value={customer.churn_probability * 100}
                    className="h-2"
                  />

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <div className="flex gap-1 flex-wrap">
                      {customer.risk_factors && customer.risk_factors.length > 0 ? (
                        customer.risk_factors.map((factor: string, i: number) => (
                          <span key={i} className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-xs">
                            {factor}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Keine spez. Faktoren</span>
                      )}
                    </div>
                    <span>{customer.profile.monthly_fee}€/Monat</span>
                  </div>
                </div>

                <InsightTrigger
                  context={createCustomerChatContext(customer)}
                  prompt={`Analysiere die Churn-Risikofaktoren für ${customer.name}`}
                  className="border rounded-md px-3 py-2 text-xs"
                >
                  Analyse
                </InsightTrigger>
              </div>
            ))
          )}
        </div>

      </CardContent>
    </Card>
  );
}