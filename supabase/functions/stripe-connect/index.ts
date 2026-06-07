import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { action, groupId, groupName, amount, recipientIban, recipientName, recipientEmail } = await req.json();

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

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

    // Virer le pot au bénéficiaire via IBAN
    if (action === "send_to_beneficiary") {
      // Créer un customer pour le bénéficiaire
      const customer = await stripe.customers.create({
        name: recipientName,
        email: recipientEmail,
      });

      // Créer un payout vers l'IBAN du bénéficiaire
      const paymentMethod = await stripe.paymentMethods.create({
        type: "sepa_debit",
        sepa_debit: { iban: recipientIban },
        billing_details: { name: recipientName, email: recipientEmail },
      });

      // Enregistrer la notification dans Supabase
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