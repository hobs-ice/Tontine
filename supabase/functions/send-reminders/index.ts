import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.0.0?target=deno";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  const { data: groups } = await supabase
    .from("groups")
    .select("*, group_members(*)")
    .eq("archived", false)
    .eq("started", true);

  if (!groups) return new Response("No groups", { status: 200 });

  const results = [];

  for (const group of groups) {
    const activeMembers = group.group_members.filter((m: any) => m.active && m.user_id);
    
    for (const member of activeMembers) {
      const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      // Récupérer le profil Stripe du membre
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id, stripe_payment_method_id, name")
        .eq("id", member.user_id)
        .single();

      // Prélèvement SEPA automatique si customer Stripe existe
      if (profile?.stripe_customer_id && profile?.stripe_payment_method_id) {
        try {
          const amount = group.type === "tontine" 
            ? group.amount 
            : Math.ceil(group.goal / group.group_members.length / group.months * 100) / 100;

          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: "eur",
            customer: profile.stripe_customer_id,
            payment_method: profile.stripe_payment_method_id,
            payment_method_types: ["sepa_debit"],
            confirm: true,
            metadata: { groupId: group.id, memberId: member.id },
          });

          results.push({ member: email, status: paymentIntent.status, type: 'sepa' });

          // Insérer notification
          await supabase.from("notifications").insert({
            user_id: member.user_id,
            group_id: group.id,
            type: "payment",
            message: `💳 Prélèvement automatique de ${amount}€ pour ${group.name}`,
          });

        } catch (err) {
          // Envoyer email de rappel si prélèvement échoue
          await sendReminderEmail(email, group, RESEND_API_KEY!);
          results.push({ member: email, status: 'email_fallback', type: 'email' });
        }
      } else {
        // Pas de SEPA → envoyer email de rappel
        await sendReminderEmail(email, group, RESEND_API_KEY!);
        results.push({ member: email, status: 'email_sent', type: 'email' });
      }
    }
  }

  return new Response(JSON.stringify({ success: true, results }), { 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
});

async function sendReminderEmail(email: string, group: any, resendKey: string) {
  const amount = group.type === "tontine" 
    ? group.amount 
    : Math.ceil(group.goal / group.group_members.length / group.months * 100) / 100;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "Tontine <rappel@tondomaine.com>",
      to: email,
      subject: `💰 Rappel de versement — ${group.name}`,
      html: `
        <h2>Bonjour !</h2>
        <p>C'est le début du mois — n'oublie pas de faire ton versement pour <strong>${group.name}</strong>.</p>
        <p>Montant : <strong>${amount}€</strong></p>
        <p>Connecte-toi sur l'app pour payer !</p>
        <br>
        <p>L'équipe Tontine 🫂</p>
      `,
    }),
  });
}
