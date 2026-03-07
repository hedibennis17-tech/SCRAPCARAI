
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import type { Assessment } from '@/types';
import { Loader2, DollarSign, Car, Users, Truck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query } from 'firebase/firestore';


function groupAssessmentsByClient(assessments: Assessment[]) {
  if (!assessments) return [];
  const clientsMap = new Map<string, { status: 'Terminé' | 'En attente' }>();

  assessments.forEach(assessment => {
    if (!assessment.client?.email) return;
    let client = clientsMap.get(assessment.client.email);
    if (!client) {
      client = { status: 'En attente' };
    }
    if (assessment.summary?.purchaseOrder || assessment.summary?.deliveryOrder) {
      client.status = 'Terminé';
    }
    clientsMap.set(assessment.client.email, client);
  });
  return Array.from(clientsMap.values());
}


function AdminReportsPage() {
  const { firestore } = useFirebase();
  const assessmentsQuery = firestore ? query(collection(firestore, 'assessments')) : null;
  const [assessmentsSnapshot, isFirebaseLoading, error] = useCollection(assessmentsQuery);

  const assessments = useMemo(() => {
    if (!assessmentsSnapshot) return [];
    return assessmentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Assessment[];
  }, [assessmentsSnapshot]);

  
  const stats = useMemo(() => {
    if (!assessments) return null;

    const totalRevenue = assessments.reduce((acc, q) => acc + (q.valuation?.finalPrice || 0), 0);
    const vehiclesPurchased = assessments.filter(q => q.summary).length;
    const uniqueClients = new Set(assessments.map(q => q.client?.email)).size;
    const towingsScheduled = assessments.filter(q => q.towing?.pickupDate).length;
    
    // Data for monthly chart
    const monthlyData = assessments.reduce((acc, q) => {
        if(q.createdAt) {
            const date = new Date(q.createdAt.seconds * 1000);
            const month = date.toLocaleString('fr-CA', { month: 'short', year: 'numeric' });
            if (!acc[month]) {
                acc[month] = { name: month.charAt(0).toUpperCase() + month.slice(1), total: 0 };
            }
            acc[month].total += 1;
        }
        return acc;
    }, {} as {[key: string]: {name: string, total: number}});

    const monthlyChartData = Object.values(monthlyData).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    
    // Data for client status chart
    const clientData = groupAssessmentsByClient(assessments);
    const statusCounts = clientData.reduce((acc, client) => {
        acc[client.status] = (acc[client.status] || 0) + 1;
        return acc;
    }, {} as Record<'Terminé' | 'En attente', number>);

    const statusChartData = [
        { name: 'Terminé', value: statusCounts['Terminé'] || 0, fill: 'hsl(var(--primary))' },
        { name: 'En attente', value: statusCounts['En attente'] || 0, fill: 'hsl(var(--muted-foreground))' },
    ]

    return {
      totalRevenue,
      vehiclesPurchased,
      uniqueClients,
      towingsScheduled,
      monthlyChartData,
      statusChartData
    };
  }, [assessments]);

  const barChartConfig = {
      total: {
          label: 'Véhicules',
          color: 'hsl(var(--primary))'
      }
  } satisfies ChartConfig;

   const pieChartConfig = {
    Terminé: {
      label: 'Terminé',
      color: 'hsl(var(--primary))',
    },
    'En attente': {
      label: 'En attente',
      color: 'hsl(var(--muted-foreground))',
    },
  } satisfies ChartConfig;

  return (
    <div>
        <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Rapports Intelligents</h2>
            <p className="text-muted-foreground">Analyse et aperçu de vos activités commerciales.</p>
        </div>

        {isFirebaseLoading && (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-4">Chargement des rapports...</p>
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

        {!isFirebaseLoading && stats && (
            <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Chiffre d'affaires total</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString('fr-CA', { maximumFractionDigits: 0 })}</div>
                             <p className="text-xs text-muted-foreground">Basé sur les offres acceptées</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Véhicules Achetés</CardTitle>
                            <Car className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.vehiclesPurchased}</div>
                             <p className="text-xs text-muted-foreground">Nombre total de soumissions complétées</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Clients Uniques</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.uniqueClients}</div>
                             <p className="text-xs text-muted-foreground">Nombre de clients distincts</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Remorquages Planifiés</CardTitle>
                            <Truck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.towingsScheduled}</div>
                            <p className="text-xs text-muted-foreground">Rendez-vous de remorquage à venir</p>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Charts */}
                <div className="grid gap-6 md:grid-cols-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Achats par mois</CardTitle>
                            <CardDescription>Nombre de véhicules achetés chaque mois.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                                <BarChart accessibilityLayer data={stats.monthlyChartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                    />
                                    <YAxis />
                                    <Tooltip cursor={false} content={<ChartTooltipContent />} />
                                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Statut des clients</CardTitle>
                            <CardDescription>Répartition des clients avec une soumission terminée ou en attente.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                                    <Pie data={stats.statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {stats.statusChartData.map((entry) => (
                                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}
    </div>
  );
}

export default AdminReportsPage;
