import { supabase } from './supabase';
import Legal from './Legal';
import { useState } from 'react';

const C = {
  bg: "#080b12", card: "#0e1420", cardBorder: "#1c2535",
  accent: "#f0b429", red: "#ef4444", redDim: "#ef444420",
  text: "#f1f5f9", muted: "#64748b", subtle: "#1e293b",
};

export default function Settings({ session, onBack }) {
  const [showLegal, setShowLegal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (showLegal) return <Legal type={showLegal} onBack={() => setShowLegal(null)} />;

  const deleteAccount = async () => {
    if (window.confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) {
      setDeleting(true);
      await supabase.from('profiles').delete().eq('id', session.user.id);
      await supabase.from('group_members').delete().eq('user_id', session.user.id);
      await supabase.from('notifications').delete().eq('user_id', session.user.id);
      await supabase.auth.signOut();
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', background: C.bg, minHeight: '100vh' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', marginBottom: 20, fontSize: 13 }}>
        ← Retour
      </button>

      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 24 }}>
        ⚙️ Paramètres
      </div>

      {/* COMPTE */}
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Compte</div>
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.cardBorder}`, fontSize: 13, color: C.muted }}>
          {session.user.email}
        </div>
      </div>

      {/* LÉGAL */}
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Légal</div>
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, marginBottom: 20, overflow: 'hidden' }}>
        <button onClick={() => setShowLegal('cgu')}
          style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', borderBottom: `1px solid ${C.cardBorder}`, color: C.text, fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
          📋 Conditions Générales d'Utilisation <span style={{ color: C.muted }}>›</span>
        </button>
        <button onClick={() => setShowLegal('privacy')}
          style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', color: C.text, fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
          🔒 Politique de confidentialité <span style={{ color: C.muted }}>›</span>
        </button>
      </div>

      {/* SUPPORT */}
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Support</div>
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, marginBottom: 20, overflow: 'hidden' }}>
        <a href="mailto:support@ton-tine.com"
          style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', color: C.text, fontSize: 13, textDecoration: 'none' }}>
          ✉️ Nous contacter <span style={{ color: C.muted }}>›</span>
        </a>
      </div>

      {/* DANGER */}
      <div style={{ fontSize: 11, color: C.red, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Warning</div>
      <div style={{ background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 16, overflow: 'hidden' }}>
        <button onClick={deleteAccount} disabled={deleting}
          style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', color: C.red, fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
          {deleting ? '⏳ Suppression...' : '🗑️ Supprimer mon compte'} <span>›</span>
        </button>
      </div>
    </div>
  );
}