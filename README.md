# Bruna Bisol — Site web + Skin Reading IA

Site web avec un outil d'analyse de la peau par IA, prêt à déployer sur Vercel.

## Structure du projet

```
bruna-vercel/
├── public/
│   └── index.html          ← La page web complète
├── api/
│   ├── analyze.js          ← Serverless function : analyse de la peau (Claude API)
│   └── lead.js             ← Serverless function : envoi du rapport par email (Resend)
├── package.json
├── vercel.json
├── .env.example            ← Template des variables d'environnement
└── .gitignore
```

---

## 🚀 Déploiement pas-à-pas (15 minutes)

### 1. Créer un compte Vercel + Anthropic

- **Vercel** : https://vercel.com (connexion avec GitHub recommandée)
- **Anthropic API** : https://console.anthropic.com — créer une clé API et créditer le compte (5–20 € suffisent largement pour démarrer)
- **Resend** (pour les emails) : https://resend.com — gratuit jusqu'à 100 emails/jour, 3000/mois

### 2. Créer un repo GitHub

Pousse le contenu du dossier `bruna-vercel/` sur un nouveau repo GitHub.

```bash
cd bruna-vercel
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TON_USER/bruna-bisol.git
git push -u origin main
```

### 3. Importer le projet sur Vercel

1. Sur Vercel, clique **"Add New Project"** → sélectionne le repo GitHub
2. Vercel détecte automatiquement la config (pas besoin de framework)
3. Avant de déployer, ajoute les **variables d'environnement** :

| Variable | Valeur | Obligatoire |
|----------|--------|-------------|
| `ANTHROPIC_API_KEY` | Ta clé Anthropic (commence par `sk-ant-`) | ✅ Oui |
| `RESEND_API_KEY` | Ta clé Resend (commence par `re_`) | Optionnel |
| `BRUNA_EMAIL` | L'email de Bruna pour recevoir les leads | Optionnel |
| `FROM_EMAIL` | Email expéditeur (domaine vérifié sur Resend) | Optionnel |

> 💡 Sans Resend, le site fonctionne quand même : l'analyse s'affiche bien dans le navigateur, mais aucun email n'est envoyé.

4. Clique **Deploy** — c'est en ligne en 30 secondes ✨

### 4. Configurer le domaine personnalisé (optionnel)

Dans Vercel → Settings → Domains, ajoute `brunabisol.com` (ou autre). Vercel donne les enregistrements DNS à mettre chez le registrar.

---

## 📧 Configuration de Resend (envoi d'emails)

1. Crée un compte sur https://resend.com
2. **Pour tester rapidement** : utilise l'email `onboarding@resend.dev` comme `FROM_EMAIL`. Limites : tu ne peux envoyer qu'à l'email avec lequel tu t'es inscrite.
3. **Pour la production** :
   - Vérifie ton domaine sur Resend (ajoute des enregistrements DNS — instructions données par Resend)
   - Utilise `hello@tondomaine.com` comme `FROM_EMAIL`
   - Tu peux maintenant envoyer à n'importe quelle adresse

---

## 🧪 Test en local (optionnel)

```bash
npm i -g vercel
vercel login
vercel dev
```

Crée un fichier `.env` avec tes variables d'environnement (basé sur `.env.example`), puis le site tourne sur `http://localhost:3000`.

---

## ⚙️ Personnalisation

### Changer le ton de l'analyse
→ `api/analyze.js`, modifier la constante `SYSTEM_PROMPT`

### Changer le design du site
→ `public/index.html`, tout est dans un seul fichier (CSS + HTML + JS)

### Changer le template de l'email envoyé au client
→ `api/lead.js`, fonction `buildClientEmail()`

### Changer le modèle Claude (coût vs qualité)
Dans `api/analyze.js`, ligne `model: 'claude-sonnet-4-20250514'`. Modèles disponibles :
- `claude-haiku-4-5-20251001` — moins cher, plus rapide, qualité correcte
- `claude-sonnet-4-6` — équilibre coût/qualité (recommandé)
- `claude-opus-4-7` — meilleure qualité, plus cher

---

## 💰 Coûts estimés

- **Vercel** : gratuit (plan Hobby largement suffisant)
- **Anthropic API** : ~0,02 € par analyse avec Sonnet (image + texte)
  → 1000 analyses ≈ 20 €
- **Resend** : gratuit jusqu'à 3000 emails/mois
- **Domaine** : ~10 €/an

**Pour 100 prospects/mois : ~2 € total** 🎯

---

## 🛡️ Sécurité

✅ Clé API Anthropic jamais exposée côté client (toujours côté serverless)
✅ Photos non stockées (traitées en mémoire uniquement)
✅ Limite de taille image (10MB max côté client, 7MB en base64 côté serveur)
✅ Disclaimer "guidance cosmétique, pas un diagnostic médical"
✅ Détection minor / conditions médicales → l'IA refuse poliment et redirige vers une consultation pro

### À ajouter pour passer à l'échelle (recommandé après les 50 premiers users)

- **Rate limiting** : ajouter Upstash Redis + un middleware (1 analyse / 5 min / IP) pour éviter l'abus
- **CAPTCHA** : Cloudflare Turnstile (gratuit) sur le formulaire
- **Stockage des leads** : Supabase ou Airtable pour avoir une vraie base de données plutôt que juste des emails
- **Politique de confidentialité** : page dédiée RGPD-compliant

---

## 📞 Support

Si quelque chose casse au déploiement, les logs Vercel sont dans Dashboard → ton projet → Logs. Les erreurs de l'API Claude apparaissent dans `console.error`.
