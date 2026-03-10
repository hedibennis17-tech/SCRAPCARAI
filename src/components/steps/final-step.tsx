'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { Assessment } from '@/types';
import {
  AlertTriangle, CheckCircle, PartyPopper, RefreshCw,
  Ticket, Loader2, Download, FileText, Database, Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { sendConfirmationEmail } from '@/app/actions';
import { finalizeTransaction } from '@/lib/transaction-service';
import { useFirebase } from '@/firebase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── PDF client-side ──────────────────────────────────────────────────────────
async function buildPdf(a: Assessment, orderType: 'PO' | 'DO'): Promise<jsPDF> {
  const doc = new jsPDF();
  const { client, vehicle, valuation, towing, yard, summary, condition } = a;
  const orderNumber = orderType === 'PO' ? summary?.purchaseOrder : summary?.deliveryOrder;

  const altAddr = (towing as any)?.alternateAddress;
  const pickupAddr = towing?.sameAddress === 'no' && altAddr?.street
    ? `${altAddr.street}, ${altAddr.city ?? ''}`
    : `${client?.address ?? ''}, ${client?.city ?? ''}`;

  // Header bar
  doc.setFillColor(192, 48, 63);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SCRAP CAR AI', 14, 11);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${orderType} — ${orderNumber ?? 'N/A'}`, 14, 20);
  doc.text(`${new Date().toLocaleDateString('fr-CA')}`, 196, 20, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Client
  autoTable(doc, {
    startY: 32,
    head: [['👤 CLIENT', '']],
    body: [
      ['Nom / Name',    client?.name  ?? 'N/A'],
      ['Email',         client?.email ?? 'N/A'],
      ['Téléphone',     client?.phone ?? 'N/A'],
      ['Adresse', `${client?.address ?? ''}, ${client?.city ?? ''}, ${client?.province ?? ''}`],
    ],
    headStyles: { fillColor: [30, 30, 45], textColor: 255 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
    styles: { fontSize: 9 },
  });

  // Vehicle
  autoTable(doc, {
    head: [['🚗 VÉHICULE', '']],
    body: [
      ['Véhicule', `${vehicle?.year ?? ''} ${vehicle?.make ?? ''} ${vehicle?.model ?? ''}`],
      ['NIV / VIN',  vehicle?.vin ?? 'N/A'],
      ['Kilométrage', vehicle?.mileage ? `${Number(vehicle.mileage).toLocaleString('fr-CA')} km` : 'N/A'],
      ['Transmission', vehicle?.transmission ?? 'N/A'],
      ['Traction',     vehicle?.driveline    ?? 'N/A'],
      ['Type',         vehicle?.vehicleType  ?? 'N/A'],
    ],
    headStyles: { fillColor: [192, 48, 63], textColor: 255 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
    styles: { fontSize: 9 },
  });

  // Condition
  autoTable(doc, {
    head: [['⚙️ ÉTAT / CONDITION', '']],
    body: [
      ['Démarre', condition?.runs ? 'Oui / Yes' : 'Non / No'],
      ['Accidenté', condition?.accident ? 'Oui / Yes' : 'Non / No'],
      ['Pièces manquantes', condition?.missingParts?.join(', ') || 'Aucune / None'],
      ['Rouille', condition?.hasRust ? `Oui: ${condition.rustDetails ?? ''}` : 'Non'],
      ['Dommages carrosserie', condition?.hasBodyDamage ? `Oui: ${condition.bodyDamageDetails ?? ''}` : 'Non'],
    ],
    headStyles: { fillColor: [5, 100, 70], textColor: 255 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
    styles: { fontSize: 9 },
  });

  // Towing
  autoTable(doc, {
    head: [['🚚 REMORQUAGE / TOWING', '']],
    body: [
      ['Adresse', pickupAddr],
      ['Date', towing?.pickupDate ? new Date(towing.pickupDate).toLocaleDateString('fr-CA') : 'N/A'],
      ['Plage horaire', towing?.pickupTimeSlot ?? 'N/A'],
      ['Stationnement', towing?.parkingLocation ?? 'N/A'],
      ['Distance', (towing as any)?.towingDistance ?? 'N/A'],
      ['Temps trajet estimé', (towing as any)?.towingDuration ?? 'N/A'],
      ['Toutes roues', towing?.allWheels ? 'Oui' : 'Non'],
      ['Pneus crevés', towing?.flatTires ? 'Oui' : 'Non'],
      ['Bloqué', towing?.blocked ? 'Oui' : 'Non'],
      ['Clés', towing?.hasKeys ? 'Oui' : 'Non'],
    ],
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
    styles: { fontSize: 9 },
  });

  // Yard
  autoTable(doc, {
    head: [['🏭 COUR ASSIGNÉE / ASSIGNED YARD', '']],
    body: [
      ['Cour',      yard?.yard_name       ?? 'N/A'],
      ['Adresse',   yard?.contact?.address ?? 'N/A'],
      ['Téléphone', yard?.contact?.phone   ?? 'N/A'],
      ['Email',     yard?.contact?.email   ?? 'N/A'],
    ],
    headStyles: { fillColor: [80, 30, 100], textColor: 255 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
    styles: { fontSize: 9 },
  });

  // Photos section (only on PO)
  if (orderType === 'PO') {
    const photoUrls: string[] = (condition as any)?.photos?.filter((p: string) => p && !p.startsWith('data:')) ?? [];
    if (photoUrls.length > 0) {
      const loadImg = (url: string): Promise<string> => new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = () => reject(new Error('img load failed'));
        img.src = url;
      });

      try {
        const photosY = (doc as any).lastAutoTable?.finalY + 8 ?? 200;
        // Section header
        doc.setFillColor(30, 30, 45);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.rect(14, photosY, 182, 8, 'F');
        doc.text('📷 PHOTOS DU VÉHICULE / VEHICLE PHOTOS', 17, photosY + 5.5);
        doc.setTextColor(0, 0, 0);

        let photoX = 14;
        let photoY = photosY + 11;
        const imgW = 57; const imgH = 43; const gap = 4;

        for (let i = 0; i < Math.min(photoUrls.length, 6); i++) {
          if (photoX + imgW > 196) { photoX = 14; photoY += imgH + gap; }
          // Add new page if needed
          if (photoY + imgH > 272) { doc.addPage(); photoX = 14; photoY = 14; }
          try {
            const b64 = await loadImg(photoUrls[i]);
            doc.addImage(b64, 'JPEG', photoX, photoY, imgW, imgH);
          } catch (_) { /* skip broken image */ }
          photoX += imgW + gap;
        }
      } catch (_) { /* skip entire section on error */ }
    }
  }

  // Offer banner
  const finalY = (doc as any).lastAutoTable?.finalY ?? 220;
  if (finalY + 28 < 272) {
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(14, finalY + 6, 182, 22, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('OFFRE FINALE / FINAL OFFER', 105, finalY + 15, { align: 'center' });
    doc.setFontSize(18);
    doc.text(`$${valuation?.finalPrice?.toFixed(2) ?? '0.00'}`, 105, finalY + 25, { align: 'center' });
  }

  // Footer
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('SCRAP CAR AI — scrapcarai.vercel.app', 105, 290, { align: 'center' });

  return doc;
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
const content = {
  en: {
    title: "Offer Accepted!",
    thankYou: "Thank you, {name}. Your vehicle assessment is complete.",
    refNumbers: "Your Reference Numbers",
    opNumber: "PO:", doNumber: "DO:",
    whatsNext: "What's next?",
    emailOk: "Confirmation email sent to <strong>{email}</strong>.",
    emailError: "Could not send confirmation email. Please contact us.",
    dbOk: "Transaction saved to all modules.",
    dbError: "Save error — please contact support.",
    importantInstructions: "Important Instructions",
    instructions: [
      "✅ REGISTRATION SIGNED", "🔑 KEYS OF VEHICLE",
      "📦 REMOVE ALL PRIVATE ITEMS FROM VEHICLE", "🚫 REMOVE LICENSE PLATES",
      "📞 Our driver will call 30–60 min before arrival.",
      "🔍 They will inspect the car (Engine, Catalyst, Transmission, Battery, Wheels).",
      "❓ Questions? Call dispatch: <strong>{phone}</strong>.",
    ],
    newAssessment: "Start New Assessment",
    loadingMain: "Saving transaction to all modules…",
    generatingPdf: "Generating PDF…",
    downloadPO: "Download PO",
    downloadDO: "Download DO",
  },
  fr: {
    title: "Offre acceptée !",
    thankYou: "Merci, {name}. L'évaluation de votre véhicule est terminée.",
    refNumbers: "Vos numéros de référence",
    opNumber: "PO :", doNumber: "DO :",
    whatsNext: "Quelle est la suite ?",
    emailOk: "Courriel de confirmation envoyé à <strong>{email}</strong>.",
    emailError: "Échec de l'envoi du courriel. Veuillez nous contacter.",
    dbOk: "Transaction enregistrée dans tous les modules.",
    dbError: "Erreur d'enregistrement — contactez le support.",
    importantInstructions: "Instructions importantes",
    instructions: [
      "✅ IMMATRICULATION SIGNÉE", "🔑 CLÉS DU VÉHICULE",
      "📦 RETIREZ TOUS VOS OBJETS PERSONNELS", "🚫 RETIREZ VOS PLAQUES",
      "📞 Notre chauffeur appellera 30–60 min avant son arrivée.",
      "🔍 Il inspectera le véhicule (moteur, catalyseur, transmission, batterie, roues).",
      "❓ Questions ? Appelez la répartition : <strong>{phone}</strong>.",
    ],
    newAssessment: "Nouvelle évaluation",
    loadingMain: "Enregistrement de la transaction…",
    generatingPdf: "Génération du PDF…",
    downloadPO: "Télécharger PO",
    downloadDO: "Télécharger DO",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
type FinalStepProps = { onRestart: () => void; data: Assessment; lang: 'en' | 'fr' };

export function FinalStep({ onRestart, data, lang }: FinalStepProps) {
  const c = content[lang];
  const { firestore, auth } = useFirebase();
  const { summary, client, yard } = data;

  const [isSaving,     setIsSaving]     = useState(true);
  const [dbOk,         setDbOk]         = useState(false);
  const [dbError,      setDbError]      = useState(false);
  const [emailOk,      setEmailOk]      = useState(false);
  const [emailError,   setEmailError]   = useState(false);
  const [pdfLoading,   setPdfLoading]   = useState<'PO' | 'DO' | null>(null);
  const ran = useRef(false);

  // ── Save on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      setIsSaving(true);
      try {
        // 1. Firestore
        if (firestore && auth) {
          const tx = await finalizeTransaction(firestore, auth, data);
          tx.success ? setDbOk(true) : setDbError(true);
        } else {
          console.error('Firestore/auth missing:', { firestore: !!firestore, auth: !!auth });
          setDbError(true);
        }
        // 2. Emails
        const em = await sendConfirmationEmail(data, lang);
        em.success ? setEmailOk(true) : setEmailError(true);

        // 3. SMS (fire-and-forget, no block)
        fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessment: data, lang }),
        }).catch(() => {});

      } catch (e) {
        console.error('FinalStep error:', e);
        setDbError(true);
        setEmailError(true);
      } finally {
        setIsSaving(false);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── PDF download ───────────────────────────────────────────────────────────
  const downloadPdf = useCallback(async (orderType: 'PO' | 'DO') => {
    setPdfLoading(orderType);
    try {
      const orderNumber = orderType === 'PO' ? summary?.purchaseOrder : summary?.deliveryOrder;
      const doc = await buildPdf(data, orderType);
      doc.save(`${orderType}_${orderNumber ?? 'document'}.pdf`);
    } finally {
      setPdfLoading(null);
    }
  }, [data, summary]);

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (isSaving) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-5">
        <div className="relative">
          <img src="/logo.gif" alt="Processing" className="w-44 h-44 object-contain" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <h3 className="text-xl font-bold font-headline">{c.loadingMain}</h3>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground max-w-xs">
          {[
            lang === 'fr' ? '💾 Enregistrement assessments…'       : '💾 Saving assessments…',
            lang === 'fr' ? '📋 Enregistrement transactions…'      : '📋 Saving transactions…',
            lang === 'fr' ? '👤 Mise à jour profil client…'        : '👤 Updating client profile…',
            lang === 'fr' ? '🚚 Création feuille de dispatch…'     : '🚚 Creating dispatch sheet…',
            lang === 'fr' ? '📊 Mise à jour rapports…'             : '📊 Updating reports…',
            lang === 'fr' ? '📧 Envoi des notifications…'          : '📧 Sending notifications…',
          ].map((step, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.25}s` }} />
              {step}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const po    = data.summary?.purchaseOrder ?? '—';
  const doNum = data.summary?.deliveryOrder ?? '—';

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center overflow-y-auto gap-4">

      <PartyPopper className="h-14 w-14 text-primary" />
      <h2 className="text-2xl font-bold font-headline">{c.title}</h2>
      <p className="text-muted-foreground max-w-md text-sm"
        dangerouslySetInnerHTML={{ __html: c.thankYou.replace('{name}', client?.name ?? '') }} />

      {/* Ref Numbers + PDF buttons */}
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />{c.refNumbers}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-1">
          <p className="font-mono text-lg"><span className="font-semibold">{c.opNumber}</span> {po}</p>
          <p className="font-mono text-lg"><span className="font-semibold">{c.doNumber}</span> {doNum}</p>

          {/* PDF download buttons */}
          <div className="flex gap-3 justify-center pt-3">
            <Button
              size="sm" variant="outline"
              onClick={() => downloadPdf('PO')}
              disabled={pdfLoading !== null}
            >
              {pdfLoading === 'PO'
                ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{c.generatingPdf}</>
                : <><FileText className="mr-2 h-3.5 w-3.5" />{c.downloadPO} <Download className="ml-1 h-3 w-3" /></>}
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={() => downloadPdf('DO')}
              disabled={pdfLoading !== null}
            >
              {pdfLoading === 'DO'
                ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{c.generatingPdf}</>
                : <><FileText className="mr-2 h-3.5 w-3.5" />{c.downloadDO} <Download className="ml-1 h-3 w-3" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <div className="w-full max-w-md bg-secondary/40 rounded-xl p-4 text-left space-y-2">
        <h4 className="font-semibold mb-1">{c.whatsNext}</h4>

        <div className="flex items-start gap-2 text-sm">
          {dbError
            ? <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            : <Database className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />}
          <p className={dbError ? 'text-destructive' : 'text-muted-foreground'}>
            {dbError ? c.dbError : c.dbOk}
          </p>
        </div>

        <div className="flex items-start gap-2 text-sm">
          {emailError
            ? <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            : <Mail className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />}
          <p className="text-muted-foreground" dangerouslySetInnerHTML={{
            __html: emailError ? c.emailError : c.emailOk.replace('{email}', client?.email ?? '')
          }} />
        </div>
      </div>

      {/* Instructions */}
      <Card className="w-full max-w-lg border-destructive">
        <CardHeader className="flex-row items-center gap-2 pb-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-base text-destructive">{c.importantInstructions}</CardTitle>
        </CardHeader>
        <CardContent className="text-left text-sm space-y-1.5">
          {c.instructions.map((line, i) => (
            <p key={i} dangerouslySetInnerHTML={{
              __html: line.replace('{phone}', yard?.contact?.phone ?? '1-800-111-1111')
            }} />
          ))}
        </CardContent>
      </Card>

      <Button size="lg" onClick={onRestart} variant="outline" className="mt-2">
        <RefreshCw className="mr-2 h-4 w-4" />{c.newAssessment}
      </Button>
    </div>
  );
}
