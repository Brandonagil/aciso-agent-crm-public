'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconTarget,
  IconCurrencyEuro,
  IconTrendingUp,
  IconCalendar,
  IconUsers,
  IconBulb,
  IconAlertTriangle,
  IconCheck
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';

interface ActualRetentionPlanCardProps {
  planData: {
    success: boolean;
    plan_id: string;
    plan_type: string;
    customer_id: number;
    customer_analysis: {
      customer_id: number;
      churn_probability: number;
      risk_category: string;
      current_monthly_fee: number;
      estimated_annual_value_eur: number;
      membership_duration_months: number;
      checkins_per_month: number;
      days_since_last_checkin: number;
    };
    target_segment: string;
    duration_weeks: number;
    strategies: string; // Markdown content
    implementation_steps: string[];
    created_at: string;
  };
  actionButtons?: Array<{
    label: string;
    action: 'save_plan' | 'export_pdf' | 'send_to_crm';
    planId?: string;
  }>;
  onAction?: (action: string, planId: string) => void;
  className?: string;
}

export function ActualRetentionPlanCard({
  planData,
  actionButtons = [],
  onAction,
  className
}: ActualRetentionPlanCardProps) {
  const handleActionClick = (action: string) => {
    if (onAction) {
      onAction(action, planData?.plan_id || '');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getRiskColor = (risk: string) => {
    const colorMap: Record<string, string> = {
      'NIEDRIG': 'bg-green-100 text-green-800 border-green-200',
      'MITTEL': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'HOCH': 'bg-orange-100 text-orange-800 border-orange-200',
      'KRITISCH': 'bg-red-100 text-red-800 border-red-200'
    };
    return colorMap[risk] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRiskIcon = (risk: string) => {
    if (risk === 'NIEDRIG') return IconCheck;
    if (risk === 'KRITISCH' || risk === 'HOCH') return IconAlertTriangle;
    return IconTarget;
  };

  const customer = planData?.customer_analysis;
  const RiskIcon = getRiskIcon(customer?.risk_category || '');

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Header Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <IconTarget className="h-5 w-5 text-primary" />
                Retention-Plan erstellt
                <Badge variant="secondary" className="ml-2">
                  ID: {planData?.plan_id?.slice(-8) || 'N/A'}
                </Badge>
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">
                  {planData?.target_segment === 'individual' ? 'Einzelkunde' : 'Segment'}: {customer?.customer_id || 'Unknown'}
                </Badge>
                <Badge className={getRiskColor(customer?.risk_category || '')} variant="secondary">
                  <RiskIcon className="h-3 w-3 mr-1" />
                  {customer?.risk_category || 'UNBEKANNT'} Risiko
                </Badge>
                <Badge variant="outline">
                  {planData?.duration_weeks || 0} Wochen Plan
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Erstellt</div>
              <div className="text-xs">
                {planData?.created_at ? new Date(planData.created_at).toLocaleDateString('de-DE') : 'N/A'}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Customer Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUsers className="h-4 w-4" />
            Kunden-Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <IconTrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-medium">Churn-Risiko</div>
              <div className={cn("text-lg font-bold", {
                'text-green-600': customer?.churn_probability < 30,
                'text-yellow-600': customer?.churn_probability >= 30 && customer?.churn_probability < 60,
                'text-red-600': customer?.churn_probability >= 60
              })}>
                {customer?.churn_probability?.toFixed(1) || 0}%
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <IconCurrencyEuro className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-medium">Monatsbeitrag</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(customer?.current_monthly_fee || 0)}
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <IconCalendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-medium">Mitgliedschaft</div>
              <div className="text-lg font-bold text-blue-600">
                {customer?.membership_duration_months?.toFixed(1) || 0} Monate
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <IconUsers className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-medium">Besuche/Monat</div>
              <div className="text-lg font-bold text-purple-600">
                {customer?.checkins_per_month?.toFixed(1) || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconBulb className="h-4 w-4" />
            Detaillierter Retention-Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Markdown content={planData?.strategies || 'Keine Strategien verfügbar'} />
          </div>
        </CardContent>
      </Card>

      {/* Implementation Steps Card */}
      {/* Entfernt auf User-Wunsch */}

      {/* Action Buttons Card */}
      {actionButtons && actionButtons.length > 0 && (
        <Card className="border-primary/20 max-w-xs mx-auto w-full bg-zinc-900 shadow-lg p-3">
          <CardContent className="flex justify-center py-4">
            <div className="w-full flex justify-center">
              {actionButtons
                .filter((button) => button.action !== 'export_pdf')
                .map((button, index) => (
                  <Button
                    key={index}
                    variant={button.action === 'save_plan' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => handleActionClick(button.action)}
                    className={cn(
                      'flex items-center gap-3 w-full max-w-[220px] text-lg py-3 rounded-xl shadow-lg justify-center',
                      'transition-colors duration-200',
                      button.action === 'save_plan' && 'bg-green-600 hover:bg-green-700 text-white'
                    )}
                  >
                    {button.label}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}