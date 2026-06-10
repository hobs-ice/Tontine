import { useState } from 'react';

const C = {
  bg: "#080b12", card: "#0e1420", cardBorder: "#1c2535",
  accent: "#f0b429", teal: "#06b6d4", green: "#10b981",
  text: "#f1f5f9", muted: "#64748b", subtle: "#1e293b",
};

export default function Onboarding({ onComplete }) {
  const steps = [
    {
      emoji: "🫂",
      title: "Bienvenue sur Tontine",
      desc: "L'épargne collective entre amis, famille ou collègues. Simple, transparent et sécurisé.",
    },
    {
      emoji: "🔄",
      title: "Comment ça marche ?",
      desc: "Créez un groupe, invitez vos membres. Chacun verse sa mise mensuelle et reçoit le pot à son tour.",
    },
    {
      emoji: "🎯",
      title: "Tontine ou Cagnotte ?",
      desc: "La tontine distribue le pot à tour de rôle. La cagnotte accumule vers un objectif commun.",
    },
    {
      emoji: "🛡️",
      title: "Sécurisé & Transparent",
      desc: "Paiements via Stripe. Système de garantie intégré. Historique complet pour tous les membres.",
    },
  ];

  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 48 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i === step ? C.accent : C.cardBorder, transition: 'all .3s' }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 72, marginBottom: 24 }}>{current.emoji}</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 16, lineHeight: 1.2 }}>
          {current.title}
        </div>
        <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
          {current.desc}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
          style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: C.accent, color: '#080b12', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
          {isLast ? '🚀 Créer mon premier groupe' : 'Suivant →'}
        </button>
        {!isLast && (
          <button onClick={onComplete}
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13 }}>
            Passer
          </button>
        )}
      </div>
    </div>
  );
}