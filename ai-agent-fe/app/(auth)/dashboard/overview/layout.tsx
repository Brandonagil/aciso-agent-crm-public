'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingDown, Users, ShieldAlert, Euro } from 'lucide-react';
import { DashboardChatInterface } from '@/components/dashboard/DashboardChatInterface';
import { churnAnalysisSummary } from '@/lib/data/churn-data';

export default function OverviewLayout({
  churn_stats,
  sales
}: {
  area_stats: React.ReactNode;
  churn_stats: React.ReactNode;
  sales: React.ReactNode;
}) {

  const active_customers = churnAnalysisSummary.active_customers;
  const total_at_risk = churnAnalysisSummary.total_at_risk;
  const total_revenue_at_risk = churnAnalysisSummary.total_revenue_at_risk;
  const actualChurnRate = churnAnalysisSummary.current_churn_rate;

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-6">
      <p className="text-sm text-muted-foreground">Die KPI-Karten zeigen synthetische Beispieldaten. Die BigQuery-Abfragen benötigen eine eigene Datenquelle.</p>
      {/* Kompakte KPI-Karten */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* KPI Cards (Active Customers, At-Risk, Churn Rate, Revenue at Risk) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Kunden</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{active_customers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">aktive Mitgliedschaften</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gefährdete Kunden</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{total_at_risk.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{((total_at_risk / active_customers) * 100).toFixed(1)}% der aktiven Kunden</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abwanderungsrate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actualChurnRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Kündigungen im Beispieldatensatz</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Umsatzrisiko</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{total_revenue_at_risk.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Basierend auf gefährdeten Kunden</p>
          </CardContent>
        </Card>
      </div>

      {/* UPDATED: Chat + Top Risiko-Kunden in gleicher Größe - Performance & Risiko entfernt */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-250px)] min-h-[500px] max-h-[800px]">
        {/* Linke Spalte: Chat mit voller Höhe */}
        <div className="h-full flex flex-col overflow-hidden">
          <DashboardChatInterface className="h-full min-h-0" />
        </div>

        {/* Rechte Spalte: NUR Top Risiko-Kunden mit voller Höhe - Performance & Risiko entfernt */}
        <div className="h-full overflow-hidden">
          {churn_stats}
        </div>
      </div>
      <div className="w-full mt-4">
        {sales}
      </div>
    </div>
  );
}