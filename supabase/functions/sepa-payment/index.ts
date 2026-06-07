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

  const { action, iban, name, email, amount, customerId, groupId, memberId } = await req.json();

  try {
    // Créer un customer Stripe avec IBAN
    if (action === "create_customer") {
      const customer = await stripe.customers.create({
        name,
        email,
        metadata: { memberId, groupId },
      });

      const paymentMethod = await stripe.paymentMethods.create({
        type: "sepa_debit",
        sepa_debit: { iban },
        billing_details: { name, email },
      });

      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customer.id,
      });

      return new Response(
        JSON.stringify({ customerId: customer.id, paymentMethodId: paymentMethod.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prélever automatiquement
    if (action === "charge_member") {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "eur",
        customer: customerId,
        payment_method_types: ["sepa_debit"],
        confirm: true,
        metadata: { groupId, memberId },
      });

      return new Response(
        JSON.stringify({ paymentIntentId: paymentIntent.id, status: paymentIntent.status }),
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