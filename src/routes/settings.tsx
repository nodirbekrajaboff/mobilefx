import {
  IconBrandTelegram,
  IconBuildingStore,
  IconCoins,
  IconColumns3,
  IconLock,
  IconPalette,
} from '@tabler/icons-react'
import { createFileRoute, Link, Outlet, useLocation, useMatches } from '@tanstack/react-router'

import { FeatureLockedView } from '#/components/FeatureLockedView'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '#/components/ui/sidebar'
import { useCurrency } from '#/lib/currency'
import { type AppFeatureKey, getFeatureForPathname } from '#/lib/features'
import { cn } from '#/lib/utils'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/settings')({
  component: SettingsLayout,
})

interface SettingsNavItem {
  to:
    | '/settings'
    | '/settings/currency'
    | '/settings/tables'
    | '/settings/store'
    | '/settings/telegram'
  exact?: boolean
  feature?: AppFeatureKey
  title: () => string
  subtitle: () => string
  icon: typeof IconPalette
}

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    to: '/settings',
    exact: true,
    title: () => m.settings_nav_appearance(),
    subtitle: () => m.settings_nav_appearance_sub(),
    icon: IconPalette,
  },
  {
    to: '/settings/currency',
    feature: 'currency_rates',
    title: () => m.settings_nav_currency(),
    subtitle: () => m.settings_nav_currency_sub(),
    icon: IconCoins,
  },
  {
    to: '/settings/tables',
    feature: 'dynamic_fields',
    title: () => m.settings_nav_tables(),
    subtitle: () => m.settings_nav_tables_sub(),
    icon: IconColumns3,
  },
  {
    to: '/settings/store',
    title: () => m.settings_nav_store(),
    subtitle: () => m.settings_nav_store_sub(),
    icon: IconBuildingStore,
  },
  {
    to: '/settings/telegram',
    feature: 'telegram_bot',
    title: () => m.settings_nav_telegram(),
    subtitle: () => m.settings_nav_telegram_sub(),
    icon: IconBrandTelegram,
  },
]

function SettingsLayout() {
  const location = useLocation()
  const matches = useMatches()
  const { isFeatureLocked, notifyFeatureLocked } = useCurrency()

  const activePathname = matches[matches.length - 1]?.pathname ?? location.pathname
  const normalizedPath =
    activePathname.endsWith('/') && activePathname !== '/settings/'
      ? activePathname.slice(0, -1)
      : activePathname === '/settings/'
        ? '/settings'
        : activePathname

  const activeSettingFeature = getFeatureForPathname(normalizedPath)
  const isCurrentSettingLocked = Boolean(
    activeSettingFeature && isFeatureLocked(activeSettingFeature),
  )

  return (
    <SidebarProvider defaultOpen={true} className="min-h-[calc(100svh-4rem)]">
      <Sidebar className="bg-card/95 dark:bg-card/95 top-16 h-[calc(100svh-4rem)]! border-r border-slate-950/[0.06] backdrop-blur-md dark:border-white/[0.08]">
        <SidebarContent className="p-2.5">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {SETTINGS_NAV_ITEMS.map((item) => {
                  const IconComp = item.icon
                  const isActive = item.exact
                    ? normalizedPath === item.to
                    : normalizedPath.startsWith(item.to)
                  const isLocked = Boolean(item.feature && isFeatureLocked(item.feature))

                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          to={item.to}
                          onPointerDown={(e) => {
                            if (isLocked) {
                              e.preventDefault()
                              return
                            }
                            document.documentElement.dataset.vtDirection = 'subpage'
                          }}
                          onClick={(e) => {
                            if (isLocked && item.feature) {
                              e.preventDefault()
                              notifyFeatureLocked(item.feature)
                              return
                            }
                            document.documentElement.dataset.vtDirection = 'subpage'
                          }}
                          className={cn(
                            'flex items-center justify-between no-underline',
                            isLocked && 'opacity-65',
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <IconComp className="size-4 shrink-0" />
                            <span className="truncate">{item.title()}</span>
                          </span>
                          {isLocked && (
                            <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                              <IconLock className="size-3" />
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-transparent">
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-4 py-5 sm:px-6">
          {isCurrentSettingLocked && activeSettingFeature ? (
            <FeatureLockedView feature={activeSettingFeature} />
          ) : (
            <Outlet />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
