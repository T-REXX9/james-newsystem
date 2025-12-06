# Repository Guidelines for Agentic Coding Agents

## Commands
- `npm install` — install dependencies
- `npm run dev` — dev server on localhost:8080
- `npm run build` — production build to dist/
- `npm run test` — run all tests
- `npm run test -- filename` — run single test file
- `npm run preview` — serve production build locally

## Code Style
- TypeScript, functional React components with `React.FC<Props>`
- 2-space indentation, single quotes, PascalCase components, camelCase functions
- Import order: React → third-party → local components → services → types/constants
- Tailwind classes inline, no CSS modules
- Error handling with try/catch, console.error for debugging
- Use services layer, avoid direct localStorage access
- Props from types.ts when possible

## Testing
- Place tests beside components: `Component.test.tsx`
- Use react-testing-library, mock services with `vi.mock()`
- Test empty states, error states, and user interactions

## Structure
- components/ for UI, services/ for data logic, types.ts for models
- constants.ts for mock data and fixtures
- Never edit dist/ directly
