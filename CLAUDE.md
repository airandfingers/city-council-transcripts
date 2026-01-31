# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application for managing and displaying city council transcripts. The project uses:
- Next.js 16.1.6 with App Router
- React 19.2.3
- TypeScript 5
- Tailwind CSS v4 with PostCSS
- ESLint 9 with Next.js config

## Development Commands

### Setup
```bash
npm install
```

### Development
```bash
npm run dev        # Start development server at http://localhost:3000
```

### Building
```bash
npm run build      # Create production build
npm start          # Run production build locally
```

### Linting
```bash
npm run lint       # Run ESLint
```

## Architecture

### Next.js App Router Structure
- `app/` - App Router pages and layouts
  - `layout.tsx` - Root layout with Geist fonts (sans and mono)
  - `page.tsx` - Home page component
  - `globals.css` - Global styles with Tailwind directives

### TypeScript Configuration
- Uses `@/*` path alias mapping to project root
- Strict mode enabled
- ESNext module resolution with bundler strategy
- React 19 JSX transform (`jsx: "react-jsx"`)

### Styling
- Tailwind CSS v4 via PostCSS (`@tailwindcss/postcss`)
- Dark mode support configured in components
- Geist font family (sans and mono variants) loaded via `next/font/google`

## Ralph Integration

This project uses Ralph, an autonomous AI development agent. Ralph-specific files are in `.ralph/`:

- `.ralph/PROMPT.md` - Ralph's development instructions and loop behavior
- `.ralph/@AGENT.md` - Build instructions and quality standards for Ralph
- `.ralph/@fix_plan.md` - Prioritized TODO list for Ralph's work
- `.ralph/specs/` - Project specifications and requirements
- `.ralph/logs/` - Loop execution logs

### Ralph Quality Standards
When working in this codebase and Ralph is active:
- 85% minimum code coverage for new features
- All tests must pass (100% pass rate)
- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Update `.ralph/@fix_plan.md` when completing tasks
- Push commits to remote regularly

## ESLint Configuration

Uses ESLint 9 flat config with:
- `eslint-config-next/core-web-vitals`
- `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Key Patterns

### Font Loading
The project uses `next/font/google` for optimized font loading with Geist Sans and Geist Mono. Fonts are loaded in `app/layout.tsx` and applied via CSS variables (`--font-geist-sans`, `--font-geist-mono`).

### Image Optimization
Uses Next.js `<Image>` component for optimized image loading. Static assets are in `public/`.

### TypeScript Paths
Import from project root using `@/` alias:
```typescript
import Component from "@/app/components/Component"
```
