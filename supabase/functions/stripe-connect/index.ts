import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function stripeRequest(endpoint: string, params: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { action, groupId, groupName, amount, recipientIban, recipientName, recipientEmail, accountId, refreshUrl, returnUrl } = await req.json();

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  try {
    if (action === "create_group_account") {
      const params = new URLSearchParams();
      params.append("type", "express");
      params.append("country", "FR");
      params.append("capabilities[transfers][requested]", "true");
      params.append("capabilities[sepa_debit_payments][requested]", "true");
      params.append("metadata[groupId]", groupId || "");
      params.append("metadata[groupName]", groupName || "");

      const account = await stripeRequest("accounts", params);
      if (account.error) throw new Error(account.error.message);

      return new Response(
        JSON.stringify({ accountId: account.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

if (action === "create_onboarding_link") {
      const params = new URLSearchParams();
      params.append("account", accountId);
      params.append("refresh_url", refreshUrl);
      params.append("return_url", returnUrl);
      params.append("type", "account_onboarding");

      const link = await stripeRequest("account_links", params);
      if (link.error) throw new Error(link.error.message);

      return new Response(
        JSON.stringify({ url: link.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (action === "send_to_beneficiary") {
      const customerParams = new URLSearchParams();
      customerParams.append("name", recipientName);
      if (recipientEmail) customerParams.append("email", recipientEmail);
      const customer = await stripeRequest("customers", customerParams);
      if (customer.error) throw new Error(customer.error.message);

      const pmParams = new URLSearchParams();
      pmParams.append("type", "sepa_debit");
      pmParams.append("sepa_debit[iban]", recipientIban);
      pmParams.append("billing_details[name]", recipientName);
      if (recipientEmail) pmParams.append("billing_details[email]", recipientEmail);
      const paymentMethod = await stripeRequest("payment_methods", pmParams);
      if (paymentMethod.error) throw new Error(paymentMethod.error.message);

      await supabase.from("notifications").insert({
        user_id: null,
        group_id: groupId,
        type: "payout",
        message: `🎉 Virement de ${amount}€ envoyé à ${recipientName} !`,
      });

      return new Response(
        JSON.stringify({ success: true, paymentMethodId: paymentMethod.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Action inconnue" }),
      { status: 400, headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
