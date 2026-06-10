import { useState } from 'react';

const C = {
  bg: "#080b12", card: "#0e1420", cardBorder: "#1c2535",
  accent: "#f0b429", teal: "#06b6d4", green: "#10b981",
  purple: "#8b5cf6", text: "#f1f5f9", muted: "#64748b",
};

const illustrations = {
  0: (
    <svg width="200" height="160" viewBox="0 0 200 180">
      {/* Groupe de personnes */}
      {[40, 80, 120, 160].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={60} r={18} fill={[C.accent, C.teal, C.purple, C.green][i]} opacity={0.9} />
          <text x={x} y={65} textAnchor="middle" fontSize="16">{["😊", "🙂", "😄", "😎"][i]}</text>
          <rect x={x - 15} y={82} width={30} height={20} rx={6} fill={[C.accent, C.teal, C.purple, C.green][i]} opacity={0.3} />
        </g>
      ))}
      {/* Connexions */}
      <line x1="58" y1="60" x2="62" y2="60" stroke={C.accent} strokeWidth="2" strokeDasharray="4" opacity="0.5"/>
      <line x1="98" y1="60" x2="102" y2="60" stroke={C.teal} strokeWidth="2" strokeDasharray="4" opacity="0.5"/>
      <line x1="138" y1="60" x2="142" y2="60" stroke={C.purple} strokeWidth="2" strokeDasharray="4" opacity="0.5"/>
      <text x="100" y="130" textAnchor="middle" fontSize="12" fill={C.muted}>Votre cercle de confiance</text>
    </svg>
  ),
  1: (
    <svg width="200" height="160" viewBox="0 0 200 160">
      {/* Cycle de paiement */}
      <circle cx="100" cy="75" r="55" fill="none" stroke={C.cardBorder} strokeWidth="2" strokeDasharray="6"/>
      {[0, 1, 2, 3].map(i => {
        const angle = (i * 90 - 90) * Math.PI / 180;
        const x = 100 + 55 * Math.cos(angle);
        const y = 75 + 55 * Math.sin(angle);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={16} fill={C.card} stroke={[C.accent, C.teal, C.purple, C.green][i]} strokeWidth="2"/>
            <text x={x} y={y + 5} textAnchor="middle" fontSize="14">{["💰", "🎯", "💳", "🏆"][i]}</text>
          </g>
        );
      })}
      <circle cx="100" cy="75" r="20" fill={C.accentDim || C.accent + '20'}/>
      <text x="100" y="79" textAnchor="middle" fontSize="18">🔄</text>
      <text x="100" y="145" textAnchor="middle" fontSize="12" fill={C.muted}>Rotation mensuelle</text>
    </svg>
  ),
  2: (
    <svg width="200" height="160" viewBox="0 0 200 160">
      {/* Tontine vs Cagnotte */}
      <rect x="10" y="20" width="80" height="100" rx="12" fill={C.card} stroke={C.accent} strokeWidth="2"/>
      <text x="50" y="50" textAnchor="middle" fontSize="24">🔄</text>
      <text x="50" y="72" textAnchor="middle" fontSize="11" fill={C.accent} fontWeight="bold">TONTINE</text>
      <text x="50" y="88" textAnchor="middle" fontSize="9" fill={C.muted}>Chacun reçoit</text>
      <text x="50" y="100" textAnchor="middle" fontSize="9" fill={C.muted}>à son tour</text>

      <rect x="110" y="20" width="80" height="100" rx="12" fill={C.card} stroke={C.teal} strokeWidth="2"/>
      <text x="150" y="50" textAnchor="middle" fontSize="24">🎯</text>
      <text x="150" y="72" textAnchor="middle" fontSize="11" fill={C.teal} fontWeight="bold">CAGNOTTE</text>
      <text x="150" y="88" textAnchor="middle" fontSize="9" fill={C.muted}>Objectif</text>
      <text x="150" y="100" textAnchor="middle" fontSize="9" fill={C.muted}>commun</text>

      <text x="100" y="145" textAnchor="middle" fontSize="12" fill={C.muted}>Choisissez votre format</text>
    </svg>
  ),
  3: (
    <svg width="200" height="160" viewBox="0 0 200 160">
      {/* Sécurité */}
      <path d="M100 10 L155 35 L155 80 Q155 120 100 140 Q45 120 45 80 L45 35 Z" fill={C.card} stroke={C.green} strokeWidth="2"/>
<text x="100" y="85" textAnchor="middle" fontSize="40">🛡️</text>
<text x="100" y="155" textAnchor="middle" fontSize="11" fill={C.green}>Stripe • RGPD • SEPA</text>
<text x="100" y="172" textAnchor="middle" fontSize="11" fill={C.muted}>Vos fonds sont protégés</text>
    </svg>
  ),
};

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);

  const steps = [
    { title: "Bienvenue sur Tontine 🫂", desc: "L'épargne collective entre amis, famille ou collègues. Simple, transparent et sécurisé." },
    { title: "Comment ça marche ?", desc: "Créez un groupe, invitez vos membres. Chacun verse sa mise mensuelle et reçoit le pot à son tour." },
    { title: "Tontine ou Cagnotte ?", desc: "La tontine distribue le pot à tour de rôle. La cagnotte accumule vers un objectif commun." },
    { title: "Sécurisé & Transparent 🔒", desc: "Paiements via Stripe certifié PCI DSS. Système de garantie intégré. Historique complet." },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px', background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {steps.map((_, i) => (
          <div key={i} onClick={() => setStep(i)} style={{ width: i === step ? 32 : 8, height: 8, borderRadius: 4, background: i === step ? C.accent : i < step ? C.accent + '60' : C.cardBorder, transition: 'all .3s', cursor: 'pointer' }} />
        ))}
      </div>

      {/* Illustration */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
        {illustrations[step]}
      </div>

      {/* Content */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 12, lineHeight: 1.2 }}>
          {current.title}
        </div>
        <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
          {current.desc}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
          style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: C.accent, color: '#080b12', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
          {isLast ? '🚀 Créer mon premier groupe' : 'Suivant →'}
        </button>
        {!isLast && (
          <button onClick={onComplete}
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: '8px' }}>
            Passer
          </button>
        )}
      </div>
    </div>
  );
}
