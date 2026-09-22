'use client';

import * as React from 'react';
import { 
  Brain, 
  Lightbulb, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Target,
  MessageSquare,
  Users,
  Phone,
  Star
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AIInsights, Recommendation } from '@/lib/types/reports';

interface AIInsightsPanelProps {
  aiInsights?: AIInsights;
  recommendations?: Recommendation[];
  className?: string;
}

export function AIInsightsPanel({ aiInsights, recommendations, className }: AIInsightsPanelProps) {
  // Get priority styling
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          label: 'Dringend',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: AlertCircle
        };
      case 'high':
        return {
          label: 'Hoch',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: Clock
        };
      case 'medium':
        return {
          label: 'Mittel',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: Target
        };
      case 'low':
      default:
        return {
          label: 'Niedrig',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: CheckCircle
        };
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'communication':
        return MessageSquare;
      case 'engagement':
        return Users;
      case 'retention':
        return Target;
      case 'service':
        return Star;
      default:
        return Lightbulb;
    }
  };

  // Format confidence score
  const formatConfidence = (score: number) => {
    const percentage = Math.round(score * 100);
    if (percentage >= 90) return { level: 'Sehr hoch', color: 'text-green-600' };
    if (percentage >= 75) return { level: 'Hoch', color: 'text-blue-600' };
    if (percentage >= 60) return { level: 'Mittel', color: 'text-yellow-600' };
    return { level: 'Niedrig', color: 'text-red-600' };
  };

  const confidence = aiInsights ? formatConfidence(aiInsights.confidence_score) : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          KI-Insights & Empfehlungen
        </CardTitle>
        <CardDescription>
          Von Machine Learning Modellen generierte Erkenntnisse und Handlungsempfehlungen
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* AI Summary */}
        {aiInsights && (
          <div className="space-y-4">
            {/* Confidence Score */}
            <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Analyse-Vertrauen</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${confidence?.color}`}>
                  {confidence?.level}
                </span>
                <Badge variant="secondary">
                  {Math.round(aiInsights.confidence_score * 100)}%
                </Badge>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                Zusammenfassung
              </h4>
              <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded-lg">
                {aiInsights.summary}
              </p>
            </div>

            {/* Key Findings */}
            {aiInsights.key_findings && aiInsights.key_findings.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Wichtige Erkenntnisse
                </h4>
                <ul className="space-y-2">
                  {aiInsights.key_findings.map((finding, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-green-600" />
            Handlungsempfehlungen
            {recommendations && (
              <Badge variant="secondary" className="ml-2">
                {recommendations.length}
              </Badge>
            )}
          </h4>

          {recommendations && recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((recommendation) => {
                const priorityConfig = getPriorityConfig(recommendation.priority);
                const CategoryIcon = getCategoryIcon(recommendation.category);
                const PriorityIcon = priorityConfig.icon;

                return (
                  <div 
                    key={recommendation.id}
                    className={`p-4 rounded-lg border-2 ${priorityConfig.bgColor} ${priorityConfig.borderColor}`}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                          <h5 className="font-medium text-sm">
                            {recommendation.title}
                          </h5>
                        </div>
                        <Badge 
                          className={`${priorityConfig.bgColor} ${priorityConfig.color} ${priorityConfig.borderColor} border`}
                        >
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {priorityConfig.label}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {recommendation.description}
                      </p>

                      {/* Additional Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {recommendation.estimated_impact && (
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Erwarteter Impact:</span>
                            <span className="font-medium">{recommendation.estimated_impact}</span>
                          </div>
                        )}
                        {recommendation.suggested_timeline && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Zeitrahmen:</span>
                            <span className="font-medium">{recommendation.suggested_timeline}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-end pt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs"
                          onClick={() => {
                            // TODO: Implement action handling
                            console.log('Implementing recommendation:', recommendation.id);
                          }}
                        >
                          {recommendation.category === 'communication' && <Phone className="h-3 w-3 mr-1" />}
                          {recommendation.category === 'engagement' && <Users className="h-3 w-3 mr-1" />}
                          {recommendation.category === 'retention' && <Target className="h-3 w-3 mr-1" />}
                          {recommendation.category === 'service' && <Star className="h-3 w-3 mr-1" />}
                          Umsetzen
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-muted-foreground mb-2">
                Keine KI-Empfehlungen verfügbar
              </h3>
              <p className="text-sm text-muted-foreground">
                Aktivieren Sie KI-Insights für personalisierte Handlungsempfehlungen
              </p>
            </div>
          )}
        </div>

        {/* Analysis Metadata */}
        {aiInsights && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Analyse erstellt: {new Date(aiInsights.analysis_date).toLocaleDateString('de-DE')}
              </span>
              <div className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                <span>Powered by ML</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}