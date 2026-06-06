import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async () => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  // Récupérer tous les groupes actifs
  const { data: groups } = await supabase
    .from("groups")
    .select("*, group_members(*)")
    .eq("archived", false)
    .eq("started", true);

  if (!groups) return new Response("No groups", { status: 200 });

  for (const group of groups) {
    const activeMembers = group.group_members.filter((m: any) => m.active && m.user_id);
    
    for (const member of activeMembers) {
      // Récupérer l'email du membre
      const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      // Envoyer l'email de rappel
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "http://www.ton-tine.com/",
          to: email,
          subject: `💰 Rappel de versement — ${group.name}`,
          html: `
            <h2>Bonjour !</h2>
            <p>C'est le début du mois — n'oublie pas de faire ton versement pour <strong>${group.name}</strong>.</p>
            <p>Montant : <strong>${group.type === "tontine" ? group.amount : Math.ceil(group.goal / group.group_members.length / group.months)}€</strong></p>
            <p>Connecte-toi sur l'app pour confirmer ton paiement !</p>
            <br>
            <p>L'équipe Tontine 🫂</p>
          `,
        }),
      });
    }
  }

  return new Response("Emails sent!", { status: 200 });
});
