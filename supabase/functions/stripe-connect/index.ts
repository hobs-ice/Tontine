import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.0.0?target=deno";

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

  const { action, groupId, groupName, amount, recipientIban, recipientName } = await req.json();

  try {
    // Créer un compte virtuel pour le groupe
    if (action === "create_group_account") {
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        capabilities: {
          transfers: { requested: true },
          sepa_debit_payments: { requested: true },
        },
        metadata: { groupId, groupName },
      });
      return new Response(
        JSON.stringify({ accountId: account.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Virer le pot au bénéficiaire
    if (action === "send_to_beneficiary") {
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: "eur",
        destination: Deno.env.get("STRIPE_CONNECT_ACCOUNT")!,
        metadata: { groupId, recipientName },
      });
      return new Response(
        JSON.stringify({ transferId: transfer.id }),
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

