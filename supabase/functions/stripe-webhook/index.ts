import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(",");
  const timestamp = parts.find(p => p.startsWith("t="))?.split("=")[1];
  const signature = parts.find(p => p.startsWith("v1="))?.split("=")[1];
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

  return expectedSig === signature;
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const valid = await verifyStripeSignature(body, signature, WEBHOOK_SECRET);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const { groupId, memberId } = paymentIntent.metadata;

    if (groupId && memberId) {
      const { data: group } = await supabase
        .from("groups")
        .select("current_month")
        .eq("id", groupId)
        .single();

      if (group) {
        const currentMonth = group.current_month - 1;

        await supabase.from("payments").upsert({
          group_id: groupId,
          member_id: memberId,
          month: currentMonth,
          paid: true,
          paid_at: new Date().toISOString(),
        }, { onConflict: "group_id,member_id,month" });

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

        // Vérifier si tous les membres ont payé ce mois
        const { data: fullGroup } = await supabase
          .from("groups")
          .select("*, group_members(*)")
          .eq("id", groupId)
          .single();

        if (fullGroup) {
          const activeMembers = fullGroup.group_members.filter((m: any) => m.active);
          const { data: monthPayments } = await supabase
            .from("payments")
            .select("member_id, paid")
            .eq("group_id", groupId)
            .eq("month", currentMonth);

          const recipientMember = activeMembers[fullGroup.current_month - 1];
          const paidMemberIds = new Set((monthPayments || []).filter((p: any) => p.paid).map((p: any) => p.member_id));
          
          // Le bénéficiaire est considéré payé automatiquement
          const allPaid = activeMembers.every((m: any) => 
            m.id === recipientMember?.id || paidMemberIds.has(m.id)
          );

          if (allPaid && recipientMember?.user_id) {
            const { data: recipientProfile } = await supabase
              .from("profiles")
              .select("iban, name")
              .eq("id", recipientMember.user_id)
              .single();

            if (recipientProfile?.iban) {
              const guaranteePercent = fullGroup.guarantee_percent || 10;
              const pot = fullGroup.amount * activeMembers.length;
              const netAmount = Math.round(pot * (1 - guaranteePercent / 100) * 0.96 * 100) / 100;

              // Virement automatique vers le bénéficiaire
if (recipientProfile?.iban && fullGroup.stripe_account_id) {
  const guaranteePercent = fullGroup.guarantee_percent || 10;
  const pot = fullGroup.amount * activeMembers.length;
  const netAmount = Math.round(pot * (1 - guaranteePercent / 100) * 0.96 * 100) / 100;

  // Créer un payout depuis le compte Connect du groupe
  const payoutParams = new URLSearchParams();
  payoutParams.append("amount", String(Math.round(netAmount * 100)));
  payoutParams.append("currency", "eur");
  payoutParams.append("method", "instant");
  payoutParams.append("metadata[groupId]", fullGroup.id);
  payoutParams.append("metadata[recipientName]", recipientProfile.name || "");

  const payoutRes = await fetch("https://api.stripe.com/v1/payouts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Account": fullGroup.stripe_account_id,
    },
    body: payoutParams.toString(),
  });

  const payout = await payoutRes.json();
  console.log("PAYOUT:", JSON.stringify(payout));
}

              // Mettre à jour garantie + passer au mois suivant
              const guaranteeAmount = Math.round(pot * (guaranteePercent / 100) * 100) / 100;
              
              await supabase.from("notifications").insert({
                user_id: recipientMember.user_id,
                group_id: fullGroup.id,
                type: "payout",
                message: `🎉 ${netAmount}€ virés sur votre compte pour ${fullGroup.name} !`,
              });

              // Archiver automatiquement si cycle terminé
const newMonth = fullGroup.current_month + 1;
if (newMonth > activeMembers.length) {
  await supabase.from("groups").update({
    archived: true,
    current_month: newMonth,
    guarantee_balance: (fullGroup.guarantee_balance || 0) + guaranteeAmount,
  }).eq("id", fullGroup.id);
} else {
  await supabase.from("groups").update({
    current_month: newMonth,
    guarantee_balance: (fullGroup.guarantee_balance || 0) + guaranteeAmount,
  }).eq("id", fullGroup.id);
}
            }
          }
        }
      }
    }
  }


  

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});