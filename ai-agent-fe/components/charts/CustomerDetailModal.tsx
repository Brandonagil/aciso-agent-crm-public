'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  MoreHorizontal,
  TrendingDown,
  Clock,
  Euro,
  Filter,
  SortAsc,
  Users
} from 'lucide-react';
// import { FloatingChatAction } from '@/components/ui/chat-trigger';
// import { createCustomerChatContext } from '@/lib/utils/chat-integration';

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

interface CustomerDetailModalProps {
  segment: Segment;
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
}

const getRiskBadgeVariant = (category: string) => {
  switch (category?.toUpperCase()) {
    case 'KRITISCH': return 'destructive' as const;
    case 'HOCH': return 'secondary' as const;
    case 'ERHÖHT': return 'secondary' as const;
    case 'MODERAT': return 'outline' as const;
    case 'NIEDRIG': return 'outline' as const;
    default: return 'outline' as const;
  }
};

const formatInactiveTime = (days: number): string => {
  if (days === 0) return 'Aktiv';
  if (days < 30) return `${days} Tage`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? 'Monat' : 'Monate'}`;
  }
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'Jahr' : 'Jahre'}`;
  }
  return `${years}J ${remainingMonths}M`;
};

type SortField = 'name' | 'churn_probability' | 'monthly_fee' | 'days_inactive' | 'risk_rank';
type SortDirection = 'asc' | 'desc';

export function CustomerDetailModal({ segment, customers, isOpen, onClose }: CustomerDetailModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('churn_probability');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // Filter and sort customers
  const filteredAndSortedCustomers = customers
    .filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customer_id.includes(searchTerm);
      const matchesRisk = riskFilter === 'all' || customer.risk_category?.toUpperCase() === riskFilter.toUpperCase();
      return matchesSearch && matchesRisk;
    })
    .sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'churn_probability':
          aValue = a.churn_probability;
          bValue = b.churn_probability;
          break;
        case 'monthly_fee':
          aValue = a.profile?.monthly_fee || 0;
          bValue = b.profile?.monthly_fee || 0;
          break;
        case 'days_inactive':
          aValue = a.business_metrics?.days_inactive || 0;
          bValue = b.business_metrics?.days_inactive || 0;
          break;
        case 'risk_rank':
          aValue = a.risk_rank || 999;
          bValue = b.risk_rank || 999;
          break;
        default:
          aValue = a.churn_probability;
          bValue = b.churn_probability;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Calculate summary statistics
  const avgChurnRisk = filteredAndSortedCustomers.length > 0
    ? filteredAndSortedCustomers.reduce((sum, c) => sum + c.churn_probability, 0) / filteredAndSortedCustomers.length
    : 0;

  const totalRevenue = filteredAndSortedCustomers.reduce((sum, c) => sum + (c.profile?.monthly_fee || 0), 0);
  const highRiskCount = filteredAndSortedCustomers.filter(c => c.churn_probability >= 0.6).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {segment.icon && <span className="text-2xl">{segment.icon}</span>}
            {segment.name}
          </DialogTitle>
          <DialogDescription>
            Detailansicht für {filteredAndSortedCustomers.length} von {customers.length} Kunden in diesem Segment
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600">Kunden</span>
            </div>
            <div className="text-lg font-bold text-blue-700">{filteredAndSortedCustomers.length}</div>
          </div>

          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Ø Risiko</span>
            </div>
            <div className="text-lg font-bold text-red-700">{(avgChurnRisk * 100).toFixed(1)}%</div>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Umsatz</span>
            </div>
            <div className="text-lg font-bold text-green-700">€{totalRevenue.toLocaleString()}</div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-600">Hochrisiko</span>
            </div>
            <div className="text-lg font-bold text-orange-700">{highRiskCount}</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kunde suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[120px]">
                <Filter className="h-4 w-4 mr-2" />
                {riskFilter === 'all' ? 'Alle Risiken' : riskFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setRiskFilter('all')}>
                Alle Risiken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRiskFilter('KRITISCH')}>
                Kritisch
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRiskFilter('HOCH')}>
                Hoch
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRiskFilter('ERHÖHT')}>
                Erhöht
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRiskFilter('MODERAT')}>
                Moderat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRiskFilter('NIEDRIG')}>
                Niedrig
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Customer Table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[200px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('name')}
                    className="h-8 px-2 font-medium"
                  >
                    Kunde
                    <SortAsc className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[80px] text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('risk_rank')}
                    className="h-8 px-2 font-medium"
                  >
                    Rang
                    <SortAsc className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[60px] text-center hidden md:table-cell">Alter</TableHead>
                <TableHead className="w-[120px]">Kategorie</TableHead>
                <TableHead className="w-[140px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('churn_probability')}
                    className="h-8 px-2 font-medium"
                  >
                    Churn-Risiko
                    <SortAsc className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] text-right hidden lg:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('days_inactive')}
                    className="h-8 px-2 font-medium"
                  >
                    Inaktiv
                    <SortAsc className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('monthly_fee')}
                    className="h-8 px-2 font-medium"
                  >
                    Beitrag
                    <SortAsc className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px] hidden xl:table-cell">Risikofaktoren</TableHead>
                <TableHead className="w-[80px]">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedCustomers.map((customer) => (
                <TableRow key={customer.customer_id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">ID: {customer.customer_id}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs font-mono">
                      #{customer.risk_rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    <span className="text-sm">{customer.profile.age}J</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRiskBadgeVariant(customer.risk_category)} className="text-xs">
                      {customer.risk_category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={customer.churn_probability * 100} className="w-16 h-2" />
                      <span className="text-sm font-semibold text-red-600 tabular-nums min-w-[45px]">
                        {(customer.churn_probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    <span className="text-sm tabular-nums">
                      {formatInactiveTime(customer.business_metrics.days_inactive)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-semibold text-green-600 tabular-nums">
                      €{customer.profile.monthly_fee}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {customer.risk_factors && customer.risk_factors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {customer.risk_factors.slice(0, 2).map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs py-0 px-1 bg-red-50 text-red-700">
                            {factor}
                          </Badge>
                        ))}
                        {customer.risk_factors.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{customer.risk_factors.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <span className="text-sm">Kunde analysieren</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Retention-Plan erstellen
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Kundendetails anzeigen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAndSortedCustomers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || riskFilter !== 'all'
                  ? 'Keine Kunden gefunden, die den Filterkriterien entsprechen'
                  : 'Keine Kunden in diesem Segment'
                }
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}