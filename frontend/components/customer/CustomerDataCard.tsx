'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  IconUser,
  IconCalendar,
  IconUsers,
  IconAlertTriangle,
  IconCheck,
  IconActivity,
  IconCreditCard
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface CustomerDataCardProps {
  customerData: {
    mitglied_id: number;
    alter_jahre: number;
    geschlecht: string;
    vertragsbeginn: string;
    laufzeit: string;
    zahlweise: string;
    aktueller_beitrag_eur: number;
    zahlungsart: string;
    vertragsperiode: number;
    vertragsende_aktuell: string;
    anzahl_checkins: number;
    durchschn_aufenthalt_min: number;
    letzter_checkin: string;
    mitgliedschaft_dauer_monate: number;
    checkins_pro_monat: number;
    tage_seit_letztem_checkin: number;
    churn_score_bias_corrected: number;
    gekuendigt: number;
    kuendigungsdatum?: string;
    kuendigungsart?: string;
    kuendigungsgrund?: string;
    risiko_kategorie: string;
    engagement_score: number;
  };
  className?: string;
}

export function CustomerDataCard({ customerData, className }: CustomerDataCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('de-DE');
    } catch {
      return dateString;
    }
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
    return IconActivity;
  };

  const RiskIcon = getRiskIcon(customerData.risiko_kategorie);

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Header Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <IconUser className="h-5 w-5 text-blue-500" />
                Mitglied {customerData.mitglied_id}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">
                  {customerData.alter_jahre} Jahre, {customerData.geschlecht}
                </Badge>
                <Badge className={getRiskColor(customerData.risiko_kategorie)} variant="secondary">
                  <RiskIcon className="h-3 w-3 mr-1" />
                  {customerData.risiko_kategorie} Risiko
                </Badge>
                <Badge variant={customerData.gekuendigt ? 'destructive' : 'default'}>
                  {customerData.gekuendigt ? 'Gekündigt' : 'Aktiv'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Churn-Score</div>
              <div className={cn("text-lg font-bold", {
                'text-green-600': customerData.churn_score_bias_corrected < 30,
                'text-yellow-600': customerData.churn_score_bias_corrected >= 30 && customerData.churn_score_bias_corrected < 60,
                'text-red-600': customerData.churn_score_bias_corrected >= 60
              })}>
                {customerData.churn_score_bias_corrected.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconActivity className="h-4 w-4" />
            Aktivitäts-Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <IconUsers className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-medium">Check-ins gesamt</div>
              <div className="text-lg font-bold text-blue-600">
                {customerData.anzahl_checkins}
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <IconActivity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-medium">Check-ins/Monat</div>
              <div className="text-lg font-bold text-purple-600">
                {customerData.checkins_pro_monat?.toFixed(1) || 0}
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <IconCalendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-medium">Tage inaktiv</div>
              <div className={cn("text-lg font-bold", {
                'text-green-600': customerData.tage_seit_letztem_checkin < 7,
                'text-yellow-600': customerData.tage_seit_letztem_checkin >= 7 && customerData.tage_seit_letztem_checkin < 30,
                'text-red-600': customerData.tage_seit_letztem_checkin >= 30
              })}>
                {customerData.tage_seit_letztem_checkin}
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <IconActivity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-medium">Ø Aufenthalt</div>
              <div className="text-lg font-bold text-indigo-600">
                {customerData.durchschn_aufenthalt_min} min
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCreditCard className="h-4 w-4" />
            Vertrags-Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Monatsbeitrag:</span>
                <div className="font-semibold text-green-600 text-lg">
                  {formatCurrency(customerData.aktueller_beitrag_eur)}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Zahlweise:</span>
                <div className="font-medium">{customerData.zahlweise || '-'}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Zahlungsart:</span>
                <div className="font-medium">{customerData.zahlungsart || '-'}</div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Vertragsbeginn:</span>
                <div className="font-medium">{formatDate(customerData.vertragsbeginn)}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Vertragsende:</span>
                <div className="font-medium">{formatDate(customerData.vertragsende_aktuell)}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Laufzeit:</span>
                <div className="font-medium">{customerData.laufzeit || '-'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Membership Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendar className="h-4 w-4" />
            Mitgliedschafts-Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Mitgliedschaftsdauer:</span>
              <div className="font-semibold text-blue-600">
                {customerData.mitgliedschaft_dauer_monate?.toFixed(1) || 0} Monate
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Engagement-Score:</span>
              <div className="font-semibold text-purple-600">
                {customerData.engagement_score?.toFixed(1) || 0}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Letzter Check-in:</span>
              <div className="font-medium">
                {formatDate(customerData.letzter_checkin)}
              </div>
            </div>
          </div>

          {customerData.gekuendigt === 1 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Kündigungsinformationen</h4>
              <div className="space-y-1 text-sm">
                {customerData.kuendigungsdatum && (
                  <div>
                    <span className="text-red-600">Kündigungsdatum:</span> {formatDate(customerData.kuendigungsdatum)}
                  </div>
                )}
                {customerData.kuendigungsart && (
                  <div>
                    <span className="text-red-600">Art:</span> {customerData.kuendigungsart}
                  </div>
                )}
                {customerData.kuendigungsgrund && (
                  <div>
                    <span className="text-red-600">Grund:</span> {customerData.kuendigungsgrund}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}