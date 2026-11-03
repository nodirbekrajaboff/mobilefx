import { IconLock, IconLogout, IconX } from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { LiveDemoTimerBadge } from '#/components/LiveDemoTimerBadge'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { getApi } from '#/lib/api'
import { useCurrency } from '#/lib/currency'
import type { AppFeatureKey } from '#/lib/features'
import { useTheme } from '#/lib/theme'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/')({
  component: MainLaunchpadPage,
})

const iconSpring = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 18,
}

/* ============================================================================
 * MAXSUS VECTOR ILLUSTRATOR SVG ICONS (Animated with Motion on Hover)
 * ========================================================================== */

function RepairsSvg() {
  return (
    <svg viewBox="0 0 64 64" className="size-13 overflow-visible" fill="none">
      <motion.g
        style={{ originX: '32px', originY: '32px' }}
        variants={{
          rest: { rotate: 0, scale: 1 },
          hover: { rotate: -14, scale: 1.05 },
        }}
        transition={iconSpring}
      >
        <rect
          x="12"
          y="38"
          width="42"
          height="14"
          rx="7"
          transform="rotate(-45 12 38)"
          fill="#F46060"
        />
      </motion.g>
      <motion.g
        style={{ originX: '32px', originY: '32px' }}
        variants={{
          rest: { rotate: 0, scale: 1 },
          hover: { rotate: 14, scale: 1.05 },
        }}
        transition={iconSpring}
      >
        <rect
          x="22"
          y="12"
          width="42"
          height="14"
          rx="7"
          transform="rotate(45 22 12)"
          fill="#14B8A6"
        />
      </motion.g>
      <motion.circle
        cx="32"
        cy="32"
        r="7.5"
        fill="#0F4C5C"
        style={{ originX: '32px', originY: '32px' }}
        variants={{
          rest: { scale: 1 },
          hover: { scale: 1.18 },
        }}
        transition={iconSpring}
      />
      <motion.circle
        cx="32"
        cy="32"
        r="3"
        fill="#FFF8F0"
        style={{ originX: '32px', originY: '32px' }}
        variants={{
          rest: { scale: 1 },
          hover: { scale: 1.3 },
        }}
        transition={iconSpring}
      />
    </svg>
  )
}

function PhonesSvg() {
  return (
    <svg viewBox="0 0 64 64" className="size-13 overflow-visible" fill="none">
      <motion.g
        style={{ originX: '36px', originY: '32px' }}
        variants={{
          rest: { rotate: 0, x: 0, y: 0 },
          hover: { rotate: 9, x: 3.5, y: -2 },
        }}
        transition={iconSpring}
      >
        <rect
          x="23"
          y="10"
          width="26"
          height="42"
          rx="6"
          transform="rotate(8 23 10)"
          fill="#7C5CFC"
          opacity="0.85"
        />
      </motion.g>
      <motion.g
        style={{ originX: '28px', originY: '33px' }}
        variants={{
          rest: { rotate: 0, x: 0, y: 0 },
          hover: { rotate: -5, x: -2.5, y: -1 },
        }}
        transition={iconSpring}
      >
        <rect x="15" y="12" width="26" height="42" rx="6" fill="#0EA5E9" />
        <path
          d="M19 18C19 16.8954 19.8954 16 21 16H35C36.1046 16 37 16.8954 37 18V36L19 44V18Z"
          fill="#38BDF8"
        />
        <rect x="24" y="19" width="8" height="2.5" rx="1.25" fill="#0F172A" />
        <circle cx="28" cy="48" r="2" fill="#E0F2FE" />
      </motion.g>
    </svg>
  )
}

function PartsSvg() {
  return (
    <svg viewBox="0 0 64 64" className="size-13 overflow-visible" fill="none">
      <motion.g
        style={{ originX: '32px', originY: '32px' }}
        variants={{
          rest: { rotate: 0, scale: 1 },
          hover: { rotate: -5, scale: 1.05 },
        }}
        transition={iconSpring}
      >
        <path d="M32 9L52 20.5V43.5L32 55L12 43.5V20.5L32 9Z" fill="#F59E0B" />
        <path d="M32 9L52 20.5L32 32L12 20.5L32 9Z" fill="#FBBF24" />
        <path d="M32 32L52 20.5V43.5L32 55V32Z" fill="#8B5CF6" />
      </motion.g>
      <motion.path
        d="M34 21L25 34H32L30 43L39 30H32L34 21Z"
        fill="#FFFBEB"
        style={{ originX: '32px', originY: '32px' }}
        variants={{
          rest: { scale: 1, rotate: 0, y: 0 },
          hover: { scale: 1.24, rotate: 8, y: -1.5 },
        }}
        transition={iconSpring}
      />
    </svg>
  )
}

function PosSvg() {
  return (
    <svg viewBox="0 0 64 64" className="size-13 overflow-visible" fill="none">
      <motion.g
        style={{ originX: '32px', originY: '40px' }}
        variants={{
          rest: { scale: 1, y: 0 },
          hover: { scale: 1.04, y: 1 },
        }}
        transition={iconSpring}
      >
        <rect x="12" y="26" width="40" height="26" rx="6" fill="#58508D" />
        <rect x="16" y="34" width="32" height="14" rx="3" fill="#FFA600" />
      </motion.g>
      <motion.g
        style={{ originX: '32px', originY: '14px' }}
        variants={{
          rest: { y: 0, scaleY: 1, scaleX: 1 },
          hover: { y: -2.5, scaleY: 1.12, scaleX: 1.04 },
        }}
        transition={iconSpring}
      >
        <path
          d="M10 14H21L19 28C19 30.5 16.8 32 14.2 32C11.5 32 9.5 30 9.5 27.5L10 14Z"
          fill="#FF6361"
        />
        <path
          d="M21 14H32V27.5C32 30 29.8 32 26.8 32C23.8 32 21.5 30 21.5 27.5L21 14Z"
          fill="#FFA600"
        />
        <path
          d="M32 14H43L42.5 27.5C42.5 30 40.2 32 37.2 32C34.2 32 32 30 32 27.5V14Z"
          fill="#FF6361"
        />
        <path
          d="M43 14H54L54.5 27.5C54.5 30 52.5 32 49.8 32C47.2 32 45 30.5 45 28L43 14Z"
          fill="#FFA600"
        />
      </motion.g>
    </svg>
  )
}

function DebtsSvg() {
  return (
    <svg viewBox="0 0 64 64" className="size-13 overflow-visible" fill="none">
      <motion.g
        style={{ originX: '34px', originY: '32px' }}
        variants={{
          rest: { rotate: 0, x: 0, y: 0 },
          hover: { rotate: 8, x: 3.5, y: -2 },
        }}
        transition={iconSpring}
      >
        <rect
          x="18"
          y="10"
          width="32"
          height="42"
          rx="5"
          transform="rotate(6 18 10)"
          fill="#FB923C"
        />
      </motion.g>
      <motion.g
        style={{ originX: '29px', originY: '33px' }}
        variants={{
          rest: { rotate: 0, x: 0 },
          hover: { rotate: -4, x: -2 },
        }}
        transition={iconSpring}
      >
        <rect x="13" y="12" width="32" height="42" rx="5" fill="#10B981" />
        <path
          d="M13 17C13 14.2386 15.2386 12 18 12H20V54H18C15.2386 54 13 51.7614 13 49V17Z"
          fill="#047857"
        />
        <rect x="24" y="22" width="14" height="3.5" rx="1.75" fill="#ECFDF5" />
        <rect x="24" y="30" width="10" height="3.5" rx="1.75" fill="#A7F3D0" />
        <motion.circle
          cx="36"
          cy="42"
          r="5"
          fill="#FEF3C7"
          style={{ originX: '36px', originY: '42px' }}
          variants={{
            rest: { scale: 1 },
            hover: { scale: 1.25 },
          }}
          transition={iconSpring}
        />
      </motion.g>
    </svg>
  )
}

function AnalyticsSvg() {
  return (
    <svg viewBox="0 0 64 64" className="size-13 overflow-visible" fill="none">
      <motion.rect
        x="12"
        y="32"
        width="11"
        height="20"
        rx="3.5"
        fill="#8E44AD"
        style={{ originX: '17.5px', originY: '52px' }}
        variants={{
          rest: { scaleY: 1 },
          hover: { scaleY: 1.22 },
        }}
        transition={iconSpring}
      />
      <motion.rect
        x="26.5"
        y="22"
        width="11"
        height="30"
        rx="3.5"
        fill="#F36854"
        style={{ originX: '32px', originY: '52px' }}
        variants={{
          rest: { scaleY: 1 },
          hover: { scaleY: 1.15 },
        }}
        transition={{ ...iconSpring, delay: 0.03 }}
      />
      <motion.rect
        x="41"
        y="12"
        width="11"
        height="40"
        rx="3.5"
        fill="#FBBF24"
        style={{ originX: '46.5px', originY: '52px' }}
        variants={{
          rest: { scaleY: 1 },
          hover: { scaleY: 1.12 },
        }}
        transition={{ ...iconSpring, delay: 0.06 }}
      />
      <motion.g
        variants={{
          rest: { y: 0 },
          hover: { y: -3.5 },
        }}
        transition={iconSpring}
      >
        <circle cx="17.5" cy="24" r="3.5" fill="#14B8A6" />
        <path d="M17.5 24L32 15L46.5 12" stroke="#14B8A6" strokeWidth="3" strokeLinecap="round" />
      </motion.g>
    </svg>
  )
}

function SettingsSvg() {
  return (
    <svg viewBox="0 0 64 64" className="size-13 overflow-visible" fill="none">
      <rect x="12" y="14" width="40" height="14" rx="7" fill="#6366F1" />
      <motion.circle
        cx="43"
        cy="21"
        r="4.5"
        fill="#EEF2FF"
        variants={{
          rest: { x: 0 },
          hover: { x: -22 },
        }}
        transition={iconSpring}
      />
      <rect x="12" y="36" width="40" height="14" rx="7" fill="#14B8A6" />
      <motion.circle
        cx="21"
        cy="43"
        r="4.5"
        fill="#F0FDFA"
        variants={{
          rest: { x: 0 },
          hover: { x: 22 },
        }}
        transition={iconSpring}
      />
    </svg>
  )
}

function CustomersSvg() {
  return (
    <svg viewBox="0 0 64 64" className="size-13 overflow-visible" fill="none">
      <motion.g
        style={{ originX: '42px', originY: '37px' }}
        variants={{
          rest: { x: 0, y: 0, scale: 1 },
          hover: { x: 3.5, y: -2, scale: 1.06 },
        }}
        transition={iconSpring}
      >
        <circle cx="42" cy="22" r="8" fill="#F59E0B" />
        <path
          d="M30 46C30 39.3726 35.3726 34 42 34C48.6274 34 54 39.3726 54 46V49C54 50.6569 52.6569 52 51 52H33C31.3431 52 30 50.6569 30 49V46Z"
          fill="#FBBF24"
        />
      </motion.g>
      <motion.g
        style={{ originX: '25px', originY: '37px' }}
        variants={{
          rest: { x: 0, y: 0, scale: 1 },
          hover: { x: -2.5, y: -1, scale: 1.06 },
        }}
        transition={iconSpring}
      >
        <circle cx="25" cy="20" r="9.5" fill="#6366F1" />
        <path
          d="M10 47C10 38.7157 16.7157 32 25 32C33.2843 32 40 38.7157 40 47V50C40 51.6569 38.6569 53 37 53H13C11.3431 53 10 51.6569 10 50V47Z"
          fill="#14B8A6"
        />
      </motion.g>
    </svg>
  )
}

function SalesSvg() {
  return (
    <svg viewBox="0 0 64 64" className="size-13 overflow-visible" fill="none">
      <motion.g
        style={{ originX: '30px', originY: '32px' }}
        variants={{
          rest: { y: 0, rotate: 0 },
          hover: { y: -2.5, rotate: -3 },
        }}
        transition={iconSpring}
      >
        <path
          d="M14 14C14 11.7909 15.7909 10 18 10H42C44.2091 10 46 11.7909 46 14V51L41 47.5L36 51L30 47.5L24 51L19 47.5L14 51V14Z"
          fill="#6366F1"
        />
        <rect x="20" y="18" width="20" height="3.5" rx="1.75" fill="#E0E7FF" />
        <rect x="20" y="25" width="14" height="3.5" rx="1.75" fill="#C7D2FE" />
        <rect x="20" y="32" width="11" height="3.5" rx="1.75" fill="#A5B4FC" />
      </motion.g>
      <motion.g
        style={{ originX: '44px', originY: '41px' }}
        variants={{
          rest: { scale: 1, x: 0, y: 0 },
          hover: { scale: 1.16, x: 2.5, y: 1.5 },
        }}
        transition={iconSpring}
      >
        <circle cx="44" cy="41" r="11" fill="#10B981" />
        <path
          d="M39.5 41.2L42.6 44.3L48.8 38.1"
          stroke="#ECFDF5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
    </svg>
  )
}

function LoopingAppIcon({
  Illustration,
  glow,
}: {
  Illustration: React.ComponentType
  glow: string
}) {
  const [activeVariant, setActiveVariant] = useState<'rest' | 'hover'>('hover')

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveVariant((prev) => (prev === 'hover' ? 'rest' : 'hover'))
    }, 620)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="pointer-events-none absolute -inset-6 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${glow} 0%, transparent 72%)`,
          filter: 'blur(12px)',
        }}
        animate={{
          scale: [0.88, 1.22, 0.88],
          opacity: [0.55, 1, 0.55],
        }}
        transition={{
          duration: 1.3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div initial="rest" animate={activeVariant} style={{ display: 'flex' }}>
        <motion.div
          animate={{
            y: [-3, 3, -3],
            scale: [0.96, 1.07, 0.96],
          }}
          transition={{
            duration: 1.24,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="flex items-center justify-center"
        >
          <Illustration />
        </motion.div>
      </motion.div>
    </div>
  )
}

function WarehouseFolderMiniPreview({
  isDark,
  phonesLocked,
  partsLocked,
}: {
  isDark: boolean
  phonesLocked?: boolean
  partsLocked?: boolean
}) {
  return (
    <div className="grid size-full grid-cols-2 grid-rows-2 gap-1.5 p-2.5">
      {/* Mini App 1: Phones */}
      <motion.div
        variants={{
          rest: { scale: 1, y: 0 },
          hover: { scale: 1.07, y: -1 },
        }}
        transition={iconSpring}
        style={{
          background: isDark
            ? 'linear-gradient(145deg, #1d242e 0%, #21202e 100%)'
            : 'linear-gradient(145deg, #ffffff 0%, #e0f2fe 100%)',
        }}
        className={`relative flex items-center justify-center rounded-[7px] shadow-2xs ring-1 ring-black/[0.06] dark:ring-white/[0.12] ${
          phonesLocked ? 'opacity-60 grayscale-[45%]' : ''
        }`}
      >
        <div className="scale-[0.42] transform">
          <PhonesSvg />
        </div>
        {phonesLocked && (
          <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-white shadow-2xs">
            <IconLock className="size-2.5 stroke-[2.5]" />
          </span>
        )}
      </motion.div>

      {/* Mini App 2: Spare Parts */}
      <motion.div
        variants={{
          rest: { scale: 1, y: 0 },
          hover: { scale: 1.07, y: -1 },
        }}
        transition={iconSpring}
        style={{
          background: isDark
            ? 'linear-gradient(145deg, #29231c 0%, #231f2d 100%)'
            : 'linear-gradient(145deg, #ffffff 0%, #fef3c7 100%)',
        }}
        className={`relative flex items-center justify-center rounded-[7px] shadow-2xs ring-1 ring-black/[0.06] dark:ring-white/[0.12] ${
          partsLocked ? 'opacity-60 grayscale-[45%]' : ''
        }`}
      >
        <div className="scale-[0.42] transform">
          <PartsSvg />
        </div>
        {partsLocked && (
          <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-white shadow-2xs">
            <IconLock className="size-2.5 stroke-[2.5]" />
          </span>
        )}
      </motion.div>

      {/* Empty mini slot 3 */}
      <div className="rounded-[7px] bg-slate-900/[0.045] ring-1 ring-black/[0.03] ring-inset dark:bg-white/[0.05] dark:ring-white/[0.05]" />

      {/* Empty mini slot 4 */}
      <div className="rounded-[7px] bg-slate-900/[0.045] ring-1 ring-black/[0.03] ring-inset dark:bg-white/[0.05] dark:ring-white/[0.05]" />
    </div>
  )
}

interface AppEntry {
  id: string
  to:
    | '/repairs'
    | '/phones'
    | '/parts'
    | '/pos'
    | '/sales'
    | '/debts'
    | '/customers'
    | '/analytics'
    | '/settings'
  label: string
  Illustration: React.ComponentType
  lightBg: string
  darkBg: string
  glow: string
}

interface LaunchingAppState extends AppEntry {
  rect: {
    left: number
    top: number
    width: number
    height: number
  }
}

function MainLaunchpadPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { resolvedTheme } = useTheme()
  const { isFeatureLocked, notifyFeatureLocked } = useCurrency()
  const isDark = resolvedTheme === 'dark'
  const [launchingApp, setLaunchingApp] = useState<LaunchingAppState | null>(null)
  const [closingAppId, setClosingAppId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const saved = sessionStorage.getItem('closing-app-id')
    if (saved) {
      sessionStorage.removeItem('closing-app-id')
    }
    return saved
  })
  const [closingApp, setClosingApp] = useState<LaunchingAppState | null>(null)
  const [isFolderOpen, setIsFolderOpen] = useState<boolean>(
    () => closingAppId === 'phones' || closingAppId === 'parts',
  )
  const [folderOffset, setFolderOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const launchTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (launchTimerRef.current !== null) {
        window.clearTimeout(launchTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isFolderOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !launchingApp) {
        updateFolderOriginOffset()
        setIsFolderOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFolderOpen, launchingApp])

  const updateFolderOriginOffset = () => {
    const folderTile = document.querySelector('[data-app-id="warehouse"] [data-app-tile]')
    if (!folderTile) return
    const rect = folderTile.getBoundingClientRect()
    setFolderOffset({
      x: Math.round(rect.left + rect.width / 2 - window.innerWidth / 2),
      y: Math.round(rect.top + rect.height / 2 - window.innerHeight / 2),
    })
  }

  const authQuery = useQuery({
    queryKey: ['auth-guard'],
    queryFn: async () => {
      const { data, error } = await getApi()['auth-guard'].me.get()
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })

  const userName = authQuery.data?.user?.name || 'Sardor Usta'
  const userEmail = authQuery.data?.user?.email || 'admin@mobilefix.uz'
  const userInitials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const labels = {
    repairs: m.nav_repairs(),
    warehouse: m.nav_warehouse(),
    phones: m.nav_phones(),
    parts: m.nav_parts(),
    pos: m.nav_pos(),
    sales: m.nav_sales(),
    debts: m.nav_debts(),
    customers: m.nav_customers(),
    analytics: m.nav_analytics(),
    settings: m.nav_settings(),
  }

  const warehouseApps: AppEntry[] = [
    {
      id: 'phones',
      to: '/phones',
      label: labels.phones,
      Illustration: PhonesSvg,
      lightBg: 'linear-gradient(145deg, #ffffff 0%, #f0f9ff 55%, #eef2ff 100%)',
      darkBg: 'linear-gradient(145deg, #1d242e 0%, #1e1e23 55%, #21202e 100%)',
      glow: 'rgba(56, 189, 248, 0.18)',
    },
    {
      id: 'parts',
      to: '/parts',
      label: labels.parts,
      Illustration: PartsSvg,
      lightBg: 'linear-gradient(145deg, #ffffff 0%, #fffbeb 55%, #f5f3ff 100%)',
      darkBg: 'linear-gradient(145deg, #29231c 0%, #1e1e23 55%, #231f2d 100%)',
      glow: 'rgba(245, 158, 11, 0.18)',
    },
  ]

  type HomeTileItem =
    | ({ kind: 'app' } & AppEntry)
    | {
        kind: 'folder'
        id: 'warehouse'
        label: string
        lightBg: string
        darkBg: string
        glow: string
        children: AppEntry[]
      }

  const homeItems: HomeTileItem[] = [
    {
      kind: 'app',
      id: 'repairs',
      to: '/repairs',
      label: labels.repairs,
      Illustration: RepairsSvg,
      lightBg: 'linear-gradient(145deg, #ffffff 0%, #fff5f5 55%, #f0fdf9 100%)',
      darkBg: 'linear-gradient(145deg, #272024 0%, #1e1e23 55%, #1d2624 100%)',
      glow: 'rgba(244, 63, 94, 0.18)',
    },
    {
      kind: 'folder',
      id: 'warehouse',
      label: labels.warehouse,
      lightBg:
        'linear-gradient(145deg, rgba(255,255,255,0.88) 0%, rgba(240,249,255,0.84) 52%, rgba(254,243,199,0.78) 100%)',
      darkBg:
        'linear-gradient(145deg, rgba(35,39,51,0.9) 0%, rgba(30,30,37,0.88) 52%, rgba(41,35,28,0.86) 100%)',
      glow: 'rgba(56, 189, 248, 0.2)',
      children: warehouseApps,
    },
    {
      kind: 'app',
      id: 'pos',
      to: '/pos',
      label: labels.pos,
      Illustration: PosSvg,
      lightBg: 'linear-gradient(145deg, #ffffff 0%, #fff7ed 55%, #faf5ff 100%)',
      darkBg: 'linear-gradient(145deg, #29211d 0%, #1e1e23 55%, #251e2c 100%)',
      glow: 'rgba(249, 115, 22, 0.18)',
    },
    {
      kind: 'app',
      id: 'sales',
      to: '/sales',
      label: labels.sales,
      Illustration: SalesSvg,
      lightBg: 'linear-gradient(145deg, #ffffff 0%, #eef2ff 55%, #ecfdf5 100%)',
      darkBg: 'linear-gradient(145deg, #1f2130 0%, #1e1e23 55%, #1c2723 100%)',
      glow: 'rgba(99, 102, 241, 0.18)',
    },
    {
      kind: 'app',
      id: 'debts',
      to: '/debts',
      label: labels.debts,
      Illustration: DebtsSvg,
      lightBg: 'linear-gradient(145deg, #ffffff 0%, #ecfdf5 55%, #f0fdfa 100%)',
      darkBg: 'linear-gradient(145deg, #1c2722 0%, #1e1e23 55%, #1c2525 100%)',
      glow: 'rgba(16, 185, 129, 0.18)',
    },
    {
      kind: 'app',
      id: 'customers',
      to: '/customers',
      label: labels.customers,
      Illustration: CustomersSvg,
      lightBg: 'linear-gradient(145deg, #ffffff 0%, #eef2ff 55%, #f0fdfa 100%)',
      darkBg: 'linear-gradient(145deg, #20212e 0%, #1e1e23 55%, #1c2625 100%)',
      glow: 'rgba(99, 102, 241, 0.18)',
    },
    {
      kind: 'app',
      id: 'analytics',
      to: '/analytics',
      label: labels.analytics,
      Illustration: AnalyticsSvg,
      lightBg: 'linear-gradient(145deg, #ffffff 0%, #fdf2f8 55%, #f5f3ff 100%)',
      darkBg: 'linear-gradient(145deg, #281e26 0%, #1e1e23 55%, #221f2d 100%)',
      glow: 'rgba(168, 85, 247, 0.18)',
    },
    {
      kind: 'app',
      id: 'settings',
      to: '/settings',
      label: labels.settings,
      Illustration: SettingsSvg,
      lightBg: 'linear-gradient(145deg, #ffffff 0%, #eef2ff 55%, #ecfeff 100%)',
      darkBg: 'linear-gradient(145deg, #20222e 0%, #1e1e23 55%, #1c2529 100%)',
      glow: 'rgba(20, 184, 166, 0.18)',
    },
  ]

  const allApps: AppEntry[] = [
    ...homeItems.filter((item): item is { kind: 'app' } & AppEntry => item.kind === 'app'),
    ...warehouseApps,
  ]

  useLayoutEffect(() => {
    updateFolderOriginOffset()
  }, [])

  useLayoutEffect(() => {
    if (!closingAppId) return

    const matchedApp = allApps.find((a) => a.id === closingAppId)
    const tileEl =
      document.querySelector(`[data-app-id="${closingAppId}"] [data-app-tile]`) ??
      document.querySelector('[data-app-id="warehouse"] [data-app-tile]')
    if (!matchedApp || !tileEl) {
      setClosingAppId(null)
      return
    }

    const rect = tileEl.getBoundingClientRect()
    setClosingApp({
      id: matchedApp.id,
      to: matchedApp.to,
      label: matchedApp.label,
      Illustration: matchedApp.Illustration,
      lightBg: matchedApp.lightBg,
      darkBg: matchedApp.darkBg,
      glow: matchedApp.glow,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
    })
  }, [closingAppId])

  const triggerAppLaunch = (app: AppEntry, e: React.MouseEvent<HTMLButtonElement>) => {
    if (launchingApp || closingApp || closingAppId) return
    if (app.id !== 'settings' && isFeatureLocked(app.id as AppFeatureKey)) {
      notifyFeatureLocked(app.id as AppFeatureKey)
      return
    }
    const tile = e.currentTarget.querySelector('[data-app-tile]')
    const rect = (tile ?? e.currentTarget).getBoundingClientRect()
    const cx = Math.round(rect.left + rect.width / 2)
    const cy = Math.round(rect.top + rect.height / 2)

    document.documentElement.style.setProperty('--ios-origin-x', `${cx}px`)
    document.documentElement.style.setProperty('--ios-origin-y', `${cy}px`)

    setLaunchingApp({
      ...app,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
    })

    void router.preloadRoute({ to: app.to })

    const randomLoadingMs = Math.floor(750 + Math.random() * 1200)
    launchTimerRef.current = window.setTimeout(() => {
      document.documentElement.dataset.vtDirection = 'subpage'
      void navigate({ to: app.to })
    }, randomLoadingMs)
  }

  const bgGradient =
    resolvedTheme === 'dark'
      ? 'radial-gradient(ellipse 70% 40% at 50% 105%, rgba(99, 102, 241, 0.18) 0%, rgba(139, 92, 246, 0.09) 45%, transparent 82%), linear-gradient(to top, #1b1c26 0%, #181820 40%, #16161b 100%)'
      : 'radial-gradient(ellipse 70% 40% at 50% 105%, rgba(99, 102, 241, 0.13) 0%, rgba(168, 85, 247, 0.07) 45%, rgba(56, 189, 248, 0.04) 70%, transparent 85%), linear-gradient(to top, #eef1fb 0%, #f5f7fc 42%, #fafbfe 100%)'

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-6 select-none"
      style={{
        background: bgGradient,
      }}
    >
      {/* Pastdan tepaga tarqaluvchi yumshoq nur gumbazi (Bottom Horizon Glow) */}
      <div
        className="pointer-events-none absolute inset-x-0 -bottom-28 mx-auto h-72 w-[min(88vw,920px)] rounded-full blur-3xl"
        style={{
          background:
            resolvedTheme === 'dark'
              ? 'radial-gradient(ellipse at 50% 85%, rgba(99, 102, 241, 0.16) 0%, rgba(168, 85, 247, 0.08) 50%, transparent 78%)'
              : 'radial-gradient(ellipse at 50% 85%, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.06) 50%, transparent 78%)',
        }}
      />

      {/* Minimal nuqtali to'r qatlami */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            resolvedTheme === 'dark'
              ? 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)'
              : 'radial-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 70% 65% at 50% 55%, #000 30%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 65% at 50% 55%, #000 30%, transparent 100%)',
        }}
      />

      {/* Tepa o'ng tomonda Live Timer (agar APP_LIVE_HOURS bo'lsa) va User Avatar */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-end gap-2.5 px-4 sm:gap-3 sm:px-6">
          <LiveDemoTimerBadge />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-slot="user-avatar"
                variant="ghost"
                size="icon-lg"
                className="pointer-events-auto rounded-full p-0"
                aria-label={m.user_profile()}
              >
                <Avatar size="default">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold shadow-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-foreground truncate text-xs font-semibold">{userName}</span>
                <span className="text-muted-foreground truncate text-xs">{userEmail}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  await getApi()['auth-guard'].logout.post()
                  await queryClient.invalidateQueries({
                    queryKey: ['auth-guard'],
                  })
                  void navigate({ to: '/login', replace: true })
                }}
              >
                <IconLogout />
                {m.logout()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Markazda faqat Apps va Sклад Folder (Motion Scale + Animated SVG Illustrations + Blur/Dim) */}
      <div className="relative z-10 grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-4 md:gap-x-14 md:gap-y-12">
        {homeItems.map((item) => {
          const { id, label, lightBg, darkBg, glow } = item
          const isPhonesLocked = isFeatureLocked('phones')
          const isPartsLocked = isFeatureLocked('parts')
          const isTileLocked =
            item.kind === 'folder'
              ? isPhonesLocked && isPartsLocked
              : id !== 'settings' && isFeatureLocked(id as AppFeatureKey)
          const isOtherLaunching = launchingApp !== null && launchingApp.id !== id
          const isClickedLaunching = launchingApp?.id === id
          const isClickedClosing = closingAppId === id || closingApp?.id === id
          const isOtherClosing =
            closingAppId !== null &&
            closingAppId !== id &&
            !(item.kind === 'folder' && (closingAppId === 'phones' || closingAppId === 'parts'))

          const handleTileClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (launchingApp || closingApp || closingAppId) return

            if (item.kind === 'folder') {
              const tile = e.currentTarget.querySelector('[data-app-tile]')
              const rect = (tile ?? e.currentTarget).getBoundingClientRect()
              setFolderOffset({
                x: Math.round(rect.left + rect.width / 2 - window.innerWidth / 2),
                y: Math.round(rect.top + rect.height / 2 - window.innerHeight / 2),
              })
              setIsFolderOpen(true)
              return
            }

            triggerAppLaunch(item, e)
          }

          return (
            <motion.button
              key={id}
              data-app-id={id}
              type="button"
              onClick={handleTileClick}
              initial={
                isOtherClosing
                  ? {
                      opacity: 0.18,
                      scale: 0.92,
                    }
                  : false
              }
              animate={
                isFolderOpen
                  ? item.kind === 'folder'
                    ? {
                        opacity: 0,
                        scale: 1.18,
                        filter: 'blur(4px)',
                      }
                    : {
                        opacity: 0.16,
                        filter: 'blur(10px)',
                        scale: 0.92,
                      }
                  : isOtherLaunching
                    ? {
                        opacity: 0.14,
                        filter: 'blur(8px)',
                        scale: 0.92,
                      }
                    : isClickedLaunching
                      ? {
                          opacity: 0,
                          scale: 1,
                        }
                      : {
                          opacity: 1,
                          filter: 'none',
                          scale: 1,
                        }
              }
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="group flex cursor-pointer flex-col items-center gap-2.5 border-0 bg-transparent p-0 outline-none"
            >
              <motion.div
                data-app-tile
                initial="rest"
                whileHover={
                  launchingApp || closingApp || closingAppId || isFolderOpen ? 'rest' : 'hover'
                }
                whileTap={
                  launchingApp || closingApp || closingAppId || isFolderOpen ? 'rest' : 'tap'
                }
                variants={{
                  rest: { scale: 1 },
                  hover: { scale: 1.09 },
                  tap: { scale: 0.93 },
                }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 22,
                }}
                style={{
                  opacity: isClickedClosing ? 0 : 1,
                  background: isDark ? darkBg : lightBg,
                  boxShadow: isDark
                    ? `0 8px 24px -4px rgba(0,0,0,0.55), 0 0 24px -6px ${glow}, inset 0 1px 0 0 rgba(255,255,255,0.09)`
                    : `0 6px 18px -4px rgba(30,41,59,0.09), 0 0 20px -8px ${glow}, inset 0 1px 0 0 rgba(255,255,255,0.9)`,
                }}
                className={`group-focus-visible:ring-primary relative flex size-22 items-center justify-center rounded-2xl ring-1 ring-black/[0.06] backdrop-blur-md group-focus-visible:ring-2 dark:ring-white/[0.1] ${
                  isTileLocked ? 'opacity-75 grayscale-[35%]' : ''
                }`}
              >
                {item.kind === 'folder' ? (
                  <WarehouseFolderMiniPreview
                    isDark={isDark}
                    phonesLocked={isPhonesLocked}
                    partsLocked={isPartsLocked}
                  />
                ) : (
                  <item.Illustration />
                )}

                {isTileLocked && (
                  <span
                    title="Locked (.env APP_FEATURES)"
                    className="absolute -top-1.5 -right-1.5 z-10 flex size-6 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500 text-white shadow-sm ring-2 ring-white dark:ring-zinc-900"
                  >
                    <IconLock className="size-3.5 stroke-[2.4]" />
                  </span>
                )}
              </motion.div>

              <span
                className={`flex items-center gap-1 text-[13.5px] font-semibold tracking-[-0.01em] text-slate-800 transition-colors group-hover:text-slate-950 dark:text-zinc-200 dark:group-hover:text-zinc-100 ${
                  isTileLocked ? 'opacity-70' : ''
                }`}
              >
                {label}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* iOS / Android Home Screen Warehouse Folder Open/Close Overlay */}
      <AnimatePresence>
        {isFolderOpen && (
          <motion.div
            key="warehouse-folder-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => {
              if (launchingApp) return
              updateFolderOriginOffset()
              setIsFolderOpen(false)
            }}
            className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/15 p-6 backdrop-blur-md dark:bg-black/45"
          >
            {/* Floating Folder Title */}
            <motion.h2
              initial={{
                opacity: 0,
                x: folderOffset.x * 0.45,
                y: folderOffset.y * 0.45 + 18,
                scale: 0.75,
              }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                x: folderOffset.x * 0.45,
                y: folderOffset.y * 0.45 + 14,
                scale: 0.75,
              }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 28,
                mass: 0.85,
              }}
              className="pointer-events-none mb-5 text-2xl font-bold tracking-tight text-slate-900 drop-shadow-xs dark:text-zinc-100"
            >
              {labels.warehouse}
            </motion.h2>

            {/* Expanded Frosted Glass Folder Surface */}
            <motion.div
              initial={{
                opacity: 0,
                x: folderOffset.x,
                y: folderOffset.y,
                scale: 0.26,
                borderRadius: 48,
              }}
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                borderRadius: 34,
              }}
              exit={{
                opacity: 0,
                x: folderOffset.x,
                y: folderOffset.y,
                scale: 0.24,
                borderRadius: 48,
              }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 28,
                mass: 0.85,
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: isDark
                  ? 'linear-gradient(145deg, rgba(34,36,48,0.88) 0%, rgba(25,25,33,0.86) 100%)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.86) 0%, rgba(244,247,254,0.82) 100%)',
                boxShadow: isDark
                  ? '0 28px 68px -12px rgba(0,0,0,0.68), 0 0 40px -10px rgba(56,189,248,0.18), inset 0 1px 0 0 rgba(255,255,255,0.12)'
                  : '0 24px 60px -12px rgba(15,23,42,0.18), 0 0 36px -10px rgba(56,189,248,0.16), inset 0 1px 0 0 rgba(255,255,255,0.95)',
              }}
              className="relative grid w-[min(88vw,340px)] grid-cols-2 place-items-center gap-x-8 gap-y-6 p-8 ring-1 ring-black/[0.07] backdrop-blur-2xl dark:ring-white/[0.12]"
            >
              {warehouseApps.map((app, idx) => {
                const { id, label, Illustration, lightBg, darkBg, glow } = app
                const isSubAppLocked = isFeatureLocked(id as AppFeatureKey)
                const isOtherLaunching = launchingApp !== null && launchingApp.id !== id
                const isClickedLaunching = launchingApp?.id === id
                const isClickedClosing = closingAppId === id || closingApp?.id === id

                return (
                  <motion.button
                    key={id}
                    data-app-id={id}
                    type="button"
                    onClick={(e) => triggerAppLaunch(app, e)}
                    initial={{ opacity: 0, scale: 0.72, y: 8 }}
                    animate={
                      isOtherLaunching
                        ? {
                            opacity: 0.14,
                            filter: 'blur(8px)',
                            scale: 0.9,
                            y: 0,
                          }
                        : isClickedLaunching
                          ? {
                              opacity: 0,
                              scale: 1,
                              y: 0,
                            }
                          : {
                              opacity: 1,
                              filter: 'none',
                              scale: 1,
                              y: 0,
                            }
                    }
                    transition={{
                      delay: idx * 0.035,
                      type: 'spring',
                      stiffness: 420,
                      damping: 25,
                    }}
                    className="group flex cursor-pointer flex-col items-center gap-2.5 border-0 bg-transparent p-0 outline-none"
                  >
                    <motion.div
                      data-app-tile
                      initial="rest"
                      whileHover={launchingApp || closingApp || closingAppId ? 'rest' : 'hover'}
                      whileTap={launchingApp || closingApp || closingAppId ? 'rest' : 'tap'}
                      variants={{
                        rest: { scale: 1 },
                        hover: { scale: 1.09 },
                        tap: { scale: 0.93 },
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 22,
                      }}
                      style={{
                        opacity: isClickedClosing ? 0 : 1,
                        background: isDark ? darkBg : lightBg,
                        boxShadow: isDark
                          ? `0 8px 24px -4px rgba(0,0,0,0.55), 0 0 24px -6px ${glow}, inset 0 1px 0 0 rgba(255,255,255,0.09)`
                          : `0 6px 18px -4px rgba(30,41,59,0.09), 0 0 20px -8px ${glow}, inset 0 1px 0 0 rgba(255,255,255,0.9)`,
                      }}
                      className={`group-focus-visible:ring-primary relative flex size-22 items-center justify-center rounded-2xl ring-1 ring-black/[0.06] group-focus-visible:ring-2 dark:ring-white/[0.1] ${
                        isSubAppLocked ? 'opacity-75 grayscale-[35%]' : ''
                      }`}
                    >
                      <Illustration />
                      {isSubAppLocked && (
                        <span
                          title="Locked (.env APP_FEATURES)"
                          className="absolute -top-1.5 -right-1.5 z-10 flex size-6 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500 text-white shadow-sm ring-2 ring-white dark:ring-zinc-900"
                        >
                          <IconLock className="size-3.5 stroke-[2.4]" />
                        </span>
                      )}
                    </motion.div>

                    <span
                      className={`text-center text-[13.5px] font-semibold tracking-[-0.01em] text-slate-800 transition-colors group-hover:text-slate-950 dark:text-zinc-200 dark:group-hover:text-zinc-100 ${
                        isSubAppLocked ? 'opacity-70' : ''
                      }`}
                    >
                      {label}
                    </span>
                  </motion.button>
                )
              })}
            </motion.div>

            {/* Round "X" close button under folder */}
            <motion.button
              type="button"
              aria-label={m.close()}
              onClick={(e) => {
                e.stopPropagation()
                if (launchingApp) return
                updateFolderOriginOffset()
                setIsFolderOpen(false)
              }}
              initial={{
                opacity: 0,
                x: folderOffset.x * 0.45,
                y: folderOffset.y * 0.45 - 14,
                scale: 0.5,
              }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                x: folderOffset.x * 0.45,
                y: folderOffset.y * 0.45 - 12,
                scale: 0.5,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 26,
                mass: 0.85,
              }}
              style={{
                background: isDark
                  ? 'linear-gradient(145deg, rgba(38,40,54,0.92) 0%, rgba(26,27,36,0.9) 100%)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(244,247,254,0.88) 100%)',
                boxShadow: isDark
                  ? '0 12px 28px -6px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.12)'
                  : '0 10px 24px -6px rgba(15,23,42,0.16), inset 0 1px 0 0 rgba(255,255,255,0.95)',
              }}
              className="focus-visible:ring-primary mt-5 flex size-11 cursor-pointer items-center justify-center rounded-full border-0 text-slate-700 ring-1 ring-black/[0.08] backdrop-blur-xl transition-colors outline-none hover:text-slate-950 focus-visible:ring-2 dark:text-zinc-200 dark:ring-white/[0.14] dark:hover:text-white"
            >
              <IconX className="size-5 stroke-[2.25]" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App Open & App Close Surface Animations */}
      <AnimatePresence>
        {launchingApp && (
          <motion.div
            key={`open-${launchingApp.id}`}
            initial={{
              left: launchingApp.rect.left,
              top: launchingApp.rect.top,
              width: launchingApp.rect.width,
              height: launchingApp.rect.height,
              borderRadius: 16,
            }}
            animate={{
              left: 0,
              top: 0,
              width: window.innerWidth,
              height: window.innerHeight,
              borderRadius: 0,
            }}
            transition={{
              duration: 0.44,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="fixed z-40 flex items-center justify-center overflow-hidden bg-white shadow-2xl ring-1 ring-black/[0.06] dark:bg-[#19191e] dark:ring-white/[0.08]"
          >
            {/* Centered looping app icon animation while full-screen surface opens */}
            <motion.div
              initial={{ opacity: 0.9, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="flex flex-col items-center gap-3"
            >
              <LoopingAppIcon Illustration={launchingApp.Illustration} glow={launchingApp.glow} />
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.2, ease: 'easeOut' }}
                className="text-muted-foreground text-xs font-semibold"
              >
                {launchingApp.label}
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {closingApp && (
        <motion.div
          key={`close-${closingApp.id}`}
          initial={{
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight,
            borderRadius: 0,
          }}
          animate={{
            left: closingApp.rect.left,
            top: closingApp.rect.top,
            width: closingApp.rect.width,
            height: closingApp.rect.height,
            borderRadius: 16,
          }}
          transition={{
            duration: 0.38,
            ease: [0.32, 0.72, 0, 1],
          }}
          onAnimationComplete={() => {
            setClosingApp(null)
            setClosingAppId(null)
          }}
          style={{
            background: resolvedTheme === 'dark' ? closingApp.darkBg : closingApp.lightBg,
            boxShadow:
              resolvedTheme === 'dark'
                ? `0 8px 24px -4px rgba(0,0,0,0.55), 0 0 24px -6px ${closingApp.glow}, inset 0 1px 0 0 rgba(255,255,255,0.09)`
                : `0 6px 18px -4px rgba(30,41,59,0.09), 0 0 20px -8px ${closingApp.glow}, inset 0 1px 0 0 rgba(255,255,255,0.9)`,
          }}
          className="pointer-events-none fixed z-40 flex items-center justify-center overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/[0.1]"
        >
          {/* App icon materializes back inside the tile as surface shrinks into place */}
          <motion.div
            initial={{ opacity: 0, scale: 1.4, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'none' }}
            transition={{ delay: 0.1, duration: 0.22, ease: 'easeOut' }}
            className="flex items-center justify-center"
          >
            <closingApp.Illustration />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
