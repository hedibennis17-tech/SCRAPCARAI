'use server';

import type { Assessment } from '@/types';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function escapeText(str: string | number | boolean | null | undefined): string {
  if (str === null || str === undefined) return 'N/A';
  if (typeof str === 'boolean') return str ? 'Yes' : 'No';
  return String(str).replace(/[&<>"']/g, (match) => {
    switch (match) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return match;
    }
  });
}

function buildHtmlBody(assessment: Assessment, lang: 'en' | 'fr'): string {
    const c = assessment.client;
    const v = assessment.vehicle;
    const co = assessment.condition;
    const val = assessment.valuation;
    const tow = assessment.towing;
    const photos = co?.photos || [];

    const i18n = {
        en: {
            title: "Complete Vehicle Assessment",
            clientInfo: "👤 CLIENT INFORMATION",
            name: "Name",
            email: "Email",
            phone: "Phone",
            address: "Address",
            vehicleDetails: "🚗 VEHICLE DETAILS",
            vehicle: "Vehicle",
            mileage: "Mileage",
            vin: "VIN",
            transmission: "Transmission",
            driveline: "Driveline",
            type: "Type",
            vehicleCondition: "⚙️ VEHICLE CONDITION",
            runs: "Runs",
            accident: "Accident",
            missingParts: "Missing Major Parts",
            mechanicalIssues: "Mechanical Issues",
            rust: "Rust",
            wheelType: "Wheel Type",
            bodyDamage: "Body Damage",
            isComplete: "Vehicle Complete",
            incompleteDetails: "Details if Incomplete",
            vehiclePhotos: "📸 VEHICLE PHOTOS",
            noPhotos: "No photos available",
            towing: "🚚 TOWING & APPOINTMENT",
            pickupLocation: "Pickup Location",
            pickupDate: "Pickup Date",
            timeSlot: "Time Slot",
            parking: "Parking",
            allWheels: "All Wheels",
            flatTires: "Flat Tires",
            blocked: "Vehicle Blocked",
            hasKeys: "Keys Available",
            finalOffer: "💰 FINAL OFFER",
            firmPrice: "Firm price for your vehicle",
            thankYou: "Thank you for choosing",
            contactSoon: "You will be contacted shortly to confirm pickup.",
            yes: "Yes",
            no: "No",
            none: "None"
        },
        fr: {
            title: "Valorisation Complète du Véhicule",
            clientInfo: "👤 INFORMATIONS DU CLIENT",
            name: "Nom",
            email: "Courriel",
            phone: "Téléphone",
            address: "Adresse",
            vehicleDetails: "🚗 DÉTAILS DU VÉHICULE",
            vehicle: "Véhicule",
            mileage: "Kilométrage",
            vin: "NIV",
            transmission: "Transmission",
            driveline: "Traction",
            type: "Type",
            vehicleCondition: "⚙️ ÉTAT DU VÉHICULE",
            runs: "Démarre",
            accident: "Accidenté",
            missingParts: "Pièces majeures manquantes",
            mechanicalIssues: "Problèmes mécaniques",
            rust: "Rouille",
            wheelType: "Type de roues",
            bodyDamage: "Dommages carrosserie",
            isComplete: "Véhicule complet",
            incompleteDetails: "Détails si incomplet",
            vehiclePhotos: "📸 PHOTOS DU VÉHICULE",
            noPhotos: "Aucune photo disponible",
            towing: "🚚 REMORQUAGE ET RENDEZ-VOUS",
            pickupLocation: "Lieu de cueillette",
            pickupDate: "Date de cueillette",
            timeSlot: "Plage horaire",
            parking: "Stationnement",
            allWheels: "Toutes les roues",
            flatTires: "Pneus crevés",
            blocked: "Véhicule bloqué",
            hasKeys: "Clés disponibles",
            finalOffer: "💰 OFFRE FINALE",
            firmPrice: "Prix ferme pour votre véhicule",
            thankYou: "Merci d'avoir choisi",
            contactSoon: "Vous serez contacté sous peu pour confirmer la cueillette.",
            yes: "Oui",
            no: "Non",
            none: "Aucune"
        }
    };

    const t = i18n[lang];

    let photosHtml = '';
    if (photos.length > 0) {
        photos.forEach(url => {
            photosHtml += `
                <div style="text-align: center;">
                  <img src="${url}" alt="Vehicle Photo" style="max-width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;" />
                </div>`;
        });
    } else {
        photosHtml = `<p style="grid-column: 1 / -1; text-align: center; color: #6b7280;">${t.noPhotos}</p>`;
    }

    const pickupAddress = tow?.sameAddress === 'no' 
        ? `${escapeText(tow.alternateAddress?.street)}, ${escapeText(tow.alternateAddress?.city)}`
        : c ? `${escapeText(c.address)}, ${escapeText(c.city)}` : 'N/A';
        
    return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #D2E8E3; padding: 20px;">
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <div style="text-align: center; border-bottom: 3px solid hsl(var(--primary)); padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: hsl(var(--primary)); margin: 0; font-size: 28px;">SCRAP CAR AI</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0;">${t.title}</p>
        </div>

        ${c ? `
        <div style="margin-bottom: 25px;">
          <h2 style="color: #374151; border-left: 4px solid hsl(var(--primary)); padding-left: 10px; margin-bottom: 15px;">${t.clientInfo}</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <p><strong>${t.name}:</strong> ${escapeText(c.name)}</p>
            <p><strong>${t.email}:</strong> ${escapeText(c.email)}</p>
            <p><strong>${t.phone}:</strong> ${escapeText(c.phone)}</p>
            <p><strong>${t.address}:</strong> ${escapeText(c.address)}, ${escapeText(c.city)}, ${escapeText(c.province)}</p>
          </div>
        </div>` : ''}

        ${v ? `
        <div style="margin-bottom: 25px;">
          <h2 style="color: #374151; border-left: 4px solid #dc2626; padding-left: 10px; margin-bottom: 15px;">${t.vehicleDetails}</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <p><strong>${t.vehicle}:</strong> ${escapeText(v.year)} ${escapeText(v.make)} ${escapeText(v.model)}</p>
            <p><strong>${t.mileage}:</strong> ${escapeText(v.mileage)} km</p>
            <p><strong>${t.vin}:</strong> ${escapeText(v.vin) || 'N/A'}</p>
            <p><strong>${t.transmission}:</strong> ${escapeText(v.transmission)}</p>
            <p><strong>${t.driveline}:</strong> ${escapeText(v.driveline)}</p>
            <p><strong>${t.type}:</strong> ${escapeText(v.vehicleType)}</p>
          </div>
        </div>` : ''}

        ${co ? `
        <div style="margin-bottom: 25px;">
          <h2 style="color: #374151; border-left: 4px solid #059669; padding-left: 10px; margin-bottom: 15px;">${t.vehicleCondition}</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <p><strong>${t.runs}:</strong> ${co.runs ? t.yes : t.no}</p>
            <p><strong>${t.accident}:</strong> ${co.accident ? t.yes : t.no}</p>
            <p><strong>${t.missingParts}:</strong> ${co.missingParts?.join(', ') || t.none}</p>
            <p><strong>${t.mechanicalIssues}:</strong> ${co.hasMechanicalIssues ? `${t.yes}: ${escapeText(co.mechanicalIssues)}` : t.no}</p>
            <p><strong>${t.rust}:</strong> ${co.hasRust ? `${t.yes}: ${escapeText(co.rustDetails)}` : t.no}</p>
            <p><strong>${t.wheelType}:</strong> ${escapeText(co.wheelType)}</p>
            <p><strong>${t.bodyDamage}:</strong> ${co.hasBodyDamage ? `${t.yes}: ${escapeText(co.bodyDamageDetails)}` : t.no}</p>
            <p><strong>${t.isComplete}:</strong> ${co.isComplete ? t.yes : t.no}</p>
            ${!co.isComplete ? `<p><strong>${t.incompleteDetails}:</strong> ${escapeText(co.incompleteDetails)}</p>`: ''}
          </div>
        </div>` : ''}

        <div style="margin-bottom: 25px;">
          <h2 style="color: #374151; border-left: 4px solid #7c3aed; padding-left: 10px; margin-bottom: 15px;">${t.vehiclePhotos}</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            ${photosHtml}
          </div>
        </div>

        ${tow ? `
        <div style="margin-bottom: 25px;">
          <h2 style="color: #374151; border-left: 4px solid #dc2626; padding-left: 10px; margin-bottom: 15px;">${t.towing}</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <p><strong>${t.pickupLocation}:</strong> ${pickupAddress}</p>
            <p><strong>${t.pickupDate}:</strong> ${tow.pickupDate ? new Date(tow.pickupDate).toLocaleDateString() : 'N/A'}</p>
            <p><strong>${t.timeSlot}:</strong> ${escapeText(tow.pickupTimeSlot)}</p>
            <p><strong>${t.parking}:</strong> ${escapeText(tow.parkingLocation)}</p>
            <p><strong>${t.allWheels}:</strong> ${tow.allWheels ? t.yes : t.no}</p>
            <p><strong>${t.flatTires}:</strong> ${tow.flatTires ? t.yes : t.no}</p>
            <p><strong>${t.blocked}:</strong> ${tow.blocked ? t.yes : t.no}</p>
            <p><strong>${t.hasKeys}:</strong> ${tow.hasKeys ? t.yes : t.no}</p>
          </div>
        </div>` : ''}

        ${val ? `
        <div style="background: linear-gradient(135deg, #1e3a8a, #3730a3); padding: 30px; border-radius: 12px; text-align: center; color: white; border: 4px solid #22C55E; box-shadow: 0 6px 20px rgba(0,0,0,0.2);">
          <h2 style="margin: 0 0 15px 0; font-size: 28px; color: #DC2626; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
            💰 ${t.finalOffer}
          </h2>
          <p style="font-size: 48px; font-weight: 900; margin: 0; color: #22C55E; text-shadow: 3px 3px 6px rgba(0,0,0,0.4);">
            $${val.finalPrice.toFixed(0)}
          </p>
          <p style="margin: 15px 0 0 0; color: #22C55E; font-size: 18px; font-weight: 700; background: rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block;">
            ${t.firmPrice}
          </p>
        </div>` : ''}

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
          <p style="margin: 0;">${t.thankYou} <strong>SCRAP CAR AI</strong></p>
          <p style="margin: 5px 0 0 0;">${t.contactSoon}</p>
        </div>

      </div>
    </div>
  `;
}


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT!, 10),
    secure: (process.env.SMTP_PORT === '465'),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendEmail(mailOptions: nodemailer.SendMailOptions) {
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return { success: true, info };
    } catch(err: any) {
        console.error('❌ Failed to send email:', err);
        return { success: false, error: err.message || err };
    }
}


export async function sendConfirmationEmail(assessment: Assessment, lang: 'en' | 'fr') {
    const adminEmail = process.env.ADMIN_EMAIL || "hedi_bennis@live.com";
    const fromAddress = `"SCRAP CAR AI" <${process.env.SMTP_USER || adminEmail}>`;
    const clientEmail = assessment.client?.email;
    const clientName = assessment.client?.name || 'New Client';

    if (!clientEmail) {
        console.error("Client email is missing, cannot send email.");
        return { success: false, error: "Client email is missing." };
    }
    
    const htmlBody = buildHtmlBody(assessment, lang);
    const offerPrice = assessment.valuation?.finalPrice.toFixed(0);
    const vehicleName = `${assessment.vehicle?.year} ${assessment.vehicle?.make} ${assessment.vehicle?.model}`;

    const subjects = {
      en: {
        client: `Your ${vehicleName} Assessment - ${offerPrice ? `$${offerPrice}` : ''}`,
        admin: `NEW SUBMISSION - ${clientName} - ${vehicleName} - ${offerPrice ? `$${offerPrice}` : ''}`
      },
      fr: {
        client: `Évaluation de votre ${vehicleName} - ${offerPrice ? `$${offerPrice}` : ''}`,
        admin: `NOUVELLE SOUMISSION - ${clientName} - ${vehicleName} - ${offerPrice ? `$${offerPrice}` : ''}`
      }
    }

    const mailToClient: nodemailer.SendMailOptions = {
        from: fromAddress,
        to: clientEmail,
        subject: subjects[lang].client,
        html: htmlBody,
    };

    const mailToAdmin: nodemailer.SendMailOptions = {
        from: fromAddress,
        to: adminEmail,
        subject: subjects[lang].admin,
        html: htmlBody,
    };
    
    const results = await Promise.all([
      sendEmail(mailToClient),
      sendEmail(mailToAdmin),
    ]);

    const clientResult = results[0];
    const adminResult = results[1];
    const errors = [];

    if (!clientResult.success) {
      errors.push({ to: clientEmail, error: clientResult.error });
    }
    if (!adminResult.success) {
       errors.push({ to: adminEmail, error: adminResult.error });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true };
}

export async function generateOrderPdf(assessment: Assessment, orderType: 'PO' | 'DO') {
    const doc = new jsPDF();
    const orderNumber = orderType === 'PO' ? assessment.summary?.purchaseOrder : assessment.summary?.deliveryOrder;

    doc.setFontSize(18);
    doc.text(`${orderType} - ${orderNumber}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);

    const clientDetails = [
        ["Client", assessment.client?.name || ''],
        ["Courriel", assessment.client?.email || ''],
        ["Téléphone", assessment.client?.phone || ''],
        ["Adresse", `${assessment.client?.address}, ${assessment.client?.city}, ${assessment.client?.province}`]
    ];
    
    autoTable(doc, {
        startY: 40,
        head: [['Détails Client', '']],
        body: clientDetails,
    });
    
    const vehicleDetails = [
        ["Véhicule", `${assessment.vehicle?.year} ${assessment.vehicle?.make} ${assessment.vehicle?.model}`],
        ["NIV", assessment.vehicle?.vin || 'N/A'],
        ["Kilométrage", `${assessment.vehicle?.mileage} km`],
        ["Offre Finale", `$${assessment.valuation?.finalPrice.toFixed(2)}`],
    ];

    autoTable(doc, {
        head: [['Détails Véhicule', '']],
        body: vehicleDetails,
    });

    const towingDetails = [
        ["Date de ramassage", assessment.towing?.pickupDate ? new Date(assessment.towing.pickupDate).toLocaleDateString() : 'N/A'],
        ["Plage horaire", assessment.towing?.pickupTimeSlot || 'N/A'],
        ["Cour assignée", assessment.yard?.yard_name || 'N/A'],
    ]

     autoTable(doc, {
        head: [['Remorquage & Rendez-vous', '']],
        body: towingDetails,
    });

    const pdfOutput = doc.output('datauristring');
    return {
        fileName: `${orderType}_${orderNumber}.pdf`,
        data: pdfOutput
    }
}
