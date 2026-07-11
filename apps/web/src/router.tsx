import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  })
  const router = createTanStackRouter({
    context: { queryClient },
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 30_000,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
