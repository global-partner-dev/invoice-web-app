---
description: Repository Information Overview
alwaysApply: true
---

# Invoice Web App Information

## Summary
A modern invoice generation web application built with React 18 and TypeScript. The application features authentication (Login), user dashboard, admin panel, and responsive UI using shadcn/ui components with Tailwind CSS. It uses React Router for navigation, React Hook Form for form management, React Query for server state management, and Recharts for data visualization.

## Structure
The project follows a modular component-based architecture:
- **`public/`**: Static assets including favicon and redirects configuration
- **`src/`**: Main application source code
  - **`components/`**: Reusable UI components (shadcn/ui library and custom components)
  - **`pages/`**: Page components for routes (Home, Login, Dashboard, Admin, NotFound)
  - **`hooks/`**: Custom React hooks (mobile detection, toast notifications)
  - **`assets/`**: Images and media files
  - **`lib/`**: Utility functions
  - **`App.tsx`**: Main app component with routing and providers
  - **`main.tsx`**: Entry point with React DOM rendering
- **Root config files**: Vite, TypeScript, Tailwind, PostCSS, and ESLint configurations

## Language & Runtime
**Language**: TypeScript 5.8.3
**Runtime**: Node.js (implied, using ES2020 target)
**Build System**: Vite 5.4.19
**Package Manager**: npm (with bun.lockb present)
**Module Format**: ES Modules (ESNext)

## Dependencies
**Main Dependencies**:
- React 18.3.1 & React DOM 18.3.1
- React Router DOM 6.30.1 (client-side routing)
- React Hook Form 7.61.1 (form state management)
- @tanstack/react-query 5.83.0 (server state management)
- @radix-ui/* components (30+ UI primitives for shadcn/ui)
- Tailwind CSS (via tailwindcss 3.4.17)
- Recharts 2.15.4 (charting library)
- Zod 3.25.76 (schema validation)
- Lucide React 0.462.0 (icon library)
- Sonner 1.7.4 (toast notifications)
- Date-fns 3.6.0 (date utilities)

**Development Dependencies**:
- @vitejs/plugin-react-swc 3.11.0 (SWC compiler plugin)
- ESLint 9.32.0 with TypeScript support
- TypeScript ESLint 8.38.0
- Tailwind CSS 3.4.17
- PostCSS 8.5.6 & Autoprefixer 10.4.21

## Build & Installation
```bash
npm install
npm run dev        # Start development server (http://localhost:8080)
npm run build      # Production build
npm run build:dev  # Development build
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

## Testing
No testing framework configured. Test dependencies and test files are not present in the project.

## Entry Point
**Main Entry**: `src/main.tsx` - Renders React app into DOM element with id "root"
**App Router**: `src/App.tsx` - Contains BrowserRouter configuration and route definitions
**Routes**: Home, Login, Dashboard (/Profile), Admin (/Users), NotFound (404)

## Configuration Files
- **vite.config.ts**: Dev server on port 8080, React + SWC plugin, path alias for @/
- **tsconfig.json**: Composite configuration with app and node references, ES2020 target, path aliases
- **tailwind.config.ts**: Tailwind customization and UI configuration
- **postcss.config.js**: PostCSS configuration for Tailwind
- **eslint.config.js**: ESLint with JS, TypeScript, React Hooks and React Refresh rules
- **components.json**: shadcn/ui component registry configuration
