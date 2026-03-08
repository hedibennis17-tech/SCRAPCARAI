import { NextResponse } from 'next/server';
import type { Assessment } from '@/types';

export async function POST(request: Request) {
  try {
    const { assessment, lang }: { assessment: Assessment; lang?: 'en' | 'fr' } = await request.json();

    if (!assessment) {
      return NextResponse.json({ ok: false, error: 'Missing assessment data' }, { status: 400 });
    }

    const results: Record<string, any> = {
      transactionId: assessment.summary?.purchaseOrder || `TRX-${Date.now()}`,
      timestamp: new Date().toISOString(),
      steps: {},
    };

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // 1. Send confirmation email
    try {
      const emailRes = await fetch(`${baseUrl}/api/send-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment, lang }),
      });
      const emailData = await emailRes.json();
      results.steps.email = emailData;
    } catch (err: any) {
      console.error('Email step failed:', err);
      results.steps.email = { ok: false, error: err.message };
    }

    // 2. Send SMS notification
    try {
      const smsRes = await fetch(`${baseUrl}/api/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment, lang }),
      });
      const smsData = await smsRes.json();
      results.steps.sms = smsData;
    } catch (err: any) {
      console.error('SMS step failed:', err);
      results.steps.sms = { ok: false, error: err.message };
    }

    // 3. Generate PO PDF
    try {
      const pdfRes = await fetch(`${baseUrl}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment, orderType: 'PO' }),
      });
      const pdfData = await pdfRes.json();
      results.steps.pdf_po = { ok: pdfData.ok, fileName: pdfData.fileName };
    } catch (err: any) {
      console.error('PDF PO step failed:', err);
      results.steps.pdf_po = { ok: false, error: err.message };
    }

    // 4. Generate DO PDF
    try {
      const pdfRes = await fetch(`${baseUrl}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment, orderType: 'DO' }),
      });
      const pdfData = await pdfRes.json();
      results.steps.pdf_do = { ok: pdfData.ok, fileName: pdfData.fileName };
    } catch (err: any) {
      console.error('PDF DO step failed:', err);
      results.steps.pdf_do = { ok: false, error: err.message };
    }

    const allOk = Object.values(results.steps).every((s: any) => s.ok);

    return NextResponse.json({
      ok: allOk,
      transactionId: results.transactionId,
      timestamp: results.timestamp,
      steps: results.steps,
    });
  } catch (err: any) {
    console.error('Error in /api/submit-transaction:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Unknown error' }, { status: 500 });
  }
}
