
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Assessment } from '@/types';
import { Loader2, MoreHorizontal, CheckCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc } from 'firebase/firestore';


function AdminPurchasesPage() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  
  const assessmentsQuery = firestore ? query(collection(firestore, 'assessments'), where('valuation', '!=', null)) : null;
  const [assessmentsSnapshot, isFirebaseLoading, error] = useCollection(assessmentsQuery);

  const assessments = useMemo(() => {
    if (!assessmentsSnapshot) return [];
    return assessmentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Assessment[];
  }, [assessmentsSnapshot]);

  
  const handleUpdateStatus = (id: string, newStatus: string) => {
    if(firestore) {
        const docRef = doc(firestore, 'assessments', id);
        updateDocumentNonBlocking(docRef, { status: newStatus });
        toast({
            title: 'Statut mis à jour',
            description: `Le statut de la soumission a été changé à "${newStatus}".`,
        });
    }
  }

  const handleDelete = (id: string) => {
      if(firestore) {
          const docRef = doc(firestore, 'assessments', id);
          deleteDocumentNonBlocking(docRef);
          toast({
              variant: 'destructive',
              title: 'Achat supprimé',
              description: `L'enregistrement de l'achat a été supprimé.`,
          })
      }
  }
  
  const sortedAssessments = React.useMemo(() => {
    if (!assessments) return [];
    return [...assessments].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  }, [assessments]);


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Achats de Véhicules</h2>
          <p className="text-muted-foreground">
            Suivi de tous les véhicules pour lesquels une offre a été acceptée.
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          {isFirebaseLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-4">Chargement des achats...</p>
            </div>
          )}

          {error && (
             <Alert variant="destructive">
                <AlertTitle>Erreur de base de données</AlertTitle>
                <AlertDescription>
                    <p>Impossible de charger les données :</p>
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
                  <TableHead>Date d'Achat</TableHead>
                  <TableHead>Prix d'Achat</TableHead>
                  <TableHead>Remorqueur</TableHead>
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
                        <div className="text-sm text-muted-foreground">{assessment.client?.email}</div>
                      </TableCell>
                       <TableCell>
                         <div className="font-medium">{assessment.vehicle?.make} {assessment.vehicle?.model} ({assessment.vehicle?.year})</div>
                         <div className="text-sm text-muted-foreground">{assessment.vehicle?.transmission}</div>
                       </TableCell>
                       <TableCell>
                        {assessment.createdAt ? new Date(assessment.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </TableCell>
                       <TableCell className="font-medium">
                        {assessment.valuation ? `$${assessment.valuation.finalPrice.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell>{assessment.yard?.yard_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={assessment.status === 'Terminé' ? 'default' : 'secondary'} className={assessment.status !== 'Terminé' ? 'bg-orange-400 text-white' : 'bg-green-600'}>
                          {assessment.status || 'En attente'}
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
                              <DropdownMenuItem onClick={() => handleUpdateStatus(assessment.id!, 'Terminé')}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Marquer comme "Terminé"
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(assessment.id!)}>
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
                    <TableCell colSpan={7} className="text-center h-24">
                      Aucun achat trouvé.
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

export default AdminPurchasesPage;
