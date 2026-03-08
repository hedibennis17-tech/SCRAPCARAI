'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { Assessment } from '@/types';
import { AlertTriangle, CheckCircle, PartyPopper, RefreshCw, Ticket, Loader2, Download, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { sendConfirmationEmail } from '@/app/actions';
import { finalizeTransaction } from '@/lib/transaction-service';
import { useFirebase } from '@/firebase';

type FinalStepProps = {
  onRestart: () => void;
  data: Assessment;
  lang: 'en' | 'fr';
};

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
    dbError: "Transaction save error — contact support.",
    importantInstructions: "Important Instructions",
    instructions: [
      "✅ REGISTRATION SIGNED","🔑 KEYS OF VEHICLE",
      "📦 REMOVE ALL PRIVATE ITEMS FROM VEHICLE","🚫 REMOVE LICENSE PLATES",
      "📞 Our driver will call 30–60 min before arrival.",
      "🔍 They will inspect the car (Engine, Catalyst, Transmission, Battery, Wheels).",
      "❓ Questions? Call dispatch: <strong>{phone}</strong>.",
    ],
    newAssessment: "Start New Assessment",
    loading: "Saving transaction to all modules...",
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
      "✅ IMMATRICULATION SIGNÉE","🔑 CLÉS DU VÉHICULE",
      "📦 RETIREZ TOUS VOS OBJETS PERSONNELS","🚫 RETIREZ VOS PLAQUES",
      "📞 Notre chauffeur appellera 30–60 min avant son arrivée.",
      "🔍 Il inspectera le véhicule (moteur, catalyseur, transmission, batterie, roues).",
      "❓ Questions ? Appelez la répartition : <strong>{phone}</strong>.",
    ],
    newAssessment: "Nouvelle évaluation",
    loading: "Enregistrement de la transaction dans tous les modules...",
  },
};

export function FinalStep({ onRestart, data, lang }: FinalStepProps) {
  const c = content[lang];
  const { firestore, auth } = useFirebase();
  const { summary, client, yard } = data;

  const [isSending, setIsSending]     = useState(true);
  const [dbOk, setDbOk]               = useState(false);
  const [dbError, setDbError]         = useState(false);
  const [emailOk, setEmailOk]         = useState(false);
  const [emailError, setEmailError]   = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      setIsSending(true);
      try {
        // ── 1. Save to Firestore (ALL collections) ──
        if (firestore && auth) {
          const txResult = await finalizeTransaction(firestore, auth, data);
          console.log('TX result:', txResult);
          txResult.success ? setDbOk(true) : setDbError(true);
        } else {
          console.error('Firestore or auth missing:', { firestore: !!firestore, auth: !!auth });
          setDbError(true);
        }

        // ── 2. Send emails to both parties ──
        const emailResult = await sendConfirmationEmail(data, lang);
        emailResult.success ? setEmailOk(true) : setEmailError(true);

      } catch (e) {
        console.error('FinalStep error:', e);
        setDbError(true);
        setEmailError(true);
      } finally {
        setIsSending(false);
      }
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isSending) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-5">
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
        <h3 className="text-xl font-bold font-headline">{c.loading}</h3>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Firestore — assessments, clients, vehicles...</span>
          <span className="flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> towing_dispatches, reports_data...</span>
        </div>
      </div>
    );
  }

  const po = summary?.purchaseOrder ?? data.summary?.purchaseOrder ?? '—';
  const doNum = summary?.deliveryOrder ?? data.summary?.deliveryOrder ?? '—';

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center overflow-y-auto gap-4">
      <PartyPopper className="h-14 w-14 text-primary" />
      <h2 className="text-2xl font-bold font-headline">{c.title}</h2>
      <p className="text-muted-foreground max-w-md text-sm"
        dangerouslySetInnerHTML={{ __html: c.thankYou.replace('{name}', client?.name ?? '') }} />

      {/* Ref Numbers */}
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />{c.refNumbers}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-1">
          <p className="font-mono text-lg"><span className="font-semibold">{c.opNumber}</span> {po}</p>
          <p className="font-mono text-lg"><span className="font-semibold">{c.doNumber}</span> {doNum}</p>
        </CardContent>
      </Card>

      {/* Status */}
      <div className="w-full max-w-md space-y-2 text-left bg-secondary/40 rounded-xl p-4">
        <h4 className="font-semibold mb-2">{c.whatsNext}</h4>

        <div className="flex items-start gap-2 text-sm">
          {dbError
            ? <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            : <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />}
          <p className={dbError ? 'text-destructive' : 'text-muted-foreground'}>
            {dbError ? c.dbError : c.dbOk}
          </p>
        </div>

        <div className="flex items-start gap-2 text-sm">
          {emailError
            ? <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            : <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />}
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
