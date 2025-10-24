# Master Tasklist

Application web de gestion de tâches permettant de prioriser intelligemment son travail grâce à une combinaison de **complexité**, **priorité** et **durée**. Le calcul du coefficient pondéré met en avant les tâches rapides, simples et urgentes pour aider à prendre des décisions plus rapidement.

## Fonctionnalités clés

- Tableau de bord synthétique (tâches actives, en retard, terminées dans la semaine, répartition par catégorie).
- Formulaire de création/édition riche (catégories, tâches parentes, sliders de priorité/complexité/durée, notes).
- Authentification JWT avec pages de connexion/inscription.
- API Next.js (Pages Router) et base de données Postgres via Prisma.
- Interfaces responsive avec Tailwind CSS et composants Shadcn UI.
- Notifications email lors de la réception d’un feedback utilisateur (via EmailIt).

## Pile technologique

- [Next.js](https://nextjs.org/) 14 (Pages Router)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL
- Authentification JWT (`jsonwebtoken`, `bcryptjs`)
- Composants Radix UI, React Hook Form, date-fns, etc.

## Prérequis

- Node.js 20.x (nvm recommandé)
- pnpm (Corepack activé) ou npm ≥ 10
- Accès à une base PostgreSQL (Supabase, Railway, local…)

## Configuration

1. Duplique `.env.example` (si présent) ou crée un `.env` à la racine :

   ```dotenv
   DATABASE_URL="postgresql://user:password@host:5432/db?schema=public"
   DIRECT_URL="postgresql://user:password@host:5432/db?schema=public"
   JWT_SECRET="change-me"
   MIGRATION_API_KEY="dev-migration-key"
   CRON_SECRET="dev-cron-secret"
   NEXT_PUBLIC_CO_DEV_ENV="http://localhost:3000"
   EMAILIT_API_KEY="sk_live_xxx"              # clé API EmailIt
   EMAILIT_FROM="Master Tasklist <no-reply@le-caribou.ca>"
   FEEDBACK_NOTIFICATION_EMAIL="info@le-caribou.ca"
   ```

   Ajoute les éventuelles clés Supabase, Resend ou services tiers utilisés. **Ne versionne jamais ce fichier.**

2. Installe les dépendances :

   ```bash
   pnpm install
   # ou npm install
   ```

3. Initialise la base :

   ```bash
   pnpm prisma db push
   # ou pnpm prisma migrate deploy si tu utilises des migrations
   ```

4. (Optionnel) Charger des données de démonstration :

   ```bash
   curl -X POST http://localhost:3000/api/migrate-data \
     -H "X-Migration-Key: dev-migration-key"
   ```

## Lancer l’application en local

```bash
pnpm dev
# puis ouvre http://localhost:3000
```

Tests et lint :

```bash
pnpm lint
```

## Déploiement (Railway ou autre)

1. Publie ton code sur GitHub (`main`).
2. Sur Railway :
   - Crée un projet “Next.js”.
   - Connecte le repo GitHub.
   - Configure les variables d’environnement (mêmes valeurs que ton `.env`).
   - Fournis une base PostgreSQL Railway ou garde Supabase via `DATABASE_URL`.
   - Commandes par défaut : build `pnpm install && pnpm build`, start `pnpm start`.
3. Pour cPanel/serveur Node : installe Node 20, clone le repo, mets à jour `.env`, exécute `pnpm install`, `pnpm build`, puis `pnpm start` derrière un process manager (PM2/Passenger) avec proxy.

## Notifications email

Les feedbacks envoyés via `/api/feedback` génèrent un email HTML adressé à `FEEDBACK_NOTIFICATION_EMAIL` via l’API [EmailIt](https://docs.emailit.com/). Assure-toi :

- d’avoir un domaine d’envoi validé chez EmailIt,
- de définir `EMAILIT_API_KEY` et `EMAILIT_FROM`,
- d’adapter le destinataire si besoin.

En cas d’erreur côté EmailIt, l’envoi est simplement journalisé dans les logs serveur.

## Contribution

1. Fork ou clone (`git clone https://github.com/collectifweb/master-tasklist.git`).
2. Crée une branche (`git checkout -b feature/ma-fonctionnalite`).
3. Commits (`git commit -m "feat: …"`).
4. Push et ouvre une Pull Request.

Pense à ajouter une licence si tu souhaites préciser les conditions d’utilisation du projet.
