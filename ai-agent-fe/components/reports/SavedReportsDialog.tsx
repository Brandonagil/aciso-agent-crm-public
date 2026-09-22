'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Button
} from '@/components/ui/button';
import {
  Input
} from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Badge
} from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Calendar, 
  Tag, 
  FileText, 
  Trash2, 
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { MemberReportData } from '@/lib/types/reports';

interface SavedReport {
  report_id: string;
  member_id: number;
  title?: string;
  description?: string;
  report_type: string;
  created_at: string;
  created_by: string;
  tags?: string[];
  file_size_bytes?: number;
  report_data?: MemberReportData;
}

interface SavedReportsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  memberId?: number;
  onLoadReport?: (reportData: MemberReportData) => void;
}

const reportTypeLabels: Record<string, string> = {
  'standard': 'Standard Report',
  'executive_summary': 'Executive Summary',
  'detailed_analytics': 'Detaillierte Analyse',
  'risk_focused': 'Risiko-Fokussiert',
  'retention_strategy': 'Retention-Strategie'
};

export function SavedReportsDialog({
  isOpen,
  onClose,
  memberId,
  onLoadReport
}: SavedReportsDialogProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterMember, setFilterMember] = useState<string>(memberId?.toString() || '');
  
  // Delete confirmation
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load reports
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filterMember) {
        params.append('memberId', filterMember);
      }
      
      if (filterType) {
        params.append('reportType', filterType);
      }
      
      params.append('limit', '50');

      const response = await fetch(`/api/reports/saved?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setReports(result.reports);
      } else {
        setError(result.error || 'Fehler beim Laden der Reports');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  }, [filterMember, filterType]);

  // Filter reports based on search term
  useEffect(() => {
    let filtered = reports;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.title?.toLowerCase().includes(term) ||
        report.description?.toLowerCase().includes(term) ||
        report.tags?.some(tag => tag.toLowerCase().includes(term)) ||
        report.report_id.toLowerCase().includes(term)
      );
    }

    setFilteredReports(filtered);
  }, [reports, searchTerm]);

  // Load reports when dialog opens or filters change
  useEffect(() => {
    if (isOpen) {
      loadReports();
    }
  }, [isOpen, loadReports]);

  const handleLoadReport = async (reportId: string) => {
    try {
      const report = reports.find(r => r.report_id === reportId);
      if (!report) return;

      // If report data is already loaded, use it
      if (report.report_data) {
        onLoadReport?.(report.report_data);
        onClose();
        return;
      }

      // Otherwise, fetch the full report
      const response = await fetch(
        `/api/reports/member/${report.member_id}?saved=true&version=${reportId}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        onLoadReport?.(result.data);
        onClose();
      } else {
        setError(result.error || 'Fehler beim Laden des Reports');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/reports/saved?reportId=${reportId}`,
        { method: 'DELETE' }
      );
      const result = await response.json();

      if (result.success) {
        setReports(reports.filter(r => r.report_id !== reportId));
        setReportToDelete(null);
      } else {
        setError(result.error || 'Fehler beim Löschen');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gespeicherte Reports</DialogTitle>
            <DialogDescription>
              Verwalten und laden Sie zuvor gespeicherte Member-Reports.
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Reports durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Alle Typen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle Typen</SelectItem>
                  {Object.entries(reportTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Mitglieds-ID"
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="w-32"
              />

              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadReports}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Reports List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Lade Reports...</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Reports gefunden</p>
                <p className="text-sm">
                  {searchTerm || filterType || filterMember 
                    ? 'Versuchen Sie andere Suchkriterien' 
                    : 'Noch keine Reports gespeichert'
                  }
                </p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <Card key={report.report_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {report.title || `Report für Mitglied ${report.member_id}`}
                        </CardTitle>
                        <CardDescription>
                          {report.description || 'Keine Beschreibung verfügbar'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {reportTypeLabels[report.report_type] || report.report_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(report.created_at), 'PPP', { locale: de })}
                      </div>
                      <div>
                        Mitglied: {report.member_id}
                      </div>
                      <div>
                        Größe: {formatFileSize(report.file_size_bytes)}
                      </div>
                    </div>

                    {/* Tags */}
                    {report.tags && report.tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {report.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleLoadReport(report.report_id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Laden
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setReportToDelete(report.report_id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Löschen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie diesen Report löschen möchten? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportToDelete && handleDeleteReport(reportToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Löschen...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}