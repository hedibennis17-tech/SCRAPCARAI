
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Assessment, ConditionWizardData } from '@/types';
import { Loader2, ArrowUpDown, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query } from 'firebase/firestore';

// Helper function to create a concise summary of the vehicle's condition
const getConditionSummary = (condition?: ConditionWizardData) => {
    if (!condition) return 'N/A';
    const parts = [
        !condition.missingParts?.includes('Catalyst') && 'Cata',
        !condition.missingParts?.includes('Engine') && 'Moteur',
        !condition.missingParts?.includes('Transmission') && 'Trans',
        !condition.missingParts?.includes('Battery') && 'Batt',
        !condition.missingParts?.includes('Wheels') && 'Roues',
        condition.runs && 'Démarre'
    ].filter(Boolean);
    return parts.join(', ');
}

function AdminVehiclesPage() {
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>('date');
  const { firestore } = useFirebase();
  const assessmentsQuery = firestore ? query(collection(firestore, 'assessments')) : null;
  const [assessmentsSnapshot, isFirebaseLoading, error] = useCollection(assessmentsQuery);

  const assessments = useMemo(() => {
    if (!assessmentsSnapshot) return [];
    return assessmentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Assessment[];
  }, [assessmentsSnapshot]);


  const sortedAssessments = useMemo(() => {
    if(!assessments) return [];
    const sorted = [...assessments];
    if (sortOrder === 'date') {
      return sorted.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    }
    return sorted.sort((a, b) => a.client?.name?.localeCompare(b.client?.name ?? '') ?? 0);
  }, [assessments, sortOrder]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rapport des véhicules</h2>
          <p className="text-muted-foreground">
            Liste de tous les véhicules récemment évalués ou achetés.
          </p>
        </div>
         <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSortOrder('date')} disabled={sortOrder==='date'}>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Trier par Date
            </Button>
            <Button variant="outline" onClick={() => setSortOrder('name')} disabled={sortOrder==='name'}>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Trier par Nom
            </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          {isFirebaseLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-4">Chargement des véhicules...</p>
            </div>
          )}

          {error && (
             <Alert variant="destructive">
                <AlertTitle>Erreur de base de données</AlertTitle>
                <AlertDescription>
                    <p>Impossible de charger les données. L'erreur suivante s'est produite :</p>
                    <pre className="mt-2 text-xs bg-black/20 p-2 rounded-md overflow-x-auto">
                        {error.message}
                    </pre>
                </AlertDescription>
            </Alert>
          )}

          {!isFirebaseLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAssessments && sortedAssessments.length > 0 ? (
                  sortedAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell>
                        <div className="font-medium">{assessment.client?.name}</div>
                        <div className="text-sm text-muted-foreground">{assessment.client?.phone}</div>
                      </TableCell>
                       <TableCell>
                         <div className="font-medium">{assessment.vehicle?.make} {assessment.vehicle?.model}</div>
                         <div className="text-sm text-muted-foreground">{assessment.vehicle?.year}</div>
                       </TableCell>
                        <TableCell>
                         <div className="font-medium">{assessment.vehicle?.transmission}</div>
                         <div className="text-sm text-muted-foreground">{assessment.vehicle?.mileage ? `${Number(assessment.vehicle.mileage).toLocaleString()} km` : 'N/A'}</div>
                       </TableCell>
                       <TableCell>
                          {assessment.client?.city}
                       </TableCell>
                       <TableCell className="text-xs">{getConditionSummary(assessment.condition)}</TableCell>
                       <TableCell className="font-medium">
                        {assessment.valuation ? `$${assessment.valuation.finalPrice.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={assessment.summary?.purchaseOrder ? 'default' : 'secondary'} className={!assessment.summary?.purchaseOrder ? 'bg-orange-400 text-white' : 'bg-green-600'}>
                          {assessment.summary?.purchaseOrder ? 'Terminé' : 'En attente'}
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
                                  Mettre à jour le statut
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                      Aucun véhicule trouvé.
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

export default AdminVehiclesPage;
