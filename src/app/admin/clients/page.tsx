
'use client';

import React, { useMemo } from 'react';
import { Loader2, MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import type { Assessment } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query } from 'firebase/firestore';

function AdminClientsPage() {
  const { firestore } = useFirebase();
  const assessmentsQuery = firestore ? query(collection(firestore, 'assessments')) : null;
  const [assessmentsSnapshot, isFirebaseLoading, error] = useCollection(assessmentsQuery);

  const assessments = useMemo(() => {
    if (!assessmentsSnapshot) return [];
    return assessmentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Assessment[];
  }, [assessmentsSnapshot]);


  return (
    <div>
        <div className="flex items-center justify-between mb-6">
            <div>
            <h2 className="text-3xl font-bold tracking-tight">Soumissions Clients</h2>
            <p className="text-muted-foreground">Liste de toutes les soumissions de véhicules par les clients.</p>
            </div>
            <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un client
            </Button>
        </div>

      <Card>
        <CardContent className="pt-6">
           {isFirebaseLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-4">Chargement des soumissions...</p>
            </div>
          )}

          {error && (
             <div className="text-red-500 p-4">{error.message}</div>
          )}
          
          {!isFirebaseLoading && !error && (
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>N° de PO</TableHead>
                    <TableHead>N° de DO</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments && assessments.length > 0 ? (
                    assessments.map((assessment) => (
                      <TableRow key={assessment.id}>
                        <TableCell>
                          <div className="font-medium">{assessment.client?.name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{assessment.client?.email || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{assessment.client?.phone || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{assessment.vehicle?.make || 'N/A'} {assessment.vehicle?.model || ''} ({assessment.vehicle?.year || 'N/A'})</div>
                            <div className="text-sm text-muted-foreground">{assessment.client?.city || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono">{assessment.summary?.purchaseOrder || 'N/A'}</div>
                        </TableCell>
                         <TableCell>
                          <div className="font-mono">{assessment.summary?.deliveryOrder || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={assessment.summary ? 'default' : 'secondary'} className={!assessment.summary ? 'bg-orange-400 text-white' : ''}>
                                {assessment.summary ? 'Terminé' : 'En attente'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Modifier la soumission
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer la soumission
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        Aucune soumission trouvée.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

export default AdminClientsPage;
