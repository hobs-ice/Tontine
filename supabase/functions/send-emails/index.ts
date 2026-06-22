import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Tontine <noreply@ton-tine.com>",
      to,
      subject,
      html,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { type, email, name, groupName, amount } = await req.json();
  console.log("Received:", type, email);
  

  try {
    if (type === "welcome") {
      await sendEmail(
        email,
        "🫂 Bienvenue sur Tontine !",
        `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #080b12; color: #f1f5f9; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px;">🫂</div>
            <h1 style="color: #f0b429; font-size: 28px; margin: 16px 0;">Bienvenue sur Tontine !</h1>
          </div>
          <p>Bonjour ${name ? name.split(' ')[0] : ''} 👋</p>
          <p>Votre compte Tontine a été créé avec succès !</p>
          <p>Vous pouvez maintenant :</p>
          <ul>
            <li>✅ Créer votre première tontine ou cagnotte</li>
            <li>✅ Inviter vos proches</li>
            <li>✅ Gérer vos versements automatiquement</li>
          </ul>
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://ton-tine.com" style="background: #f0b429; color: #080b12; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700;">
              🚀 Commencer
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 32px; text-align: center;">L'équipe Tontine 🫂</p>
        </div>
        `
      );
    }

    if (type === "payout") {
      await sendEmail(
        email,
        `🎉 Vous recevez ${amount}€ !`,
        `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #080b12; color: #f1f5f9; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px;">🎉</div>
            <h1 style="color: #10b981; font-size: 28px; margin: 16px 0;">${amount}€ virés sur votre compte !</h1>
          </div>
          <p>Bonjour ${name || ''} 👋</p>
          <p>C'est votre tour ! Le pot du groupe <strong style="color: #f0b429;">${groupName}</strong> vous a été viré.</p>
          <p>Montant : <strong style="color: #10b981; font-size: 20px;">${amount}€</strong></p>
          <p style="color: #64748b; font-size: 12px;">Le virement arrivera sur votre compte dans 3-5 jours ouvrés.</p>
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://ton-tine.com" style="background: #f0b429; color: #080b12; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700;">
              📊 Voir mon groupe
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 32px; text-align: center;">L'équipe Tontine 🫂</p>
        </div>
        `
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
