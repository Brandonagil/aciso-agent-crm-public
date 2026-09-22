'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import JSON5 from 'json5';

interface MinimalRetentionPlanRendererProps {
  content: string;
  onAction?: (action: string, planId: string) => void;
}

interface StructuredRetentionPlan {
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
    cost_estimate: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export function MinimalRetentionPlanRenderer({ content, onAction }: MinimalRetentionPlanRendererProps) {
  // Extract JSON from content
  let structuredPlan: StructuredRetentionPlan | null = null;
  try {
    let jsonString = null;
    
    // 1. Try direct JSON parse first (most common case)
    try {
      structuredPlan = JSON5.parse(content.trim());
    } catch {
      // 2. Prioritize markdown code block (preferred)
      const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        jsonString = codeBlockMatch[1];
      } else {
        // 3. Fallback: find the first JSON-like object or array
        const jsonMatch = content.match(/([\{\[][\s\S]*?[\]\}])/);
        if (jsonMatch && jsonMatch[1]) {
          jsonString = jsonMatch[1];
        }
      }

      if (jsonString) {
        // 4. Let JSON5 parse the potentially "dirty" JSON
        structuredPlan = JSON5.parse(jsonString);
      }
    }
  } catch (error) {
    console.error('Failed to parse retention plan JSON:', error);
    console.error('Content that failed:', content.substring(0, 500));
    structuredPlan = null;
  }

  const handleSave = () => {
    if (onAction) {
      const planId = `plan_${Date.now()}`;
      console.log('Saving retention plan:', planId);
      onAction('save_plan', planId);
    }
  };

  if (!structuredPlan) {
    return (
      <div className="prose max-w-none">
        {content.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
            <Save className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Retention-Plan</h2>
            {structuredPlan.customer_profile && (
              <p className="text-sm text-slate-500">
                Kunde ID: {structuredPlan.customer_profile.id}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {structuredPlan.executive_summary && (
        <div className="p-4 sm:p-6 space-y-6">
          <h3 className="text-base font-semibold text-slate-800">Übersicht</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60">
              <div className="text-lg font-bold tracking-tight text-slate-900">{structuredPlan.executive_summary.churn_risk}%</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Churn-Risiko</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60">
              <div className="text-lg font-bold tracking-tight text-slate-900">€{structuredPlan.executive_summary.clv_uplift.toLocaleString()}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">CLV-Uplift</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60">
              <div className="text-lg font-bold tracking-tight text-slate-900">{structuredPlan.executive_summary.roi_estimate}%</div>
              <div className="text-xs font-medium text-slate-500 mt-1">ROI-Potenzial</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60">
              <div className="text-lg font-bold tracking-tight text-slate-900">12W</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Zeitrahmen</div>
            </div>
          </div>
          {structuredPlan.executive_summary.top_insight && (
            <div className="bg-slate-100/70 border border-slate-200/60 rounded-lg p-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                {structuredPlan.executive_summary.top_insight}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Customer Profile */}
      {structuredPlan.customer_profile && (
        <div className="px-4 sm:px-6 pb-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-800">Kundenprofil</h3>
          <div className="bg-slate-50/80 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-medium text-slate-500">Status:</span>
              <span className="text-sm font-semibold text-slate-800">{structuredPlan.customer_profile.activity_status}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-medium text-slate-500">Altersgruppe:</span>
              <span className="text-sm font-semibold text-slate-800">{structuredPlan.customer_profile.age_group}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-medium text-slate-500">Wert-Tier:</span>
              <span className="text-sm font-semibold text-slate-800">{structuredPlan.customer_profile.value_tier}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-medium text-slate-500">Tage inaktiv:</span>
              <span className="text-sm font-semibold text-slate-800">{structuredPlan.customer_profile.key_metrics.days_inactive}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-medium text-slate-500">Monatsbeitrag:</span>
              <span className="text-sm font-semibold text-slate-800">€{structuredPlan.customer_profile.key_metrics.monthly_fee}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {structuredPlan.top_actions && structuredPlan.top_actions.length > 0 && (
        <div className="px-4 sm:px-6 pb-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-800">Maßnahmen</h3>
          <div className="space-y-3">
            {structuredPlan.top_actions.map((action, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200/60 rounded-lg p-4 hover:bg-slate-100/50 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-sm text-slate-800 leading-relaxed">{action.title}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      action.priority === 'high' ? 'bg-slate-800 text-white' : 
                      action.priority === 'medium' ? 'bg-slate-600 text-white' : 
                      'bg-slate-400 text-white'
                    }`}>
                      Priorität: {action.priority === 'high' ? 'Hoch' : action.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{action.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="text-slate-500">
                      <span className="font-medium">Zeitrahmen:</span> {action.timeframe}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50/30">
        <Button 
          onClick={handleSave} 
          variant="outline" 
          size="sm"
          className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700 font-medium"
        >
          <Save className="h-4 w-4 mr-2" />
          Plan speichern
        </Button>
      </div>
    </div>
  );
}