import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle>404 - Seite nicht gefunden</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Die angeforderte Seite konnte nicht gefunden werden.
          </p>
          <Button asChild className="w-full">
            <Link href="/dashboard">
              Zurück zum Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}