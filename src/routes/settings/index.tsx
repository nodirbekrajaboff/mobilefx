import { IconCheck } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'

import { Card } from '#/components/ui/card'
import { type AppLanguage, type ThemeMode, useTheme } from '#/lib/theme'
import { cn } from '#/lib/utils'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/settings/')({
  component: SettingsAppearanceAndLanguagePage,
})

function LanguageFlag({ code }: { code: AppLanguage }) {
  switch (code) {
    case 'uz':
      return (
        <svg
          viewBox="0 0 28 20"
          className="h-5 w-7 shrink-0 rounded-[4px] shadow-2xs ring-1 ring-black/10 dark:ring-white/15"
        >
          <rect width="28" height="6.5" fill="#0099B5" />
          <rect y="6.5" width="28" height="7" fill="#ffffff" />
          <rect y="13.5" width="28" height="6.5" fill="#1EB53A" />
          <line x1="0" y1="6.5" x2="28" y2="6.5" stroke="#CE1126" strokeWidth="0.9" />
          <line x1="0" y1="13.5" x2="28" y2="13.5" stroke="#CE1126" strokeWidth="0.9" />
          <circle cx="4.2" cy="3.2" r="1.6" fill="#ffffff" />
          <circle cx="4.8" cy="3.2" r="1.3" fill="#0099B5" />
        </svg>
      )
    case 'ru':
      return (
        <svg
          viewBox="0 0 28 20"
          className="h-5 w-7 shrink-0 rounded-[4px] shadow-2xs ring-1 ring-black/10 dark:ring-white/15"
        >
          <rect width="28" height="6.66" fill="#ffffff" />
          <rect y="6.66" width="28" height="6.66" fill="#0039A6" />
          <rect y="13.33" width="28" height="6.67" fill="#D52B1E" />
        </svg>
      )
    case 'en':
      return (
        <svg
          viewBox="0 0 28 20"
          className="h-5 w-7 shrink-0 rounded-[4px] shadow-2xs ring-1 ring-black/10 dark:ring-white/15"
        >
          <rect width="28" height="20" fill="#012169" />
          <path d="M0 0L28 20M28 0L0 20" stroke="#fff" strokeWidth="3.5" />
          <path d="M0 0L28 20M28 0L0 20" stroke="#C8102E" strokeWidth="1.8" />
          <path d="M14 0V20M0 10H28" stroke="#fff" strokeWidth="5.5" />
          <path d="M14 0V20M0 10H28" stroke="#C8102E" strokeWidth="3.2" />
        </svg>
      )
  }
}

function ThemePreviewIllustration({ mode }: { mode: ThemeMode }) {
  if (mode === 'light') {
    return (
      <div
        data-theme-preview
        className="flex h-40 w-full flex-col overflow-hidden bg-[#f1f3f7] p-3 pb-0"
      >
        <div className="flex flex-1 flex-col overflow-hidden rounded-t-xl border border-b-0 border-[#e2e5ec] bg-[#ffffff] shadow-2xs">
          {/* Window Chrome */}
          <div className="flex h-6 items-center justify-between border-b border-[#eef0f5] px-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#ff5f57]" />
              <span className="size-2 rounded-full bg-[#febc2e]" />
              <span className="size-2 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-[#e2e5ec]" />
              <span className="h-1.5 w-2 rounded-full bg-[#e2e5ec]" />
            </div>
          </div>
          {/* Window Body */}
          <div className="grid flex-1 grid-cols-12 gap-2.5 bg-[#f8f9fc] p-2.5">
            {/* Mini Sidebar */}
            <div className="col-span-4 flex flex-col gap-2 rounded-lg border border-[#e5e8f0] bg-[#ffffff] p-2">
              <div className="bg-primary h-2.5 w-3/4 rounded-full" />
              <div className="h-2 w-full rounded-full bg-[#e2e5ec]" />
              <div className="h-2 w-5/6 rounded-full bg-[#eef0f5]" />
            </div>
            {/* Mini Main Content */}
            <div className="col-span-8 flex flex-col gap-2 rounded-lg border border-[#e5e8f0] bg-[#ffffff] p-2.5">
              <div className="h-2 w-1/2 rounded-full bg-[#dce0e9]" />
              <div className="bg-primary flex h-11 w-full items-center justify-center rounded-lg px-3">
                <div className="h-2 w-2/3 rounded-full bg-[#ffffff]/45" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'dark') {
    return (
      <div
        data-theme-preview
        className="flex h-40 w-full flex-col overflow-hidden bg-[#16161a] p-3 pb-0"
      >
        <div className="flex flex-1 flex-col overflow-hidden rounded-t-xl border border-b-0 border-white/10 bg-[#1e1e23] shadow-2xs">
          {/* Window Chrome */}
          <div className="flex h-6 items-center justify-between border-b border-white/[0.07] px-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#ff5f57]" />
              <span className="size-2 rounded-full bg-[#febc2e]" />
              <span className="size-2 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-white/15" />
              <span className="h-1.5 w-2 rounded-full bg-white/15" />
            </div>
          </div>
          {/* Window Body */}
          <div className="grid flex-1 grid-cols-12 gap-2.5 bg-[#19191e] p-2.5">
            {/* Mini Sidebar */}
            <div className="col-span-4 flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-[#222228] p-2">
              <div className="bg-primary h-2.5 w-3/4 rounded-full" />
              <div className="h-2 w-full rounded-full bg-white/15" />
              <div className="h-2 w-5/6 rounded-full bg-white/10" />
            </div>
            {/* Mini Main Content */}
            <div className="col-span-8 flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-[#222228] p-2.5">
              <div className="h-2 w-1/2 rounded-full bg-white/20" />
              <div className="bg-primary flex h-11 w-full items-center justify-center rounded-lg px-3">
                <div className="h-2 w-2/3 rounded-full bg-[#e4e4e7]/45" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div data-theme-preview className="grid h-40 w-full grid-cols-2 overflow-hidden">
      {/* Left Half: Light */}
      <div className="flex flex-col overflow-hidden bg-[#f1f3f7] pt-3 pl-3">
        <div className="flex flex-1 flex-col overflow-hidden rounded-tl-xl border-t border-l border-[#e2e5ec] bg-[#ffffff]">
          <div className="flex h-6 items-center gap-1.5 border-b border-[#eef0f5] px-2.5">
            <span className="size-2 rounded-full bg-[#ff5f57]" />
            <span className="size-2 rounded-full bg-[#febc2e]" />
            <span className="size-2 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex flex-1 flex-col gap-2 bg-[#f8f9fc] p-2.5">
            <div className="flex flex-1 flex-col gap-2 rounded-lg border border-[#e5e8f0] bg-[#ffffff] p-2.5">
              <div className="bg-primary h-2.5 w-4/5 rounded-full" />
              <div className="h-2 w-full rounded-full bg-[#dce0e9]" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Half: Dark */}
      <div className="flex flex-col overflow-hidden bg-[#16161a] pt-3 pr-3">
        <div className="flex flex-1 flex-col overflow-hidden rounded-tr-xl border-t border-r border-white/10 bg-[#1e1e23]">
          <div className="flex h-6 items-center gap-1.5 border-b border-white/[0.07] px-2.5">
            <span className="size-2 rounded-full bg-[#ff5f57]" />
            <span className="size-2 rounded-full bg-[#febc2e]" />
            <span className="size-2 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex flex-1 flex-col gap-2 bg-[#19191e] p-2.5">
            <div className="flex flex-1 flex-col gap-2 rounded-lg border border-white/[0.08] bg-[#222228] p-2.5">
              <div className="bg-primary h-2.5 w-4/5 rounded-full" />
              <div className="h-2 w-full rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const THEME_OPTIONS: Array<{
  id: ThemeMode
  label: () => string
  sub: () => string
}> = [
  {
    id: 'light',
    label: () => m.appearance_light(),
    sub: () => m.appearance_light_sub(),
  },
  {
    id: 'dark',
    label: () => m.appearance_dark(),
    sub: () => m.appearance_dark_sub(),
  },
  {
    id: 'system',
    label: () => m.appearance_system(),
    sub: () => m.appearance_system_sub(),
  },
]

const LANGUAGE_OPTIONS: Array<{
  code: AppLanguage
  title: () => string
  native: () => string
}> = [
  {
    code: 'uz',
    title: () => m.lang_uz_title(),
    native: () => m.lang_uz_sub(),
  },
  {
    code: 'ru',
    title: () => m.lang_ru_title(),
    native: () => m.lang_ru_sub(),
  },
  {
    code: 'en',
    title: () => m.lang_en_title(),
    native: () => m.lang_en_sub(),
  },
]

function SelectionIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'flex size-5.5 shrink-0 items-center justify-center rounded-full transition-all duration-150',
        active
          ? 'bg-primary text-primary-foreground shadow-2xs'
          : 'border border-slate-300 bg-transparent dark:border-slate-700',
      )}
    >
      {active && <IconCheck className="size-3.5 stroke-[2.5]" />}
    </span>
  )
}

function SettingsAppearanceAndLanguagePage() {
  const { theme, setTheme, language, setLanguage } = useTheme()

  return (
    <div className="flex flex-col gap-5">
      {/* 1. TIZIM MAVZUSI (Visual Window Preview Cards) */}
      <Card className="p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-base font-bold tracking-tight">
            {m.appearance_theme_title()}
          </h2>
          <p className="text-muted-foreground text-xs">{m.appearance_theme_desc()}</p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {THEME_OPTIONS.map((item) => {
            const active = theme === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={cn(
                  'group focus-visible:ring-ring/40 flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-150 outline-none focus-visible:ring-3',
                  active
                    ? 'border-primary ring-primary/20 ring-2'
                    : 'border-slate-950/[0.08] hover:border-slate-950/[0.18] dark:border-white/[0.09] dark:hover:border-white/[0.2]',
                )}
              >
                <ThemePreviewIllustration mode={item.id} />

                <div className="bg-card flex w-full items-center justify-between gap-3 border-t border-slate-950/[0.06] px-4 py-3.5 dark:border-white/[0.07]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-foreground text-xs font-bold">{item.label()}</span>
                    <span className="text-muted-foreground text-[11px]">{item.sub()}</span>
                  </div>
                  <SelectionIndicator active={active} />
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* 2. DASTUR TILI (Country Flag Cards without duplicate Tabs) */}
      <Card className="p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-base font-bold tracking-tight">
            {m.appearance_lang_title()}
          </h2>
          <p className="text-muted-foreground text-xs">{m.appearance_lang_desc()}</p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = language === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  'focus-visible:ring-ring/40 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-150 outline-none focus-visible:ring-3',
                  active
                    ? 'border-primary bg-primary/[0.03] ring-primary/20 dark:bg-primary/[0.08] ring-2'
                    : 'bg-card border-slate-950/[0.08] hover:border-slate-950/[0.18] hover:bg-slate-950/[0.015] dark:border-white/[0.09] dark:hover:border-white/[0.2] dark:hover:bg-white/[0.02]',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-950/[0.06] bg-slate-950/[0.025] dark:border-white/[0.08] dark:bg-white/[0.04]">
                    <LanguageFlag code={lang.code} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-foreground text-xs font-bold">{lang.title()}</span>
                    <span className="text-muted-foreground text-[11px]">{lang.native()}</span>
                  </div>
                </div>

                <SelectionIndicator active={active} />
              </button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
