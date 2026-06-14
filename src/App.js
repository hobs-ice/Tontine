import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Auth from './Auth';
import Profile from './Profile';
import Settings from './Settings';
import Onboarding from './Onboarding';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);


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
const DAY = new Date().getDate();


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
function HomeView({ groups, onNew, onOpen, onLogout, onProfile, profile, unreadCount, onNotifications, onSettings, session }) {
  const tontines = groups.filter(g => g.type === "tontine" && !g.archived);
  const cagnottes = groups.filter(g => g.type === "cagnotte" && !g.archived);
  const archives = groups.filter(g => g.archived);

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
              {g.pay_method === "carte" ? <Badge color={C.purple}>💳 Carte</Badge> : <Badge color={C.teal}>⚡ SEPA</Badge>}
            </div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'capitalize' }}>{g.name}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
  {active.length} membre{active.length > 1 ? 's' : ''} actif{active.length > 1 ? 's' : ''} · 
  {g.creator_id === session?.user?.id ? ' Vous êtes créateur' : ` Créé par ${g.members?.find(m => m.is_creator)?.name || '?'}`}
</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Donut paid={paidCount} total={active.length} color={color} size={64} />
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>ce mois</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressBar value={g.currentMonth - 1} max={g.type === "tontine" ? g.members.length : g.months} color={color} />
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
    <div style={{ maxWidth: 480, margin: "0 auto", background: C.bg, minHeight: '100vh', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
      
      {/* HEADER FIXE */}
      <div style={{ position: 'sticky', top: 0, background: C.bg, zIndex: 100, borderBottom: `1px solid ${C.cardBorder}`, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* NAVBAR */}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>🫂 Tontine</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onNotifications} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', fontSize: 20 }}>
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: C.red, color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={onSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>⚙️</button>
          <button onClick={onProfile} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.accent}` }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: `2px solid ${C.cardBorder}` }}>👤</div>
            )}
          </button>
        </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* SALUTATION */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: C.text }}>
            Bonjour {profile?.name?.split(' ')[0] || ''} 👋
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>L'épargne collective entre amis</div>
        </div>

        {groups.filter(g => !g.archived).length === 0 ? (
          <div style={{ textAlign: "center", padding: '48px 24px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🪙</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Aucun groupe</div>
            <div style={{ color: C.muted, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              Crée ta première tontine ou cagnotte et invite tes proches !
            </div>
            <Btn onClick={onNew}>+ Créer un groupe</Btn>
          </div>
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
            {archives.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>📦 Archives</div>
                {archives.map(g => (
                  <Card key={g.id} onClick={() => onOpen(g.id)} style={{ marginBottom: 10, opacity: 0.5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15 }}>{g.name}</div>
                        <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{g.type === "tontine" ? "🔄 Tontine" : "🎯 Cagnotte"} · Archivé</div>
                      </div>
                      <Badge color={C.muted}>📦 Archivé</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <div style={{ position: 'sticky', bottom: 16, marginTop: 8 }}>
  <Btn onClick={onNew} style={{ width: "100%", boxShadow: '0 4px 24px rgba(240,180,41,0.3)' }}>+ Nouveau groupe</Btn>
</div>
          </>
        )}
      </div>
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
  const [guaranteePercent, setGuaranteePercent] = useState(10);
  
 
  const [members] = useState([{ id: 0, name: "Créateur", isCreator: true, active: true, joined: 1 }]);
  const [maxMembers, setMaxMembers] = useState('');
  

  const color = type === "tontine" ? C.accent : C.teal;
  const monthly = type === "cagnotte" && Number(goal) > 0 && members.length > 0 && Number(months) > 0
    ? Math.ceil(Number(goal) / members.length / Number(months) * 100) / 100 : null;

  const canNext1 = name.trim() && (type === "tontine" ? Number(amount) > 0 : Number(goal) > 0 && Number(months) > 0);
  const canCreate = canNext1 && Number(maxMembers) >= 2;

  const handle = () => {
  const base = { type, name, payMethod, iban, guaranteePercent, maxMembers: Number(maxMembers), started: false, currentMonth: 1, payments: {}, banVotes: {}, banCandidates: [] };
  
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

      <Card style={{ marginBottom: 10 }}>
  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 8 }}>NOMBRE DE MEMBRES MAX</div>
  <input type="number" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} placeholder="Ex: 10"
    style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: C.accent, fontSize: 32, fontFamily: "'Syne',sans-serif", fontWeight: 800 }} />
  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>La tontine durera {maxMembers || '?'} mois</div>
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
          {[["carte", "💳 Carte / Apple Pay", "Paiement par carte", C.purple], ["stripe", "🏦 Prélèvement SEPA", "Automatique via IBAN", C.teal]].map(([v, label, sub, col]) => (
            <div key={v} onClick={() => setPayMethod(v)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `2px solid ${payMethod === v ? col : C.cardBorder}`, background: payMethod === v ? col + "15" : "transparent", transition: "all .15s" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: payMethod === v ? col : C.text }}>{label}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </Card>
      {payMethod === 'carte' && (
  <Card style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 6 }}>IBAN (optionnel)</div>
    <input value={iban} onChange={e => setIban(e.target.value.toUpperCase())}
      placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
      style={{ width: "100%", background: C.subtle, border: "none", borderRadius: 8, padding: "10px 12px", color: C.text, outline: "none", fontSize: 13, letterSpacing: ".05em" }} />
  </Card>
)}

<Card style={{ marginBottom: 10 }}>
  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 8 }}>GARANTIE (%)</div>
  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
    {[5, 10, 15, 20].map(p => (
      <div key={p} onClick={() => setGuaranteePercent(p)}
        style={{ flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', border: `2px solid ${guaranteePercent === p ? C.accent : C.cardBorder}`, background: guaranteePercent === p ? C.accentDim : 'transparent' }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: guaranteePercent === p ? C.accent : C.text }}>{p}%</div>
      </div>
    ))}
  </div>
  <div style={{ fontSize: 11, color: C.muted }}>
    Sur chaque versement {guaranteePercent}% est conservé dans le compte du groupe comme garantie.
  </div>
</Card>

      {/* membres */}
      <Card style={{ marginBottom: 10 }}>
  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".06em", marginBottom: 8 }}>MEMBRES</div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <Avatar name={members[0].name} size={30} />
    <div style={{ fontSize: 13 }}>{members[0].name} <Badge color={C.accent}>Créateur</Badge></div>
  </div>
  <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
    💡 Invitez les membres après la création du groupe
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

function JoinGroup({ token, session, onDone }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error] = useState(''); // eslint-disable-line no-unused-vars

  useEffect(() => {
  loadGroup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [token]);


  const loadGroup = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*, group_members(*)')
      .eq('invite_token', token)
      .single();
    setGroup(data);
    setLoading(false);
  };

  const joinGroup = async () => {
    setJoining(true);
    const { data: members } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', group.id)
      .is('user_id', null)
      .limit(1);

    if (members && members.length > 0) {
      await supabase.from('group_members')
        .update({ user_id: session.user.id })
        .eq('id', members[0].id);
    } else {
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: session.user.id,
        name: session.user.email.split('@')[0],
        is_creator: false,
        active: true,
        join_order: 99,
      });
    }
    onDone();
  };

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, fontSize: 24 }}>⏳</div>
  );

  if (!group) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.red, fontSize: 16 }}>❌ Lien invalide ou expiré</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 16px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🫂</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: C.text }}>
          Tu es invité !
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '.06em', marginBottom: 6 }}>GROUPE</div>
        
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: C.text, marginBottom: 8 }}>{group.name}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ background: C.accentDim, color: C.accent, borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
            {group.type === 'tontine' ? '🔄 Tontine' : '🎯 Cagnotte'}
          </span>
          <span style={{ background: C.subtle, color: C.muted, borderRadius: 20, padding: '4px 10px', fontSize: 11 }}>
            {group.group_members?.length} membres
          </span>
          {group.type === 'tontine' && (
            <span style={{ background: C.subtle, color: C.muted, borderRadius: 20, padding: '4px 10px', fontSize: 11 }}>
              💰 {group.amount}€/mois
            </span>
          )}
        </div>
      </div>
      {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{error}</div>}
      <button onClick={joinGroup} disabled={joining}
        style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: C.accent, color: '#080b12', fontWeight: 800, fontSize: 16, cursor: joining ? 'not-allowed' : 'pointer', opacity: joining ? 0.6 : 1 }}>
        {joining ? '⏳ Connexion...' : '🚀 Rejoindre le groupe'}
      </button>
    </div>
  );
}

function NotificationsView({ notifications, session, onBack, onMarkRead }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', background: C.bg, minHeight: '100vh' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', marginBottom: 20, fontSize: 13 }}>
        ← Retour
      </button>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 24 }}>
        🔔 Notifications
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔕</div>
          <div>Aucune notification</div>
        </div>
      ) : (
        notifications.map((n, i) => (
          <div key={i} onClick={() => onMarkRead(n.id)}
            style={{ background: n.read ? C.card : C.accentDim, border: `1px solid ${n.read ? C.cardBorder : C.accent + '40'}`, borderRadius: 14, padding: 16, marginBottom: 10, cursor: 'pointer' }}>
            <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>{n.message}</div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            {!n.read && <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginTop: 4 }}>● Non lu</div>}
          </div>
        ))
      )}
      {notifications.some(n => !n.read) && (
        <button onClick={() => notifications.filter(n => !n.read).forEach(n => onMarkRead(n.id))}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 13, marginTop: 8 }}>
          ✓ Tout marquer comme lu
        </button>
      )}
    </div>
  );
}


function StripePayment({ amount, groupName, memberId, groupId, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentRequest, setPaymentRequest] = useState(null);

  useEffect(() => {
    if (!stripe) return;
    const pr = stripe.paymentRequest({
      country: 'FR',
      currency: 'eur',
      total: { label: groupName, amount: Math.round(amount * 100) },
      requestPayerName: true,
      requestPayerEmail: true,
    });
    pr.canMakePayment().then(result => {
      if (result) setPaymentRequest(pr);
    });
    pr.on('paymentmethod', async (e) => {
      const res = await fetch('https://pgquynoaxjtyhbrfjbzg.supabase.co/functions/v1/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, groupName, memberId, groupId })
      });
      const { clientSecret } = await res.json();
      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: e.paymentMethod.id
      }, { handleActions: false });
      if (confirmError) {
        e.complete('fail');
        setError(confirmError.message);
      } else {
        e.complete('success');
        onSuccess();
      }
    });
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe]);

  const handlePay = async () => {
    setLoading(true);
    const res = await fetch('https://pgquynoaxjtyhbrfjbzg.supabase.co/functions/v1/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, groupName, memberId, groupId })
    });
    const { clientSecret, error: fetchError } = await res.json();
    if (fetchError) { setError(fetchError); setLoading(false); return; }
    const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    });
    if (stripeError) {
      setError(stripeError.message);
    } else {
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: C.card, borderRadius: 18, padding: 24, width: '90%', maxWidth: 400 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
          💳 Payer {amount}€
        </div>

        {paymentRequest && (
          <div style={{ marginBottom: 16 }}>
            <PaymentRequestButtonElement options={{ paymentRequest }} />
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, margin: '12px 0' }}>— ou —</div>
          </div>
        )}

        <div style={{ background: C.subtle, borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <CardElement options={{ style: { base: { color: '#f1f5f9', fontSize: '16px' } } }} />
        </div>
        {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handlePay} disabled={loading}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: C.purple, color: 'white', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? '⏳...' : '⚡ Payer'}
          </button>
        </div>
      </div>
    </div>
  );
}


function InviteForm({ groupId }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const sendInvite = async () => {
    if (!email.trim()) return;
    const { error } = await supabase
      .from('invitations')
      .insert({ 
        group_id: groupId, 
        email: email.trim().toLowerCase(),
      });
    
    if (!error) {
      setStatus('✅ Invitation envoyée !');
      setEmail('');
    } else {
      setStatus('❌ Erreur');
    }
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="email@exemple.com"
          onKeyDown={e => e.key === 'Enter' && sendInvite()}
          style={{ flex: 1, background: C.subtle, border: 'none', borderRadius: 8, padding: '8px 12px', color: C.text, outline: 'none', fontSize: 13 }} />
        <button onClick={sendInvite} disabled={!email}
          style={{ background: !email ? C.subtle : C.accent, border: 'none', borderRadius: 8, padding: '8px 14px', color: !email ? C.muted : '#080b12', fontWeight: 700, cursor: !email ? 'not-allowed' : 'pointer', fontSize: 12 }}>
          Inviter
        </button>
      </div>
      {status && <div style={{ fontSize: 12, marginTop: 6, color: C.green }}>{status}</div>}
    </div>
  );
}

function InviteAccept({ invites, session, onDone }) {
  const acceptInvite = async (invite) => {
    await supabase.from('invitations').update({ status: 'accepted' }).eq('id', invite.id);
    
    // Ajouter le membre avec son vrai nom de profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', session.user.id)
      .single();

    await supabase.from('group_members').insert({
      group_id: invite.group_id,
      user_id: session.user.id,
      name: profile?.name || session.user.email.split('@')[0],
      is_creator: false,
      active: true,
      join_order: 99,
    });

    onDone();
  };

  const declineInvite = async (invite) => {
    await supabase.from('invitations').update({ status: 'declined' }).eq('id', invite.id);
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



// ── TONTINE DETAIL ────────────────────────────────────────────
function TontineDetail({ group, onBack, onUpdate, session }) {
  const [tab, setTab] = useState("dashboard");
  const [showStripePayment, setShowStripePayment] = useState(null);
  const { name, amount, members, currentMonth, payments, banVotes, payMethod } = group;
  const active = members.filter(m => m.active);
  const pot = amount * active.length;
  const guaranteePercent = group.guarantee_percent || 10;
const guaranteeAmount = Math.round(pot * (guaranteePercent / 100) * 100) / 100;
const netAmount = Math.round((pot - guaranteeAmount) * 0.96 * 100) / 100;

  const recipient = active[currentMonth - 1] || active[0];
  const monthPaid = (mi, pi) => payments?.[mi]?.[pi] ?? false;
  const allPaid = active.every(m => monthPaid(currentMonth - 1, m.id));
  const myId = session?.user?.id;
  console.log('myId:', myId, 'creator_id:', group.creator_id);
  console.log('members:', members.map(m => ({ name: m.name , user_id: m.user_id })));



  const togglePaid = (memberId) => {
    const p = { ...group.payments };
    const mi = currentMonth - 1;
    if (!p[mi]) p[mi] = {};
    p[mi] = { ...p[mi], [memberId]: !p[mi][memberId] };
    onUpdate({ ...group, payments: p });
  };

  const castBanVote = async (candidateId, vote) => {
  const bv = { ...group.banVotes };
  if (!bv[candidateId]) bv[candidateId] = {};
  bv[candidateId] = { ...bv[candidateId], [session?.user?.id || myId]: vote };
  
  const updatedGroup = { ...group, banVotes: bv };
  
  // Vérifier si la majorité est atteinte
  const voters = active.filter(m => m.id !== recipient?.id && m.id !== candidateId);
  const yes = Object.values(bv[candidateId]).filter(v => v === "yes").length;
  
  if (yes > voters.length / 2) {
    // Bannissement confirmé — désactiver le membre dans Supabase
    const candidate = members.find(m => m.id === candidateId);
    if (candidate) {
      await supabase.from('group_members')
        .update({ active: false })
        .eq('id', candidate.id);
      
      updatedGroup.members = members.map(m => 
        m.id === candidateId ? { ...m, active: false } : m
      );
    }
  }
  
  onUpdate(updatedGroup);
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
        <Badge color={payMethod === "carte" ? C.purple : C.teal}>{payMethod === "carte" ? "💳 Carte" : "⚡ SEPA"}</Badge>
      </div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{name}</div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>
  {active.length} membres · {amount}€/mois · Mois {currentMonth}/{members.length} · 
  {group.creator_id === session?.user?.id ? ' 👑 Vous êtes créateur' : ` Créé par ${members.find(m => m.is_creator)?.name || '?'}`}
</div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? color + "20" : "transparent", border: `1px solid ${tab === t.id ? color + "60" : C.cardBorder}`, borderRadius: 20, padding: "8px 14px", color: tab === t.id ? color : C.muted, fontSize: tab === t.id ? 11 : 16, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", display: 'flex', alignItems: 'center', gap: 4 }}>
  {t.label} {tab === t.id && <span style={{ fontSize: 11 }}>{t.fullLabel}</span>}
</button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <div className="fade-in">
          <Card style={{ marginBottom: 12, background: "linear-gradient(135deg,#0d0d1a,#1a0f40,#0d1a2e)", borderColor: C.accent + "30", padding: 28, position: 'relative', overflow: 'hidden' }}>
  {/* Cercle décoratif */}
  <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: C.accent + '08', border: `1px solid ${C.accent}15` }} />
  <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: C.accent + '10', border: `1px solid ${C.accent}20` }} />
  
  <div style={{ fontSize: 10, color: C.muted, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 8 }}>Cagnotte du mois</div>
  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 56, fontWeight: 800, color: C.accent, lineHeight: 1, marginBottom: 16 }}>{fmt(pot)}€</div>
  
  <FeeNote amount={pot} />
  
  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 16px' }}>
    <Avatar name={recipient?.name || "?"} size={32} />
    <div style={{ textAlign: 'left' }}>
      <div style={{ fontSize: 10, color: C.muted }}>Bénéficiaire ce mois</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{recipient?.name}</div>
    </div>
    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
      <div style={{ fontSize: 10, color: C.muted }}>Reçoit le</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>5 du mois</div>
    </div>
  </div>

  {group.guarantee_percent && (
    <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
      <span style={{ color: C.muted }}>🛡️ Garantie ({group.guarantee_percent}%)</span>
      <span style={{ color: C.orange }}>{fmt(guaranteeAmount)}€ retenus</span>
    </div>
  )}
</Card>
        

          
       {group.creator_id === session?.user?.id && !group.started && (
  <Card style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>📧 Inviter un membre</div>
    <InviteForm groupId={group.id} />
  </Card>
)}

{!group.started && (
<Card style={{ marginBottom: 12 }}>
  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>🔗 Lien d'invitation</div>
  <div style={{ background: C.subtle, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: C.muted, marginBottom: 10, wordBreak: 'break-all' }}>
    {`${window.location.origin}/join/${group.invite_token}`}
  </div>
  <div style={{ display: 'flex', gap: 8 }}>
    <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${group.invite_token}`).then(() => alert('Lien copié !'))}
      style={{ flex: 1, background: C.subtle, border: 'none', borderRadius: 8, padding: '8px', color: C.text, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
      📋 Copier
    </button>
    <a href={`https://wa.me/?text=Rejoins ma tontine "${group.name}" ! ${window.location.origin}/join/${group.invite_token}`}
      target="_blank" rel="noreferrer"
      style={{ flex: 1, background: '#25D366', border: 'none', borderRadius: 8, padding: '8px', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
      💬 WhatsApp
    </a>
    <a href={`sms:?body=Rejoins ma tontine "${group.name}" ! ${window.location.origin}/join/${group.invite_token}`}
      style={{ flex: 1, background: C.teal, border: 'none', borderRadius: 8, padding: '8px', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
      📱 SMS
    </a>
  </div>
</Card>
)}

{!group.started && group.creator_id === session?.user?.id && (
  <Card style={{ marginBottom: 12, borderColor: C.green + "40", background: C.greenDim, textAlign: "center", padding: 20 }}>
    <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
      {active.length} membre{active.length > 1 ? 's' : ''} prêt{active.length > 1 ? 's' : ''}. Démarrez quand vous êtes au complet !
    </div>

    {!group.started && group.creator_id === session?.user?.id && group.stripe_account_id && !group.stripe_onboarding_complete && (
  <Card style={{ marginBottom: 12, borderColor: C.teal + "40", background: '#0d1a1a' }}>
    <div style={{ fontSize: 12, color: C.teal, fontWeight: 700, marginBottom: 8 }}>🏦 Compte groupe</div>
    <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
      Chaque groupe a son propre compte bancaire sécurisé. Cette vérification unique permet de recevoir et distribuer les fonds de ce groupe en toute sécurité. Elle prend moins de 2 minutes !
    </div>
    <button onClick={async () => {
      localStorage.setItem('onboarding_group_id', group.id);
      const res = await fetch('https://pgquynoaxjtyhbrfjbzg.supabase.co/functions/v1/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_onboarding_link',
          accountId: group.stripe_account_id,
          refreshUrl: window.location.href,
          returnUrl: window.location.origin + '?onboarding=success',
        })
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    }} style={{ background: C.teal, border: 'none', borderRadius: 10, padding: '10px 20px', color: '#080b12', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
      🔐 Vérifier le compte groupe
    </button>
  </Card>
)}
    <button onClick={async () => {
      if (window.confirm(`Démarrer la tontine avec ${active.length} membre(s) ? Plus d'invitations possibles après.`)) {
        await supabase.from('groups').update({ started: true }).eq('id', group.id);
        onUpdate({ ...group, started: true });
      }
    }} style={{ background: C.green, border: 'none', borderRadius: 10, padding: '12px 32px', color: '#080b12', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>
      🚀 Démarrer la tontine
    </button>
  </Card>
)}


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
    const paid = monthPayments[m.id];
    return (
      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, 
        background: isRecipient ? C.accentDim : paid ? C.greenDim : C.redDim, 
        borderRadius: 8, padding: '5px 10px', 
        border: `1px solid ${isRecipient ? C.accent : paid ? C.green : C.red}40` }}>
        <span style={{ fontSize: 10 }}>{isRecipient ? '🏆' : paid ? '✓' : '✗'}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: isRecipient ? C.accent : paid ? C.green : C.red }}>{m.name}</span>
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
          {payMethod === "carte" && (
  <Card style={{ marginBottom: 12, borderColor: C.purple + "40", background: C.purpleDim }}>
    <div style={{ fontSize: 11, color: C.purple, fontWeight: 600, marginBottom: 4 }}>🏦 Mode carte</div>
    <div style={{ fontSize: 12, color: C.muted, marginBottom: group.iban ? 8 : 0 }}>Le créateur confirme chaque versement manuellement. Fenêtre : 1 au 28 du mois.</div>
    {group.iban && (
      <div style={{ background: C.subtle, borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>IBAN pour carte</div>
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
    <div style={{ fontSize: 11, color: C.purple, fontWeight: 600, marginBottom: 4 }}>⚡ Prélèvement automatique</div>
    <div style={{ fontSize: 12, color: C.muted }}>
      Si vous avez renseigné votre IBAN → prélèvement automatique le 1er du mois.<br/>
      Sinon → paiement par carte requis.
    </div>
  </Card>
)}
          <Card>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
    <div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16 }}>Mois {currentMonth}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{active.filter(m => monthPaid(currentMonth - 1, m.id)).length}/{active.length} versements reçus</div>
    </div>
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
                    <div style={{ fontSize: 11, color: isLate ? C.red : C.muted, marginTop: 2 }}>
  {isRecipient ? "🎉 Bénéficiaire du mois" : isLate ? "⚠ En retard" : <span style={{ color: C.accent, fontWeight: 600 }}>{fmt(amount)}€</span>}
</div>
                  </div>

                  {(() => { console.log('m.user_id:', m.user_id, 'myId:', myId); return null; })()}
                 {paid ? (
  <span style={{ background: C.greenDim, border: `1px solid ${C.green}`, color: C.green, borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700 }}>
    ✓ Payé
  </span>
) : payMethod === 'carte' ? (
  m.user_id === myId ? (
    showStripePayment === m.id ? (
      <Elements stripe={stripePromise}>
        <StripePayment
          amount={group.amount}
          groupName={group.name}
          memberId={m.id}
          groupId={group.id}
          onSuccess={() => { togglePaid(m.id); setShowStripePayment(null); }}
          onCancel={() => setShowStripePayment(null)}
        />
      </Elements>
    ) : (
      <button onClick={() => setShowStripePayment(m.id)}
        style={{ background: C.purple, border: 'none', borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontWeight: 700, color: 'white' }}>
        ⚡ Payer
      </button>
    )
  ) : (
    <span style={{ background: C.subtle, border: `1px solid ${C.cardBorder}`, color: C.muted, borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700 }}>
      ⏳ En attente
    </span>
  )

) : payMethod === 'carte' && group.creator_id === myId ? (
  <span 
    onClick={() => togglePaid(m.id)}
    style={{ background: C.subtle, border: `1px solid ${C.cardBorder}`, color: C.text, borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
    Confirmer
  </span>
) : (
  <span style={{ background: C.subtle, border: `1px solid ${C.cardBorder}`, color: C.muted, borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700 }}>
    ⏳ En attente
  </span>
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
  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Ordre de passage</div>
  {members.map((m, i) => {
    const done = i < currentMonth - 1;
    const current = i === currentMonth - 1;
    const banned = !m.active;
    const isLast = i === members.length - 1;
    return (
      <div key={m.id}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 0, opacity: done ? .4 : 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: current ? C.accent : done ? C.green : banned ? C.red : C.subtle, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: current ? "#080b12" : C.muted, flexShrink: 0 }}>
              {done ? '✓' : i + 1}
            </div>
            {!isLast && <div style={{ width: 2, height: 24, background: done ? C.green : C.cardBorder + '80', margin: '3px 0', borderRadius: 2 }} />}
          </div>
          <Avatar name={m.name} size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}{m.is_creator ? " 👑" : ""}</div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {done ? `Reçu au mois ${i + 1}` : current ? 'Ce mois' : `Mois ${i + 1}`}
            </div>
          </div>
          {done && <Badge color={C.green}>✓ Reçu</Badge>}
          {current && <Badge color={C.accent}>Ce mois</Badge>}
          {banned && <Badge color={C.red}>Banni</Badge>}
          {!done && !current && !banned && !m.is_creator && session?.user?.id === group.creator_id && 
            !Object.values(payments).some(monthPayments => monthPayments[m.id]) && (
            <button onClick={async () => {
              if (window.confirm(`Retirer ${m.name} du groupe ?`)) {
                await supabase.from('group_members').delete().eq('id', m.id);
                onUpdate({ ...group, members: members.filter(x => x.id !== m.id) });
              }
            }} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 18 }}>×</button>
          )}
        </div>
        {!isLast && <div style={{ height: 8 }} />}
      </div>
    );
  })}
</Card>
{allPaid && group.creator_id === session?.user?.id && group.stripe_account_id && (
  <Card style={{ marginBottom: 12, borderColor: C.green + "40", background: C.greenDim, textAlign: "center", padding: 20 }}>
    <div style={{ fontSize: 13, color: C.green, fontWeight: 700, marginBottom: 8 }}>✅ Tous les membres ont payé !</div>
    <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
      Distribuez le pot à <strong style={{ color: C.text }}>{recipient?.name}</strong>
    </div>
    <button onClick={async () => {
      if (window.confirm(`Virer ${fmt(netAmount)}€ à ${recipient?.name} ?`)) {
        const res = await fetch('https://pgquynoaxjtyhbrfjbzg.supabase.co/functions/v1/stripe-connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_to_beneficiary',
            groupId: group.id,
            accountId: group.stripe_account_id,
            amount: netAmount,
            recipientIban: recipient?.iban || '',
            recipientName: recipient?.name || '',
          })
        });
        const data = await res.json();
        if (data.success) {
          alert(`🎉 ${fmt(netAmount)}€ distribués à ${recipient?.name} !`);
        }
      }
    }} style={{ background: C.green, border: 'none', borderRadius: 10, padding: '12px 32px', color: '#080b12', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>
      💸 Distribuer {fmt(netAmount)}€ à {recipient?.name}
    </button>
  </Card>
)}
    {group.started && currentMonth === members.filter(m => m.active).length && (
  <Card style={{ marginTop: 12, borderColor: C.green + "50", background: C.greenDim, textAlign: "center", padding: 24 }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: C.green }}>Cycle terminé !</div>
    <div style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 16 }}>Tout le monde a reçu sa part.</div>
    {group.creator_id === session?.user?.id && (
      <button onClick={async () => {
        if (window.confirm('Relancer un nouveau cycle avec les mêmes membres ?')) {
          // Remettre à zéro les paiements et le mois
          await supabase.from('payments').delete().eq('group_id', group.id);
          await supabase.from('groups').update({
            current_month: 1,
            started: false,
            guarantee_balance: group.guarantee_balance || 0,
          }).eq('id', group.id);
          onUpdate({ ...group, currentMonth: 1, started: false, payments: {} });
        }
      }} style={{ background: C.green, border: 'none', borderRadius: 10, padding: '12px 24px', color: '#080b12', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
        🔄 Relancer un nouveau cycle
      </button>
    )}
  </Card>
)}
  </div>
)}


      {/* GOVERNANCE */}
      {tab === "governance" && (
        <div className="fade-in">
          <Card style={{ marginBottom: 12, borderColor: C.orange + "40", background: C.orangeDim }}>
  <div style={{ fontSize: 12, color: C.orange, fontWeight: 700, marginBottom: 12 }}>⚖️ Règles de gouvernance</div>
  {[
    { icon: '🚫', text: 'Bannissement uniquement si le membre n\'a pas encore reçu sa part' },
    { icon: '🗳️', text: 'Vote ouvert à tous sauf le bénéficiaire du mois' },
    { icon: '⚖️', text: 'Majorité simple décide · Égalité : le créateur tranche' },
    { icon: '💰', text: 'Pénalité du banni redistribuée au prochain bénéficiaire' },
    { icon: '🛡️', text: `Garantie de ${group.guarantee_percent || 10}% retenue chaque mois` },
  ].map((rule, i) => (
    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{rule.icon}</span>
      <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{rule.text}</span>
    </div>
  ))}
</Card>

          {Object.keys(banVotes).length === 0 && lateMembers.length === 0 && (
            <Card style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13, color: C.muted }}>Aucun vote en cours</div>
            </Card>
          )}

          {Object.keys(banVotes).map(candidateIdStr => {
            const candidateId = candidateIdStr;
            const candidate = members.find(m => m.id === candidateId);
            if (!candidate) return null;
            const { yes, no, total, majority, tie } = getBanResult(candidateId);
            const myVote = banVotes[candidateId]?.[myId];
            const alreadyReceived = members.findIndex(m => String(m.id) === String(candidateId)) < currentMonth - 1;

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

  const voteUnlock = async (vote) => {
  const uv = { ...group.unlockVotes, [myId]: vote };
  const updatedGroup = { ...group, unlockVotes: uv };
  
  // Vérifier si unanimité atteinte
  const newUnlockYes = Object.values(uv).filter(v => v === "yes").length;
  if (newUnlockYes === active.length) {
    // Archiver automatiquement
    await supabase.from('groups').update({ archived: true }).eq('id', group.id);
    updatedGroup.archived = true;
  }
  
  onUpdate(updatedGroup);
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
    { id: "dashboard", label: "📊", fullLabel: "Tableau" },
    { id: "payments", label: "💳", fullLabel: "Paiements" },
    { id: "history", label: "📈", fullLabel: "Historique" },
    { id: "order", label: "📋", fullLabel: "Ordre" },
    { id: "governance", label: "⚖️", fullLabel: "Gouvernance" },
  ];


  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Retour</button>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <Badge color={C.teal}>🎯 Cagnotte</Badge>
        <Badge color={payMethod === "stripe" ? C.purple : C.muted}>{payMethod === "stripe" ? "⚡ Stripe" : "🏦 carte"}</Badge>
      </div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{name}</div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>{active.length} membres · Objectif {fmt(goal)}€ · {months} mois</div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
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
          {payMethod === "carte" && (
            <Card style={{ marginBottom: 12, borderColor: C.purple + "40", background: C.purpleDim }}>
              <div style={{ fontSize: 11, color: C.purple, fontWeight: 600, marginBottom: 4 }}>🏦 carte manuel</div>
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
                 <button 
  onClick={() => (group.creator_id === myId || m.user_id === myId) && !paid ? togglePaid(m.id) : null}
  style={{ background: paid ? C.greenDim : C.subtle, border: `1px solid ${paid ? C.green : C.cardBorder}`, color: paid ? C.green : C.muted, borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: (group.creator_id === myId || m.user_id === myId) && !paid ? "pointer" : "default", fontWeight: 700 }}>
  {paid ? "✓ Payé" : group.creator_id === myId ? "Confirmer" : m.user_id === myId ? "À payer" : "⏳ En cours"}
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
const [showProfile, setShowProfile] = useState(false); // eslint-disable-line no-unused-vars
const [joinToken, setJoinToken] = useState(null);
const [profile, setProfile] = useState(null);
const [notifications, setNotifications] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);
const [showNotifications, setShowNotifications] = useState(false);
const [showSettings, setShowSettings] = useState(false);
const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Détecter retour onboarding Stripe
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('onboarding') === 'success') {
  const groupId = localStorage.getItem('onboarding_group_id');
  if (groupId) {
    supabase.from('groups').update({ stripe_onboarding_complete: true }).eq('id', groupId).then(() => {
      localStorage.removeItem('onboarding_group_id');
      window.history.replaceState({}, '', window.location.pathname);
    });
  }
}
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

useEffect(() => {
  const path = window.location.pathname;
  if (path.startsWith('/join/')) {
    const token = path.split('/join/')[1];
    if (token) setJoinToken(token);
  }
}, []);

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



// Charger les profils des membres
const memberUserIds = allGroups.flatMap(g => 
  (g.group_members || []).map(m => m.user_id).filter(Boolean)
);
const { data: profiles } = memberUserIds.length > 0 ? await supabase
  .from('profiles')
  .select('id, iban, name')
  .in('id', memberUserIds) : { data: [] };

const profilesMap = {};
(profiles || []).forEach(p => { profilesMap[p.id] = p; });
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
        payMethod: g.pay_method,
        members: (g.group_members || []).map(m => ({
  ...m,
  has_iban: !!(profilesMap[m.user_id]?.iban),
  profileName: profilesMap[m.user_id]?.name,
  iban: profilesMap[m.user_id]?.iban || null,
})),
        payments: paymentsObj,
        banVotes: g.ban_votes || {},
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
if (profiles && profiles.length > 0) {
  setProfile(profiles[0]);
  if (!profiles[0].onboarding_complete) setShowOnboarding(true);
}

const { data: notifs } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', session.user.id)
  .order('created_at', { ascending: false })
  .limit(20);
if (notifs) {
  setNotifications(notifs);
  setUnreadCount(notifs.filter(n => !n.read).length);
}

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
      max_members: groupData.maxMembers || 10,
      guarantee_percent: groupData.guaranteePercent || 10,
guarantee_balance: 0,
      started: false,
      creator_id: session.user.id 
    }])
    .select()
    .single();
  
  if (!error && newGroup) {
    const { data: creatorProfile } = await supabase
  .from('profiles')
  .select('name')
  .eq('id', session.user.id)
  .single();

const membersToInsert = members.map((m, i) => ({
  group_id: newGroup.id,
  name: m.isCreator ? (creatorProfile?.name || session.user.email.split('@')[0]) : m.name,
  is_creator: m.isCreator,
  active: true,
  join_order: i + 1,
  user_id: m.isCreator ? session.user.id : null,
}));
    await supabase.from('group_members').insert(membersToInsert);
    // Créer un compte Stripe Connect pour le groupe
const stripeRes = await fetch('https://pgquynoaxjtyhbrfjbzg.supabase.co/functions/v1/stripe-connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create_group_account',
    groupId: newGroup.id,
    groupName: newGroup.name,
  })
});
const { accountId } = await stripeRes.json();
if (accountId) {
  await supabase.from('groups').update({ stripe_account_id: accountId }).eq('id', newGroup.id);
}
    await loadGroups();
  } else {
    console.error('Erreur création groupe:', error);
  }
  setView("home");
};

  const updateGroup = async (updated) => { await loadGroups();
  const { group_members, payments, banVotes, banCandidates, unlockVotes, redistributeVotes, refundRequests, members, ...groupData } = updated;
  
  // Mettre à jour le groupe
  await supabase.from('groups').update({
    current_month: groupData.current_month,
    started: groupData.started,
    ban_votes: updated.banVotes || {},
  }).eq('id', updated.id);

  

  // Mettre à jour la garantie quand tous ont payé
const allPaid = Object.values(updated.payments[updated.currentMonth - 1] || {})
  .filter(Boolean).length === (updated.members || []).filter(m => m.active).length;

// carte automatique au bénéficiaire si tous ont payé
if (allPaid && updated.type === 'tontine') {
  const activeMembers = (updated.members || []).filter(m => m.active);
  const recipientMember = activeMembers[updated.currentMonth - 1] || activeMembers[0];
  
  if (recipientMember?.user_id) {
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('iban, name')
      .eq('id', recipientMember.user_id)
      .single();

    if (recipientProfile?.iban) {
      const guaranteePercent = updated.guarantee_percent || 10;
      const pot = updated.amount * activeMembers.length;
      const netAmount = Math.round(pot * (1 - guaranteePercent / 100) * 0.96 * 100) / 100;

      await fetch('https://pgquynoaxjtyhbrfjbzg.supabase.co/functions/v1/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_to_beneficiary',
          groupId: updated.id,
          amount: netAmount,
          recipientIban: recipientProfile.iban,
          recipientName: recipientProfile.name || recipientMember.name,
          recipientEmail: '',
        })
      });

      // Notification au bénéficiaire
      await supabase.from('notifications').insert({
        user_id: recipientMember.user_id,
        group_id: updated.id,
        type: 'payout',
        message: `🎉 ${netAmount}€ virés sur votre compte pour ${updated.name} !`,
      });
    }
  }
}

  

if (allPaid) {
  const pot = updated.amount * (updated.members || []).filter(m => m.active).length;
  const guaranteeAmount = Math.round(pot * ((updated.guarantee_percent || 10) / 100) * 100) / 100;
  await supabase.from('groups').update({ 
    guarantee_balance: (updated.guarantee_balance || 0) + guaranteeAmount 
  }).eq('id', updated.id);
}


  // Vérifier si le groupe doit être marqué comme démarré
if (!updated.started && payments) {
  const hasPayment = Object.values(payments).some(monthPayments => 
    Object.values(monthPayments).some(paid => paid === true)
  );
  if (hasPayment) {
    await supabase.from('groups').update({ started: true }).eq('id', updated.id);
  }
// Notifier les membres quand quelqu'un paie
if (payments) {
  for (const [, memberPayments] of Object.entries(payments)) {
    for (const [memberId, paid] of Object.entries(memberPayments)) {
      if (paid) {
        const member = (updated.members || []).find(m => 
          String(m.id) === String(memberId)
        );
        if (member) {
          await supabase.from('notifications').insert({
            user_id: session.user.id,
            group_id: updated.id,
            type: 'payment',
            message: `✅ ${member.name} a confirmé son paiement pour ${updated.name}`,
          });
        }
      }
    }
  }
}

}

  // Sauvegarder les paiements
  if (payments) {
    for (const [monthKey, memberPayments] of Object.entries(payments)) {
      const month = parseInt(monthKey);

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
await new Promise(resolve => setTimeout(resolve, 500));
await loadGroups();
};

   if (loading) return (
    <div style={{ background: '#080b12', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0b429', fontSize: 24 }}>
      ⏳
    </div>
  );

if (joinToken && !session) return <Auth onJoinToken={joinToken} />;
if (joinToken && session) return <JoinGroup token={joinToken} session={session} onDone={() => { setJoinToken(null); loadGroups(); }} />;

  if (!session) return <Auth />;
  if (showOnboarding) return <Onboarding onComplete={async () => {
  await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', session.user.id);
  setShowOnboarding(false);
}} />;
  if (showProfile && session) return <Profile session={session} onBack={() => { setShowProfile(false); loadGroups(); }} />;
  if (session && !profile?.name) return (
  <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 16px', background: C.bg, minHeight: '100vh' }}>
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🫂</div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: C.text }}>Bienvenue !</div>
      <div style={{ color: C.muted, fontSize: 14, marginTop: 8 }}>Complétez votre profil pour commencer</div>
    </div>
    <Profile session={session} onBack={() => loadGroups()} isOnboarding={true} />
  </div>
);
  if (showSettings) return <Settings session={session} onBack={() => setShowSettings(false)} />;
  if (showNotifications) return <NotificationsView 
  notifications={notifications}
  session={session}
  onBack={() => setShowNotifications(false)}
  onMarkRead={async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }}
/>;
  
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
  return <HomeView groups={groups} onNew={() => setView("create")} onOpen={id => { setActiveId(id); setView("detail"); }} onLogout={() => supabase.auth.signOut()} onProfile={() => setShowProfile(true)} profile={profile} onNotifications={() => setShowNotifications(true)}onSettings={() => setShowSettings(true)}session={session} unreadCount={unreadCount}/>;
}


