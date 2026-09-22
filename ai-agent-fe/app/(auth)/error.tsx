'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Auth layout error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-red-600">Authentifizierungsfehler</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Es gab ein Problem beim Laden der Authentifizierung. Bitte versuchen Sie es erneut.
          </p>
          {error.message && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
              {error.message}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Erneut versuchen
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/login'} 
              className="w-full"
            >
              Zur Anmeldung
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}