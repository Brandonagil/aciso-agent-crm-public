import { Suspense } from 'react';
import { RetentionPlansTable } from '@/components/retention/RetentionPlansTable';
import { Card, CardContent } from '@/components/ui/card';

export default function RetentionPlansPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Retention-Pläne</h1>
          <p className="text-muted-foreground">
            Verwalte alle generierten Retention-Pläne für deine Kunden
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Suspense fallback={<div className="p-6">Lade Pläne...</div>}>
              <RetentionPlansTable />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}