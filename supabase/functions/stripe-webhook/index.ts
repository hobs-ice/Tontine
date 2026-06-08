import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, WEBHOOK_SECRET!);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  // Paiement réussi
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as any;
    const { groupId, memberId } = paymentIntent.metadata;

    if (groupId && memberId) {
      // Récupérer le groupe et le mois actuel
      const { data: group } = await supabase
        .from("groups")
        .select("current_month, payments")
        .eq("id", groupId)
        .single();

      if (group) {
        const currentMonth = group.current_month - 1;
        const payments = group.payments || {};
        if (!payments[currentMonth]) payments[currentMonth] = {};
        payments[currentMonth][memberId] = true;

        await supabase.from("payments").upsert({
          group_id: groupId,
          member_id: memberId,
          month: currentMonth,
          paid: true,
          paid_at: new Date().toISOString(),
        }, { onConflict: "group_id,member_id,month" });

        // Notification
        const { data: member } = await supabase
          .from("group_members")
          .select("user_id, name")
          .eq("id", memberId)
          .single();

        if (member?.user_id) {
          await supabase.from("notifications").insert({
            user_id: member.user_id,
            group_id: groupId,
            type: "payment",
            message: `✅ Prélèvement de ${paymentIntent.amount / 100}€ confirmé !`,
          });
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

