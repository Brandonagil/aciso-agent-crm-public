'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { createGlassCard } from '@/lib/styles/glass-morphism';
import { cn } from '@/lib/utils';

interface Customer {
  customer_id: string;
  name: string;
  churn_probability: number;
  risk_category: string;
  risk_rank?: number;
  risk_factors?: string[];
  risk_segment?: string;
  profile: {
    age: number;
    gender: string;
    payment_method: string;
    monthly_fee: number;
    activity_status: string;
    contract_duration_months: number;
  };
  business_metrics: {
    days_inactive: number;
    total_checkins: number;
    contract_ltv: number;
    checkins_per_euro: number;
    churn_score_raw?: number;
  };
  retention_priority: string;
}

const segments = [
  { id: 'neue-mitglieder', name: 'Neue Mitglieder' },
  { id: 'junge-inaktive', name: 'Junge Inaktive' },
  { id: 'standard-risikokunden', name: 'Standard Risikokunden' },
  { id: 'langzeit-risikokunden', name: 'Langzeit-Risikokunden' },
  { id: 'aeltere-gefaehrdete', name: 'Ältere Gefährdete' },
  { id: 'vip-gefaehrdete', name: 'VIP Gefährdete' }
];


const normalizeSegmentName = (segment: string): string => {
  const mapping: Record<string, string> = {
    'Neue Mitglieder': 'neue-mitglieder',
    'Junge Inaktive': 'junge-inaktive',
    'Standard Risikokunden': 'standard-risikokunden',
    'Langzeit-Risikokunden': 'langzeit-risikokunden',
    'Ältere Gefährdete': 'aeltere-gefaehrdete',
    'VIP Gefährdete': 'vip-gefaehrdete'
  };
  return mapping[segment] || 'standard-risikokunden';
};

export function SegmentedRiskCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
  const ITEMS_PER_PAGE = 5;

  // Gruppiere Kunden nach Segmenten und zeige nur Top 5 pro Segment
  const customersBySegment = customers.reduce((acc, customer) => {
    const segmentKey = normalizeSegmentName(customer.risk_segment || 'Sonstige Risiken');
    if (!acc[segmentKey]) {
      acc[segmentKey] = [];
    }
    acc[segmentKey].push(customer);
    return acc;
  }, {} as Record<string, Customer[]>);

  // Sortiere und filtere Hochrisikokunden (>70% Churn-Wahrscheinlichkeit)
  Object.keys(customersBySegment).forEach(key => {
    customersBySegment[key] = customersBySegment[key]
      .filter(customer => customer.churn_probability >= 0.7) // Nur echte Hochrisikokunden
      .sort((a, b) => b.churn_probability - a.churn_probability);

    // Initialize page for each segment (start at page 0)
    if (currentPage[key] === undefined) {
      setCurrentPage(prev => ({ ...prev, [key]: 0 }));
    }
  });

  const fetchRiskCustomers = async (segmentOffset: number = 0) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/churn/high-risk?limit=50&offset=${segmentOffset}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        if (segmentOffset === 0) {
          setCustomers(data.customers);
        } else {
          // Neue Kunden zu bestehenden hinzufügen
          setCustomers(prev => [...prev, ...data.customers]);
        }
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch customer data');
      }
    } catch (err) {
      console.error('Error fetching risk customers:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskCustomers();
  }, []);

  // Setze das aktive Tab auf das erste Segment mit Kunden
  useEffect(() => {
    if (customers.length > 0 && !activeTab) {
      const segmentsWithCustomers = segments.filter(segment => {
        const segmentCustomers = customersBySegment[segment.id] || [];
        return segmentCustomers.length > 0;
      });
      
      if (segmentsWithCustomers.length > 0) {
        setActiveTab(segmentsWithCustomers[0].id);
      }
    }
  }, [customers, activeTab, customersBySegment]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className={cn(createGlassCard('interactive'))}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Lade Risikokunden-Segmente...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse bg-gray-200 h-4 rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn(createGlassCard('interactive'))}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Fehler beim Laden der Risikokunden-Segmente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Erneut versuchen
          </button>
        </CardContent>
      </Card>
    );
  }

  const activeCustomers = customersBySegment[activeTab] || [];
  const currentPageNum = currentPage[activeTab] || 0;
  const startIndex = currentPageNum * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCustomers = activeCustomers.slice(startIndex, endIndex);
  const totalPages = Math.ceil(activeCustomers.length / ITEMS_PER_PAGE);

  return (
    <Card className="bg-transparent border-0 shadow-none">

      <CardContent className="p-0">
        {/* Horizontal Card Carousel - no vertical scroll */}
        <div className="p-4 space-y-4">
          {/* Segment Navigation as Pills - nur Segmente mit Kunden anzeigen */}
          <div className="flex flex-wrap gap-2 justify-center">
            {segments
              .filter(segment => {
                const segmentCustomers = customersBySegment[segment.id] || [];
                return segmentCustomers.length > 0; // Nur Segmente mit Kunden
              })
              .map((segment) => {
                const segmentCustomers = customersBySegment[segment.id] || [];
                return (
                  <button
                    key={segment.id}
                    onClick={() => setActiveTab(segment.id)}
                    className={`px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === segment.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <span className="hidden sm:inline">{segment.name}</span>
                    <span className="bg-background/20 text-current px-2 py-0.5 rounded-full text-xs">
                      {segmentCustomers.length}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* Table-style Layout - Fixed height container */}
          <div className="space-y-2 h-[400px] flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {paginatedCustomers.map((customer) => (
              <div key={customer.customer_id} className={cn("rounded-lg p-4 transition-all duration-200", createGlassCard('subtle', { hover: true }))}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Customer Info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-foreground text-sm truncate">{customer.name}</h4>
                        <p className="text-xs text-muted-foreground">ID: {customer.customer_id}</p>
                      </div>
                    </div>

                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap flex-shrink-0 ${customer.risk_category === 'KRITISCH' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        customer.risk_category === 'HOCH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                          customer.risk_category === 'MITTEL' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                      {customer.risk_category}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 text-xs flex-shrink-0">
                    <div className="text-center">
                      <div className="font-medium text-foreground">€{customer.profile.monthly_fee.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-foreground">{customer.business_metrics.days_inactive} Tage</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-foreground">{customer.business_metrics.total_checkins}</div>
                    </div>
                  </div>

                  {/* Churn Score */}
                  <div className="text-center lg:text-right flex-shrink-0">
                    <div className="text-xl font-bold text-red-600 leading-none">
                      {(customer.churn_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Additional Details Row */}
                <div className="mt-3 pt-3 border-t border-border/20">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alter:</span>
                      <span className="font-medium text-foreground">{customer.profile.age} Jahre</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Geschlecht:</span>
                      <span className="font-medium text-foreground">{customer.profile.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vertragsdauer:</span>
                      <span className="font-medium text-foreground">{customer.profile.contract_duration_months} Mon.</span>
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {activeCustomers.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center items-center gap-2 mt-4">
                {/* Previous Button */}
                <button
                  onClick={() => {
                    const newPage = Math.max(0, currentPageNum - 1);
                    setCurrentPage(prev => ({ ...prev, [activeTab]: newPage }));
                  }}
                  disabled={currentPageNum === 0}
                  className="px-3 py-1 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Zurück
                </button>

                {/* Page Info */}
                <span className="px-3 py-1 text-sm text-muted-foreground">
                  Seite {currentPageNum + 1} von {totalPages}
                </span>

                {/* Next Button */}
                <button
                  onClick={() => {
                    const newPage = Math.min(totalPages - 1, currentPageNum + 1);
                    setCurrentPage(prev => ({ ...prev, [activeTab]: newPage }));
                  }}
                  disabled={currentPageNum >= totalPages - 1}
                  className="px-3 py-1 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Weiter →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {activeCustomers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              Keine Risikokunden in diesem Segment gefunden.
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Dieses Segment hat aktuell keine Kunden mit erhöhtem Churn-Risiko.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}