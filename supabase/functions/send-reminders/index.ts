import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

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
    const allMembers = group.group_members.filter((m: any) => m.active);
    if (group.current_month > allMembers.length) {
      results.push({ group: group.name, status: "cycle_finished" });
      continue;
    }

    const activeMembers = group.group_members.filter((m: any) => m.active && m.user_id);

    for (const member of activeMembers) {
      const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id, stripe_payment_method_id, name")
        .eq("id", member.user_id)
        .single();

      if (profile?.stripe_customer_id && profile?.stripe_payment_method_id) {
        try {
          const amount = group.amount;

          const params = new URLSearchParams();
          params.append("amount", String(Math.round(amount * 100)));
          params.append("currency", "eur");
          params.append("customer", profile.stripe_customer_id);
          params.append("payment_method", profile.stripe_payment_method_id);
          params.append("payment_method_types[]", "sepa_debit");
params.append("confirm", "true");
params.append("metadata[groupId]", group.id);
params.append("metadata[memberId]", member.id);
if (group.stripe_account_id && group.stripe_onboarding_complete) {
  params.append("transfer_data[destination]", group.stripe_account_id);
}

          const res = await fetch("https://api.stripe.com/v1/payment_intents", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          const paymentIntent = await res.json();

          if (paymentIntent.error) {
            throw new Error(paymentIntent.error.message);
          }

          results.push({ member: email, status: paymentIntent.status, type: "sepa" });

          await supabase.from("notifications").insert({
            user_id: member.user_id,
            group_id: group.id,
            type: "payment",
            message: `💳 Prélèvement automatique de ${amount}€ pour ${group.name}`,
          });

        } catch (err) {
          await sendReminderEmail(email, group, RESEND_API_KEY!);
          results.push({ member: email, status: "email_fallback", error: err.message });
        }
      } else {
        await sendReminderEmail(email, group, RESEND_API_KEY!);
        results.push({ member: email, status: "email_sent" });
      }
    }
  }

  
return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function sendReminderEmail(email: string, group: any, resendKey: string) {
  const amount = group.amount;

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
      html: `<h2>Bonjour !</h2><p>N'oublie pas ton versement pour <strong>${group.name}</strong>.</p><p>Montant : <strong>${amount}€</strong></p>`,
    }),
  });
}