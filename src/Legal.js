import React from 'react';

const C = {
  bg: "#080b12", card: "#0e1420", cardBorder: "#1c2535",
  accent: "#f0b429", text: "#f1f5f9", muted: "#64748b", subtle: "#1e293b",
};

export default function Legal({ type, onBack }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', background: C.bg, minHeight: '100vh' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', marginBottom: 20, fontSize: 13 }}>
        ← Retour
      </button>

      {type === 'cgu' && (
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 24 }}>
            📋 Conditions Générales d'Utilisation
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>Dernière mise à jour : juin 2026</div>

          {[
            { title: "1. Objet", content: "L'application Tontine est un outil organisationnel permettant à des groupes de particuliers de gérer collectivement leur épargne rotative (tontine) ou commune (cagnotte). L'app facilite le suivi des paiements et la communication entre membres." },
            { title: "2. Responsabilité", content: "Tontine est un outil d'organisation. Les transactions financières sont gérées par Stripe, prestataire de paiement agréé. L'application ne détient pas les fonds des utilisateurs et ne peut être tenue responsable des litiges entre membres." },
            { title: "3. Paiements", content: "Les paiements sont traités par Stripe Inc., certifié PCI DSS. En utilisant les fonctionnalités de paiement, vous acceptez les conditions de Stripe. Tontine ne stocke aucune donnée bancaire." },
            { title: "4. Obligations des membres", content: "Chaque membre s'engage à respecter ses engagements financiers envers le groupe. En cas de non-paiement, le créateur du groupe peut initier une procédure de bannissement selon les règles définies dans le groupe." },
            { title: "5. Données personnelles", content: "Vos données sont traitées conformément à notre Politique de Confidentialité et au RGPD. Vous disposez d'un droit d'accès, de rectification et d'effacement de vos données." },
            { title: "6. Résiliation", content: "Vous pouvez supprimer votre compte à tout moment depuis votre profil. Les données liées aux transactions sont conservées 5 ans conformément aux obligations légales françaises." },
          ].map((section, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: C.text, marginBottom: 8 }}>{section.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{section.content}</div>
            </div>
          ))}
        </div>
      )}

      {type === 'privacy' && (
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 24 }}>
            🔒 Politique de Confidentialité
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>Dernière mise à jour : juin 2026</div>

          {[
            { title: "Données collectées", content: "Nous collectons : email, nom, téléphone, IBAN (optionnel), photo de profil. Ces données sont nécessaires au fonctionnement du service." },
            { title: "Utilisation des données", content: "Vos données sont utilisées uniquement pour faire fonctionner l'app Tontine — gestion des groupes, paiements, notifications. Elles ne sont jamais vendues à des tiers." },
            { title: "Hébergement", content: "Vos données sont hébergées sur Supabase (serveurs EU) et Stripe (certifié PCI DSS). Tous les échanges sont chiffrés via HTTPS." },
            { title: "Vos droits (RGPD)", content: "Vous avez le droit d'accéder à vos données, les rectifier, les exporter ou les supprimer. Pour exercer ces droits, utilisez le bouton 'Supprimer mon compte' dans votre profil ou contactez-nous." },
            { title: "Conservation", content: "Vos données sont conservées tant que votre compte est actif. Les données financières sont conservées 5 ans (obligation légale). Après suppression du compte, vos données personnelles sont effacées sous 30 jours." },
            { title: "Contact", content: "Pour toute question relative à vos données personnelles, contactez-nous via l'application." },
          ].map((section, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: C.text, marginBottom: 8 }}>{section.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{section.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}