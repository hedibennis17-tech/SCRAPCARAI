
import { NextResponse } from 'next/server';
import { sendConfirmationEmail } from '@/app/actions';
import type { Assessment } from '@/types';

export async function POST(request: Request) {
  try {
    const payload: Assessment & { lang?: 'en' | 'fr' } = await request.json();

    const assessmentData = payload.client ? payload : (payload as any).scrapCarAI?.fields;

    if (!assessmentData) {
        return NextResponse.json({ ok: false, error: 'Invalid payload structure' }, { status: 400 });
    }
    
    const lang = payload.lang || 'en';

    const result = await sendConfirmationEmail(assessmentData, lang);

    if (result.success) {
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({ ok: false, error: result.errors || result.error }, { status: 500 });
    }
  } catch (e: any) {
    console.error('API Error /api/send-summary:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
