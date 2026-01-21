# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` contains the Next.js App Router pages, layouts, and route groups like `(app)` and `(auth)`.
- `src/components/` holds shared UI building blocks; `src/components/ui/` includes shadcn-style primitives.
- `src/lib/` is for utilities and helpers; `src/hooks/` for shared React hooks.
- `src/db/` and `drizzle/` contain database code and migrations; `drizzle.config.ts` configures Drizzle.
- `public/` stores static assets; `src/app/globals.css` defines global styles.

## Build, Test, and Development Commands
- `npm run dev`: start the local Next.js dev server.
- `npm run build`: create a production build.
- `npm run start`: run the production build locally.
- `npm run lint`: run ESLint with the Next.js config.

## Coding Style & Naming Conventions
- TypeScript + React components live under `src/` and follow existing patterns.
- Use the existing import aliases (e.g., `@/components`, `@/lib`, `@/hooks`) from `components.json`.
- Follow ESLint rules from `eslint.config.mjs`; format to match surrounding code (no Prettier config is present).
- Component filenames use `PascalCase.tsx`; hooks use `useX.ts`.

## Testing Guidelines
- No test runner is configured yet (no `__tests__`, `*.test.*`, or `*.spec.*` files found).
- If you add tests, document the runner and add a script in `package.json`, then keep test names consistent with the chosen tool.

## Commit & Pull Request Guidelines
- Existing commits are short, lowercase, and imperative (e.g., “add auth page”). Follow that style.
- PRs should include a clear summary, steps to verify, and screenshots for UI changes.

## Security & Configuration Tips
- Use `.env.example` as the baseline and keep secrets in `.env.local` (never commit secrets).
- When touching auth or database code, note any required env vars in the PR description.
