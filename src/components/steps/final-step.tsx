'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { Assessment } from '@/types';
import {
  AlertTriangle, CheckCircle, PartyPopper, RefreshCw,
  Ticket, Loader2, Download, FileText, Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { sendConfirmationEmail } from '@/app/actions';
import { finalizeTransaction } from '@/lib/transaction-service';
import { useFirebase } from '@/firebase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── i18n ─────────────────────────────────────────────────────────────────────
const content = {
  en: {
    title: "Offer Accepted!",
    thankYou: "Thank you, {name}. Your vehicle assessment is complete.",
    refNumbers: "Your Reference Numbers",
    opNumber: "PO:",
    doNumber: "DO:",
    whatsNext: "What's next?",
    emailConfirmation: "A confirmation email with all details has been sent to <strong>{email}</strong>.",
    smsConfirmation: "You will receive an SMS notification shortly to confirm your appointment.",
    importantInstructions: "Important Instructions",
    instructions: [
      "✅ REGISTRATION SIGNED",
      "🔑 KEYS OF VEHICLE",
      "📦 REMOVE ALL PRIVATE ITEMS FROM VEHICLE",
      "🚫 REMOVE LICENSE PLATES",
      "📞 Our driver will call 30–60 min before arrival.",
      "🔍 They will inspect the car (Engine, Catalyst, Transmission, Battery, Wheels) and provide the final amount.",
      "❓ Questions? Call our dispatch: <strong>{phone}</strong>.",
    ],
    downloadPo: "Download PO",
    downloadDo: "Download DO",
    newAssessment: "Start New Assessment",
    generatingSummary: "Finalizing your transaction...",
    emailError: "Could not send confirmation email. Please contact us.",
    transactionSaved: "Transaction saved to all modules.",
    transactionError: "Transaction save failed. Please contact support.",
    notifications: "Notifications sent to both parties.",
  },
  fr: {
    title: "Offre acceptée !",
    thankYou: "Merci, {name}. L'évaluation de votre véhicule est terminée.",
    refNumbers: "Vos numéros de référence",
    opNumber: "PO :",
    doNumber: "DO :",
    whatsNext: "Quelle est la suite ?",
    emailConfirmation: "Un courriel de confirmation avec tous les détails a été envoyé à <strong>{email}</strong>.",
    smsConfirmation: "Vous recevrez sous peu une notification par SMS pour confirmer votre rendez-vous.",
    importantInstructions: "Instructions importantes",
    instructions: [
      "✅ IMMATRICULATION SIGNÉE",
      "🔑 CLÉS DU VÉHICULE",
      "📦 RETIREZ TOUS VOS OBJETS PERSONNELS",
      "🚫 RETIREZ VOS PLAQUES D'IMMATRICULATION",
      "📞 Notre chauffeur appellera 30–60 min avant son arrivée.",
      "🔍 Il inspectera le véhicule (moteur, catalyseur, transmission, batterie, roues) et fournira le montant final.",
      "❓ Questions ? Appelez notre répartition : <strong>{phone}</strong>.",
    ],
    downloadPo: "Télécharger PO",
    downloadDo: "Télécharger DO",
    newAssessment: "Nouvelle évaluation",
    generatingSummary: "Finalisation de la transaction...",
    emailError: "Échec de l'envoi du courriel. Veuillez nous contacter.",
    transactionSaved: "Transaction enregistrée dans tous les modules.",
    transactionError: "Échec de l'enregistrement. Contactez le support.",
    notifications: "Notifications envoyées aux 2 parties.",
  },
};

// ─── PDF Generator (client-side) ─────────────────────────────────────────────
function buildPdf(assessment: Assessment, orderType: 'PO' | 'DO'): jsPDF {
  const doc = new jsPDF();
  const { client, vehicle, valuation, towing, yard, summary, condition } = assessment;
  const orderNumber = orderType === 'PO' ? summary?.purchaseOrder : summary?.deliveryOrder;
  const pickupAddress =
    towing?.sameAddress === 'no' && (towing as any).alternateAddress
      ? `${(towing as any).alternateAddress.street}, ${(towing as any).alternateAddress.city}`
      : `${client?.address ?? ''}, ${client?.city ?? ''}`;

  // ── Header ──
  doc.setFillColor(192, 48, 63);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SCRAP CAR AI', 14, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${orderType} — ${orderNumber ?? 'N/A'}`, 14, 21);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 21);

  doc.setTextColor(0, 0, 0);

  // ── Client ──
  autoTable(doc, {
    startY: 34,
    head: [['👤 CLIENT', '']],
    body: [
      ['Nom / Name',    client?.name    ?? 'N/A'],
      ['Email',         client?.email   ?? 'N/A'],
      ['Téléphone',     client?.phone   ?? 'N/A'],
      ['Adresse',       `${client?.address ?? ''}, ${client?.city ?? ''}, ${client?.province ?? ''}`],
    ],
    headStyles: { fillColor: [40, 40, 50] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    styles: { fontSize: 10 },
  });

  // ── Vehicle ──
  autoTable(doc, {
    head: [['🚗 VÉHICULE / VEHICLE', '']],
    body: [
      ['Véhicule',      `${vehicle?.year ?? ''} ${vehicle?.make ?? ''} ${vehicle?.model ?? ''}`],
      ['NIV / VIN',     vehicle?.vin ?? 'N/A'],
      ['Kilométrage',   vehicle?.mileage ? `${vehicle.mileage} km` : 'N/A'],
      ['Transmission',  vehicle?.transmission ?? 'N/A'],
      ['Traction',      vehicle?.driveline    ?? 'N/A'],
      ['Type',          vehicle?.vehicleType  ?? 'N/A'],
    ],
    headStyles: { fillColor: [192, 48, 63] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    styles: { fontSize: 10 },
  });

  // ── Condition ──
  autoTable(doc, {
    head: [['⚙️ ÉTAT / CONDITION', '']],
    body: [
      ['Démarre / Runs',  condition?.runs ? 'Oui / Yes' : 'Non / No'],
      ['Accident',        condition?.accident ? 'Oui / Yes' : 'Non / No'],
      ['Pièces manquantes', condition?.missingParts?.join(', ') || 'Aucune / None'],
      ['Rouille / Rust',  condition?.hasRust ? `Oui: ${condition.rustDetails ?? ''}` : 'Non / No'],
      ['Dommages carrosserie', condition?.hasBodyDamage ? `Oui: ${condition.bodyDamageDetails ?? ''}` : 'Non / No'],
    ],
    headStyles: { fillColor: [5, 100, 70] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    styles: { fontSize: 10 },
  });

  // ── Towing ──
  autoTable(doc, {
    head: [['🚚 REMORQUAGE / TOWING', '']],
    body: [
      ['Adresse de cueillette', pickupAddress],
      ['Date',         towing?.pickupDate ? new Date(towing.pickupDate).toLocaleDateString() : 'N/A'],
      ['Plage horaire', towing?.pickupTimeSlot ?? 'N/A'],
      ['Stationnement', towing?.parkingLocation ?? 'N/A'],
      ['Toutes roues',  towing?.allWheels ? 'Oui' : 'Non'],
      ['Pneus crevés',  towing?.flatTires ? 'Oui' : 'Non'],
      ['Véhicule bloqué', towing?.blocked ? 'Oui' : 'Non'],
      ['Clés disponibles', towing?.hasKeys ? 'Oui' : 'Non'],
    ],
    headStyles: { fillColor: [30, 58, 138] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    styles: { fontSize: 10 },
  });

  // ── Assigned Yard ──
  autoTable(doc, {
    head: [['🏭 COUR ASSIGNÉE / ASSIGNED YARD', '']],
    body: [
      ['Nom',       yard?.yard_name       ?? 'N/A'],
      ['Adresse',   yard?.contact.address ?? 'N/A'],
      ['Téléphone', yard?.contact.phone   ?? 'N/A'],
      ['Email',     yard?.contact.email   ?? 'N/A'],
    ],
    headStyles: { fillColor: [80, 30, 100] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    styles: { fontSize: 10 },
  });

  // ── Offer Banner ──
  const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
  if (finalY + 30 < 270) {
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(14, finalY + 6, 182, 24, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFRE FINALE / FINAL OFFER', 105, finalY + 16, { align: 'center' });
    doc.setFontSize(20);
    doc.text(`$${valuation?.finalPrice?.toFixed(2) ?? '0.00'}`, 105, finalY + 27, { align: 'center' });
  }

  // ── Footer ──
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('SCRAP CAR AI — scrapcarai.vercel.app', 105, 290, { align: 'center' });

  return doc;
}

// ─── Component ────────────────────────────────────────────────────────────────
type FinalStepProps = {
  onRestart: () => void;
  data: Assessment;
  lang: 'en' | 'fr';
};

export function FinalStep({ onRestart, data, lang }: FinalStepProps) {
  const c = content[lang];
  const { summary, client, yard } = data;
  const { firestore } = useFirebase();

  const [emailSent,        setEmailSent]        = useState(false);
  const [emailError,       setEmailError]        = useState(false);
  const [transactionSaved, setTransactionSaved] = useState(false);
  const [transactionError, setTransactionError] = useState(false);
  const [isSending,        setIsSending]         = useState(true);

  // ── Finalize on mount ──
  useEffect(() => {
    if (!summary || emailSent) return;

    const finalize = async () => {
      setIsSending(true);
      try {
        // 1. Write to all Firestore collections
        if (firestore && data.id) {
          const txResult = await finalizeTransaction(firestore, data);
          if (txResult.success) {
            setTransactionSaved(true);
          } else {
            setTransactionError(true);
            console.error('TX error:', txResult.error);
          }
        }

        // 2. Send emails to both parties
        const emailResult = await sendConfirmationEmail(data, lang);
        if (emailResult.success) {
          setEmailSent(true);
        } else {
          setEmailError(true);
        }
      } catch (e) {
        console.error('Finalize error:', e);
        setEmailError(true);
        setTransactionError(true);
      } finally {
        setIsSending(false);
      }
    };

    finalize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  // ── PDF download handler ──
  const downloadPdf = useCallback((orderType: 'PO' | 'DO') => {
    const orderNumber = orderType === 'PO' ? summary?.purchaseOrder : summary?.deliveryOrder;
    const doc = buildPdf(data, orderType);
    doc.save(`${orderType}_${orderNumber}.pdf`);
  }, [data, summary]);

  // ── Loading screen ──
  if (!summary || isSending) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-4">
        <div className="relative">
          <Loader2 className="h-14 w-14 animate-spin text-primary" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        </div>
        <h3 className="text-xl font-bold font-headline">{c.generatingSummary}</h3>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground max-w-xs">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Enregistrement Firestore...
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
            Génération des documents...
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse delay-300" />
            Envoi des notifications...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center overflow-y-auto gap-4">

      {/* Hero */}
      <PartyPopper className="h-14 w-14 text-primary mb-1" />
      <h2 className="text-2xl font-bold font-headline">{c.title}</h2>
      <p
        className="text-muted-foreground max-w-md mx-auto text-sm"
        dangerouslySetInnerHTML={{ __html: c.thankYou.replace('{name}', client?.name ?? '') }}
      />

      {/* Reference Numbers */}
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            {c.refNumbers}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-1">
          <p className="font-mono text-lg">
            <span className="font-semibold">{c.opNumber}</span> {summary.purchaseOrder}
          </p>
          <p className="font-mono text-lg">
            <span className="font-semibold">{c.doNumber}</span> {summary.deliveryOrder}
          </p>
        </CardContent>
      </Card>

      {/* PDF Downloads */}
      <div className="flex gap-3">
        <Button size="sm" variant="outline" onClick={() => downloadPdf('PO')}>
          <FileText className="mr-2 h-4 w-4" />
          {c.downloadPo}
          <Download className="ml-2 h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadPdf('DO')}>
          <FileText className="mr-2 h-4 w-4" />
          {c.downloadDo}
          <Download className="ml-2 h-3 w-3" />
        </Button>
      </div>

      {/* Status Row */}
      <div className="w-full max-w-md space-y-2 text-left">

        {/* Transaction saved */}
        <div className="flex items-start gap-2 text-sm">
          {transactionError
            ? <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            : <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />}
          <p className={transactionError ? 'text-destructive' : 'text-muted-foreground'}>
            {transactionError ? c.transactionError : c.transactionSaved}
          </p>
        </div>

        {/* Email */}
        <div className="flex items-start gap-2 text-sm">
          {emailError
            ? <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            : <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />}
          <p
            className="text-muted-foreground"
            dangerouslySetInnerHTML={{
              __html: emailError
                ? c.emailError
                : c.emailConfirmation.replace('{email}', client?.email ?? ''),
            }}
          />
        </div>

        {/* SMS / Notifications */}
        <div className="flex items-start gap-2 text-sm">
          <Bell className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <p className="text-muted-foreground">{c.notifications}</p>
        </div>
      </div>

      {/* Important Instructions */}
      <Card className="w-full max-w-lg border-destructive">
        <CardHeader className="flex-row items-center gap-2 pb-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-base text-destructive">{c.importantInstructions}</CardTitle>
        </CardHeader>
        <CardContent className="text-left text-sm space-y-1.5">
          {c.instructions.map((instruction, index) => (
            <p
              key={index}
              dangerouslySetInnerHTML={{
                __html: instruction.replace('{phone}', yard?.contact.phone ?? '1-800-111-1111'),
              }}
            />
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 mt-2">
        <Button size="lg" onClick={onRestart} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          {c.newAssessment}
        </Button>
      </div>
    </div>
  );
}
