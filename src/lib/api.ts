import { treaty } from '@elysiajs/eden'
import { createIsomorphicFn } from '@tanstack/react-start'

import { type App, app } from '#/server'

/**
 * Isomorphic Eden Treaty client for TanStack Start:
 *
 * - Server (SSR / Loaders): invokes Elysia directly in-memory via `treaty(app).api`
 * - Client (Browser): sends typed HTTP requests via `treaty<App>(window.location.origin).api`
 */
export const getApi = createIsomorphicFn()
  .server(() => treaty(app).api)
  .client(
    () =>
      treaty<App>(window.location.origin, {
        fetch: {
          credentials: 'include',
        },
      }).api,
  )
