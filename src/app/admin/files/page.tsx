
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

function AdminFilesPage() {
  return (
    <div>
        <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Dossiers</h2>
            <p className="text-muted-foreground">Gérez tous les dossiers et documents relatifs à vos acquisitions.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Gestion des dossiers</CardTitle>
                <CardDescription>Cette section est en cours de développement.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
               <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">La fonctionnalité de gestion des dossiers sera bientôt disponible.</p>
            </CardContent>
        </Card>
    </div>
  );
}

export default AdminFilesPage;
