'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, MapPin, Clock, Phone } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { updateDoc, doc } from 'firebase/firestore';

const STATUS_COLORS: Record<string, string> = {
  scheduled:  'bg-blue-500 text-white',
  in_transit: 'bg-amber-500 text-white',
  completed:  'bg-green-600 text-white',
  cancelled:  'bg-red-600 text-white',
};

function AdminTowingPage() {
  const { firestore } = useFirebase();

  const q = firestore ? query(collection(firestore, 'towing_dispatches'), orderBy('createdAt', 'desc')) : null;
  const [snap, loading, error] = useCollection(q);

  const dispatches = useMemo(() => {
    if (!snap) return [];
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  }, [snap]);

  const updateStatus = async (id: string, status: string) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'towing_dispatches', id), { status, updatedAt: new Date() });
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Truck className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Towing & Dispatch</h2>
          <p className="text-muted-foreground">Feuilles de route et statuts de remorquage en temps réel.</p>
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
                  <TableHead>PO / DO</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead><MapPin className="inline h-4 w-4 mr-1" />Adresse</TableHead>
                  <TableHead><Clock className="inline h-4 w-4 mr-1" />Date & Heure</TableHead>
                  <TableHead>Cour</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatches.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">Aucune dispatch enregistrée.</TableCell></TableRow>
                )}
                {dispatches.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">
                      <div>{d.purchaseOrder}</div>
                      <div className="text-muted-foreground">{d.deliveryOrder}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{d.clientName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{d.clientPhone}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{d.vehicleSummary}<div className="text-xs text-muted-foreground">{d.vehicleVin}</div></TableCell>
                    <TableCell className="text-sm max-w-[160px]">
                      <div>{d.pickupAddress}</div>
                      <div className="text-xs text-muted-foreground">{d.parkingLocation}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{d.pickupDate ? new Date(d.pickupDate).toLocaleDateString() : 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{d.pickupTimeSlot}</div>
                    </TableCell>
                    <TableCell className="text-xs">{d.yardName}<div className="text-muted-foreground">{d.yardPhone}</div></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 text-xs">
                        {!d.allWheels  && <Badge variant="destructive" className="text-xs px-1">No Wheels</Badge>}
                        {d.flatTires   && <Badge variant="destructive" className="text-xs px-1">Flat</Badge>}
                        {d.blocked     && <Badge variant="destructive" className="text-xs px-1">Bloqué</Badge>}
                        {!d.hasKeys    && <Badge variant="secondary"   className="text-xs px-1">No Keys</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        className="text-xs rounded border bg-background px-2 py-1 cursor-pointer"
                        value={d.status ?? 'scheduled'}
                        onChange={(e) => updateStatus(d.id, e.target.value)}
                      >
                        <option value="scheduled">Planifié</option>
                        <option value="in_transit">En route</option>
                        <option value="completed">Complété</option>
                        <option value="cancelled">Annulé</option>
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

export default AdminTowingPage;
