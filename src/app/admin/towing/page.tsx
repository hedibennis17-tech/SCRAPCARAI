
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck } from 'lucide-react';

function AdminTowingPage() {
  return (
    <div>
        <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Towing &amp; Dispatch</h2>
            <p className="text-muted-foreground">Gérez les opérations de remorquage.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Gestion du remorquage</CardTitle>
                <CardDescription>Cette section est en cours de développement.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
               <Truck className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">La fonctionnalité de gestion du remorquage sera bientôt disponible.</p>
            </CardContent>
        </Card>
    </div>
  );
}

export default AdminTowingPage;
