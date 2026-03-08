'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Car, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { updateDoc, doc } from 'firebase/firestore';

const STATUS_OPTIONS = ['pending_pickup','picked_up','at_yard','processed','sold'];
const STATUS_LABELS: Record<string, string> = {
  pending_pickup: 'En attente',
  picked_up: 'Ramassé',
  at_yard: 'Au yard',
  processed: 'Traité',
  sold: 'Vendu',
};
const STATUS_COLORS: Record<string, string> = {
  pending_pickup: 'bg-amber-500 text-white',
  picked_up: 'bg-blue-500 text-white',
  at_yard: 'bg-purple-600 text-white',
  processed: 'bg-green-600 text-white',
  sold: 'bg-gray-600 text-white',
};

function AdminVehiclesPage() {
  const { firestore } = useFirebase();
  const [sortAsc, setSortAsc] = useState(false);

  const q = firestore ? query(collection(firestore, 'vehicles'), orderBy('createdAt', 'desc')) : null;
  const [snap, loading, error] = useCollection(q);

  const vehicles = useMemo(() => {
    if (!snap) return [];
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  }, [snap]);

  const updateStatus = async (id: string, status: string) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'vehicles', id), { status, updatedAt: new Date() });
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Car className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Véhicules</h2>
          <p className="text-muted-foreground">Inventaire complet avec état et progression.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
          {error && <p className="text-destructive p-6">{error.message}</p>}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>NIV / VIN</TableHead>
                  <TableHead>Kilométrage</TableHead>
                  <TableHead>Pièces présentes</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead>Offre</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">Aucun véhicule enregistré.</TableCell></TableRow>
                )}
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.year} {v.make} {v.model}</div>
                      <div className="text-xs text-muted-foreground">{v.vehicleType}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{v.vin ?? 'N/A'}</TableCell>
                    <TableCell className="text-sm">{v.mileage ? `${v.mileage} km` : 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {['Catalyst','Engine','Transmission','Battery','Wheels'].map(part => (
                          <Badge key={part} variant={v.missingParts?.includes(part) ? 'destructive' : 'secondary'} className="text-xs px-1">
                            {part}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div>{v.runs ? '✅ Démarre' : '❌ Ne démarre pas'}</div>
                        {v.accident && <div>⚠️ Accidenté</div>}
                        {v.hasRust && <div>🔴 Rouille</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {v.photos?.length > 0
                        ? <span className="text-xs text-primary">{v.photos.length} photo(s)</span>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {v.finalPrice ? `$${Number(v.finalPrice).toFixed(2)}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <select
                        className="text-xs rounded border bg-background px-2 py-1 cursor-pointer"
                        value={v.status ?? 'pending_pickup'}
                        onChange={e => updateStatus(v.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminVehiclesPage;
