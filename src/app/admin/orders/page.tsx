
'use client';

import React, { useMemo, useState } from 'react';
import type { Assessment } from '@/types';
import { Loader2, MoreHorizontal, ArrowUpDown, Download, Search, CheckCircle, Trash2, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { generateOrderPdf } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

type OrderType = 'PO' | 'DO';
type SortKey = 'pickupDate' | 'orderNumber';


function AdminOrdersPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [orderType, setOrderType] = useState<OrderType>('PO');
    const [sortKey, setSortKey] = useState<SortKey>('pickupDate');
    const [searchTerm, setSearchTerm] = useState('');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const assessmentsQuery = firestore ? query(collection(firestore, 'assessments'), where('summary', '!=', null)) : null;
    const [assessmentsSnapshot, isFirebaseLoading, error] = useCollection(assessmentsQuery);

    const assessments = useMemo(() => {
        if (!assessmentsSnapshot) return [];
        return assessmentsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id})) as Assessment[];
    }, [assessmentsSnapshot]);


    const filteredAndSortedAssessments = useMemo(() => {
        if (!assessments) return [];
        
        let filtered = assessments.filter(q => q.summary && (q.summary.purchaseOrder || q.summary.deliveryOrder));
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(q => 
                q.client?.name?.toLowerCase().includes(lowercasedTerm) ||
                q.client?.email?.toLowerCase().includes(lowercasedTerm) ||
                q.client?.phone?.includes(lowercasedTerm) ||
                q.summary?.purchaseOrder?.toLowerCase().includes(lowercasedTerm) ||
                q.summary?.deliveryOrder?.toLowerCase().includes(lowercasedTerm)
            );
        }

        return filtered.sort((a, b) => {
             const aDate = a.towing?.pickupDate ? new Date(a.towing.pickupDate).getTime() : 0;
             const bDate = b.towing?.pickupDate ? new Date(b.towing.pickupDate).getTime() : 0;
             const aOrder = (orderType === 'PO' ? a.summary?.purchaseOrder : a.summary?.deliveryOrder) || '';
             const bOrder = (orderType === 'PO' ? b.summary?.purchaseOrder : b.summary?.deliveryOrder) || '';

            if (sortKey === 'pickupDate') {
                return bDate - aDate; // Desc
            }
            if (sortKey === 'orderNumber') {
                return bOrder.localeCompare(aOrder);
            }
            return 0;
        });

    }, [assessments, orderType, sortKey, searchTerm]);

    const handleDownloadPdf = async (assessment: Assessment, orderType: OrderType) => {
        setIsGeneratingPdf(true);
        try {
            const { fileName, data } = await generateOrderPdf(assessment, orderType);
            const link = document.createElement('a');
            link.href = data;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: 'PDF Téléchargé', description: `${fileName} a été téléchargé.` });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast({ variant: 'destructive', title: 'Erreur PDF', description: 'La génération du PDF a échoué.' });
        } finally {
            setIsGeneratingPdf(false);
        }
    };


    return (
        <Card>
            <CardHeader className="px-7">
                <CardTitle>Dossiers d'ordres</CardTitle>
                <CardDescription>Gérez vos bons de commande (PO) et bons de livraison (DO).</CardDescription>
                 <div className="flex items-center justify-between gap-4 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                            />
                        </div>
                        <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Type d'ordre" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PO">Purchase Orders (PO)</SelectItem>
                                <SelectItem value="DO">Delivery Orders (DO)</SelectItem>
                            </SelectContent>
                        </Select>
                         <Button variant="outline" size="sm" onClick={() => setSortKey('pickupDate')} disabled={sortKey==='pickupDate'}>
                            <ArrowUpDown className="mr-2 h-4 w-4" /> Trier par Date
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSortKey('orderNumber')} disabled={sortKey==='orderNumber'}>
                            <ArrowUpDown className="mr-2 h-4 w-4" /> Trier par N° d'Ordre
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isFirebaseLoading && (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="ml-4">Chargement des ordres...</p>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Erreur de base de données</AlertTitle>
                        <AlertDescription>
                            <p>Impossible de charger les données: {error.message}</p>
                        </AlertDescription>
                    </Alert>
                )}

                {!isFirebaseLoading && !error && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>N° d'Ordre ({orderType})</TableHead>
                                <TableHead>Date Ramassage</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Véhicule</TableHead>
                                <TableHead>Offre</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedAssessments.length > 0 ? (
                                filteredAndSortedAssessments.map((assessment) => (
                                    <TableRow key={assessment.id}>
                                        <TableCell className="font-mono">{orderType === 'PO' ? assessment.summary?.purchaseOrder : assessment.summary?.deliveryOrder}</TableCell>
                                        <TableCell>{assessment.towing?.pickupDate ? new Date(assessment.towing.pickupDate).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{assessment.client?.name}</div>
                                            <div className="text-xs text-muted-foreground">{assessment.client?.email}</div>
                                            <div className="text-xs text-muted-foreground">{assessment.client?.phone}</div>
                                        </TableCell>
                                        <TableCell>{assessment.vehicle?.make} {assessment.vehicle?.model} ({assessment.vehicle?.year})</TableCell>
                                        <TableCell className="font-medium">${assessment.valuation?.finalPrice.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant={"secondary"} className='bg-blue-500 text-white'>Planifié</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleDownloadPdf(assessment, orderType)} disabled={isGeneratingPdf}>
                                                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                                        Télécharger PDF
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <CheckCircle className="mr-2 h-4 w-4" /> Marquer comme terminé
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">
                                        <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                                            <FileText className="h-8 w-8" />
                                            Aucun ordre trouvé.
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export default AdminOrdersPage;
