import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Auth from './Auth';
import Profile from './Profile';

// ── DESIGN TOKENS ─────────────────────────────────────────────
const C = {
  bg: "#080b12", card: "#0e1420", cardBorder: "#1c2535",
  accent: "#f0b429", accentDim: "#f0b42920",
  green: "#10b981", greenDim: "#10b98120",
  red: "#ef4444", redDim: "#ef444420",
  teal: "#06b6d4", tealDim: "#06b6d420",
  purple: "#8b5cf6", purpleDim: "#8b5cf620",
  orange: "#f97316", orangeDim: "#f9731620",
  text: "#f1f5f9", muted: "#64748b", subtle: "#1e293b",
};

const styleTag = document.createElement("style");
styleTag.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Cabinet+Grotesk:wght@300;400;500;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg};font-family:'DM Sans',sans-serif;color:${C.text};min-height:100vh}
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-thumb{background:${C.cardBorder};border-radius:2px}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  .fade-in{animation:fadeIn .25s ease forwards}
  .pulse{animation:pulse 2s infinite}
`;
document.head.appendChild(styleTag);

// ── HELPERS ───────────────────────────────────────────────────
const fmt = n => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const pct = (a, b) => b === 0 ? 0 : Math.round(a / b * 100);
const today = new Date();
const DAY = today.getDate();


function Avatar({ name, size = 36 }) {
  const i = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: `hsl(${h},50%,38%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: size * .35, color: "#fff", flexShrink: 0 }}>{i}</div>;
}

function Badge({ children, color = C.accent }) {
  return <span style={{ background: color + "25", color, border: `1px solid ${color}40`, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>;
}

function Card({ children, style = {}, onClick }) {
  return <div className="fade-in" onClick={onClick} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: 18, cursor: onClick ? "pointer" : "default", ...style }}>{children}</div>;
}

function Btn({ children, onClick, color = C.accent, ghost = false, style = {}, disabled = false, small = false }) {
  return <button onClick={onClick} disabled={disabled} style={{ border: ghost ? `1px solid ${color}50` : "none", borderRadius: 10, padding: small ? "6px 14px" : "11px 22px", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: small ? 12 : 13, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .4 : 1, transition: "opacity .15s", background: ghost ? color + "15" : color, color: ghost ? color : "#080b12", ...style }}>{children}</button>;
}

function Pill({ label, value, color = C.accent }) {
  return <div style={{ background: C.subtle, borderRadius: 12, padding: "10px 14px", flex: 1 }}>
    <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color }}>{value}</div>
  </div>;
}

// Donut chart
function Donut({ paid, total, color, size = 80 }) {
  const r = 28, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const filled = total === 0 ? 0 : (paid / total) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.cardBorder} strokeWidth={8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dasharray .4s ease" }} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, fill: color }}>{pct(paid, total)}%</text>
    </svg>
  );
}

// Progress bar
function ProgressBar({ value, max, color = C.accent, height = 6 }) {
  return <div style={{ background: C.cardBorder, borderRadius: height, height, overflow: "hidden" }}>
    <div style={{ width: `${pct(value, max)}%`, height: "100%", background: color, borderRadius: height, transition: "width .4s ease" }} />
  </div>;
}

// Fee breakdown
function FeeNote({ amount }) {
  const stripe = Math.round(amount * 0.01 * 100) / 100;
  const app = Math.round(amount * 0.03 * 100) / 100;
  return <div style={{ background: C.subtle, borderRadius: 10, padding: "10px 14px", fontSize: 11, color: C.muted }}>
    <div style={{ marginBottom: 3 }}>💳 Frais Stripe (1%) : <span style={{ color: C.text }}>{fmt(stripe)}€</span></div>
    <div>🏦 Frais app (3%) : <span style={{ color: C.text }}>{fmt(app)}€</span></div>
    <div style={{ marginTop: 6, color: C.accent, fontWeight: 600 }}>Vous recevez : {fmt(amount - stripe - app)}€</div>
  </div>;
}



// ── HOME ──────────────────────────────────────────────────────
function HomeView({ groups, onNew, onOpen, onLogout, onProfile, profile }) {
  console.log('Profile in HomeView:', profile);
  const tontines = groups.filter(g => g.type === "tontine");
  
  const cagnottes = groups.filter(g => g.type === "cagnotte");

  function GroupCard({ g }) {
    const active = g.members.filter(m => m.active);
    const monthPayments = g.payments[g.currentMonth - 1] || {};
    const paidCount = active.filter(m => monthPayments[m.id]).length;
    const color = g.type === "tontine" ? C.accent : C.teal;
    const isLate = DAY > 28;

    return (
      <Card onClick={() => onOpen(g.id)} style={{ marginBottom: 10, transition: "border-color .2s", borderColor: isLate && paidCount < active.length ? C.red + "60" : C.cardBorder }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <Badge color={color}>{g.type === "tontine" ? "🔄 Tontine" : "🎯 Cagnotte"}</Badge>
              {g.payMethod === "stripe" ? <Badge color={C.purple}>⚡ Stripe</Badge> : <Badge color={C.muted}>🏦 Virement</Badge>}
            </div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 }}>{g.name}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{active.length} membres actifs</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Donut paid={paidCount} total={active.length} color={color} size={64} />
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>ce mois</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressBar
            value={g.currentMonth - 1}
            max={g.type === "tontine" ? g.members.length : g.months}
            color={color}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: C.muted }}>Mois {g.currentMonth}</span>
            <span style={{ fontSize: 11, color }}>
              {g.type === "tontine" ? `${fmt(g.amount * active.length)}€/mois` : `Objectif ${fmt(g.goal)}€`}
            </span>
          </div>
        </div>
        {isLate && paidCount < active.length && (
          <div className="pulse" style={{ marginTop: 8, fontSize: 11, color: C.red, fontWeight: 600 }}>
            ⚠ {active.length - paidCount} membre(s) en retard
          </div>
        )}
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: "-.03em" }}>🫂 Tontine</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>L'épargne collective entre amis</div>
       <button onClick={onProfile} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
  {profile?.avatar_url ? (
    <img src={profile.avatar_url} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
  ) : (
    <span style={{ fontSize: 20 }}>👤</span>
  )}
</button> <span style={{ color: C.muted, fontSize: 12 }}>|</span>   
             <button onClick={onLogout} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12 }}>
   Déconnexion
</button>
      </div>

      {groups.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🪙</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 8 }}>Aucun groupe</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Crée ta première tontine ou cagnotte</div>
          <Btn onClick={onNew}>+ Créer un groupe</Btn>
        </Card>
      ) : (
        <>
          {tontines.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>🔄 Tontines</div>
              {tontines.map(g => <GroupCard key={g.id} g={g} />)}
            </div>
          )}
          {cagnottes.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>🎯 Cagnottes</div>
              {cagnottes.map(g => <GroupCard key={g.id} g={g} />)}
            </div>
          )}
          <Btn onClick={onNew} style={{ width: "100%" }}>+ Nouveau groupe</Btn>
        </>
      )}
    </div>
  );
}

// ── CREATE ────────────────────────────────────────────────────
function CreateView({ onCreate, onBack }) {
  const [type, setType] = useState("tontine");
  const [step] = useState(1); // eslint-disable-line no-unused-vars
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [goal, setGoal] = useState("");
  const [months, setMonths] = useState("");
  const [payMethod, setPayMethod] = useState("stripe");
  const [iban, setIban] = useState('');
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState([{ id: 0, name: "Moi", isCreator: true, active: true, joined: 1 }]);


  const color = type === "tontine" ? C.accent : C.teal;
  const monthly = type === "cagnotte" && Number(goal) > 0 && members.length > 0 && Number(months) > 0
    ? Math.ceil(Number(goal) / members.length / Number(months) * 100) / 100 : null;

  const addMember = () => {
    const t = memberInput.trim();
    if (!t) return;
    const id = members.length;
    setMembers(m => [...m, { id, name: t, isCreator: false, active: true, joined: id + 1 }]);
    setMemberInput("");
  };
  const removeMember = i => setMembers(m => m.filter((_, idx) => idx !== i));
  const shuffle = () => setMembers(m => {
    const [c, ...rest] = m;
    return [c, ...rest.sort(() => Math.random() - .5).map((x, i) => ({ ...x, joined: i + 2 }))];
  });

  const canNext1 = name.trim() && (type === "tontine" ? Number(amount) > 0 : Number(goal) > 0 && Number(months) > 0);
  const canCreate = canNext1 && members.length >= 2;

  const handle = () => {
  const base = { type, name, payMethod, iban, started: false, currentMonth: 1, payments: {}, banVotes: {}, banCandidates: [] };
  if (type === "tontine") onCreate({ ...base, amount: Number(amount), members });
  else onCreate({ ...base, goal: Number(goal), months: Number(months), members, unlockVotes: {}, redistributeVotes: {}, refundRequests: [] });
};

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 16px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", marginBottom: 20, fontSize: 13 }}>← Retour</button>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Nouveau groupe</div>

      {/* type */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[["tontine", "🔄", "Tontine", "Chacun reçoit à son tour", C.accent], ["cagnotte", "🎯", "Cagnotte", "Objectif commun", C.teal]].map(([t, icon, label, desc, col]) => (
          <div key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "14px 10px", borderRadius: 14, cursor: "pointer", textAlign: "center", border: `2px solid ${type === t ? col : C.cardBorder}`, background: type === t ? col + "15" : C.card, transition: "all .15s" }}>
            <div style={{ fontSize: 26, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: type === t ? col : C.text }}>{label}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* nom */}
      <Card style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 8 }}>NOM DU GROUPE</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={type === "tontine" ? "Tontine des potes" : "Voyage Seychelles 🇸🇨"}
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 18, fontFamily: "'Syne',sans-serif", fontWeight: 700 }} />
      </Card>

      {/* montants */}
      {type === "tontine" ? (
        <Card style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 8 }}>MISE MENSUELLE (€)</div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100"
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: C.accent, fontSize: 32, fontFamily: "'Syne',sans-serif", fontWeight: 800 }} />
        </Card>
      ) : (
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <Card style={{ flex: 2 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 8 }}>OBJECTIF (€)</div>
            <input type="number" value={goal} onChange={e => setGoal(e.target.value)} placeholder="1000"
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: C.teal, fontSize: 32, fontFamily: "'Syne',sans-serif", fontWeight: 800 }} />
          </Card>
          <Card style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 8 }}>DURÉE (mois)</div>
            <input type="number" value={months} onChange={e => setMonths(e.target.value)} placeholder="6"
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 32, fontFamily: "'Syne',sans-serif", fontWeight: 800 }} />
          </Card>
        </div>
      )}

      {/* paiement */}
      <Card style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 10 }}>MODE DE PAIEMENT</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["stripe", "⚡ Stripe", "Prélèvement auto", C.purple], ["virement", "🏦 Virement", "Manuel + confirmation", C.muted]].map(([v, label, sub, col]) => (
            <div key={v} onClick={() => setPayMethod(v)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `2px solid ${payMethod === v ? col : C.cardBorder}`, background: payMethod === v ? col + "15" : "transparent", transition: "all .15s" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: payMethod === v ? col : C.text }}>{label}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </Card>
      {payMethod === 'virement' && (
  <Card style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 6 }}>IBAN (optionnel)</div>
    <input value={iban} onChange={e => setIban(e.target.value.toUpperCase())}
      placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
      style={{ width: "100%", background: C.subtle, border: "none", borderRadius: 8, padding: "10px 12px", color: C.text, outline: "none", fontSize: 13, letterSpacing: ".05em" }} />
  </Card>
)}

      {/* membres */}
      <Card style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em" }}>MEMBRES ({members.length})</div>
          {type === "tontine" && <button onClick={shuffle} style={{ background: "none", border: "none", color: C.purple, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>🔀 Ordre aléatoire</button>}
        </div>
        {members.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            {type === "tontine" && <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.subtle, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.muted, flexShrink: 0 }}>{i + 1}</div>}
            <Avatar name={m.name} size={30} />
            <div style={{ flex: 1, fontSize: 13 }}>{m.name}</div>
            {m.isCreator ? <Badge color={color}>Créateur</Badge> : <button onClick={() => removeMember(i)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 18 }}>×</button>}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input value={memberInput} onChange={e => setMemberInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addMember()} placeholder="Prénom..."
            style={{ flex: 1, background: C.subtle, border: "none", borderRadius: 8, padding: "8px 12px", color: C.text, outline: "none", fontSize: 13 }} />
          <Btn onClick={addMember} ghost color={C.muted} small>+ Ajouter</Btn>
        </div>
      </Card>

      {/* récap frais */}
      {canCreate && (
        <Card style={{ marginBottom: 14, borderColor: color + "40" }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 10 }}>RÉCAP & FRAIS</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {type === "tontine" ? (
              <>
                <Pill label="Cagnotte / mois" value={`${fmt(Number(amount) * members.length)}€`} color={C.accent} />
                <Pill label="Durée cycle" value={`${members.length} mois`} color={C.text} />
              </>
            ) : (
              <>
                <Pill label="Par personne / mois" value={`${fmt(monthly)}€`} color={C.teal} />
                <Pill label="Part / personne" value={`${fmt(Math.round(Number(goal) / members.length))}€`} color={C.text} />
              </>
            )}
          </div>
          <FeeNote amount={type === "tontine" ? Number(amount) * members.length : Number(goal)} />
        </Card>
      )}

      <Btn onClick={handle} disabled={!canCreate} color={color} style={{ width: "100%" }}>
        🚀 Lancer {type === "tontine" ? "la tontine" : "la cagnotte"}
      </Btn>
    </div>
  );
}

function InviteAccept({ invites, session, onDone }) {
  const acceptInvite = async (invite) => {
  await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invite.id);

  if (invite.member_id) {
    // Mettre à jour le membre spécifique
    await supabase
      .from('group_members')
      .update({ user_id: session.user.id })
      .eq('id', invite.member_id);
  } else {
    // Créer un nouveau membre
    await supabase
      .from('group_members')
      .insert({
        group_id: invite.group_id,
        user_id: session.user.id,
        name: session.user.email.split('@')[0],
        is_creator: false,
        active: true,
        join_order: 99,
      });
  }

  onDone();
};


  const declineInvite = async (invite) => {
    await supabase
      .from('invitations')
      .update({ status: 'declined' })
      .eq('id', invite.id);
    onDone();
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 24 }}>
        🫂 Invitations en attente
      </div>
      {invites.map((invite, i) => (
        <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: 20, marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginBottom: 6 }}>
            {invite.groups?.name}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
  Tu as été invité à rejoindre <strong style={{ color: C.accent }}>{invite.groups?.name}</strong>
</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => acceptInvite(invite)}
              style={{ flex: 1, background: C.green, border: 'none', borderRadius: 10, padding: '10px', color: '#080b12', fontWeight: 700, cursor: 'pointer' }}>
              ✅ Accepter
            </button>
            <button onClick={() => declineInvite(invite)}
              style={{ flex: 1, background: C.redDim, border: `1px solid ${C.red}`, borderRadius: 10, padding: '10px', color: C.red, fontWeight: 700, cursor: 'pointer' }}>
              ❌ Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InviteForm({ groupId, members }) {
  
  const [email, setEmail] = useState('');
  const [memberId, setMemberId] = useState('');
  const [status, setStatus] = useState('');
  
  const sendInvite = async () => {
  if (!email.trim() || !memberId) {
    setStatus('⚠️ Sélectionne un membre et entre un email');
    setTimeout(() => setStatus(''), 3000);
    return;
  }
    const { error } = await supabase
      .from('invitations')
      .insert({ 
        group_id: groupId, 
        email: email.trim().toLowerCase(),
        member_id: memberId || null
      });
    
    if (!error) {
      setStatus('✅ Invitation envoyée !');
      setEmail('');
      setMemberId('');
    } else {
      setStatus('❌ Erreur');
    }
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div>
      <select value={memberId} onChange={e => setMemberId(e.target.value)}
        style={{ width: '100%', background: C.subtle, border: 'none', borderRadius: 8, padding: '8px 12px', color: C.text, outline: 'none', fontSize: 13, marginBottom: 8 }}>
        <option value="">Sélectionner un membre</option>
        {members.filter(m => !m.user_id && !m.is_creator).map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="email@exemple.com"
          onKeyDown={e => e.key === 'Enter' && sendInvite()}
          style={{ flex: 1, background: C.subtle, border: 'none', borderRadius: 8, padding: '8px 12px', color: C.text, outline: 'none', fontSize: 13 }} />
        <button onClick={sendInvite} disabled={!email || !memberId}
  style={{ 
    background: !email || !memberId ? C.subtle : C.accent, 
    border: 'none', 
    borderRadius: 8, 
    padding: '8px 14px', 
    color: !email || !memberId ? C.muted : '#080b12', 
    fontWeight: 700, 
    cursor: !email || !memberId ? 'not-allowed' : 'pointer', 
    fontSize: 12 
  }}>
  Inviter
</button>

      </div>
      {status && <div style={{ fontSize: 12, marginTop: 6, color: C.green }}>{status}</div>}
    </div>
  );
}
// ── TONTINE DETAIL ────────────────────────────────────────────
function TontineDetail({ group, onBack, onUpdate, session }) {
  const [tab, setTab] = useState("dashboard");
  const { name, amount, members, currentMonth, payments, banVotes, payMethod } = group;
  const active = members.filter(m => m.active);
  const pot = amount * active.length;
  const netPot = Math.round(pot * 0.96 * 100) / 100;
  const recipient = active[currentMonth - 1] || active[0];
  const monthPaid = (mi, pi) => payments?.[mi]?.[pi] ?? false;
  const allPaid = active.every(m => monthPaid(currentMonth - 1, m.id));
  const myId = 0; // simulate current user = Amilcar

  const togglePaid = (memberId) => {
    const p = { ...group.payments };
    const mi = currentMonth - 1;
    if (!p[mi]) p[mi] = {};
    p[mi] = { ...p[mi], [memberId]: !p[mi][memberId] };
    onUpdate({ ...group, payments: p });
  };

  const castBanVote = (candidateId, vote) => {
    const bv = { ...group.banVotes };
    if (!bv[candidateId]) bv[candidateId] = {};
    bv[candidateId] = { ...bv[candidateId], [myId]: vote };
    onUpdate({ ...group, banVotes: bv });
  };

  const initiateBan = (memberId) => {
    const bv = { ...group.banVotes };
    if (!bv[memberId]) bv[memberId] = {};
    onUpdate({ ...group, banVotes: bv });
  };

  // Check ban candidate: 2 consecutive missed payments
  const getLateMembers = () => {
    return active.filter(m => {
      if (m.isCreator) return false;
      if (m.id === recipient?.id) return false;
      const missed1 = currentMonth >= 2 && !monthPaid(currentMonth - 2, m.id);
      const missed2 = !monthPaid(currentMonth - 1, m.id);
      return missed1 && missed2 && DAY >= 28;
    });
  };

  const lateMembers = getLateMembers();

  const getBanResult = (candidateId) => {
    const votes = banVotes[candidateId] || {};
    const voters = active.filter(m => m.id !== recipient?.id && m.id !== candidateId);
    const yes = Object.values(votes).filter(v => v === "yes").length;
    const no = Object.values(votes).filter(v => v === "no").length;
    const total = voters.length;
    return { yes, no, total, majority: yes > total / 2, tie: yes === no && yes + no === total };
  };

  const color = C.accent;

  const tabs = [
  { id: "dashboard", label: "📊 Tableau" },
  { id: "payments", label: "💳 Paiements" },
  { id: "history", label: "📈 Historique" },
  { id: "order", label: "📋 Ordre" },
  { id: "governance", label: "⚖️ Gouvernance" },
];

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Retour</button>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <Badge color={C.accent}>🔄 Tontine</Badge>
        <Badge color={payMethod === "stripe" ? C.purple : C.muted}>{payMethod === "stripe" ? "⚡ Stripe" : "🏦 Virement"}</Badge>
      </div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{name}</div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>{active.length} membres · {amount}€/mois · Mois {currentMonth}/{members.length}</div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? color + "20" : "transparent", border: `1px solid ${tab === t.id ? color + "60" : C.cardBorder}`, borderRadius: 20, padding: "6px 14px", color: tab === t.id ? color : C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <div className="fade-in">
          <Card style={{ marginBottom: 12, background: "linear-gradient(135deg,#0e1420,#1a1040)", borderColor: C.purple + "40", textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: ".1em", textTransform: "uppercase" }}>Cagnotte du mois</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 52, fontWeight: 800, color: C.accent, lineHeight: 1 }}>{fmt(pot)}€</div>
            <FeeNote amount={pot} />
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Avatar name={recipient?.name || "?"} size={30} />
              <span style={{ fontSize: 14 }}>Pour <strong>{recipient?.name}</strong> le 5 du mois</span>
            
            {group.creator_id === session?.user?.id && (!group.started || currentMonth > members.length) && (
  <Btn onClick={async () => {
    if (window.confirm('Archiver ce groupe ?')) {
      await supabase.from('groups').update({ archived: true }).eq('id', group.id);
      onBack();
    }
  }} color={C.muted} ghost style={{ width: '100%', marginTop: 12 }}>
    📦 Archiver le groupe
  </Btn>
)}
            </div>
          </Card>
          
          <Card style={{ marginBottom: 12 }}>
  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>📧 Inviter un membre</div>
  <InviteForm groupId={group.id} members={active} />
</Card>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Pill label="Versements ce mois" value={`${active.filter(m => monthPaid(currentMonth - 1, m.id)).length}/${active.length}`} color={C.green} />
            <Pill label="Progression cycle" value={`${currentMonth}/${members.length}`} color={C.accent} />
          </div>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Versements — Mois {currentMonth}</div>
              <Donut paid={active.filter(m => monthPaid(currentMonth - 1, m.id)).length} total={active.length} color={C.accent} size={56} />
            </div>
            <ProgressBar value={currentMonth - 1} max={members.length} color={C.accent} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: C.muted }}>Début</span>
              <span style={{ fontSize: 10, color: C.muted }}>{members.length} mois</span>
            </div>
          </Card>

          {lateMembers.length > 0 && (
            <Card style={{ borderColor: C.red + "50", background: C.redDim }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 8 }}>⚠ Membres en retard (2e mois)</div>
              {lateMembers.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Avatar name={m.name} size={28} />
                  <div style={{ flex: 1, fontSize: 13 }}>{m.name}</div>
                  <Btn onClick={() => { initiateBan(m.id); setTab("governance"); }} color={C.red} small>Voter bannissement</Btn>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

{/* HISTORY */}
{tab === "history" && (
  <div className="fade-in">
    <Card style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>📈 Historique des paiements</div>
      {Array.from({ length: currentMonth }, (_, i) => i).map(monthIndex => {
        const monthPayments = payments[monthIndex] || {};
        const paidCount = active.filter(m => monthPayments[m.id]).length;
        const isComplete = paidCount === active.length;
        const recipientIndex = monthIndex;
        const monthRecipient = active[recipientIndex] || active[0];
        return (
          <div key={monthIndex} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.cardBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13 }}>
                Mois {monthIndex + 1}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {isComplete && <Badge color={C.green}>✓ Complet</Badge>}
                {!isComplete && monthIndex < currentMonth - 1 && <Badge color={C.red}>⚠ Incomplet</Badge>}
                {monthIndex === currentMonth - 1 && !isComplete && <Badge color={C.accent}>En cours</Badge>}
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
              🎉 Bénéficiaire : <strong style={{ color: C.accent }}>{monthRecipient?.name}</strong> · {fmt(pot * 0.96)}€ net
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {active.map(m => {
                const isRecipient = m.id === monthRecipient?.id;
                const paid = isRecipient || monthPayments[m.id];
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: paid ? C.greenDim : C.redDim, borderRadius: 8, padding: '4px 8px', border: `1px solid ${paid ? C.green : C.red}30` }}>
                    <span style={{ fontSize: 10 }}>{paid ? '✓' : '✗'}</span>
                    <span style={{ fontSize: 11, color: paid ? C.green : C.red }}>{m.name}</span>
                    {isRecipient && <span style={{ fontSize: 10 }}>🎉</span>}
                  </div>
                );
              })}
            </div>
            <ProgressBar value={paidCount} max={active.length} color={isComplete ? C.green : C.accent} height={4} />
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{paidCount}/{active.length} versements</div>
          </div>
        );
      })}
    </Card>
  </div>
)}

      {/* PAYMENTS */}
      {tab === "payments" && (
        <div className="fade-in">
          {payMethod === "virement" && (
  <Card style={{ marginBottom: 12, borderColor: C.purple + "40", background: C.purpleDim }}>
    <div style={{ fontSize: 11, color: C.purple, fontWeight: 600, marginBottom: 4 }}>🏦 Mode virement</div>
    <div style={{ fontSize: 12, color: C.muted, marginBottom: group.iban ? 8 : 0 }}>Le créateur confirme chaque versement manuellement. Fenêtre : 1 au 28 du mois.</div>
    {group.iban && (
      <div style={{ background: C.subtle, borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>IBAN pour virement</div>
        <div style={{ fontSize: 14, color: C.text, fontWeight: 700, letterSpacing: ".05em" }}>{group.iban}</div>
        <button onClick={() => navigator.clipboard.writeText(group.iban).then(() => alert('IBAN copié !'))}
          style={{ background: 'none', border: 'none', color: C.purple, fontSize: 11, cursor: 'pointer', marginTop: 4, fontWeight: 600 }}>
          📋 Copier l'IBAN
        </button>
      </div>
    )}
  </Card>
)}
          {payMethod === "stripe" && (
            <Card style={{ marginBottom: 12, borderColor: C.purple + "40", background: C.purpleDim }}>
              <div style={{ fontSize: 11, color: C.purple, fontWeight: 600, marginBottom: 4 }}>⚡ Prélèvement Stripe automatique</div>
              <div style={{ fontSize: 12, color: C.muted }}>Prélevé automatiquement entre le 1 et le 28. S'arrête au dernier mois du cycle.</div>
            </Card>
          )}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Mois {currentMonth}</div>
              {allPaid && <Badge color={C.green}>✓ Complet</Badge>}
            </div>
            {active.map(m => {
              const isRecipient = m.id === recipient?.id;
              const paid = isRecipient || monthPaid(currentMonth - 1, m.id);
              const isLate = DAY > 25 && !paid && !isRecipient;
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 10px", borderRadius: 10, background: isLate ? C.redDim : "transparent", border: isLate ? `1px solid ${C.red}30` : "1px solid transparent" }}>
                  <Avatar name={m.name} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}{m.isCreator ? " 👑" : ""}</div>
                    <div style={{ fontSize: 11, color: isLate ? C.red : C.muted }}>
                      {isRecipient ? "🎉 Bénéficiaire" : isLate ? "⚠ En retard" : `${fmt(amount)}€ à verser`}
                    </div>
                  </div>
                  {isRecipient ? <Badge color={C.accent}>Reçoit {fmt(netPot)}€</Badge> : (
                    <button onClick={() => togglePaid(m.id)} style={{ background: paid ? C.greenDim : C.subtle, border: `1px solid ${paid ? C.green : C.cardBorder}`, color: paid ? C.green : C.muted, borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                      {paid ? "✓ Payé" : payMethod === "stripe" ? "⚡ Auto" : "Confirmer"}
                    </button>
                  )}
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* ORDER */}
      {tab === "order" && (
        <div className="fade-in">
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Ordre de passage</div>
            {members.map((m, i) => {
              const done = i < currentMonth - 1;
              const current = i === currentMonth - 1;
              const banned = !m.active;
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, opacity: done ? .4 : 1 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: current ? C.accent : banned ? C.red : C.subtle, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: current ? "#080b12" : C.muted, flexShrink: 0 }}>{i + 1}</div>
                  <Avatar name={m.name} size={30} />
                  <div style={{ flex: 1, fontSize: 13 }}>{m.name}{m.isCreator ? " 👑" : ""}</div>
                  {done && <Badge color={C.muted}>Passé</Badge>}
                  {current && <Badge color={C.accent}>Ce mois</Badge>}
                  {!done && !current && !banned && <span style={{ fontSize: 11, color: C.muted }}>Mois {i + 1}</span>}
                  {banned && <Badge color={C.red}>Banni</Badge>}
                </div>
              );
            })}
          </Card>
          {currentMonth === members.filter(m => m.active).length && (
            <Card style={{ marginTop: 12, borderColor: C.green + "50", background: C.greenDim, textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: C.green }}>Cycle terminé !</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Tout le monde a reçu sa part. Les prélèvements sont arrêtés.</div>
            </Card>
          )}
        </div>
      )}

      {/* GOVERNANCE */}
      {tab === "governance" && (
        <div className="fade-in">
          <Card style={{ marginBottom: 12, borderColor: C.orange + "40", background: C.orangeDim }}>
            <div style={{ fontSize: 11, color: C.orange, fontWeight: 700, marginBottom: 6 }}>ℹ Règles de gouvernance</div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
              • Bannissement possible uniquement si le membre n'a pas encore reçu sa part<br />
              • Vote ouvert à tous sauf le bénéficiaire du mois<br />
              • Majorité simple décide · En cas d'égalité : le créateur tranche<br />
              • Pénalité du banni redistribuée au prochain bénéficiaire<br />
              • Vote sur maintien du pot (mensualités +) ou pot réduit
            </div>
          </Card>

          {Object.keys(banVotes).length === 0 && lateMembers.length === 0 && (
            <Card style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13, color: C.muted }}>Aucun vote en cours</div>
            </Card>
          )}

          {Object.keys(banVotes).map(candidateIdStr => {
            const candidateId = Number(candidateIdStr);
            const candidate = members.find(m => m.id === candidateId);
            if (!candidate) return null;
            const { yes, no, total, majority, tie } = getBanResult(candidateId);
            const myVote = banVotes[candidateId]?.[myId];
            const alreadyReceived = members.findIndex(m => m.id === candidateId) < currentMonth - 1;

            return (
              <Card key={candidateId} style={{ marginBottom: 12, borderColor: C.red + "40" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Avatar name={candidate.name} size={36} />
                  <div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>Vote : bannir {candidate.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>2 versements manqués consécutifs</div>
                  </div>
                </div>

                {alreadyReceived ? (
                  <div style={{ fontSize: 12, color: C.orange }}>⚠ Ce membre a déjà reçu sa part — bannissement non applicable.</div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <div style={{ flex: 1, background: C.greenDim, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: C.green }}>{yes}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>Oui</div>
                      </div>
                      <div style={{ flex: 1, background: C.redDim, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: C.red }}>{no}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>Non</div>
                      </div>
                      <div style={{ flex: 1, background: C.subtle, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20 }}>{total - yes - no}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>En attente</div>
                      </div>
                    </div>

                    {!myVote && myId !== candidateId && myId !== recipient?.id && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        <Btn onClick={() => castBanVote(candidateId, "yes")} color={C.red} style={{ flex: 1 }}>👎 Bannir</Btn>
                        <Btn onClick={() => castBanVote(candidateId, "no")} color={C.green} style={{ flex: 1 }}>👍 Garder</Btn>
                      </div>
                    )}
                    {myVote && <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Votre vote : <strong style={{ color: myVote === "yes" ? C.red : C.green }}>{myVote === "yes" ? "Bannir" : "Garder"}</strong></div>}

                    {tie && <div style={{ fontSize: 12, color: C.orange, marginBottom: 8 }}>⚖ Égalité — le créateur peut trancher</div>}
                    {majority && (
                      <div style={{ background: C.redDim, borderRadius: 8, padding: 10, fontSize: 12, color: C.red }}>
                        ✅ Majorité atteinte — {candidate.name} peut être banni.<br />
                        Pénalité redistribuée au prochain bénéficiaire. Vote ouvert sur maintien du pot.
                      </div>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CAGNOTTE DETAIL ───────────────────────────────────────────
function CagnotteDetail({ group, onBack, onUpdate }) {
  const [tab, setTab] = useState("dashboard");
  const { name, goal, months, members, currentMonth, payments, unlockVotes, payMethod, refundRequests } = group;
  const active = members.filter(m => m.active);
  const monthly = Math.ceil(goal / members.length / months * 100) / 100;
  const myId = 0;

  const monthPaid = (mi, memberId) => payments?.[mi]?.[memberId] ?? false;

  const totalCollected = active.reduce((sum, m) => {
    let mSum = 0;
    for (let i = 0; i < currentMonth; i++) if (monthPaid(i, m.id)) mSum += monthly;
    return sum + mSum;
  }, 0);

  const togglePaid = (memberId) => {
    const p = { ...group.payments };
    const mi = currentMonth - 1;
    if (!p[mi]) p[mi] = {};
    p[mi] = { ...p[mi], [memberId]: !p[mi][memberId] };
    onUpdate({ ...group, payments: p });
  };

  const voteUnlock = (vote) => {
    const uv = { ...group.unlockVotes, [myId]: vote };
    onUpdate({ ...group, unlockVotes: uv });
  };

  const requestRefund = () => {
    const rr = [...(refundRequests || [])];
    if (!rr.includes(myId)) rr.push(myId);
    onUpdate({ ...group, refundRequests: rr });
  };

  const unlockYes = Object.values(unlockVotes || {}).filter(v => v === "yes").length;
  const unlockUnanimous = unlockYes === active.length;
  const myUnlockVote = unlockVotes?.[myId];

  const myPaid = (() => {
    let s = 0;
    for (let i = 0; i < currentMonth; i++) if (monthPaid(i, myId)) s += monthly;
    return s;
  })();

 
  const allPaidThisMonth = active.every(m => monthPaid(currentMonth - 1, m.id));

  const tabs = [
  { id: "dashboard", label: "📊 Tableau" },
  { id: "payments", label: "💳 Paiements" },
  { id: "history", label: "📈 Historique" },
  { id: "governance", label: "⚖️ Gouvernance" },
];


  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Retour</button>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <Badge color={C.teal}>🎯 Cagnotte</Badge>
        <Badge color={payMethod === "stripe" ? C.purple : C.muted}>{payMethod === "stripe" ? "⚡ Stripe" : "🏦 Virement"}</Badge>
      </div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{name}</div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>{active.length} membres · Objectif {fmt(goal)}€ · {months} mois</div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? C.teal + "20" : "transparent", border: `1px solid ${tab === t.id ? C.teal + "60" : C.cardBorder}`, borderRadius: 20, padding: "6px 14px", color: tab === t.id ? C.teal : C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="fade-in">
          <Card style={{ marginBottom: 12, background: "linear-gradient(135deg,#0e1420,#001a20)", borderColor: C.teal + "40", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: ".1em", textTransform: "uppercase" }}>Collecté</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 44, fontWeight: 800, color: C.teal, lineHeight: 1 }}>{fmt(Math.round(totalCollected))}€</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: C.muted }}>Objectif</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700 }}>{fmt(goal)}€</div>
              </div>
            </div>
            <ProgressBar value={totalCollected} max={goal} color={C.teal} height={8} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: C.teal, fontWeight: 600 }}>{pct(totalCollected, goal)}% atteint</span>
              <span style={{ fontSize: 11, color: C.muted }}>{fmt(goal - Math.round(totalCollected))}€ restants</span>
            </div>
            
          </Card>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Pill label="Par personne / mois" value={`${fmt(monthly)}€`} color={C.teal} />
            <Pill label="Mois en cours" value={`${currentMonth}/${months}`} color={C.text} />
          </div>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Versements ce mois</div>
              <Donut paid={active.filter(m => monthPaid(currentMonth - 1, m.id)).length} total={active.length} color={C.teal} size={56} />
            </div>
          </Card>

          <Card style={{ borderColor: C.teal + "30" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>🔒 Ma tirelire (visible uniquement par moi)</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: C.teal }}>{fmt(myPaid)}€ versés</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Sur {fmt(Math.round(goal / members.length))}€ au total</div>
          </Card>
        </div>
      )}

      {tab === "payments" && (
        <div className="fade-in">
          {payMethod === "virement" && (
            <Card style={{ marginBottom: 12, borderColor: C.purple + "40", background: C.purpleDim }}>
              <div style={{ fontSize: 11, color: C.purple, fontWeight: 600, marginBottom: 4 }}>🏦 Virement manuel</div>
              <div style={{ fontSize: 12, color: C.muted }}>Le créateur confirme chaque versement. Fenêtre : 1 au 28 du mois.</div>
            </Card>
          )}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Mois {currentMonth}</div>
              {allPaidThisMonth && <Badge color={C.green}>✓ Complet</Badge>}
            </div>
            {active.map(m => {
              const paid = monthPaid(currentMonth - 1, m.id);
              const isLate = DAY > 25 && !paid;
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 10px", borderRadius: 10, background: isLate ? C.redDim : "transparent", border: `1px solid ${isLate ? C.red + "30" : "transparent"}` }}>
                  <Avatar name={m.name} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}{m.isCreator ? " 👑" : ""}</div>
                    <div style={{ fontSize: 11, color: isLate ? C.red : C.muted }}>{isLate ? "⚠ En retard" : `${fmt(monthly)}€ à verser`}</div>
                  </div>
                  <button onClick={() => togglePaid(m.id)} style={{ background: paid ? C.greenDim : C.subtle, border: `1px solid ${paid ? C.green : C.cardBorder}`, color: paid ? C.green : C.muted, borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                    {paid ? "✓ Payé" : payMethod === "stripe" ? "⚡ Auto" : "Confirmer"}
                  </button>
                </div>
              );
            })}
          </Card>
        </div>
      )}

{tab === "history" && (
  <div className="fade-in">
    <Card style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>📈 Historique des paiements</div>
      {Array.from({ length: currentMonth }, (_, i) => i).map(monthIndex => {
        const monthPayments = payments[monthIndex] || {};
        const paidCount = active.filter(m => monthPayments[m.id]).length;
        const isComplete = paidCount === active.length;
        return (
          <div key={monthIndex} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.cardBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13 }}>
                Mois {monthIndex + 1}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {isComplete && <Badge color={C.green}>✓ Complet</Badge>}
                {!isComplete && monthIndex < currentMonth - 1 && <Badge color={C.red}>⚠ Incomplet</Badge>}
                {monthIndex === currentMonth - 1 && !isComplete && <Badge color={C.teal}>En cours</Badge>}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {active.map(m => {
                const paid = monthPayments[m.id];
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: paid ? C.greenDim : C.redDim, borderRadius: 8, padding: '4px 8px', border: `1px solid ${paid ? C.green : C.red}30` }}>
                    <span style={{ fontSize: 10 }}>{paid ? '✓' : '✗'}</span>
                    <span style={{ fontSize: 11, color: paid ? C.green : C.red }}>{m.name}</span>
                  </div>
                );
              })}
            </div>
            <ProgressBar value={paidCount} max={active.length} color={isComplete ? C.green : C.teal} height={4} />
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              {paidCount}/{active.length} versements · {fmt(paidCount * monthly)}€ collectés ce mois
            </div>
          </div>
        );
      })}
    </Card>
  </div>
)}


      {tab === "governance" && (
        <div className="fade-in">
          <Card style={{ marginBottom: 12, borderColor: C.teal + "40" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🔓 Déblocage de la cagnotte</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Unanimité requise. Chaque membre doit voter "Débloquer".</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, background: C.greenDim, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: C.green }}>{unlockYes}</div>
                <div style={{ fontSize: 10, color: C.muted }}>Oui</div>
              </div>
              <div style={{ flex: 1, background: C.subtle, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20 }}>{active.length - unlockYes}</div>
                <div style={{ fontSize: 10, color: C.muted }}>En attente</div>
              </div>
            </div>

            {!myUnlockVote ? (
              <Btn onClick={() => voteUnlock("yes")} color={C.teal} style={{ width: "100%" }}>🔓 Voter Débloquer</Btn>
            ) : (
              <div style={{ fontSize: 12, color: C.green, textAlign: "center" }}>✅ Vous avez voté pour le déblocage</div>
            )}

            {unlockUnanimous && (
              <div style={{ marginTop: 12, background: C.greenDim, borderRadius: 10, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>🎉</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: C.green }}>Unanimité atteinte !</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>La cagnotte peut être débloquée.</div>
                <FeeNote amount={goal} />
              </div>
            )}
          </Card>

          <Card style={{ borderColor: C.orange + "40" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>↩ Demander un remboursement</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>
              Vous pouvez demander le remboursement de votre tirelire individuelle ({fmt(myPaid)}€) et quitter la cagnotte. Les autres membres continuent, leurs mensualités seront recalculées.
            </div>
            {(refundRequests || []).includes(myId) ? (
              <div style={{ fontSize: 12, color: C.orange }}>⏳ Demande de remboursement en cours…</div>
            ) : (
              <Btn onClick={requestRefund} color={C.orange} ghost style={{ width: "100%" }}>Demander remboursement ({fmt(myPaid)}€)</Btn>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const [groups, setGroups] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState([]);
const [showProfile, setShowProfile] = useState(false);
const [profile, setProfile] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
  if (session) loadGroups();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [session]);

useEffect(() => {
  if (session) checkInvitations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [session]);

const checkInvitations = async () => {
  const { data } = await supabase
    .from('invitations')
    .select('*, groups(*)')
    .eq('email', session.user.email)
    .eq('status', 'pending');
  
  if (data && data.length > 0) {
    setPendingInvites(data);
  }
};


 const loadGroups = async () => {
  if (!session?.user?.id) return;
  console.log('Loading groups for user:', session.user.id);
  const { data: memberData } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', session.user.id);
  console.log('Member groups:', memberData);
  // Groupes créés par l'utilisateur
  const { data: myGroups } = await supabase
    .from('groups')
    .select(`*, group_members(*), payments(*)`)
    .eq('creator_id', session.user.id);

    

  // Groupes où l'utilisateur est membre via invitation acceptée
  const groupIds = memberData?.map(m => m.group_id) || [];
console.log('Group IDs:', groupIds);

const { data: memberGroups } = groupIds.length > 0 ? await supabase
  .from('groups')
  .select(`*, group_members(*), payments(*)`)
  .in('id', groupIds) : { data: [] };

console.log('Member groups loaded:', memberGroups);

  


   const allGroups = [...(myGroups || []), ...(memberGroups || [])];
  const uniqueGroups = allGroups.filter((g, i, self) => self.findIndex(x => x.id === g.id) === i);




  if (uniqueGroups.length >= 0) {
    const normalized = uniqueGroups.map(g => {
      // Convertir payments array en objet {mois: {memberId: bool}}
      const paymentsObj = {};
      (g.payments || []).forEach(p => {
        if (!paymentsObj[p.month]) paymentsObj[p.month] = {};
        paymentsObj[p.month][p.member_id] = p.paid;
      });
      return {
        ...g,
        currentMonth: g.current_month,
        members: g.group_members || [],
        payments: paymentsObj,
        banVotes: {},
        banCandidates: [],
        unlockVotes: {},
        redistributeVotes: {},
        refundRequests: [],
      };
    });
    setGroups(normalized);
    const { data: profiles } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', session.user.id);
if (profiles && profiles.length > 0) setProfile(profiles[0]);

  }
};


  const handleCreate = async (data) => {
  const { members, payments, banVotes, banCandidates, unlockVotes, redistributeVotes, refundRequests, ...groupData } = data;
  
  const { data: newGroup, error } = await supabase
    .from('groups')
    .insert([{ 
      name: groupData.name,
      type: groupData.type,
      amount: groupData.amount || null,
      goal: groupData.goal || null,
      months: groupData.months || null,
      current_month: 1,
      pay_method: groupData.payMethod,
      iban: groupData.iban || null,
      started: false,
      creator_id: session.user.id 
    }])
    .select()
    .single();
  
  if (!error && newGroup) {
    const membersToInsert = members.map((m, i) => ({
      group_id: newGroup.id,
      name: m.name,
      is_creator: m.isCreator,
      active: true,
      join_order: i + 1,
      user_id: m.isCreator ? session.user.id : null,
    }));
    await supabase.from('group_members').insert(membersToInsert);
    await loadGroups();
  } else {
    console.error('Erreur création groupe:', error);
  }
  setView("home");
};

  const updateGroup = async (updated) => {
  const { group_members, payments, banVotes, banCandidates, unlockVotes, redistributeVotes, refundRequests, members, ...groupData } = updated;
  
  // Mettre à jour le groupe
  await supabase.from('groups').update({
    current_month: groupData.current_month,
    started: groupData.started,
  }).eq('id', updated.id);

  // Vérifier si le groupe doit être marqué comme démarré
if (!updated.started && payments) {
  const hasPayment = Object.values(payments).some(monthPayments => 
    Object.values(monthPayments).some(paid => paid === true)
  );
  if (hasPayment) {
    await supabase.from('groups').update({ started: true }).eq('id', updated.id);
  }
}

  // Sauvegarder les paiements
  if (payments) {
    for (const [monthStr, memberPayments] of Object.entries(payments)) {
      console.log('monthStr:', monthStr, 'parseInt:', parseInt(monthStr));
      console.log('payments object:', payments);
console.log('payments keys:', Object.keys(payments));
      const month = parseInt(monthStr);
      for (const [memberId, paid] of Object.entries(memberPayments)) {
        // Trouver le vrai ID du membre dans group_members
        const member = (updated.members || updated.group_members || []).find(m => 
  String(m.id) === String(memberId) || 
  m.join_order === parseInt(memberId) + 1
);
        if (!member) continue;
        
        await supabase.from('payments')
  .upsert({
    group_id: updated.id,
    member_id: member.id,
    month,
    paid,
  }, { onConflict: 'group_id,member_id,month', ignoreDuplicates: false });
      }
    }
  }

  setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
};

   if (loading) return (
    <div style={{ background: '#080b12', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0b429', fontSize: 24 }}>
      ⏳
    </div>
  );

  if (!session) return <Auth />;

  if (showProfile && session) return <Profile session={session} onBack={() => { setShowProfile(false); loadGroups(); }} />;
  
  if (pendingInvites.length > 0) return <InviteAccept 
    invites={pendingInvites} 
    session={session}
    onDone={() => { setPendingInvites([]); loadGroups(); }} 
  />;

  if (view === "create") return <CreateView onCreate={handleCreate} onBack={() => setView("home")} />;
  if (view === "detail") {
    const g = groups.find(x => x.id === activeId);
    if (!g) return null;
    const props = { group: g, onBack: () => setView("home"), onUpdate: updateGroup, session };
    return g.type === "tontine" ? <TontineDetail {...props} /> : <CagnotteDetail {...props} />;
  }
  return <HomeView groups={groups} onNew={() => setView("create")} onOpen={id => { setActiveId(id); setView("detail"); }} onLogout={() => supabase.auth.signOut()} onProfile={() => setShowProfile(true)} profile={profile} />;
}


