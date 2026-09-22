'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Target, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
  BarChart3,
  Save,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';

interface EnhancedRetentionPlanRendererProps {
  content: string;
  planData?: {
    plan_id: string;
    target?: {
      id: string;
      name?: string;
      description?: string;
    };
    parameters?: {
      churn_risk?: number;
      roi_estimate?: number;
      budget?: number;
      duration_weeks?: number;
    };
    template?: unknown;
    recommendations?: StructuredRetentionPlan | unknown[] | string;
  };
  actionButtons?: Array<{
    label: string;
    action: 'save_plan' | 'export_pdf' | 'send_to_crm';
    planId?: string;
  }>;
  onAction?: (action: string, planId: string) => void;
  className?: string;
}

export interface StructuredRetentionPlan {
  executive_summary?: {
    churn_risk: number;
    clv_uplift: number;
    roi_estimate: number;
    top_insight: string;
  };
  customer_profile?: {
    id: number;
    age_group: string;
    value_tier: string;
    membership_stage: string;
    activity_status: string;
    key_metrics: {
      days_inactive: number;
      monthly_visits: number;
      monthly_fee: number;
      engagement_score: number;
    };
  };
  top_actions?: Array<{
    title: string;
    description: string;
    timeframe: string;
    target_metric: string;
    expected_result?: string;
    cost_estimate: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  ml_insights?: {
    primary_risk_factor: string;
    protective_factors: string[];
    prediction_confidence: number;
  };
  success_metrics?: {
    week_1_target: string;
    week_4_target: string;
    week_12_target: string;
  };
  rag_sources?: string[];
}

export function EnhancedRetentionPlanRenderer({
  content,
  planData,
  actionButtons = [],
  onAction,
  className
}: EnhancedRetentionPlanRendererProps) {
  const handleActionClick = (action: string) => {
    if (onAction && planData?.plan_id) {
      onAction(action, planData.plan_id);
    }
  };

  // Check if planData contains structured JSON retention plan
  let structuredPlan: StructuredRetentionPlan | null = null;
  if (planData?.recommendations && typeof planData.recommendations === 'object' && !Array.isArray(planData.recommendations) && planData.recommendations.executive_summary) {
    structuredPlan = planData.recommendations as StructuredRetentionPlan;
  }

  // Extract structured data from content
  const extractMetrics = (content: string) => {
    const churnRiskMatch = content.match(/Churn-Risiko[:\s]*([\d,]+(?:\.\d+)?)\s*%/i);
    const clvUpliftMatch = content.match(/CLV-Uplift[:\s]*€?([\d,]+(?:\.\d+)?)/i);
    const roiMatch = content.match(/ROI-Potenzial[:\s]*([\d,]+(?:\.\d+)?)\s*%/i);
    const customerIdMatch = content.match(/ID[:\s]*(\d+)/i);
    const memberIdMatch = content.match(/Mitglied[:\s]*(\d+)/i);
    const successMatch = content.match(/Erfolgswahrscheinlichkeit[:\s]*([\d,]+(?:\.\d+)?)\s*%/i);
    const timeframeMatch = content.match(/Umsetzungsdauer[:\s]*([\d,]+(?:\.\d+)?)\s*Wochen/i);
    
    return {
      churnRisk: churnRiskMatch ? parseFloat(churnRiskMatch[1].replace(',', '')) : planData?.parameters?.churn_risk || 0,
      clvUplift: clvUpliftMatch ? parseFloat(clvUpliftMatch[1].replace(',', '')) : planData?.parameters?.budget || 0,
      roiPotential: roiMatch ? parseFloat(roiMatch[1].replace(',', '')) : planData?.parameters?.roi_estimate || 0,
      customerId: customerIdMatch ? customerIdMatch[1] : memberIdMatch ? memberIdMatch[1] : planData?.target?.id || 'Unknown',
      successProbability: successMatch ? parseFloat(successMatch[1].replace(',', '')) : 75,
      timeframe: timeframeMatch ? parseInt(timeframeMatch[1]) : planData?.parameters?.duration_weeks || 8
    };
  };

  // Extract actions from content
  const extractActions = (content: string) => {
    const actions = [];
    
    // Enhanced regex to catch different action formats
    const actionRegex = /#{3}\s*(🔴|🟡|🟢)\s*(\d+)\.\s*([^#]+?)(?=#{3}|$)/g;
    let match;
    
    while ((match = actionRegex.exec(content)) !== null) {
      const priority = match[1] === '🔴' ? 'high' : match[1] === '🟡' ? 'medium' : 'low';
      const actionNum = match[2];
      const actionContent = match[3].trim();
      
      // Extract structured information
      const lines = actionContent.split('\n').filter(line => line.trim());
      const title = lines[0] || `Maßnahme ${actionNum}`;
      
      const description = lines.find(line => line.includes('**Beschreibung:**'))?.replace('**Beschreibung:**', '').trim();
      const timeframe = lines.find(line => line.includes('**Zeitrahmen:**'))?.replace('**Zeitrahmen:**', '').trim();
      
      actions.push({
        priority,
        title,
        description,
        timeframe
      });
    }
    
    // Fallback: Extract actions from SOFORTMASSNAHMEN, STABILISIERUNGSMASSNAHMEN, LANGFRISTIGE BINDUNG sections
    if (actions.length === 0) {
      const sofortMatch = content.match(/SOFORTMASSNAHMEN[:\s]*([\s\S]*?)(?=STABILISIERUNGSMASSNAHMEN|LANGFRISTIGE BINDUNG|KUNDENSPEZIFISCHE|$)/i);
      const stabilMatch = content.match(/STABILISIERUNGSMASSNAHMEN[:\s]*([\s\S]*?)(?=LANGFRISTIGE BINDUNG|KUNDENSPEZIFISCHE|$)/i);
      const langfristigMatch = content.match(/LANGFRISTIGE BINDUNG[:\s]*([\s\S]*?)(?=KUNDENSPEZIFISCHE|$)/i);
      
      if (sofortMatch) {
        actions.push({
          priority: 'high',
          title: 'Sofortmaßnahmen',
          description: sofortMatch[1].trim().substring(0, 200) + '...',
          timeframe: 'Sofort'
        });
      }
      
      if (stabilMatch) {
        actions.push({
          priority: 'medium',
          title: 'Stabilisierungsmaßnahmen',
          description: stabilMatch[1].trim().substring(0, 200) + '...',
          timeframe: '1-4 Wochen'
        });
      }
      
      if (langfristigMatch) {
        actions.push({
          priority: 'low',
          title: 'Langfristige Bindung',
          description: langfristigMatch[1].trim().substring(0, 200) + '...',
          timeframe: '1-6 Monate'
        });
      }
    }
    
    return actions;
  };

  // Use structured data if available, otherwise extract from content
  const metrics = structuredPlan ? {
    churnRisk: structuredPlan.executive_summary?.churn_risk || 0,
    clvUplift: structuredPlan.executive_summary?.clv_uplift || 0,
    roiPotential: structuredPlan.executive_summary?.roi_estimate || 0,
    customerId: structuredPlan.customer_profile?.id?.toString() || 'Unknown',
    successProbability: 75, // Default value, can be calculated
    timeframe: 12 // Default 12 weeks
  } : extractMetrics(content);

  const actions = structuredPlan?.top_actions ? structuredPlan.top_actions.map(action => ({
    priority: action.priority,
    title: action.title,
    description: action.description,
    timeframe: action.timeframe
  })) : extractActions(content);

  const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-600 bg-red-50 border-red-200';
    if (risk >= 50) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (risk >= 30) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* At-a-Glance KPI Section */}
      <Card className="border-l-4 border-l-primary shadow-sm bg-gradient-to-br from-slate-50 to-gray-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Retention-Plan</h2>
            <Badge variant="outline" className="ml-2 text-xs">
              ID: {metrics.customerId}
            </Badge>
            {structuredPlan?.customer_profile && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {structuredPlan.customer_profile.age_group} • {structuredPlan.customer_profile.value_tier}
              </Badge>
            )}
          </div>
          {structuredPlan?.executive_summary?.top_insight && (
            <p className="text-sm text-gray-600 mt-2">
              💡 {structuredPlan.executive_summary.top_insight}
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-red-600">{metrics.churnRisk}%</div>
              <div className="text-xs text-gray-600">Churn-Risiko</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-green-600">{metrics.successProbability}%</div>
              <div className="text-xs text-gray-600">Erfolgswahrscheinlichkeit</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-blue-600">€{metrics.clvUplift.toLocaleString()}</div>
              <div className="text-xs text-gray-600">CLV-Uplift</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{metrics.timeframe}W</div>
              <div className="text-xs text-gray-600">Umsetzungsdauer</div>
            </div>
          </div>
          
          {/* Progress Bar für Erfolgswahrscheinlichkeit */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Erfolgswahrscheinlichkeit</span>
              <span className="font-medium">{metrics.successProbability}%</span>
            </div>
            <Progress value={metrics.successProbability} className="h-2" />
          </div>
          
          {/* Alert für hohes Risiko */}
          {metrics.churnRisk >= 70 && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Kritisches Churn-Risiko</strong> - Sofortmaßnahmen erforderlich
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Maßnahmen ({actions.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risiko-Analyse */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risiko-Analyse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Churn-Risiko</span>
                    <Badge className={cn("text-xs", getRiskColor(metrics.churnRisk))}>
                      {metrics.churnRisk}%
                    </Badge>
                  </div>
                  <Progress value={metrics.churnRisk} className="h-2" />
                  <div className="text-xs text-gray-600">
                    Status: {metrics.churnRisk >= 70 ? 'Kritisch' : metrics.churnRisk >= 50 ? 'Hoch' : metrics.churnRisk >= 30 ? 'Mittel' : 'Niedrig'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Potenzial-Analyse */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Potenzial-Analyse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CLV-Uplift</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      €{metrics.clvUplift.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ROI-Potenzial</span>
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      {metrics.roiPotential}%
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    Bewertung: {metrics.roiPotential >= 200 ? 'Hervorragend' : metrics.roiPotential >= 150 ? 'Gut' : metrics.roiPotential >= 100 ? 'Akzeptabel' : 'Niedrig'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Profile & ML Insights (nur bei strukturierten Daten) */}
          {structuredPlan && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Profile */}
              {structuredPlan.customer_profile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Kundenprofil
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium">{structuredPlan.customer_profile.activity_status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mitgliedschaft:</span>
                        <span className="font-medium">{structuredPlan.customer_profile.membership_stage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tage inaktiv:</span>
                        <span className="font-medium">{structuredPlan.customer_profile.key_metrics.days_inactive}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monatsbeitrag:</span>
                        <span className="font-medium">€{structuredPlan.customer_profile.key_metrics.monthly_fee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Engagement Score:</span>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          structuredPlan.customer_profile.key_metrics.engagement_score < 20 ? "text-red-600 border-red-200" :
                          structuredPlan.customer_profile.key_metrics.engagement_score < 50 ? "text-yellow-600 border-yellow-200" :
                          "text-green-600 border-green-200"
                        )}>
                          {structuredPlan.customer_profile.key_metrics.engagement_score}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ML Insights */}
              {structuredPlan.ml_insights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      ML Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Hauptrisikofaktor:</p>
                        <p className="text-sm text-gray-600">{structuredPlan.ml_insights.primary_risk_factor}</p>
                      </div>
                      {structuredPlan.ml_insights.protective_factors && structuredPlan.ml_insights.protective_factors.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Schutzfaktoren:</p>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {structuredPlan.ml_insights.protective_factors.map((factor, idx) => (
                              <li key={idx}>{factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Vorhersage-Konfidenz:</span>
                        <Badge variant="outline" className="text-xs">
                          {(structuredPlan.ml_insights.prediction_confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Maßnahmen-Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Maßnahmen-Summary ({actions.length} Maßnahmen)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {['high', 'medium', 'low'].map((priority) => {
                  const count = actions.filter(a => a.priority === priority).length;
                  const color = priority === 'high' ? 'text-red-600' : priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                  const icon = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
                  return (
                    <div key={priority} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold">{icon} {count}</div>
                      <div className={cn("text-xs font-medium", color)}>
                        {priority === 'high' ? 'HOCH' : priority === 'medium' ? 'MITTEL' : 'NIEDRIG'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-3">
          {actions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Maßnahmen-Übersicht</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {actions.map((action, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{getPriorityIcon(action.priority)}</span>
                            <span className="font-medium text-sm text-left">{action.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs px-2 py-1", 
                                action.priority === 'high' ? 'text-red-600 border-red-200' :
                                action.priority === 'medium' ? 'text-yellow-600 border-yellow-200' :
                                'text-green-600 border-green-200'
                              )}
                            >
                              Priorität: {action.priority === 'high' ? 'Hoch' : action.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                            </Badge>
                            {action.timeframe && (
                              <Badge variant="outline" className="text-xs px-2 py-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {action.timeframe}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {action.description && (
                            <div>
                              <h5 className="font-medium text-sm mb-1 text-gray-700">Beschreibung:</h5>
                              <p className="text-sm text-gray-600">{action.description}</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Keine spezifischen Maßnahmen erkannt</p>
                <p className="text-xs text-gray-400 mt-1">Siehe Details-Tab für vollständige Analyse</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Detaillierte Analyse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <Markdown content={content} />
              </div>
            </CardContent>
          </Card>

          {/* Success Metrics (wenn vorhanden) */}
          {structuredPlan?.success_metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Erfolgsmetriken
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Woche 1</Badge>
                    <span className="text-sm">{structuredPlan.success_metrics.week_1_target}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Woche 4</Badge>
                    <span className="text-sm">{structuredPlan.success_metrics.week_4_target}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Woche 12</Badge>
                    <span className="text-sm">{structuredPlan.success_metrics.week_12_target}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* RAG Sources (wenn vorhanden) */}
          {structuredPlan?.rag_sources && structuredPlan.rag_sources.length > 0 && (
            <Card className="border-gray-200 bg-gray-50/50">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Wissenschaftliche Quellen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {structuredPlan.rag_sources.map((source, idx) => (
                    <li key={idx} className="text-gray-600">
                      • {source}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      {actionButtons && actionButtons.length > 0 && (
        <div className="flex justify-center">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200/50 shadow-sm">
            <CardContent className="p-3">
              <div className="flex gap-2">
                {actionButtons.map((button, index) => (
                  <Button
                    key={index}
                    variant={button.action === 'save_plan' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleActionClick(button.action)}
                    className={cn(
                      'transition-all duration-200 flex items-center gap-2',
                      button.action === 'save_plan' && 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                    )}
                  >
                    {button.action === 'save_plan' && <Save className="h-4 w-4" />}
                    {button.action === 'export_pdf' && <FileText className="h-4 w-4" />}
                    {button.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}