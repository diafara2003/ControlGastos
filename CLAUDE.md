@AGENTS.md

# MisCuentas - App de Finanzas Personales

## Arquitectura
- **Feature-Sliced Design (FSD)** con Next.js 15 App Router
- `app/` = routing only, `src/` = FSD layers
- FSD layers renamed: `src/views/` (was `pages/` - avoids Next.js conflict)
- Import rule: app→views→widgets→features→entities→shared

## Stack
- Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui (manual), recharts
- Supabase (Auth + PostgreSQL + RLS), Vercel deployment
- Moneda: COP (pesos colombianos), locale: es-CO

## Key commands
- `npm run dev` - development server
- `npm run build` - production build
- `npm run lint` - ESLint

## Important patterns
- Supabase client (`src/shared/api/supabase/client.ts`) uses Proxy fallback for build-time safety
- All app pages use `export const dynamic = "force-dynamic"` to prevent SSR prerender issues
- PWA: manifest.json + sw.js in /public (basic network-first caching)
