import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider, useIsFetching, useQuery } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
  useMatches,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { AppExpiredView } from '#/components/AppExpiredView'
import { AppHeader } from '#/components/AppHeader'
import { FeatureLockedView } from '#/components/FeatureLockedView'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { getApi } from '#/lib/api'
import { CurrencyProvider, useCurrency } from '#/lib/currency'
import { getFeatureForPathname } from '#/lib/features'
import { ThemeProvider, useTheme } from '#/lib/theme'
import { getLocale } from '#/paraglide/runtime'

import appCss from '../styles.css?url'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', getLocale())
    }
  },

  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Mobile Fix — POS & ERP',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootLayout,
  shellComponent: RootDocument,
})

function AppBootLoader() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <motion.div
      key="app-boot-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.04,
        filter: 'blur(12px)',
      }}
      transition={{
        duration: 0.48,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #18181f 0%, #1c1b24 100%)'
          : 'linear-gradient(180deg, #f8f9fc 0%, #f3f5fa 100%)',
      }}
      className="bg-background pointer-events-none fixed inset-0 z-50 flex min-h-screen w-full flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* Subtle dot matrix overlay matching Launchpad */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)'
            : 'radial-gradient(rgba(15, 23, 42, 0.045) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, #000 20%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, #000 20%, transparent 90%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.82, y: 10, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
        exit={{
          opacity: 0,
          scale: 0.88,
          y: -8,
          filter: 'blur(8px)',
          transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] },
        }}
        transition={{
          type: 'spring',
          stiffness: 340,
          damping: 24,
        }}
        className="relative flex flex-col items-center"
      >
        {/* Lighter animated gradient aura ONLY behind the box */}
        <motion.div
          className="pointer-events-none absolute -inset-16 rounded-full"
          style={{
            background: isDark
              ? 'conic-gradient(from 0deg at 50% 50%, rgba(99, 102, 241, 0.16) 0deg, rgba(20, 184, 166, 0.13) 120deg, rgba(168, 85, 247, 0.15) 240deg, rgba(244, 63, 94, 0.11) 300deg, rgba(99, 102, 241, 0.16) 360deg)'
              : 'conic-gradient(from 0deg at 50% 50%, rgba(99, 102, 241, 0.12) 0deg, rgba(20, 184, 166, 0.10) 120deg, rgba(168, 85, 247, 0.11) 240deg, rgba(244, 63, 94, 0.08) 300deg, rgba(99, 102, 241, 0.12) 360deg)',
            maskImage:
              'radial-gradient(circle at center, black 0%, rgba(0,0,0,0.5) 45%, transparent 72%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, black 0%, rgba(0,0,0,0.5) 45%, transparent 72%)',
            filter: 'blur(26px)',
          }}
          animate={{
            rotate: [0, 360],
            scale: [0.92, 1.08, 0.92],
          }}
          transition={{
            rotate: { duration: 7, repeat: Infinity, ease: 'linear' },
            scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          }}
        />

        <motion.div
          className="pointer-events-none absolute -inset-10 rounded-full"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.18) 0%, rgba(20, 184, 166, 0.10) 45%, transparent 75%)'
              : 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.13) 0%, rgba(20, 184, 166, 0.08) 45%, transparent 75%)',
            filter: 'blur(18px)',
          }}
          animate={{
            scale: [0.9, 1.12, 0.9],
            opacity: [0.6, 0.95, 0.6],
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Icon box without border line animation */}
        <div className="relative flex size-24 items-center justify-center">
          <motion.div
            className="bg-card relative flex size-20 items-center justify-center overflow-hidden rounded-2xl shadow-lg ring-1 ring-slate-950/[0.06] dark:ring-white/[0.1]"
            style={{
              background: isDark
                ? 'linear-gradient(145deg, #262533 0%, #1e1e26 52%, #1d2628 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f8faff 52%, #f4fbf9 100%)',
            }}
            animate={{
              y: [-2.5, 2.5, -2.5],
            }}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <svg
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10 size-12 overflow-visible"
            >
              {/* Spinning dashed orbit */}
              <motion.circle
                cx="32"
                cy="32"
                r="25"
                stroke="currentColor"
                className="text-primary/30"
                strokeWidth="1.75"
                strokeDasharray="6 6"
                style={{ originX: '32px', originY: '32px' }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />

              {/* Coral capsule bar */}
              <motion.g
                style={{ originX: '32px', originY: '32px' }}
                animate={{
                  rotate: [0, -12, 8, 0],
                  scale: [1, 1.06, 0.97, 1],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <rect
                  x="14"
                  y="37"
                  width="38"
                  height="12"
                  rx="6"
                  transform="rotate(-45 14 37)"
                  fill="#F43F5E"
                />
              </motion.g>

              {/* Teal capsule bar */}
              <motion.g
                style={{ originX: '32px', originY: '32px' }}
                animate={{
                  rotate: [0, 12, -8, 0],
                  scale: [1, 1.06, 0.97, 1],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <rect
                  x="23"
                  y="15"
                  width="38"
                  height="12"
                  rx="6"
                  transform="rotate(45 23 15)"
                  fill="#14B8A6"
                />
              </motion.g>

              {/* Center core node */}
              <motion.circle
                cx="32"
                cy="32"
                r="7"
                className="fill-primary"
                style={{ originX: '32px', originY: '32px' }}
                animate={{ scale: [0.9, 1.18, 0.9] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <circle cx="32" cy="32" r="2.8" fill="#ffffff" />
            </svg>
          </motion.div>
        </div>

        {/* Progress line loading under box */}
        <div className="relative mt-3 h-1 w-28 overflow-hidden rounded-full bg-indigo-500/12 dark:bg-indigo-400/15">
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-indigo-500 via-teal-400 to-rose-500"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 1.15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

function ProtectedShell() {
  const { language } = useTheme()
  const { isFeatureLocked, liveTimer } = useCurrency()
  const location = useLocation()
  const matches = useMatches()
  const navigate = useNavigate()
  const isRouterLoading = useRouterState({
    select: (s) => s.isLoading || s.status === 'pending',
  })
  const isFetching = useIsFetching()
  const activePathname = matches[matches.length - 1]?.pathname ?? location.pathname
  const isHome = activePathname === '/'
  const isLogin = activePathname === '/login'
  const isSettingsSubroute = activePathname.startsWith('/settings')
  const isFullBleed = isHome || isLogin || isSettingsSubroute
  const routeFeature = !isSettingsSubroute ? getFeatureForPathname(activePathname) : null
  const isRouteLocked = Boolean(routeFeature && isFeatureLocked(routeFeature))
  const [minBootHold, setMinBootHold] = useState(true)
  const [hasBooted, setHasBooted] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinBootHold(false)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [])

  const authQuery = useQuery({
    queryKey: ['auth-guard'],
    queryFn: async () => {
      const { data, error } = await getApi()['auth-guard'].me.get()
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })

  useEffect(() => {
    document.body.removeAttribute('data-scroll-locked')
    document.body.style.removeProperty('overflow')
    document.body.style.removeProperty('pointer-events')
  }, [location.pathname])

  useEffect(() => {
    if (authQuery.isLoading || minBootHold) return
    if (!isLogin && !authQuery.data?.authenticated) {
      void navigate({ to: '/login', replace: true })
    } else if (isLogin && authQuery.data?.authenticated) {
      void navigate({ to: '/', replace: true })
    }
  }, [authQuery.isLoading, authQuery.data?.authenticated, isLogin, minBootHold, navigate])

  const isNetworkBootPending =
    authQuery.isLoading || isRouterLoading || (!hasBooted && isFetching > 0)

  useEffect(() => {
    if (!minBootHold && !isNetworkBootPending && !hasBooted) {
      setHasBooted(true)
    }
  }, [minBootHold, isNetworkBootPending, hasBooted])

  const isBooting =
    !isLogin && (!hasBooted || minBootHold || authQuery.isLoading || !authQuery.data?.authenticated)

  if (liveTimer.enabled && liveTimer.isExpired) {
    return <AppExpiredView />
  }

  return (
    <div className="bg-background text-foreground min-h-screen transition-colors">
      <AnimatePresence>{isBooting && <AppBootLoader />}</AnimatePresence>

      {!authQuery.isLoading && (isLogin || authQuery.data?.authenticated) && (
        <motion.div
          key={language}
          initial={{ opacity: 0 }}
          animate={{ opacity: isBooting ? 0 : 1 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <AppHeader />
          <main className={isFullBleed ? undefined : 'mx-auto max-w-[1600px] px-4 py-5 sm:px-6'}>
            {isRouteLocked && routeFeature ? (
              <FeatureLockedView feature={routeFeature} />
            ) : (
              <Outlet />
            )}
          </main>
        </motion.div>
      )}
    </div>
  )
}

function RootLayout() {
  const { queryClient } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <ProtectedShell />
            <Toaster position="bottom-right" richColors closeButton />
          </TooltipProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
