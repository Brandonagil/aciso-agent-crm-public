'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  FileText,
  AlertCircle,
  CheckCircle,
  Save,
  FolderOpen
} from 'lucide-react';

// Import our custom report widgets
import { MemberProfileCard } from '@/components/reports/MemberProfileCard';
import { ChurnRiskGauge } from '@/components/reports/ChurnRiskGauge';
import { ActivityTimeline } from '@/components/reports/ActivityTimeline';
import { RiskFactorsList } from '@/components/reports/RiskFactorsList';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';

import { 
  MemberReportData, 
  MemberReportResponse 
} from '@/lib/types/reports';

// Import save/load dialogs
import { SaveReportDialog } from '@/components/reports/SaveReportDialog';
import { SavedReportsDialog } from '@/components/reports/SavedReportsDialog';

export default function MemberReportPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;

  const [reportData, setReportData] = useState<MemberReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeAI] = useState(true);
  const [includeComparison] = useState(true);
  
  // Save/Load dialogs
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`/api/reports/member/${memberId}`, window.location.origin);
      url.searchParams.set('includeAIInsights', includeAI.toString());
      url.searchParams.set('includeComparison', includeComparison.toString());

      const response = await fetch(url.toString());
      
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
  }, [memberId, includeAI, includeComparison]);

  // Load data on component mount and when options change
  useEffect(() => {
    if (memberId) {
      fetchReportData();
    }
  }, [memberId, includeAI, includeComparison, fetchReportData]);

  // Handle export (placeholder)
  const handleExport = (format: 'pdf' | 'excel') => {
    // TODO: Implement export functionality
    console.log(`Exporting report as ${format} for member ${memberId}`);
    alert(`Export als ${format.toUpperCase()} wird implementiert...`);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchReportData();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <div className="md:col-span-2 lg:col-span-3">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Fehler beim Laden des Reports</h2>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            {error}
          </p>
          <Button onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  // No data state
  if (!reportData) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Keine Daten gefunden</h2>
          <p className="text-muted-foreground mb-4">
            Für Mitglied {memberId} konnten keine Reportdaten generiert werden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Mitglieder-Report
            </h2>
            <p className="text-muted-foreground">
              Detaillierte Analyse für {reportData.profile.name || `Mitglied ${memberId}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <Badge 
            variant={reportData.churnAnalysis.risk_level === 'critical' || reportData.churnAnalysis.risk_level === 'high' ? 'destructive' : 'secondary'}
            className="flex items-center gap-1"
          >
            {reportData.churnAnalysis.risk_level === 'low' ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {reportData.churnAnalysis.risk_level === 'critical' ? 'Kritisches Risiko' :
             reportData.churnAnalysis.risk_level === 'high' ? 'Hohes Risiko' :
             reportData.churnAnalysis.risk_level === 'medium' ? 'Mittleres Risiko' : 'Niedriges Risiko'}
          </Badge>

          {/* Action Buttons */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowLoadDialog(true)}
            className="flex items-center gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Laden
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Speichern
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            PDF Export
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Excel Export
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="grid gap-6">
        {/* Top Row - Profile and Churn Risk */}
        <div className="grid gap-6 md:grid-cols-2">
          <MemberProfileCard 
            profile={reportData.profile}
            className="h-fit"
          />
          <ChurnRiskGauge 
            churnAnalysis={reportData.churnAnalysis}
            className="h-fit"
          />
        </div>

        {/* Activity Timeline - Full Width */}
        <ActivityTimeline 
          activityData={reportData.activityPatterns}
        />

        {/* Bottom Row - Risk Factors and AI Insights */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RiskFactorsList 
            riskFactors={reportData.riskFactors}
          />
          <AIInsightsPanel 
            aiInsights={reportData.aiInsights}
            recommendations={reportData.recommendations}
          />
        </div>

        {/* Report Metadata */}
        <div className="flex items-center justify-between py-4 border-t text-sm text-muted-foreground">
          <span>
            Report generiert: {new Date().toLocaleDateString('de-DE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Version {reportData.reportVersion}
          </span>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800">
                Report erfolgreich gespeichert! ID: {saveSuccess}
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSaveSuccess(null)}
                className="ml-auto h-auto p-1"
              >
                ×
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Save Report Dialog */}
      {reportData && (
        <SaveReportDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          reportData={reportData}
          memberId={parseInt(memberId)}
          onSaveSuccess={(reportId) => {
            setSaveSuccess(reportId);
            setTimeout(() => setSaveSuccess(null), 5000);
          }}
        />
      )}

      {/* Load Saved Reports Dialog */}
      <SavedReportsDialog
        isOpen={showLoadDialog}
        onClose={() => setShowLoadDialog(false)}
        memberId={parseInt(memberId)}
        onLoadReport={(loadedReportData) => {
          setReportData(loadedReportData);
        }}
      />
    </div>
  );
}