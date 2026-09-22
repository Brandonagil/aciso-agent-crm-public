'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  AlertTriangle,
  Clock,
  Users,
  Diamond,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { CustomerDetailModal } from './CustomerDetailModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface Segment {
  id: string;
  name: string;
  icon: string;
}

interface SegmentOverviewCardProps {
  segment: Segment;
  customers: Customer[];
  totalCustomers: number;
}

const getSegmentIcon = (segmentId: string) => {
  const iconMap = {
    'neue-mitglieder': UserPlus,
    'etablierte-risikokunden': AlertTriangle,
    'inaktive-langzeitmitglieder': Clock,
    'aeltere-risikokunden': Users,
    'premium-risikokunden': Diamond,
    'sonstige-risiken': HelpCircle
  };
  return iconMap[segmentId as keyof typeof iconMap] || HelpCircle;
};

const getSegmentColor = (segmentId: string) => {
  const colorMap = {
    'neue-mitglieder': 'border-muted-foreground/30 bg-muted/50',
    'etablierte-risikokunden': 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20',
    'inaktive-langzeitmitglieder': 'border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20',
    'aeltere-risikokunden': 'border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20',
    'premium-risikokunden': 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20',
    'sonstige-risiken': 'border-muted-foreground/30 bg-muted/50'
  };
  return colorMap[segmentId as keyof typeof colorMap] || 'border-muted-foreground/30 bg-muted/50';
};

const getSegmentTextColor = (segmentId: string) => {
  const textColorMap = {
    'neue-mitglieder': 'text-muted-foreground',
    'etablierte-risikokunden': 'text-red-700 dark:text-red-300',
    'inaktive-langzeitmitglieder': 'text-yellow-700 dark:text-yellow-300',
    'aeltere-risikokunden': 'text-purple-700 dark:text-purple-300',
    'premium-risikokunden': 'text-emerald-700 dark:text-emerald-300',
    'sonstige-risiken': 'text-muted-foreground'
  };
  return textColorMap[segmentId as keyof typeof textColorMap] || 'text-muted-foreground';
};

const getRiskPriority = (segmentId: string) => {
  const priorityMap = {
    'etablierte-risikokunden': 'KRITISCH',
    'premium-risikokunden': 'HOCH',
    'inaktive-langzeitmitglieder': 'HOCH',
    'aeltere-risikokunden': 'MITTEL',
    'neue-mitglieder': 'MITTEL',
    'sonstige-risiken': 'NIEDRIG'
  };
  return priorityMap[segmentId as keyof typeof priorityMap] || 'NIEDRIG';
};

export function SegmentOverviewCard({ segment, customers }: SegmentOverviewCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [sortOrder, setSortOrder] = useState<'risk' | 'name'>('risk');

  const IconComponent = getSegmentIcon(segment.id);
  const segmentColorClass = getSegmentColor(segment.id);
  const textColorClass = getSegmentTextColor(segment.id);
  const priority = getRiskPriority(segment.id);

  // Sort customers based on the selected order
  const sortedCustomers = [...customers].sort((a, b) => {
    if (sortOrder === 'risk') {
      return b.churn_probability - a.churn_probability;
    }
    return a.name.localeCompare(b.name);
  });

  const visibleCustomers = sortedCustomers.slice(0, visibleCount);

  const handleLoadMore = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent modal from opening
    setVisibleCount(prev => prev + 5);
  };

  const handleSortChange = (order: 'risk' | 'name') => {
    setSortOrder(order);
  };

  // Calculate metrics
  const customerCount = customers.length;

  const avgChurnRisk = customerCount > 0
    ? customers.reduce((sum, c) => sum + c.churn_probability, 0) / customerCount
    : 0;


  return (
    <>
      <Card
        onClick={() => setShowModal(true)}
        className={cn("h-full flex flex-col transition-all duration-200 hover:shadow-lg cursor-pointer", segmentColorClass, createGlassCard('card', { hover: true, animated: true }))}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <IconComponent className={`h-5 w-5 ${textColorClass}`} />
              <span className="text-sm font-medium truncate">{segment.name}</span>
            </div>
            <Badge
              variant={priority === 'KRITISCH' ? 'destructive' : priority === 'HOCH' ? 'secondary' : 'outline'}
              className="text-xs px-2 py-0"
            >
              {priority}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-3">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className={`text-2xl font-bold ${textColorClass}`}>{customerCount}</div>
              <p className="text-xs text-muted-foreground">Kunden</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{(avgChurnRisk * 100).toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Ø Risiko</p>
            </div>
          </div>

          {/* FIXED: Top Risk Customers List mit fester Höhe und integriertem "Mehr laden" Button */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
              <h4 className="text-xs font-semibold text-muted-foreground">Top Risiko-Kunden</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={e => e.stopPropagation()}>
                    Sortieren <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent onClick={e => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => handleSortChange('risk')}>Nach Risiko</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange('name')}>Nach Name</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Scrollbarer Container - Karte wächst NIEMALS über ursprüngliche Größe */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="space-y-1.5">
                {visibleCustomers.map(customer => (
                  <div key={customer.customer_id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{customer.name}</span>
                    <Badge variant="destructive" className="font-mono px-1 py-0 text-[10px]">
                      {(customer.churn_probability * 100).toFixed(1)}%
                    </Badge>
                  </div>
                ))}

                {/* "Mehr laden" Button INNERHALB des Scroll-Containers */}
                {visibleCount < customers.length && (
                  <div className="pt-2 border-t border-border/30">
                    <Button onClick={handleLoadMore} size="sm" variant="outline" className="w-full text-xs">
                      Mehr laden ({customers.length - visibleCount} weitere)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CustomerDetailModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        segment={segment}
        customers={customers}
      />
    </>
  );
}