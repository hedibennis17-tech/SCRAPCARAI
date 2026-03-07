import { NextResponse } from 'next/server';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { ai } from '@/ai/genkit';
import { firestore } from '@/firebase/firebase';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Assessment } from '@/types';

// Helper function to build a structured prompt for the AI
function buildAnalysisPrompt(assessment: Assessment): string {
    const { client, vehicle, condition } = assessment;

    let prompt = `Analyze the condition of the following vehicle based on the data provided by the user. Provide a one-paragraph summary of the vehicle's overall state, highlighting key positive and negative points.\n\n`;

    if (client) {
        prompt += `Client Location: ${client.city}, ${client.province}\n`;
    }
    if (vehicle) {
        prompt += `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}\n`;
        prompt += `Mileage: ${vehicle.mileage} km\n`;
        prompt += `Transmission: ${vehicle.transmission}, Driveline: ${vehicle.driveline}\n`;
    }
    if (condition) {
        prompt += `\n--- Vehicle Condition ---\n`;
        prompt += `Does it run? ${condition.runs ? 'Yes' : 'No'}\n`;
        prompt += `Was it in an accident? ${condition.accident ? 'Yes' : 'No'}\n`;
        prompt += `Missing major parts: ${condition.missingParts?.join(', ') || 'None'}\n`;
        prompt += `Mechanical Issues: ${condition.hasMechanicalIssues ? condition.mechanicalIssues : 'None'}\n`;
        prompt += `Rust Details: ${condition.hasRust ? condition.rustDetails : 'None'}\n`;
        prompt += `Body Damage: ${condition.hasBodyDamage ? condition.bodyDamageDetails : 'None'}\n`;
        prompt += `Is it complete? ${condition.isComplete ? 'Yes' : `No, details: ${condition.incompleteDetails}`}\n`;
        
        if (condition.photos && condition.photos.length > 0) {
            prompt += `\nImages are provided for visual analysis. Look for rust, body damage, and general wear.\n`;
            condition.photos.forEach(photoUrl => {
                prompt += `{{media url=${photoUrl}}}\n`;
            });
        }
    }

    prompt += `\nConclude with a final summary paragraph.`;
    return prompt;
}


export async function POST(request: Request) {
  try {
    const { assessment }: { assessment: Assessment } = await request.json();
    
    if (!assessment || !assessment.client || !assessment.vehicle || !assessment.condition) {
        return NextResponse.json({ success: false, error: "Incomplete assessment data provided." }, { status: 400 });
    }

    // 🔍 Étape 1 : Génération IA (analyse condition)
    const prompt = buildAnalysisPrompt(assessment);
    const aiResponse = await ai.generate({
      model: "googleai/gemini-1.5-flash",
      prompt,
    });

    const aiText = aiResponse.text;
    const valuation = assessment.valuation?.finalPrice || Math.floor(Math.random() * 4000 + 500);

    // 🧾 Étape 2 : Génération du PDF
    const pdf = new jsPDF();
    pdf.text("Rapport d'évaluation - CarWizard AI", 20, 20);
    autoTable(pdf, {
      startY: 30,
      head: [["Champ", "Valeur"]],
      body: [
        ["Nom", assessment.client.name],
        ["Email", assessment.client.email],
        ["Téléphone", assessment.client.phone],
        ["Véhicule", `${assessment.vehicle.year} ${assessment.vehicle.make} ${assessment.vehicle.model}`],
        ["Kilométrage", `${assessment.vehicle.mileage} km`],
        ["Analyse IA", aiText],
        ["Offre Estimée", `${valuation} CAD`],
      ],
      theme: 'grid'
    });
    const pdfBuffer = pdf.output("arraybuffer");

    // 💾 Étape 3 : Sauvegarde Firestore
    await setDoc(doc(firestore, "evaluations", `${Date.now()}-${assessment.client.email}`), {
      ...assessment,
      aiSummary: aiText,
      createdAt: new Date().toISOString(),
    });

    // 📧 Étape 4 : Envoi des emails
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: (process.env.SMTP_PORT === '465'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"CarWizardAI" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: [assessment.client.email, process.env.ADMIN_EMAIL].filter(Boolean).join(', '),
      subject: "Votre Rapport d'évaluation - CarWizard AI",
      html: `<p>Bonjour ${assessment.client.name},</p><p>Merci d'avoir utilisé CarWizard AI. Vous trouverez ci-joint votre rapport d'évaluation.</p><p><b>Résumé de l'IA :</b></p><p>${aiText}</p><p><b>Offre :</b> ${valuation} CAD</p>`,
      attachments: [
        {
          filename: `rapport-evaluation-${assessment.vehicle.make}-${assessment.vehicle.model}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf'
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Évaluation envoyée avec succès !" });
  } catch (err: any) {
    console.error("Erreur du handler /api/evaluation:", err);
    return NextResponse.json({ success: false, error: err.message || 'An unknown server error occurred.' }, { status: 500 });
  }
}
