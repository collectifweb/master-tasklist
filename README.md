# Master Tasklist

Application web de gestion de tâches permettant de prioriser intelligemment son travail grâce à une combinaison de **complexité**, **priorité** et **durée**. Le calcul du coefficient pondéré met en avant les tâches rapides, simples et urgentes pour aider à prendre des décisions plus rapidement.

## Fonctionnalités clés

- Tableau de bord synthétique (tâches actives, en retard, terminées dans la semaine, répartition par catégorie).
- Formulaire de création/édition riche (catégories, tâches parentes, sliders de priorité/complexité/durée, notes).
- Authentification JWT avec pages de connexion/inscription.
- API Next.js (Pages Router) et base de données Postgres via Prisma.
- Interfaces responsive avec Tailwind CSS et composants Shadcn UI.

## Pile technologique

- [Next.js](https://nextjs.org/) 14 (Pages Router)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL
- Authentification JWT (`jsonwebtoken`, `bcryptjs`)
- Composants Radix UI, Formik/React Hook Form, date-fns, etc.

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

Ajoute les clés Supabase, Resend ou autres services si tu les utilises. Ne versionne pas ce fichier.

2. Installe les dépendances :
pnpm install
# ou npm install

3. Initialise la base :
pnpm prisma db push
# ou pnpm prisma migrate deploy si tu utilises des migrations

4.(Optionnel) Charger des données de démonstration :
curl -X POST http://localhost:3000/api/migrate-data \
  -H "X-Migration-Key: dev-migration-key"

Lancer l’application en localLancer l’application en local
pnpm dev
# puis ouvre http://localhost:3000

Tests et lint :
pnpm lint

Contribution
Fork ou clone (git clone https://github.com/collectifweb/master-tasklist.git).
Crée une branche (git checkout -b feature/ma-fonctionnalite).
Commits (git commit -m "feat: …").
Push et ouvre une Pull Request.
