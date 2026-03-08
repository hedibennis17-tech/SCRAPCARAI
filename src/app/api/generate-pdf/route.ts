import { NextResponse } from 'next/server';
import type { Assessment } from '@/types';

export async function POST(request: Request) {
  try {
    const { assessment, orderType }: { assessment: Assessment; orderType: 'PO' | 'DO' } = await request.json();

    if (!assessment || !orderType) {
      return NextResponse.json({ ok: false, error: 'Missing assessment or orderType' }, { status: 400 });
    }

    const orderNumber = orderType === 'PO'
      ? assessment.summary?.purchaseOrder
      : assessment.summary?.deliveryOrder;

    const client = assessment.client;
    const vehicle = assessment.vehicle;
    const towing = assessment.towing;
    const yard = assessment.yard;
    const valuation = assessment.valuation;

    const pickupDate = towing?.pickupDate
      ? new Date(towing.pickupDate).toLocaleDateString('fr-CA')
      : 'N/A';

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
  h1 { color: #1a1a2e; border-bottom: 3px solid #e63946; padding-bottom: 10px; }
  h2 { color: #1a1a2e; margin-top: 30px; border-left: 4px solid #e63946; padding-left: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  td:first-child { font-weight: bold; color: #555; width: 40%; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
  .logo { font-size: 24px; font-weight: bold; color: #e63946; }
  .order-badge { background: #1a1a2e; color: white; padding: 8px 20px; border-radius: 8px; font-size: 18px; font-weight: bold; }
  .price { font-size: 28px; font-weight: bold; color: #e63946; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px 0; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">🚗 SCRAP CAR AI</div>
  <div class="order-badge">${orderType} — ${orderNumber}</div>
</div>
<p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-CA')}</p>

<div class="price">
  Offre finale : $${valuation?.finalPrice?.toFixed(2) || 'N/A'}
</div>

<h2>Informations Client</h2>
<table>
  <tr><td>Nom</td><td>${client?.name || 'N/A'}</td></tr>
  <tr><td>Courriel</td><td>${client?.email || 'N/A'}</td></tr>
  <tr><td>Téléphone</td><td>${client?.phone || 'N/A'}</td></tr>
  <tr><td>Adresse</td><td>${client?.address || ''}, ${client?.city || ''}, ${client?.province || ''} ${client?.postalCode || ''}</td></tr>
</table>

<h2>Détails du Véhicule</h2>
<table>
  <tr><td>Véhicule</td><td>${vehicle?.year || ''} ${vehicle?.make || ''} ${vehicle?.model || ''}</td></tr>
  <tr><td>NIV</td><td>${vehicle?.vin || 'N/A'}</td></tr>
  <tr><td>Kilométrage</td><td>${vehicle?.mileage ? vehicle.mileage.toLocaleString() + ' km' : 'N/A'}</td></tr>
  <tr><td>Transmission</td><td>${vehicle?.transmission || 'N/A'}</td></tr>
  <tr><td>Traction</td><td>${vehicle?.driveline || 'N/A'}</td></tr>
  <tr><td>Type</td><td>${vehicle?.vehicleType || 'N/A'}</td></tr>
</table>

<h2>Remorquage & Rendez-vous</h2>
<table>
  <tr><td>Date de cueillette</td><td>${pickupDate}</td></tr>
  <tr><td>Plage horaire</td><td>${towing?.pickupTimeSlot || 'N/A'}</td></tr>
  <tr><td>Emplacement</td><td>${towing?.parkingLocation || 'N/A'}</td></tr>
  <tr><td>Cour assignée</td><td>${yard?.yard_name || 'N/A'}</td></tr>
  <tr><td>Adresse cour</td><td>${yard?.contact?.address || 'N/A'}</td></tr>
  <tr><td>Téléphone cour</td><td>${yard?.contact?.phone || 'N/A'}</td></tr>
</table>

<h2>Numéros de Référence</h2>
<table>
  <tr><td>Bon de commande (PO)</td><td>${assessment.summary?.purchaseOrder || 'N/A'}</td></tr>
  <tr><td>Bon de livraison (DO)</td><td>${assessment.summary?.deliveryOrder || 'N/A'}</td></tr>
</table>

<div class="footer">
  Document généré le ${new Date().toLocaleString('fr-CA')} — SCRAP CAR AI — Tous droits réservés
</div>
</body>
</html>`;

    return NextResponse.json({
      ok: true,
      fileName: `${orderType}_${orderNumber}.pdf`,
      html: htmlContent,
      orderNumber,
    });
  } catch (err: any) {
    console.error('Error in /api/generate-pdf:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Unknown error' }, { status: 500 });
  }
}
