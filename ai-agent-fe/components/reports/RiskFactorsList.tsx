'use client';

import * as React from 'react';
import { 
  AlertTriangle, 
  Activity, 
  FileText, 
  Users, 
  CreditCard, 
  ChevronRight,
  TrendingDown,
  Clock
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { RiskFactor } from '@/lib/types/reports';

interface RiskFactorsListProps {
  riskFactors: RiskFactor[];
  className?: string;
}

export function RiskFactorsList({ riskFactors, className }: RiskFactorsListProps) {
  // Sort risk factors by impact score (highest first)
  const sortedFactors = [...riskFactors].sort((a, b) => b.impact_score - a.impact_score);

  // Group factors by category
  const groupedFactors = sortedFactors.reduce((groups, factor) => {
    const category = factor.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(factor);
    return groups;
  }, {} as Record<string, RiskFactor[]>);

  // Get category configuration
  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'activity':
        return {
          label: 'Aktivität',
          icon: Activity,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'contract':
        return {
          label: 'Vertrag',
          icon: FileText,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      case 'engagement':
        return {
          label: 'Engagement',
          icon: Users,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'demographic':
        return {
          label: 'Demografie',
          icon: Users,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'payment':
        return {
          label: 'Zahlung',
          icon: CreditCard,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          label: 'Sonstiges',
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  // Get impact level styling
  const getImpactStyling = (score: number) => {
    if (score >= 0.8) {
      return {
        label: 'Kritisch',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200'
      };
    } else if (score >= 0.6) {
      return {
        label: 'Hoch',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-200'
      };
    } else if (score >= 0.4) {
      return {
        label: 'Mittel',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200'
      };
    } else {
      return {
        label: 'Niedrig',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200'
      };
    }
  };

  // Calculate overall risk level
  const overallRiskScore = riskFactors.length > 0 
    ? riskFactors.reduce((sum, factor) => sum + factor.impact_score, 0) / riskFactors.length 
    : 0;

  const overallRisk = getImpactStyling(overallRiskScore);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Risikofaktoren Analyse
        </CardTitle>
        <CardDescription>
          Identifizierte Faktoren die das Kündigungsrisiko erhöhen
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Risk Summary */}
        <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-muted">
          <div className="flex items-center gap-3">
            <TrendingDown className={`h-6 w-6 ${overallRisk.color}`} />
            <div>
              <div className="font-semibold">Gesamtrisiko</div>
              <div className="text-sm text-muted-foreground">
                {riskFactors.length} Risikofaktoren identifiziert
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge className={`${overallRisk.bgColor} ${overallRisk.color} ${overallRisk.borderColor} border`}>
              {overallRisk.label}
            </Badge>
            <div className="text-sm text-muted-foreground mt-1">
              {Math.round(overallRiskScore * 100)}% Impact
            </div>
          </div>
        </div>

        {/* Risk Factors by Category */}
        {Object.entries(groupedFactors).map(([category, factors]) => {
          const categoryConfig = getCategoryConfig(category);
          const CategoryIcon = categoryConfig.icon;

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <CategoryIcon className={`h-4 w-4 ${categoryConfig.color}`} />
                <h4 className="font-medium">{categoryConfig.label}</h4>
                <Badge variant="secondary" className="text-xs">
                  {factors.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {factors.map((factor, index) => {
                  const impact = getImpactStyling(factor.impact_score);
                  
                  return (
                    <div 
                      key={`${category}-${index}`}
                      className={`p-4 rounded-lg border ${categoryConfig.bgColor} ${categoryConfig.borderColor}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-sm">
                              {factor.factor}
                            </h5>
                            <Badge 
                              className={`${impact.bgColor} ${impact.color} ${impact.borderColor} border text-xs`}
                            >
                              {impact.label}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {factor.description}
                          </p>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Impact:
                            </span>
                            <Progress 
                              value={factor.impact_score * 100} 
                              className="flex-1 h-2"
                            />
                            <span className="text-xs font-medium">
                              {Math.round(factor.impact_score * 100)}%
                            </span>
                          </div>
                        </div>
                        
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {Object.keys(groupedFactors).indexOf(category) < Object.keys(groupedFactors).length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {riskFactors.length === 0 && (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-muted-foreground mb-2">
              Keine Risikofaktoren identifiziert
            </h3>
            <p className="text-sm text-muted-foreground">
              Dieses Mitglied zeigt aktuell keine erhöhten Kündigungsrisiken
            </p>
          </div>
        )}

        {/* Quick Stats */}
        {riskFactors.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {riskFactors.filter(f => f.impact_score >= 0.8).length}
              </div>
              <div className="text-xs text-muted-foreground">
                Kritische Faktoren
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {riskFactors.filter(f => f.impact_score >= 0.6 && f.impact_score < 0.8).length}
              </div>
              <div className="text-xs text-muted-foreground">
                Hohe Faktoren
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {riskFactors.filter(f => f.category === 'activity').length}
              </div>
              <div className="text-xs text-muted-foreground">
                Aktivitäts-Risiken
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {riskFactors.filter(f => f.category === 'contract').length}
              </div>
              <div className="text-xs text-muted-foreground">
                Vertrags-Risiken
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}