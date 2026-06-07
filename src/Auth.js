import { useState } from 'react';
import { supabase } from './supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [iban, setIban] = useState('');
  const C = {
    bg: "#080b12", card: "#0e1420", cardBorder: "#1c2535",
    accent: "#f0b429", text: "#f1f5f9", muted: "#64748b",
  };

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setMessage(error.message);
        else {
  setMessage('Vérifie ton email pour confirmer ton compte !');
  if (iban) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('profiles').upsert({
        id: userData.user.id,
        iban: iban.trim(),
      });
    }
  }
}
      }
    } catch (err) {
      setMessage(err.message);
    }
    setLoading(false);
  };

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
          {!isLogin && (
  <div>
    <input
      type="text"
      placeholder="IBAN (optionnel — pour recevoir vos virements)"
      value={iban}
      onChange={e => setIban(e.target.value.toUpperCase())}
      style={{ width: '100%', background: '#0a0f1a', border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '12px 16px', color: C.text, fontSize: 13, outline: 'none', marginBottom: 10, letterSpacing: '.05em' }} />
    <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
      💡 Renseignez votre IBAN pour recevoir automatiquement votre part quand ce sera votre tour.
    </div>
  </div>
)}


        {message && (
          <div style={{ background: '#1a0f00', border: '1px solid #f0b42940', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f0b429', marginBottom: 12 }}>
            {message}
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