'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  IconDownload,
  IconDeviceFloppy,
  IconTarget,
  IconCurrencyEuro,
  IconTrendingUp,
  IconCalendar,
  IconUsers,
  IconBulb
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface RetentionPlanCardProps {
  planData: {
    plan_id?: string;
    target?: {
      type?: string;
      id?: string;
      info?: { customer_count?: number };
    };
    recommendations?: Array<{
      type?: string;
      title?: string;
      description?: string;
      success_rate?: number;
      total_cost?: number;
      affected_customers?: number;
      note?: string;
    }>;
    financial_projections?: {
      roi_percentage?: number;
      total_investment?: number;
      revenue_impact?: number;
      expected_retained_customers?: number;
      net_benefit?: number;
    };
    success_metrics?: {
      expected_retention_rate?: number;
      break_even_weeks?: number;
    };
    timeline?: Array<{
      week?: number;
      action?: string;
      customers_affected?: number;
      investment?: number;
    }>;
    parameters?: {
      budget?: number;
      duration_weeks?: number;
    };
    template?: {
      name?: string;
      description?: string;
    };
  };
  actionButtons?: Array<{
    label: string;
    action: 'save_plan' | 'export_pdf' | 'export_excel' | 'send_to_crm';
    planId?: string;
  }>;
  onAction?: (action: string, planId: string) => void;
  className?: string;
}

export function RetentionPlanCard({
  planData,
  actionButtons = [],
  onAction,
  className
}: RetentionPlanCardProps) {
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

  const getActionTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ElementType> = {
      'personal_contact': IconUsers,
      'discount_offer': IconCurrencyEuro,
      'premium_upgrade': IconTrendingUp,
      'automated_engagement': IconBulb,
      'usage_incentive': IconTarget,
      'community_engagement': IconUsers,
      'concierge_service': IconUsers,
      'exclusive_benefits': IconTrendingUp,
      'loyalty_program': IconTarget
    };
    return iconMap[type] || IconBulb;
  };

  const getActionTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'personal_contact': 'bg-blue-100 text-blue-800',
      'discount_offer': 'bg-green-100 text-green-800',
      'premium_upgrade': 'bg-purple-100 text-purple-800',
      'automated_engagement': 'bg-orange-100 text-orange-800',
      'usage_incentive': 'bg-indigo-100 text-indigo-800',
      'community_engagement': 'bg-pink-100 text-pink-800',
      'concierge_service': 'bg-red-100 text-red-800',
      'exclusive_benefits': 'bg-yellow-100 text-yellow-800',
      'loyalty_program': 'bg-cyan-100 text-cyan-800'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <IconTarget className="h-5 w-5 text-primary" />
              {planData?.template?.name || 'Retention Plan'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {planData?.template?.description || 'Automatisch generierter Retention Plan'}
            </p>
            <div className="flex gap-2">
              <Badge variant="outline">
                {planData?.target?.type === 'segment' ? 'Segment' : 'Einzelkunde'}: {planData?.target?.id || 'Unknown'}
              </Badge>
              <Badge variant="secondary">
                {planData?.target?.info?.customer_count || 1} Kunden
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Plan ID</div>
            <div className="text-xs font-mono">{planData?.plan_id || 'N/A'}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Financial Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <IconCurrencyEuro className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm font-medium">Budget</div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(planData.parameters?.budget || 0)}
            </div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <IconTrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm font-medium">Erwarteter ROI</div>
            <div className="text-lg font-bold text-blue-600">
              {(planData?.financial_projections?.roi_percentage || 0).toFixed(1)}%
            </div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <IconUsers className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm font-medium">Retention Rate</div>
            <div className="text-lg font-bold text-purple-600">
              {((planData?.success_metrics?.expected_retention_rate || 0) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <IconCalendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm font-medium">Break-even</div>
            <div className="text-lg font-bold text-orange-600">
              {(planData?.success_metrics?.break_even_weeks || 0).toFixed(0)} Wochen
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="bg-muted/30 p-4 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <IconCurrencyEuro className="h-4 w-4" />
            Finanzielle Prognose
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Gesamtinvestition:</span>
              <span className="ml-2 font-medium">{formatCurrency(planData?.financial_projections?.total_investment || 0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Revenue Impact:</span>
              <span className="ml-2 font-medium">{formatCurrency(planData?.financial_projections?.revenue_impact || 0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Retained Customers:</span>
              <span className="ml-2 font-medium">{planData?.financial_projections?.expected_retained_customers || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Net Benefit:</span>
              <span className={cn("ml-2 font-medium",
                (planData?.financial_projections?.net_benefit || 0) > 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(planData?.financial_projections?.net_benefit || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <IconBulb className="h-4 w-4" />
            Empfohlene Maßnahmen ({planData?.recommendations?.length || 0})
          </h4>
          <div className="space-y-3">
            {(planData?.recommendations || []).map((action, index) => {
              const IconComponent = getActionTypeIcon(action?.type || 'default');
              return (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      <h5 className="font-medium">{action?.title || 'Empfehlung'}</h5>
                      <Badge className={getActionTypeColor(action?.type || 'default')}>
                        {((action?.success_rate || 0) * 100).toFixed(0)}% Erfolg
                      </Badge>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">{formatCurrency(action?.total_cost || 0)}</div>
                      <div className="text-muted-foreground">{action?.affected_customers || 0} Kunden</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{action?.description || 'Keine Beschreibung verfügbar'}</p>
                  {action?.note && (
                    <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                      ⚠️ {action.note}
                    </p>
                  )}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Success Rate</span>
                      <span>{((action?.success_rate || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={(action?.success_rate || 0) * 100} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        {planData?.timeline && planData.timeline.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <IconCalendar className="h-4 w-4" />
              Implementierungs-Timeline
            </h4>
            <div className="space-y-2">
              {(planData.timeline || []).map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                  <Badge variant="outline" className="min-w-fit">
                    Woche {item?.week || index + 1}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item?.action || 'Timeline-Punkt'}</div>
                    <div className="text-xs text-muted-foreground">
                      {item?.customers_affected || 0} Kunden • {formatCurrency(item?.investment || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {actionButtons && actionButtons.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex flex-wrap gap-2">
              {actionButtons.map((button, index) => (
                <Button
                  key={index}
                  variant={button.action === 'save_plan' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleActionClick(button.action)}
                  className="flex items-center gap-2"
                >
                  {button.action === 'save_plan' && <IconDeviceFloppy className="h-4 w-4" />}
                  {(button.action === 'export_pdf' || button.action === 'export_excel') && <IconDownload className="h-4 w-4" />}
                  {button.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}