import { useState, useEffect } from 'react';
import { supabase } from './supabase';

const C = {
  bg: "#080b12", card: "#0e1420", cardBorder: "#1c2535",
  accent: "#f0b429", green: "#10b981", red: "#ef4444",
  text: "#f1f5f9", muted: "#64748b", subtle: "#1e293b",
};

export default function Profile({ session, onBack, isOnboarding = false }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [iban, setIban] = useState('');
  const [stripeCustomerId, setStripeCustomerId] = useState(null);
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (session?.user?.id) loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) {
      setName(data.name || '');
      setPhone(data.phone || '');
      setIban(data.iban || '');
      setStripeCustomerId(data.stripe_customer_id || null);
      setAddress(data.address || '');
      setAvatarUrl(data.avatar_url || null);
    }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${session.user.id}/avatar.${fileExt}`;
    const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    let newStripeCustomerId = stripeCustomerId;
    let stripePaymentMethodId = null;

    if (iban && !stripeCustomerId) {
      try {
        const res = await fetch('https://pgquynoaxjtyhbrfjbzg.supabase.co/functions/v1/sepa-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_customer',
            iban,
            name: name || session.user.email,
            email: session.user.email,
            memberId: session.user.id,
          })
        });
        const data = await res.json();
        if (data.customerId) {
          newStripeCustomerId = data.customerId;
          stripePaymentMethodId = data.paymentMethodId;
        }
      } catch (err) {
        console.error('Stripe error:', err);
      }
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        name,
        phone,
        iban,
        avatar_url: avatarUrl,
        stripe_customer_id: newStripeCustomerId || null,
        stripe_payment_method_id: stripePaymentMethodId || null,
        address,
        email: session.user.email,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (!error) {
      setMessage('✅ Profil sauvegardé !');
      if (isOnboarding) setTimeout(() => onBack(), 1000);
    } else {
      setMessage('❌ Erreur lors de la sauvegarde');
      console.error(error);
    }
    setTimeout(() => setMessage(''), 3000);
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', background: C.bg, minHeight: '100vh' }}>
      {!isOnboarding && (
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', marginBottom: 20, fontSize: 13 }}>
          ← Retour
        </button>
      )}

      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 24 }}>
        {isOnboarding ? '👋 Bienvenue !' : '👤 Mon profil'}
      </div>

      {isOnboarding && (
        <div style={{ background: '#0a1a0a', border: '1px solid #10b98140', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: C.green, marginBottom: 20 }}>
          Complétez votre profil pour commencer à utiliser Tontine !
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', background: C.subtle, marginBottom: 12, border: `2px solid ${C.accent}` }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>👤</div>
          )}
        </div>
        <label style={{ background: C.accent, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#080b12', fontWeight: 700, fontSize: 13 }}>
          {uploading ? '⏳ Upload...' : '📷 Changer la photo'}
          <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
        </label>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '.06em', marginBottom: 6 }}>EMAIL</div>
        <div style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>{session.user.email}</div>

        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '.06em', marginBottom: 6 }}>NOM COMPLET</div>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Ton prénom et nom"
          style={{ width: '100%', background: C.subtle, border: 'none', borderRadius: 8, padding: '10px 12px', color: C.text, outline: 'none', fontSize: 14, marginBottom: 16 }} />

        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '.06em', marginBottom: 6 }}>TÉLÉPHONE</div>
        <input value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="+33 6 XX XX XX XX"
          style={{ width: '100%', background: C.subtle, border: 'none', borderRadius: 8, padding: '10px 12px', color: C.text, outline: 'none', fontSize: 14, marginBottom: 16 }} />

        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '.06em', marginBottom: 6 }}>IBAN (pour recevoir les virements)</div>
        <input value={iban} onChange={e => setIban(e.target.value.toUpperCase())}
          placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
          style={{ width: '100%', background: C.subtle, border: 'none', borderRadius: 8, padding: '10px 12px', color: C.text, outline: 'none', fontSize: 13, letterSpacing: '.05em' }} />
      
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '.06em', marginBottom: 6, marginTop: 16 }}>ADRESSE</div>
<input value={address} onChange={e => setAddress(e.target.value)}
  placeholder="123 rue de la Paix, 75001 Paris"
  style={{ width: '100%', background: C.subtle, border: 'none', borderRadius: 8, padding: '10px 12px', color: C.text, outline: 'none', fontSize: 13 }} />
      
      
      </div>


      

       {message && (
        <div style={{ background: '#0a1a0a', border: '1px solid #10b98140', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: C.green, marginBottom: 12 }}>
          {message}
        </div>
      )}

      <button onClick={saveProfile} disabled={saving}
        style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: C.accent, color: '#080b12', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? '⏳...' : isOnboarding ? '🚀 Commencer' : '💾 Sauvegarder'}
      </button>
    </div>
  );
}


  

