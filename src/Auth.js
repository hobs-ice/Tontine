import { useState } from 'react';
import { supabase } from './supabase';

import Legal from './Legal';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [iban] = useState(''); // eslint-disable-line no-unused-vars
  const [acceptCgu, setAcceptCgu] = useState(false);
const [showLegal, setShowLegal] = useState(null);
  const C = {
    bg: "#080b12", card: "#0e1420", cardBorder: "#1c2535",
    accent: "#f0b429", text: "#f1f5f9", muted: "#64748b",
  };

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');
    if (!isLogin && !acceptCgu) {
  setMessage('Vous devez accepter les CGU pour continuer');
  setLoading(false);
  return;
}
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setMessage(error.message);
 
  else {
  setMessage('Vérifie ton email pour confirmer ton compte !');
  console.log('Inscription réussie - envoi email bienvenue');
 
  
  
  // Email de bienvenue
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    await fetch('https://pgquynoaxjtyhbrfjbzg.supabase.co/functions/v1/send-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'welcome',
        email: userData.user.email,
        name: userData.user.email.split('@')[0],
      })
    });
   }
        }
      }
    } catch (err) {
      setMessage(err.message);
    }
    setLoading(false);
  };
if (showLegal) return <Legal type={showLegal} onBack={() => setShowLegal(null)} />;
  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '60px 16px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🫂</div>
        <div style={{ fontFamily: 'sans-serif', fontSize: 28, fontWeight: 800, color: C.text }}>Tontine</div>
        <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>L'épargne collective entre amis</div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: 24 }}>
        <div style={{ display: 'flex', marginBottom: 20, background: '#0a0f1a', borderRadius: 10, padding: 4 }}>
          <button onClick={() => setIsLogin(true)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: isLogin ? C.accent : 'transparent', color: isLogin ? '#080b12' : C.muted, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            Connexion
          </button>
          <button onClick={() => setIsLogin(false)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: !isLogin ? C.accent : 'transparent', color: !isLogin ? '#080b12' : C.muted, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            Inscription
          </button>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', background: '#0a0f1a', border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '12px 16px', color: C.text, fontSize: 15, outline: 'none', marginBottom: 10 }} />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
          style={{ width: '100%', background: '#0a0f1a', border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '12px 16px', color: C.text, fontSize: 15, outline: 'none', marginBottom: 16 }} />
          


        {message && (
          <div style={{ background: '#1a0f00', border: '1px solid #f0b42940', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f0b429', marginBottom: 12 }}>
            {message}
          </div>
        )}

{!isLogin && (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
      <input type="checkbox" checked={acceptCgu} onChange={e => setAcceptCgu(e.target.checked)}
        style={{ marginTop: 2 }} />
      <span style={{ fontSize: 12, color: C.muted }}>
        J'accepte les{' '}
        <button onClick={() => setShowLegal('cgu')} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 12, padding: 0 }}>
          CGU
        </button>
        {' '}et la{' '}
        <button onClick={() => setShowLegal('privacy')} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 12, padding: 0 }}>
          Politique de confidentialité
        </button>
      </span>
    </label>
  </div>
)}
        <button onClick={handleAuth} disabled={loading || !email || !password}
          style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: C.accent, color: '#080b12', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '⏳ Chargement...' : isLogin ? '🔐 Se connecter' : '🚀 Créer mon compte'}
        </button>
      </div>
    </div>
  );
}