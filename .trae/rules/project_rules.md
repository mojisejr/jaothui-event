# Jaothui Event Project Rules and Style Guide

This document defines coding standards, architectural patterns, branching and workflow rules, and critical notices for development on this project. All contributors and agents must adhere to these guidelines.

## Overview

- Tech stack: Next.js 14, TypeScript, tRPC, React Query, TailwindCSS + DaisyUI, Sanity, Prisma, Supabase, Zod, Styled-Components (limited usage).
- Monorepo-style structure within `src/` using Next.js Pages Router and selective `app/` directory for Studio.
- Client state via React Contexts (`LineProvider`, `AdminProvider`), server APIs via tRPC routers, data fetched through Sanity GROQ and Prisma.

## Critical Notices

- Do not force commit ignored files.
  - Respect `.gitignore` for `node_modules`, `.next`, `*.tsbuildinfo`, `.env*`, local DB files under `prisma/`, and other listed entries.
- Do not force install any dependency.
  - Use the defined package manager (`yarn@1.22.22`) and only add dependencies after approval.
- Do not work directly on `staging` or `main` branches.
- Branching policy:
  - MUST create new feature branches from `staging` only. Example: `feat/<scope>-<short-desc>`.
  - Keep working on the same feature branch until integration is done.
  - Ask Dev before creating branches from other feature branches.
- Environment variables:
  - Never commit any `.env*` file. Provide `.env.example` updates only where relevant.
- Secrets and credentials:
  - Never hardcode or log secrets. Use the `env.ts`/`env.js` validation layer.
- Database and migrations:
  - Do not push schema changes without review. Use `prisma db push` only in approved workflows.
- Data privacy:
  - Do not export or share production data. Redact PII in logs.
- Third-party services:
  - Do not modify Sanity datasets or Supabase projects without approval.

## Branching, Commits, and PR Workflow

- Branch naming:
  - `feat/<area>-<desc>`, `fix/<area>-<desc>`, `chore/<area>-<desc>`, `docs/<area>-<desc>`.
- Commit messages must follow Conventional Commits.
  - Format: `<type>(<optional scope>): <description>`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
  - Breaking changes must include `!` or `BREAKING CHANGE:` in footer.
  - Reference: https://www.conventionalcommits.org/en/v1.0.0/.
- PR requirements:
  - Target `staging` branch only.
  - Include summary, screenshots if UI changes, and testing notes.
  - CI/lint must pass. No failing type checks.
  - Request review from Dev before merge.

## Coding Style Guide

- Language and TypeScript
  - Use strict TypeScript (`tsconfig.json` is strict). Do not suppress types unnecessarily.
  - Prefer `type` aliases over `interface` only when consistent with current patterns. Existing interfaces under `src/interfaces` are acceptable; follow local conventions.
  - Use path alias `~/*` for imports from `src/`.
  - Avoid `any`; use Zod schemas for validation at boundaries.
- Linting and Formatting
  - Run `yarn lint` before PR. ESLint config uses `@typescript-eslint` stylistic rules.
  - Keep imports consistent with `@typescript-eslint/consistent-type-imports`.
  - Use Prettier with Tailwind plugin; class names should be ordered automatically.
- React Components
  - Functional components only. Use hooks (`useEffect`, `useState`) appropriately.
  - Use TailwindCSS with DaisyUI for UI primitives. Prefer class-based styling; use Styled-Components sparingly when dynamic styling requires it.
  - Keep components small and cohesive. Extract subcomponents in `src/components/<Feature>/`.
  - Naming: `PascalCase` for components, `camelCase` for functions/variables.
- State and Context
  - Use `LineProvider` and `AdminProvider` via `src/pages/providers.tsx`. Do not bypass providers.
  - Do not store secrets in context. Persist minimal user info only.
- API and Data Fetching
  - Client: use `api.<router>.<proc>.useQuery/useMutation` from tRPC React Query wrapper.
  - Server: create routers in `src/server/api/routers/*` using `createTRPCRouter` and `publicProcedure`/`admin` middlewares.
  - Validation: use Zod for all inputs to procedures.
  - Serialization: use `superjson` configured in tRPC.
  - When adding endpoints, ensure proper authorization via `admin` or `royalAdmin` where applicable.
- Services Layer
  - Put Sanity GROQ queries and business logic in `src/server/services/*`. Keep routers thin.
  - Reuse helpers in `src/utils/*` and constants in `src/constants/*`.
- Styling and UI
  - TailwindCSS classes with DaisyUI theme `mytheme`. Avoid inline styles.
  - Maintain accessibility (semantic tags, alt text, labels).
  - Use `react-toastify` for notifications; limit duplicate toasts (`ToastContainer limit={1}`).
- Routing
  - Use Next.js Pages Router under `src/pages`. Dynamic routes follow `[param].tsx` naming.
  - Use `next/link` for navigation. Avoid window.location mutations.

## Structure and Patterns

- Directory conventions:
  - `src/components/<Area>` for UI, `src/pages` for routes, `src/server` for backend, `sanity/` for CMS.
  - Keep interfaces in `src/interfaces`. Do not duplicate DTOs across layers.
- File naming:
  - `kebab-case.ts` for helpers and utils, `PascalCase.tsx` for components.
- Error handling:
  - On server, throw `TRPCError` for auth/validation failures.
  - On client, surface errors via toasts or inline messages.
- Logging:
  - Avoid `console.log` in production paths. Use guarded logging only in development.

## Testing and Validation

- Prefer component-level checks and tRPC procedure validations via Zod.
- If adding tests, colocate under `src/__tests__` with descriptive names.
- Validate env with `@t3-oss/env-nextjs`. Do not bypass `env.js`.

## Data and Assets

- Images: use Next Image with remote patterns as configured in `next.config.js`. For Sanity images, use `sanity/lib/image.ts` helpers.
- Assets: store under `public/` and reference via `/images/...`.

## Performance and Accessibility

- Use React Query cache properly; avoid unnecessary refetches.
- Paginate long lists; avoid unbounded scroll with heavy DOM.
- Ensure components render efficiently; memoize when needed.

## Agent Workflow (for integrated AI agents)

- Follow a structured flow:
  - Start with a broad, high-level understanding task (e.g., authentication flow, error handling).
  - Search the codebase multiple times with varied terms to ensure coverage.
  - Prefer semantic search over regex for exploration; use regex for exact matches.
  - Document assumptions and proceed without blocking unless essential info is missing.
  - Minimize unnecessary tool calls; batch related actions.
  - When making changes, fix root causes, keep diffs minimal, and align with existing style.
  - If UI changes are made, review locally before completion.
  - Track tasks using a todo list for multi-step work; mark items complete immediately when done.
  - Run tests or build locally when available; do not introduce unrelated fixes.

## Review and Deployment

- All merges flow into `staging`, then into `main` via controlled release.
- Build and lint must pass (`yarn build`, `yarn lint`).
- Coordinate database pushes and Sanity schema changes with Dev.

## Adding New Features

- Create a branch from `staging` and implement in isolated modules.
- Define Zod schemas for inputs, add tRPC endpoints, and services.
- Build UI under `src/components/<Feature>` and route under `src/pages/<feature>`.
- Add documentation to this file if new patterns are introduced.

## Do and Don’t

- Do: keep components small, validate inputs, respect providers, follow commit/branch rules.
- Don’t: commit env or build artifacts, install arbitrary packages, bypass lint/type checks, or merge directly to `main`/`staging`.

## Contact

- For any exceptions or architectural changes, consult Dev maintainers before proceeding.
