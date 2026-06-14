import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

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

  const { action, iban, name, email, amount, customerId, groupId, memberId } = await req.json();

  try {
    if (action === "create_customer") {
      // 1. Créer le customer
      const customerParams = new URLSearchParams();
      customerParams.append("name", name);
      customerParams.append("email", email);
      customerParams.append("metadata[memberId]", memberId || "");
      customerParams.append("metadata[groupId]", groupId || "");
      const customer = await stripeRequest("customers", customerParams);
      if (customer.error) throw new Error(customer.error.message);

      // 2. Créer le payment method SEPA
      const pmParams = new URLSearchParams();
      pmParams.append("type", "sepa_debit");
      pmParams.append("sepa_debit[iban]", iban);
      pmParams.append("billing_details[name]", name);
      pmParams.append("billing_details[email]", email);
      const paymentMethod = await stripeRequest("payment_methods", pmParams);
      if (paymentMethod.error) throw new Error(paymentMethod.error.message);

      // 3. Attacher au customer
      const attachParams = new URLSearchParams();
      attachParams.append("customer", customer.id);
      await stripeRequest(`payment_methods/${paymentMethod.id}/attach`, attachParams);

      // 4. Créer un SetupIntent pour générer le mandat SEPA
      const setupParams = new URLSearchParams();
      setupParams.append("customer", customer.id);
      setupParams.append("payment_method", paymentMethod.id);
      setupParams.append("payment_method_types[]", "sepa_debit");
      setupParams.append("confirm", "true");
      setupParams.append("mandate_data[customer_acceptance][type]", "online");
      setupParams.append("mandate_data[customer_acceptance][online][ip_address]", "0.0.0.0");
      setupParams.append("mandate_data[customer_acceptance][online][user_agent]", "Tontine App");
      const setupIntent = await stripeRequest("setup_intents", setupParams);
      if (setupIntent.error) throw new Error(setupIntent.error.message);

      return new Response(
        JSON.stringify({ customerId: customer.id, paymentMethodId: paymentMethod.id, mandateId: setupIntent.mandate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "charge_member") {
      const params = new URLSearchParams();
      params.append("amount", String(Math.round(amount * 100)));
      params.append("currency", "eur");
      params.append("customer", customerId);
      params.append("payment_method_types[]", "sepa_debit");
      params.append("confirm", "true");
      params.append("off_session", "true");
      params.append("metadata[groupId]", groupId || "");
      params.append("metadata[memberId]", memberId || "");
      const paymentIntent = await stripeRequest("payment_intents", params);
      if (paymentIntent.error) throw new Error(paymentIntent.error.message);

      
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
    console.error("SEPA ERROR:", error.message);
    return new Response(

      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    
    
    );

  }
  
});