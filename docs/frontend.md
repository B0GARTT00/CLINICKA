# Frontend structure and design conventions

The web client is a React 19/Vite SPA under `apps/web/src`.

| Directory       | Convention                                                                         |
| --------------- | ---------------------------------------------------------------------------------- |
| `routes`        | Router composition plus authenticated and authorized route outlets                 |
| `layouts`       | Persistent shell, responsive navigation, search and notifications                  |
| `pages`         | Route-level orchestration and feature forms; API access stays in `services/api.ts` |
| `components/ui` | Shared buttons, cards, fields, modal, status chips and async states                |
| `hooks`         | Authentication context and reusable state                                          |
| `auth`          | Client-side mirror of server permissions for navigation only                       |
| `services`      | Axios, token refresh, forbidden/session events, and typed endpoint functions       |

## Data and route rules

- TanStack Query owns server state. Query keys include active filters; successful mutations invalidate affected queries.
- React Hook Form/Zod may own complex forms; simple controlled MUI inputs are acceptable.
- `ProtectedRoute` handles authentication. `AuthorizedRoute` consults `ROUTE_PERMISSIONS`; the API remains authoritative.
- A server 401 clears the session. A server 403 emits `SERVER_FORBIDDEN_EVENT` for global feedback.
- Do not fetch sensitive records merely to calculate an aggregate UI. Reports use dedicated aggregate endpoints.

## Visual system

`theme.ts` defines the institutional emerald/gold palette, Inter/Segoe UI font stack, 12 px base radius, and MUI defaults. Pages may use Tailwind utilities for layout, but should reuse theme colors and shared components rather than introduce independent tokens.

Every data surface provides:

- `LoadingState` with live-region status;
- `EmptyState` with meaningful next-step copy;
- `ErrorState` with an alert and retry where safe;
- `MutationFeedback` for announced success or failure;
- labelled inputs, keyboard-operable actions, and semantic status chips.

Desktop and narrow layouts must remain usable. Destructive actions require explicit labeling and server validation; disabled UI is never treated as authorization.
