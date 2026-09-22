'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  IconTrash,
  IconDownload,
  IconFilter,
  IconSearch,
  IconChevronDown
} from '@tabler/icons-react';

interface RetentionPlan {
  id: string;
  user_id: string;
  customer_id: string;
  name: string;
  status: 'active' | 'archived';
  plan_data: unknown;
  created_at: string | number | Date | { toDate: () => Date } | { seconds: number };
}

export function RetentionPlansTable() {
  const [plans, setPlans] = useState<RetentionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchCustomer, setSearchCustomer] = useState<string>('');

  // Mock user ID - in real app, get from auth context
  const userId = 'demo-user';

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchCustomer && { customer_id: searchCustomer })
      });

      const response = await fetch(`/api/retention-plans?${params}`, {
        headers: {
          'Authorization': 'Bearer dummy-token' // TODO: Real auth
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchCustomer]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSelectPlan = (planId: string, checked: boolean) => {
    const newSelected = new Set(selectedPlans);
    if (checked) {
      newSelected.add(planId);
    } else {
      newSelected.delete(planId);
    }
    setSelectedPlans(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPlans(new Set(plans.map(p => p.id)));
    } else {
      setSelectedPlans(new Set());
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Plan wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/retention-plans?id=${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer dummy-token'
        }
      });

      if (response.ok) {
        await fetchPlans(); // Refresh
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPlans.size === 0) return;
    if (!confirm(`${selectedPlans.size} Pläne wirklich löschen?`)) return;

    try {
      const response = await fetch(`/api/retention-plans?bulk_ids=${Array.from(selectedPlans).join(',')}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer dummy-token'
        }
      });

      if (response.ok) {
        setSelectedPlans(new Set());
        await fetchPlans(); // Refresh
      }
    } catch (error) {
      console.error('Error bulk deleting plans:', error);
    }
  };

  const handleExportPDF = async (planId: string, planName?: string) => {
    try {
      const response = await fetch(`/api/retention-plans/${planId}/export`, {
        headers: {
          'Authorization': 'Bearer dummy-token'
        }
      });

      if (response.ok) {
        const blob = await response.blob();

        // Check if the response is actually a PDF
        if (blob.type === 'application/pdf' || blob.size > 0) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `retention-plan-${planName || planId}.pdf`;
          document.body.appendChild(a); // Ensure element is in DOM
          a.click();
          document.body.removeChild(a); // Clean up
          window.URL.revokeObjectURL(url);
        } else {
          throw new Error('Invalid PDF response');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Fehler beim Exportieren der PDF. Bitte versuchen Sie es erneut.');
    }
  };

  const formatDate = (date: RetentionPlan['created_at']) => {
    if (!date) return 'Heute';

    try {
      let d: Date;

      // Handle Firestore Timestamp
      if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
        d = date.toDate();
      }
      // Handle Firestore Timestamp with seconds/nanoseconds
      else if (typeof date === 'object' && 'seconds' in date && typeof date.seconds === 'number') {
        d = new Date(date.seconds * 1000);
      }
      // Handle ISO string or number
      else {
        d = date instanceof Date ? date : new Date(typeof date === 'string' || typeof date === 'number' ? date : NaN);
      }

      // Check if date is valid
      if (isNaN(d.getTime())) {
        // If date is invalid, return current date
        d = new Date();
      }

      return d.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      // Return current date as fallback
      return new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };



  if (loading) {
    return <div className="p-6">Lade Retention-Pläne...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex gap-4 items-center p-4 border-b">
        <div className="flex items-center gap-2">
          <IconFilter className="h-4 w-4" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Status: {statusFilter === 'all' ? 'Alle' : statusFilter}
                <IconChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                Alle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                Aktiv
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('archived')}>
                Archiviert
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <IconSearch className="h-4 w-4" />
          <Input
            placeholder="Kunde suchen..."
            value={searchCustomer}
            onChange={(e) => setSearchCustomer(e.target.value)}
            className="w-48"
          />
        </div>

        {selectedPlans.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              {selectedPlans.size} ausgewählt
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              <IconTrash className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b">
            <tr className="text-left">
              <th className="p-4">
                <input
                  type="checkbox"
                  checked={plans.length > 0 && selectedPlans.size === plans.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="p-4">Name</th>
              <th className="p-4">Kunde</th>
              <th className="p-4">Status</th>
              <th className="p-4">Erstellt</th>
              <th className="p-4">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b hover:bg-muted/50">
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedPlans.has(plan.id)}
                    onChange={(e) => handleSelectPlan(plan.id, e.target.checked)}
                  />
                </td>
                <td className="p-4">
                  <div>
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {plan.id}
                    </div>
                  </div>
                </td>
                <td className="p-4">{plan.customer_id || '-'}</td>
                <td className="p-4">
                  <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                    {plan.status === 'active' ? 'Aktiv' : 'Archiviert'}
                  </Badge>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatDate(plan.created_at)}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPDF(plan.id, plan.name)}
                      title="PDF exportieren"
                    >
                      <IconDownload className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {plans.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Keine Retention-Pläne gefunden
          </div>
        )}
      </div>
    </div>
  );
}