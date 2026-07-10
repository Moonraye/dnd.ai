# Claude Code Guide for Next.js + NestJS Project

This document provides guidance for using Claude Code (claude.ai/code) with this Next.js + NestJS project.

## Tech Stack

- Next.js with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- React Server Components by default
- Prisma ORM
- PostgreSQL Database
- NestJS for Backend API (Separate folder)
- Websocket (Socket.IO) for Real-time Collaboration

## Code Structure

This is Monorepo structure:
├── apps/
│ ├── frontend/ # Next.js application (using FSD inside /src)
│ │ ├── src/
│ │ │ ├── app/ # Next.js App Router folders, layout wrappers, and routes
│ │ │ ├── pages/ # Page-level compositions (e.g., LobbyPage, SessionPage)
│ │ │ ├── widgets/ # Major layout pieces (e.g., LiveChatRoom, CharacterHUD)
│ │ │ ├── features/ # Interactive features (e.g., DiceRoller, SendMessageField)
│ │ │ ├── entities/ # Business domain entities (e.g., CharacterModel, SessionModel)
│ │ │ └── shared/ # Core UI kits, Zustand stores, and base HTTP/WS client instances
│ ├── backend/ # NestJS server application
│ │ ├── src/
│ │ │ ├── auth/ # Custom NestJS guards & strategies to decode Supabase JWTs
│ │ │ ├── user/ # User profile and D&D character sheet database management
│ │ │ ├── game-session/ # Socket.io Gateway, active session room managers, and dice validation
│ │ │ ├── ai/ # AI prompts, Gemini client, and structured JSON parser
│ │ │ └── prisma/ # Database module initializing Prisma Client connections
├── packages/
│ ├── shared/ # Shared TypeScript models and Zod validation schemas
│ │ ├── src/
│ │ │ ├── types.ts # Shared WebSocket events, User, and Session interfaces
│ │ │ └── validation.ts # Zod schemas (e.g., CreateLobbySchema, CharacterSheetSchema)

## Conventions

Testing after each feature

Use Server Components by default, add 'use client' only when needed

- Prefer named exports for components
- Use TypeScript strict mode
- Follow the Next.js file-based routing conventions
- Use next/image for optimized images
- Use next/link for client-side navigation
- Use NestJS modules for each feature
- In Backend API, use Prisma models and migrations for database operations, never use raw SQL queries.

## Code Style

- Use functional components with TypeScript
- Prefer async/await over .then() chains
- Use early returns for cleaner code
- Keep components small and focused

## Commands (client root)

- `npm run dev` - Start development server
- `npm run build` - Build for production

## Commands (backend root)

- `npm run start:dev` - Start development server
- `npx prisma dev generate` - Generate Prisma Client
