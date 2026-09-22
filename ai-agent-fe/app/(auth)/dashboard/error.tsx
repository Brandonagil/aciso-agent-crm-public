'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-red-600">Dashboard-Fehler</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Es gab ein Problem beim Laden des Dashboards. Dies könnte an einer 
            fehlenden Verbindung zu BigQuery oder fehlenden Komponenten liegen.
          </p>
          {error.message && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded border">
              <strong>Fehlerdetails:</strong><br />
              {error.message}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Dashboard neu laden
            </Button>
            <Link href="/dashboard" passHref>
              <Button variant="outline" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Zurück zum Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}