import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '#/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { getApi } from '#/lib/api'
import { cn } from '#/lib/utils'
import * as m from '#/paraglide/messages'

export function LoginForm({ className, ...props }: React.ComponentProps<'form'>) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const nav =
        typeof navigator !== 'undefined'
          ? (navigator as Navigator & {
              userAgentData?: { platform?: string }
            })
          : undefined
      const { data, error: apiErr } = await getApi()['auth-guard'].login.post({
        login: login.trim(),
        password,
        deviceInfo: {
          platform: nav?.userAgentData?.platform || nav?.platform || undefined,
          screenResolution:
            typeof window !== 'undefined'
              ? `${window.screen.width}x${window.screen.height}`
              : undefined,
          timezone:
            typeof Intl !== 'undefined'
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : undefined,
          language: nav?.language || undefined,
        },
      })
      if (apiErr) {
        setError(m.login_error())
      } else if (!data?.ok) {
        setError(data?.error || m.login_invalid())
      } else {
        await queryClient.invalidateQueries({ queryKey: ['auth-guard'] })
        await navigate({ to: '/', replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : m.login_error())
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-6', className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{m.login_title()}</h1>
          <p className="text-muted-foreground text-xs text-balance">{m.login_subtitle()}</p>
        </div>

        <Field>
          <FieldLabel htmlFor="login">{m.login_label()}</FieldLabel>
          <Input
            id="login"
            type="text"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="admin@mobilefix.uz"
            required
            autoFocus
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">{m.password_label()}</FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
          />
        </Field>

        {error && (
          <FieldError className="border-destructive/25 bg-destructive/10 rounded-xl border px-3.5 py-2.5 text-xs font-semibold">
            {error}
          </FieldError>
        )}

        <Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? m.logging_in() : m.login_btn()}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
