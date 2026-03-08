'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, FolderOpen, FileText, Download, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function AdminFilesPage() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');

  const q = firestore ? query(collection(firestore, 'transactions'), orderBy('createdAt', 'desc')) : null;
  const [snap, loading, error] = useCollection(q);

  const transactions = useMemo(() => {
    if (!snap) return [];
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  }, [snap]);

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const s = search.toLowerCase();
    return transactions.filter(t =>
      t.clientName?.toLowerCase().includes(s) ||
      t.purchaseOrder?.toLowerCase().includes(s) ||
      t.vehicleMake?.toLowerCase().includes(s)
    );
  }, [transactions, search]);

  const downloadSummary = (t: any) => {
    const doc = new jsPDF();
    doc.setFillColor(192, 48, 63);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SCRAP CAR AI — DOSSIER', 14, 18);
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: 34,
      head: [['DOSSIER', '']],
      body: [
        ['PO', t.purchaseOrder ?? 'N/A'],
        ['DO', t.deliveryOrder ?? 'N/A'],
        ['Client', t.clientName ?? 'N/A'],
        ['Email', t.clientEmail ?? 'N/A'],
        ['Téléphone', t.clientPhone ?? 'N/A'],
        ['Adresse', t.clientAddress ?? 'N/A'],
        ['Véhicule', `${t.vehicleYear ?? ''} ${t.vehicleMake ?? ''} ${t.vehicleModel ?? ''}`],
        ['NIV', t.vehicleVin ?? 'N/A'],
        ['Kilométrage', t.vehicleMileage ? `${t.vehicleMileage} km` : 'N/A'],
        ['Offre finale', t.finalPrice ? `$${t.finalPrice}` : 'N/A'],
        ['Date de cueillette', t.pickupDate ? new Date(t.pickupDate).toLocaleDateString() : 'N/A'],
        ['Cour assignée', t.yardName ?? 'N/A'],
        ['Statut', t.status ?? 'N/A'],
      ],
      headStyles: { fillColor: [40, 40, 50] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });
    doc.save(`Dossier_${t.purchaseOrder ?? t.id}.pdf`);
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <FolderOpen className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dossiers</h2>
          <p className="text-muted-foreground">Tous les dossiers de transactions — téléchargeables en PDF.</p>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Chercher par client, PO, véhicule..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
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
                  <TableHead>Offre</TableHead>
                  <TableHead>Cueillette</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Aucun dossier trouvé.</TableCell></TableRow>
                )}
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">
                      <div>{t.purchaseOrder}</div>
                      <div className="text-muted-foreground">{t.deliveryOrder}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{t.clientName}</div>
                      <div className="text-xs text-muted-foreground">{t.clientEmail}</div>
                    </TableCell>
                    <TableCell className="text-sm">{t.vehicleYear} {t.vehicleMake} {t.vehicleModel}<div className="text-xs text-muted-foreground">{t.vehicleVin}</div></TableCell>
                    <TableCell className="font-medium text-green-600">{t.finalPrice ? `$${Number(t.finalPrice).toFixed(2)}` : 'N/A'}</TableCell>
                    <TableCell className="text-sm">{t.pickupDate ? new Date(t.pickupDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={t.status === 'confirmed' ? 'bg-green-600 text-white' : 'bg-orange-400 text-white'}>
                        {t.status ?? 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => downloadSummary(t)}>
                        <Download className="h-3 w-3 mr-1" />PDF
                      </Button>
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

export default AdminFilesPage;
