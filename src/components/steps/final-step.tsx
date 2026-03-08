
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Assessment } from '@/types';
import { AlertTriangle, CheckCircle, PartyPopper, RefreshCw, Ticket, Loader2, Download, Mail, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { sendConfirmationEmail } from '@/app/actions';

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
    opNumber: "PO:",
    doNumber: "DO:",
    whatsNext: "What's next?",
    emailConfirmation: "A confirmation email with all details has been sent to <strong>{email}</strong>.",
    emailError: "Could not send confirmation email. Please contact us.",
    smsConfirmation: "An SMS confirmation has been sent to <strong>{phone}</strong>.",
    smsError: "Could not send SMS confirmation.",
    importantInstructions: "Important Instructions",
    instructions: [
      "REGISTRATION SIGNED",
      "KEYS OF VEHICLE",
      "REMOVE ALL PRIVATE ITEMS FROM VEHICLE",
      "REMOVE LICENSE PLATES",
      "Our driver will call 30-60 minutes before arrival.",
      "They will inspect the car (Engine, Catalyst, Transmission, Battery, and Wheels) and provide the final amount.",
      "If you have any questions, please call our dispatch line: <strong>{phone}</strong>.",
    ],
    newAssessment: "Start New Assessment",
    downloadPO: "Download PO",
    downloadDO: "Download DO",
    generatingSummary: "Generating your summary & sending notifications...",
  },
  fr: {
    title: "Offre acceptée !",
    thankYou: "Merci, {name}. L'évaluation de votre véhicule est terminée.",
    refNumbers: "Vos numéros de référence",
    opNumber: "PO :",
    doNumber: "DO :",
    whatsNext: "Quelle est la suite ?",
    emailConfirmation: "Un courriel de confirmation a été envoyé à <strong>{email}</strong>.",
    emailError: "Échec de l'envoi du courriel. Veuillez nous contacter.",
    smsConfirmation: "Un SMS de confirmation a été envoyé au <strong>{phone}</strong>.",
    smsError: "Échec de l'envoi du SMS.",
    importantInstructions: "Instructions importantes",
    instructions: [
      "IMMATRICULATION SIGNÉE",
      "CLÉS DU VÉHICULE",
      "RETIREZ TOUS VOS OBJETS PERSONNELS DU VÉHICULE",
      "RETIREZ VOS PLAQUES D'IMMATRICULATION",
      "Notre chauffeur vous appellera 30 à 60 minutes avant son arrivée.",
      "Il inspectera la voiture (moteur, catalyseur, transmission, batterie et roues) et fournira le montant final.",
      "Si vous avez des questions, veuillez appeler notre ligne de répartition : <strong>{phone}</strong>.",
    ],
    newAssessment: "Nouvelle évaluation",
    downloadPO: "Télécharger PO",
    downloadDO: "Télécharger DO",
    generatingSummary: "Génération du résumé et envoi des notifications...",
  }
};

async function sendSmsNotification(assessment: Assessment, lang: 'en' | 'fr') {
  try {
    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment, lang }),
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error('SMS failed:', err);
    return false;
  }
}

async function downloadPdf(assessment: Assessment, orderType: 'PO' | 'DO') {
  try {
    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment, orderType }),
    });
    const data = await res.json();
    if (!data.ok || !data.html) return;

    // Open HTML in new tab for printing/saving as PDF
    const blob = new Blob([data.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.fileName?.replace('.pdf', '.html') || `${orderType}.html`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('PDF generation failed:', err);
  }
}

export function FinalStep({ onRestart, data, lang }: FinalStepProps) {
  const c = content[lang];
  const { summary, client, yard } = data;
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsError, setSmsError] = useState(false);
  const [isSending, setIsSending] = useState(true);

  useEffect(() => {
    if (!summary || emailSent) return;

    const runAll = async () => {
      setIsSending(true);
      try {
        // 1. Send confirmation email
        const emailResult = await sendConfirmationEmail(data, lang);
        if (emailResult.success) {
          setEmailSent(true);
        } else {
          setEmailError(true);
        }

        // 2. Send SMS via Twilio
        const smsOk = await sendSmsNotification(data, lang);
        if (smsOk) {
          setSmsSent(true);
        } else {
          setSmsError(true);
        }
      } catch (e) {
        console.error("Failed to send notifications:", e);
        setEmailError(true);
        setSmsError(true);
      } finally {
        setIsSending(false);
      }
    };

    runAll();
  }, [summary, data, lang, emailSent]);

  if (!summary || isSending) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h3 className="text-2xl font-bold font-headline">{c.generatingSummary}</h3>
        <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> Email...</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> SMS...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center overflow-y-auto">
      <PartyPopper className="h-16 w-16 text-primary mb-4" />
      <p className="text-muted-foreground max-w-md mx-auto mt-2" dangerouslySetInnerHTML={{ __html: c.thankYou.replace('{name}', client?.name || '') }} />

      <Card className="w-full max-w-md mt-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-center gap-2">
            <Ticket className="h-5 w-5 text-primary"/>
            {c.refNumbers}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="font-mono text-lg">
            <span className="font-semibold">{c.opNumber}</span> {summary.purchaseOrder}
          </p>
          <p className="font-mono text-lg">
            <span className="font-semibold">{c.doNumber}</span> {summary.deliveryOrder}
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button size="sm" variant="outline" onClick={() => downloadPdf(data, 'PO')}>
              <Download className="mr-1 h-3 w-3" />
              {c.downloadPO}
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadPdf(data, 'DO')}>
              <Download className="mr-1 h-3 w-3" />
              {c.downloadDO}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-secondary/50 rounded-lg p-4 max-w-sm w-full mt-8 text-left space-y-3">
        <h4 className="font-semibold">{c.whatsNext}</h4>

        {/* Email status */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          {emailError
            ? <AlertTriangle className="h-4 w-4 mt-1 text-destructive shrink-0" />
            : <CheckCircle className="h-4 w-4 mt-1 text-primary shrink-0" />}
          <p dangerouslySetInnerHTML={{
            __html: emailError
              ? c.emailError
              : c.emailConfirmation.replace('{email}', client?.email || '')
          }} />
        </div>

        {/* SMS status */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          {smsError
            ? <AlertTriangle className="h-4 w-4 mt-1 text-destructive shrink-0" />
            : <CheckCircle className="h-4 w-4 mt-1 text-primary shrink-0" />}
          <p dangerouslySetInnerHTML={{
            __html: smsError
              ? c.smsError
              : c.smsConfirmation.replace('{phone}', client?.phone || '')
          }} />
        </div>
      </div>

      <Card className="w-full max-w-lg mt-6 border-destructive text-destructive">
        <CardHeader className="flex-row items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          <CardTitle className="text-lg text-destructive">{c.importantInstructions}</CardTitle>
        </CardHeader>
        <CardContent className="text-left text-sm space-y-2">
          {c.instructions.map((instruction, index) => (
            <p key={index} dangerouslySetInnerHTML={{ __html: instruction.replace('{phone}', yard?.contact.phone || '1-800-111-1111') }} />
          ))}
        </CardContent>
      </Card>

      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={onRestart} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          {c.newAssessment}
        </Button>
      </div>
    </div>
  );
}
