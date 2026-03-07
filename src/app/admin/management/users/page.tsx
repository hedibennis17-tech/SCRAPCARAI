
'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Assessment } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function UserManagementPage() {
  const { firestore } = useFirebase();
  const assessmentsQuery = firestore ? query(collection(firestore, 'assessments'), orderBy('createdAt', 'desc')) : null;
  const [assessmentsSnapshot, isFirebaseLoading, error] = useCollection(assessmentsQuery);

  const users = useMemo(() => {
    if (!assessmentsSnapshot) return [];
    
    // Create a map to store the latest assessment for each unique user (by email)
    const userMap = new Map<string, Assessment>();
    
    assessmentsSnapshot.docs.forEach(doc => {
      const assessment = { ...doc.data(), id: doc.id } as Assessment;
      const email = assessment.client?.email;
      if (email && !userMap.has(email)) {
        userMap.set(email, assessment);
      }
    });

    return Array.from(userMap.values());
  }, [assessmentsSnapshot]);


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h2>
          <p className="text-muted-foreground">Créez, modifiez et gérez les comptes utilisateurs.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isFirebaseLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-4">Chargement des utilisateurs...</p>
            </div>
          )}

          {error && (
             <Alert variant="destructive">
                <AlertTitle>Erreur de base de données</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {!isFirebaseLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date d'inscription</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.client?.name || 'N/A'}</TableCell>
                      <TableCell>{user.client?.email || 'N/A'}</TableCell>
                      <TableCell>
                        {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.summary?.purchaseOrder ? 'default' : 'secondary'} className={!user.summary?.purchaseOrder ? 'bg-orange-400 text-white' : 'bg-green-600'}>
                            {user.summary?.purchaseOrder ? 'Terminé' : 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>Modifier</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Aucun utilisateur trouvé.
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

export default UserManagementPage;
