'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingDown,
  Users,
  AlertTriangle,
  DollarSign,
  Activity
} from 'lucide-react';

interface Customer {
  customer_id: string;
  name: string;
  churn_score_bias_corrected?: number;
  churn_probability?: number; // Deprecated - use churn_score_bias_corrected
  risk_category: string;
  risk_segment?: string;
  profile: {
    monthly_fee: number;
  };
}

interface RiskMetricsHeroProps {
  customers: Customer[];
  loading?: boolean;
}

export function RiskMetricsHero({ customers, loading = false }: RiskMetricsHeroProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate key metrics
  const totalCustomers = customers.length;
  const criticalRisk = customers.filter(c => c.risk_category?.toUpperCase() === 'KRITISCH').length;
  const highRisk = customers.filter(c => c.risk_category?.toUpperCase() === 'HOCH').length;
  const totalHighRiskCustomers = criticalRisk + highRisk;

  const averageChurnProbability = customers.length > 0
    ? customers.reduce((sum, c) => sum + (c.churn_score_bias_corrected ?? c.churn_probability ?? 0), 0) / customers.length
    : 0;

  const revenueAtRisk = customers
    .filter(c => (c.churn_score_bias_corrected ?? c.churn_probability ?? 0) >= 0.6)
    .reduce((sum, c) => sum + (c.profile?.monthly_fee || 0), 0);

  const riskPercentage = totalCustomers > 0 ? (totalHighRiskCustomers / totalCustomers) * 100 : 0;

  return (
    <div className="space-y-4 mb-6">
      {/* Alert for critical customers */}
      {criticalRisk > 0 && (
        <Alert className="border-red-500/20 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>{criticalRisk} kritische Risikokunden</strong> benötigen sofortige Aufmerksamkeit
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Customers */}
        <Card className="border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Gesamt Kunden
                </p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {totalCustomers}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* High Risk Customers */}
        <Card className="border-red-500/20 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Hochrisikokunden
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                    {totalHighRiskCustomers}
                  </p>
                  <Badge variant="destructive" className="text-xs">
                    {riskPercentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Average Churn Risk */}
        <Card className="border-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  Ø Churn-Risiko
                </p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                  {(averageChurnProbability * 100).toFixed(1)}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        {/* Revenue at Risk */}
        <Card className="border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Umsatz unter Risiko
                </p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                  €{revenueAtRisk.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}