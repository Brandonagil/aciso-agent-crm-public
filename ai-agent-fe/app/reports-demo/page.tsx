'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink } from 'lucide-react';

// Import our report components
import { MemberProfileCard } from '@/components/reports/MemberProfileCard';
import { ChurnRiskGauge } from '@/components/reports/ChurnRiskGauge';
import { ActivityTimeline } from '@/components/reports/ActivityTimeline';
import { RiskFactorsList } from '@/components/reports/RiskFactorsList';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';

import { MemberReportData, MemberReportResponse } from '@/lib/types/reports';

export default function ReportsDemoPage() {
  const [memberId, setMemberId] = useState('12345');
  const [reportData, setReportData] = useState<MemberReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/test?memberId=${memberId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: MemberReportResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate report');
      }

      if (result.data) {
        setReportData(result.data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sampleMemberIds = [
    { id: '12345', description: 'Hohes Risiko' },
    { id: '12346', description: 'Mittleres Risiko' },
    { id: '12347', description: 'Niedriges Risiko' },
    { id: '12348', description: 'Kritisches Risiko' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          📊 Member Report Generator Demo
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Erleben Sie das fortschrittliche Report-Generierungs-System für Fitnessstudio-Mitglieder 
          mit KI-gestützter Churn-Analyse, Aktivitätstracking und personalisierten Empfehlungen.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>🎮 Test Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="memberId" className="block text-sm font-medium mb-2">
                Member ID
              </label>
              <Input
                id="memberId"
                type="text"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="Enter Member ID..."
              />
            </div>
            <Button 
              onClick={fetchReport}
              disabled={loading || !memberId}
              className="flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Beispiel Member IDs zum Testen:</p>
            <div className="flex flex-wrap gap-2">
              {sampleMemberIds.map((sample) => (
                <Button
                  key={sample.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setMemberId(sample.id)}
                  className="flex items-center gap-2"
                >
                  {sample.id}
                  <Badge variant="secondary" className="text-xs">
                    {sample.description}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">❌ Fehler: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Generiere Member Report...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Results */}
      {reportData && !loading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              📋 Generated Report für {reportData.profile.name}
            </h2>
            <div className="flex items-center gap-2">
              <Badge 
                variant={reportData.churnAnalysis.risk_level === 'critical' || reportData.churnAnalysis.risk_level === 'high' ? 'destructive' : 'secondary'}
              >
                {reportData.churnAnalysis.risk_level === 'critical' ? '🚨 Kritisch' :
                 reportData.churnAnalysis.risk_level === 'high' ? '⚠️ Hoch' :
                 reportData.churnAnalysis.risk_level === 'medium' ? '🟡 Mittel' : '✅ Niedrig'}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`/dashboard/reports/member/${memberId}`, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Vollansicht
              </Button>
            </div>
          </div>

          {/* Report Widgets Demo */}
          <div className="grid gap-6">
            {/* Top Row */}
            <div className="grid gap-6 md:grid-cols-2">
              <MemberProfileCard profile={reportData.profile} />
              <ChurnRiskGauge churnAnalysis={reportData.churnAnalysis} />
            </div>

            {/* Activity Timeline */}
            <ActivityTimeline activityData={reportData.activityPatterns} />

            {/* Bottom Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <RiskFactorsList riskFactors={reportData.riskFactors} />
              <AIInsightsPanel 
                aiInsights={reportData.aiInsights}
                recommendations={reportData.recommendations}
              />
            </div>
          </div>

          {/* Technical Info */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">🔧 Technical Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <strong>Report Version:</strong><br />
                  {reportData.reportVersion}
                </div>
                <div>
                  <strong>Churn Score:</strong><br />
                  {reportData.churnAnalysis.churn_score_bias_corrected.toFixed(1)}%
                </div>
                <div>
                  <strong>Risk Factors:</strong><br />
                  {reportData.riskFactors.length} identifiziert
                </div>
                <div>
                  <strong>Recommendations:</strong><br />
                  {reportData.recommendations.length} verfügbar
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground border-t pt-6">
        <p>
          Report-System implementiert mit Next.js, TypeScript, Recharts und Radix UI
        </p>
        <p>
          💡 Diese Demo verwendet Mock-Daten. In der Produktion würde es mit BigQuery und echten Mitgliedsdaten arbeiten.
        </p>
      </div>
    </div>
  );
}
