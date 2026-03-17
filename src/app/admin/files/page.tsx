'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Search, Download, Mail, Check, X } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── PDF builder ───────────────────────────────────────────────────────────────
async function buildFullPdf(t: any, orderType: 'PO' | 'DO'): Promise<jsPDF> {
  const doc = new jsPDF();
  const orderNumber = orderType === 'PO' ? t.purchaseOrder : t.deliveryOrder;

  /* ── HEADER ── */
  doc.setFillColor(192, 48, 63);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('SCRAP CAR AI', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text("Système d'évaluation et de rachat de véhicules", 14, 20);
  doc.setFillColor(30, 30, 45);
  doc.roundedRect(118, 5, 78, 20, 3, 3, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(orderType === 'PO' ? 'BON DE COMMANDE' : 'BON DE LIVRAISON', 157, 14, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${orderType} — ${orderNumber ?? 'N/A'}`, 157, 22, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  /* ── REFERENCES BOX ── */
  const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : (t.createdAt ? new Date(t.createdAt) : new Date());
  const pickupDate = t.pickupDate ? new Date(t.pickupDate) : null;

  doc.setFillColor(248, 249, 250);
  doc.rect(14, 34, 182, 30, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(14, 34, 182, 30, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  const c1 = 18, c2 = 78, c3 = 138;
  doc.text('N° Commande (PO):', c1, 41); doc.text('Date Création:', c2, 41); doc.text('Cour assignée:', c3, 41);
  doc.text('N° Livraison (DO):', c1, 50); doc.text('Date Ramassage:', c2, 50); doc.text('Statut:', c3, 50);
  doc.text('N° Transaction:', c1, 59); doc.text('Type:', c2, 59);

  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
  doc.text(t.purchaseOrder ?? 'N/A', c1 + 36, 41);
  doc.text(t.deliveryOrder ?? 'N/A', c1 + 36, 50);
  doc.text(t.assessmentId ?? t.id ?? 'N/A', c1 + 36, 59);

  doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 120, 60);
  doc.text(createdAt.toLocaleDateString('fr-CA'), c2 + 30, 41);
  doc.text(pickupDate ? pickupDate.toLocaleDateString('fr-CA') : 'N/A', c2 + 32, 50);
  doc.setTextColor(192, 48, 63);
  const transType = t.towingDistance ? 'RAMASSAGE (Remorquage gratuit)' : 'DÉPÔT (Drop-off)';
  doc.text(transType, c2 + 12, 59);

  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
  doc.text(t.yardName ?? 'N/A', c3 + 26, 41);
  doc.text(t.status ?? 'confirmed', c3 + 14, 50);

  /* ── CLIENT + VÉHICULE côte à côte ── */
  const fullAddr = [t.clientAddress, t.clientCity, t.clientProvince, t.clientPostal].filter(Boolean).join(', ');
  autoTable(doc, {
    startY: 68, tableWidth: 88, margin: { left: 14 },
    head: [['CLIENT', '']], body: [
      ['Nom', t.clientName ?? 'N/A'], ['Téléphone', t.clientPhone ?? 'N/A'],
      ['Email', t.clientEmail ?? 'N/A'], ['Adresse', fullAddr || 'N/A'],
    ],
    headStyles: { fillColor: [30, 30, 45], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 26, fontSize: 8, textColor: [80, 80, 80] }, 1: { fontSize: 8 } },
    styles: { cellPadding: 2 },
  });

  autoTable(doc, {
    startY: 68, tableWidth: 88, margin: { left: 108 },
    head: [['VÉHICULE', '']], body: [
      ['Marque/Modèle', `${t.vehicleMake ?? ''} ${t.vehicleModel ?? ''}`],
      ['Année', String(t.vehicleYear ?? 'N/A')],
      ['VIN', t.vehicleVin ?? 'N/A'],
      ['Kilométrage', t.vehicleMileage ? `${Number(t.vehicleMileage).toLocaleString('fr-CA')} km` : 'N/A'],
      ['Transmission', t.vehicleTransmission ?? 'N/A'],
      ['Traction', t.vehicleDriveline ?? 'N/A'],
      ['Type', t.vehicleType ?? 'N/A'],
      ['Plaque', t.vehiclePlate ?? 'N/A'],
    ],
    headStyles: { fillColor: [192, 48, 63], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28, fontSize: 8, textColor: [80, 80, 80] }, 1: { fontSize: 8 } },
    styles: { cellPadding: 2 },
  });

  const nextY = Math.max((doc as any).lastAutoTable?.finalY ?? 140) + 4;

  /* ── CONDITION + REMORQUAGE côte à côte ── */
  const mp = Array.isArray(t.conditionMissingParts) ? t.conditionMissingParts.join(', ') || 'Aucune' : 'Aucune';
  autoTable(doc, {
    startY: nextY, tableWidth: 88, margin: { left: 14 },
    head: [['CONDITION DU VÉHICULE', '']], body: [
      ['Roule', t.conditionRuns ? 'Oui' : 'Non'],
      ['Accidenté', t.conditionAccident ? 'Oui' : 'Non'],
      ['Pièces Manquantes', mp],
      ['Rouille', t.conditionHasRust ? `Oui — ${t.conditionRustDetails ?? ''}` : 'Non'],
      ['Carrosserie', t.conditionHasBodyDamage ? `Oui — ${t.conditionBodyDamage ?? ''}` : 'Non'],
      ['Mécanique', t.conditionHasMechanical ? `Oui — ${t.conditionMechanical ?? ''}` : 'Non'],
      ['Complète', t.conditionIsComplete === false ? `Non — ${t.conditionIncomplete ?? ''}` : 'Oui'],
    ],
    headStyles: { fillColor: [5, 100, 70], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28, fontSize: 8, textColor: [80, 80, 80] }, 1: { fontSize: 8 } },
    styles: { cellPadding: 2 },
  });

  autoTable(doc, {
    startY: nextY, tableWidth: 88, margin: { left: 108 },
    head: [['INFORMATIONS DE REMORQUAGE', '']], body: [
      ['Adresse ramassage', t.pickupAddress ?? 'N/A'],
      ['Lieu', t.parkingLocation ?? 'N/A'],
      ['Horaire', pickupDate ? `${pickupDate.toLocaleDateString('fr-CA')} ${t.pickupTimeSlot ?? ''}` : 'N/A'],
      ['Distance', t.towingDistance ?? 'N/A'],
      ['Durée estimée', t.towingDuration ?? 'N/A'],
      ['Toutes roues au sol', t.towingAllWheels ? 'Oui' : 'Non'],
      ['Pneus crevés', t.towingFlatTires ? 'Oui' : 'Non'],
      ['Clés disponibles', t.towingHasKeys ? 'Oui' : 'Non'],
      ['Bloqué', t.towingBlocked ? 'Oui' : 'Non'],
      ['Destination', t.yardName ? `Kenny U-Pull ${t.yardName}` : 'N/A'],
    ],
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30, fontSize: 8, textColor: [80, 80, 80] }, 1: { fontSize: 8 } },
    styles: { cellPadding: 2 },
  });

  const afterSectY = Math.max((doc as any).lastAutoTable?.finalY ?? 220) + 4;

  /* ── COUR ASSIGNÉE ── */
  if (t.yardName) {
    autoTable(doc, {
      startY: afterSectY, tableWidth: 182, margin: { left: 14 },
      head: [['COUR ASSIGNÉE', '']], body: [
        ['Cour', t.yardName ?? 'N/A'], ['Adresse', t.yardAddress ?? 'N/A'],
        ['Téléphone', t.yardPhone ?? 'N/A'], ['Email', t.yardEmail ?? 'N/A'],
      ],
      headStyles: { fillColor: [80, 30, 100], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, fontSize: 8, textColor: [80, 80, 80] }, 1: { fontSize: 8 } },
      styles: { cellPadding: 2 },
    });
  }

  /* ── PHOTOS (PO seulement) ── */
  const photos: string[] = (t.photoUrls ?? []).filter((p: string) => p && (p.startsWith('http') || p.startsWith('data:')));
  if (orderType === 'PO' && photos.length > 0) {
    const sY = ((doc as any).lastAutoTable?.finalY ?? 240) + 6;
    const pH = doc.internal.pageSize.height;
    const headerY = sY + 10 > pH - 30 ? (() => { doc.addPage(); return 14; })() : sY;

    doc.setFillColor(30, 30, 45);
    doc.rect(14, headerY, 182, 8, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text('PHOTOS DU VÉHICULE', 17, headerY + 5.5);
    doc.setTextColor(0, 0, 0);

    const loadImg = async (url: string): Promise<string> => {
      if (url.startsWith('data:')) return url;
      try {
        const r = await fetch(`/api/img-proxy?url=${encodeURIComponent(url)}`);
        const j = await r.json();
        if (j.ok && j.dataUri) return j.dataUri;
      } catch (_) { /* fall through */ }
      return '';
    };

    let px = 14, py = headerY + 11;
    const iw = 57, ih = 44, gap = 4;
    for (let i = 0; i < Math.min(photos.length, 9); i++) {
      if (px + iw > 196) { px = 14; py += ih + gap; }
      if (py + ih > pH - 14) { doc.addPage(); px = 14; py = 14; }
      try {
        const imgData = await loadImg(photos[i]);
        if (imgData) doc.addImage(imgData, 'JPEG', px, py, iw, ih);
      } catch (_) { /* skip */ }
      px += iw + gap;
    }
  }

  /* ── OFFRE FINALE ── */
  const bannerSrcY = ((doc as any).lastAutoTable?.finalY ?? 240) + 8;
  const pH2 = doc.internal.pageSize.height;
  if (bannerSrcY + 24 > pH2 - 14) doc.addPage();
  const bY = bannerSrcY + 24 > pH2 - 14 ? 14 : bannerSrcY;
  doc.setFillColor(22, 163, 74);
  doc.roundedRect(14, bY, 182, 22, 4, 4, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('OFFRE FINALE / FINAL OFFER', 105, bY + 9, { align: 'center' });
  doc.setFontSize(16);
  doc.text(t.finalPrice ? `$${Number(t.finalPrice).toFixed(2)}` : 'N/A', 105, bY + 19, { align: 'center' });

  /* ── FOOTER sur toutes les pages ── */
  const pages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setTextColor(180, 180, 180); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(
      `SCRAP CAR AI — scrapcarai.vercel.app — Document généré le ${new Date().toLocaleString('fr-CA')} — Page ${p}/${pages}`,
      105, doc.internal.pageSize.height - 5, { align: 'center' },
    );
  }
  return doc;
}

// ─── Rebuild assessment for email ─────────────────────────────────────────────
async function sendEmailForTransaction(t: any): Promise<boolean> {
  const assessment = {
    id: t.assessmentId ?? t.id,
    summary: { purchaseOrder: t.purchaseOrder, deliveryOrder: t.deliveryOrder },
    client: { name: t.clientName, email: t.clientEmail, phone: t.clientPhone, address: t.clientAddress, city: t.clientCity, province: t.clientProvince, postalCode: t.clientPostal, country: t.clientCountry },
    vehicle: { year: t.vehicleYear, make: t.vehicleMake, model: t.vehicleModel, vin: t.vehicleVin, mileage: t.vehicleMileage, transmission: t.vehicleTransmission, driveline: t.vehicleDriveline, vehicleType: t.vehicleType, licensePlate: t.vehiclePlate },
    condition: { runs: t.conditionRuns, accident: t.conditionAccident, missingParts: t.conditionMissingParts, hasRust: t.conditionHasRust, rustDetails: t.conditionRustDetails, hasBodyDamage: t.conditionHasBodyDamage, bodyDamageDetails: t.conditionBodyDamage, hasMechanicalIssues: t.conditionHasMechanical, mechanicalIssues: t.conditionMechanical, isComplete: t.conditionIsComplete, incompleteDetails: t.conditionIncomplete, photos: t.photoUrls ?? [] },
    valuation: { finalPrice: t.finalPrice, breakdown: t.valuationBreakdown },
    towing: { pickupDate: t.pickupDate, pickupTimeSlot: t.pickupTimeSlot, parkingLocation: t.parkingLocation, towingDistance: t.towingDistance, towingDuration: t.towingDuration, allWheels: t.towingAllWheels, flatTires: t.towingFlatTires, blocked: t.towingBlocked, hasKeys: t.towingHasKeys },
    yard: { yard_name: t.yardName, contact: { address: t.yardAddress, phone: t.yardPhone, email: t.yardEmail } },
    lang: 'fr',
  };
  const res = await fetch('/api/send-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assessment) });
  const data = await res.json();
  return !!data.ok;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AdminFilesPage() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [emailState, setEmailState] = useState<Record<string, 'sending' | 'ok' | 'err'>>({});

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
      t.vehicleMake?.toLowerCase().includes(s) ||
      t.clientEmail?.toLowerCase().includes(s)
    );
  }, [transactions, search]);

  const downloadPdf = async (t: any, type: 'PO' | 'DO') => {
    const key = `${t.id}-${type}`;
    setGenerating(key);
    try {
      const orderNumber = type === 'PO' ? t.purchaseOrder : t.deliveryOrder;
      const doc = await buildFullPdf(t, type);
      doc.save(`${type}_${orderNumber ?? 'document'}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setGenerating(null);
    }
  };

  const sendEmail = async (t: any) => {
    if (!t.clientEmail) return;
    setEmailState(prev => ({ ...prev, [t.id]: 'sending' }));
    try {
      const ok = await sendEmailForTransaction(t);
      setEmailState(prev => ({ ...prev, [t.id]: ok ? 'ok' : 'err' }));
    } catch {
      setEmailState(prev => ({ ...prev, [t.id]: 'err' }));
    }
    setTimeout(() => setEmailState(prev => { const n = { ...prev }; delete n[t.id]; return n; }), 3000);
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Dossiers (PO / DO)</h2>
          <p className="admin-card-desc">Bons de commande et de livraison</p>
        </div>
        <div className="admin-search-wrap">
          <Search className="admin-search-icon" />
          <input type="search" placeholder="Rechercher…" className="admin-search-input"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && <div className="admin-table-loading"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--t-primary)' }} /><span>Chargement…</span></div>}
      {error && <p className="admin-error">{error.message}</p>}

      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client</th>
                <th className="hidden sm:table-cell">Véhicule</th>
                <th>Références</th>
                <th className="hidden md:table-cell">Offre</th>
                <th>PDF</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((t: any) => (
                <tr key={t.id} className="admin-table-row">
                  <td>
                    <div className="admin-table-name">{t.clientName || '—'}</div>
                    <div className="admin-table-sub">{t.clientEmail || '—'}</div>
                    <div className="admin-table-sub">{t.clientPhone || ''}</div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                      {t.vehicleYear} {t.vehicleMake} {t.vehicleModel}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                      {t.vehicleVin || '—'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                      {t.vehicleMileage ? `${Number(t.vehicleMileage).toLocaleString('fr-CA')} km` : ''}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--t-primary)', fontWeight: 600 }}>
                      {t.purchaseOrder || '—'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{t.deliveryOrder || ''}</div>
                    {t.pickupDate && (
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                        📅 {new Date(t.pickupDate).toLocaleDateString('fr-CA')}
                      </div>
                    )}
                  </td>
                  <td className="hidden md:table-cell admin-table-price">
                    {t.finalPrice ? `$${Number(t.finalPrice).toFixed(0)}` : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(['PO', 'DO'] as const).map(type => {
                        const key = `${t.id}-${type}`;
                        return (
                          <button key={type} onClick={() => downloadPdf(t, type)} disabled={generating === key}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: generating === key ? 'var(--t-primary)' : 'rgba(255,255,255,0.6)', fontSize: '0.72rem', cursor: generating === key ? 'default' : 'pointer' }}>
                            {generating === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    {t.clientEmail ? (
                      <button onClick={() => sendEmail(t)} disabled={emailState[t.id] === 'sending'}
                        title={`Envoyer confirmation à ${t.clientEmail}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', whiteSpace: 'nowrap',
                          background: emailState[t.id] === 'ok' ? 'rgba(34,197,94,0.15)' : emailState[t.id] === 'err' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${emailState[t.id] === 'ok' ? 'rgba(34,197,94,0.35)' : emailState[t.id] === 'err' ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '7px',
                          color: emailState[t.id] === 'ok' ? 'rgb(34,197,94)' : emailState[t.id] === 'err' ? 'rgb(239,68,68)' : 'rgba(255,255,255,0.6)',
                          fontSize: '0.72rem', cursor: emailState[t.id] === 'sending' ? 'default' : 'pointer',
                        }}>
                        {emailState[t.id] === 'sending' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {emailState[t.id] === 'ok' && <Check className="w-3 h-3" />}
                        {emailState[t.id] === 'err' && <X className="w-3 h-3" />}
                        {!emailState[t.id] && <Mail className="w-3 h-3" />}
                        {emailState[t.id] === 'ok' ? 'Envoyé ✓' : emailState[t.id] === 'err' ? 'Erreur' : 'Envoyer'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>—</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="admin-table-empty">Aucun dossier trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
