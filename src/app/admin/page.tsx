
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Assessment } from '@/types';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';


function AdminDashboard() {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  
  const assessmentsQuery = firestore ? query(collection(firestore, 'assessments'), orderBy('createdAt', 'desc')) : null;
  const [assessmentsSnapshot, isFirebaseLoading, error] = useCollection(assessmentsQuery);

  const allAssessments = useMemo(() => {
    if (!assessmentsSnapshot) return [];
    return assessmentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Assessment[];
  }, [assessmentsSnapshot]);


  const filteredAssessments = useMemo(() => {
    if (!allAssessments) return [];
    if (!searchTerm) return allAssessments;

    const lowercasedTerm = searchTerm.toLowerCase();
    return allAssessments.filter(assessment => 
      assessment.client?.name?.toLowerCase().includes(lowercasedTerm) ||
      assessment.client?.email?.toLowerCase().includes(lowercasedTerm) ||
      assessment.vehicle?.make?.toLowerCase().includes(lowercasedTerm) ||
      assessment.vehicle?.model?.toLowerCase().includes(lowercasedTerm)
    );
  }, [searchTerm, allAssessments]);


  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                  <CardTitle>Dernières soumissions</CardTitle>
                  <CardDescription>
                    Voici la liste des dernières évaluations de véhicules reçues.
                  </CardDescription>
              </div>
              <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Rechercher par client, email, véhicule..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 sm:w-[300px]"
                  />
              </div>
          </div>
        </CardHeader>
        <CardContent>
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
                  <TableHead>Offre</TableHead>
                  <TableHead>Date de soumission</TableHead>
                  <TableHead>Date de ramassage</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssessments && filteredAssessments.length > 0 ? (
                  filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell>
                        <div className="font-medium">{assessment.client?.name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{assessment.client?.email || 'N/A'}</div>
                      </TableCell>
                      <TableCell>{assessment.vehicle?.make || ''} {assessment.vehicle?.model || ''} ({assessment.vehicle?.year || 'N/A'})</TableCell>
                       <TableCell className="font-medium">
                        {assessment.valuation?.finalPrice ? `$${assessment.valuation.finalPrice.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {assessment.createdAt ? new Date(assessment.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {assessment.towing?.pickupDate ? new Date(assessment.towing.pickupDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                         <Badge variant={assessment.summary?.purchaseOrder ? 'default' : 'secondary'} className={!assessment.summary?.purchaseOrder ? 'bg-orange-400 text-white' : ''}>
                          {assessment.summary?.purchaseOrder ? 'Accepté' : 'En attente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      {searchTerm ? `Aucune soumission trouvée pour "${searchTerm}".` : "Aucune soumission pour le moment."}
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

export default AdminDashboard;
