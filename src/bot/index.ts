import { run } from '@grammyjs/runner'
import { Elysia } from 'elysia'
import { webhookCallback } from 'grammy'

import { buildFeatureLockedPayload, isServerFeatureEnabled } from '#/lib/features.server'
import { timingSafeEqualStrings } from '#/lib/security.server'

import { bot } from './bot'

export { bot, type MyContext, type SessionData } from './bot'

function getConfiguredWebhookSecret(): string | undefined {
  const raw = (process.env.WEBHOOK_SECRET || '').trim()
  if (
    !raw ||
    raw === 'your-telegram-webhook-secret' ||
    raw === 'replace-with-telegram-webhook-secret'
  ) {
    return undefined
  }
  return raw
}

const handleTelegramWebhook = webhookCallback(bot, 'elysia', {
  timeoutMilliseconds: 10_000,
  onTimeout: 'return',
})

/**
 * Elysia plugin that mounts the grammY Telegram webhook handler Flow: grammY -> Elysia (webhook) ->
 * TanStack Start API (/api/bot/webhook)
 */
export const botWebhookPlugin = new Elysia({
  name: 'telegram-bot-webhook',
  prefix: '/bot',
}).post('/webhook', async (ctx) => {
  if (!isServerFeatureEnabled('telegram_bot')) {
    ctx.set.status = 403
    return buildFeatureLockedPayload('telegram_bot')
  }
  if (!process.env.BOT_TOKEN) {
    ctx.set.status = 503
    return { ok: false, error: 'BOT_TOKEN is not configured' }
  }

  const expectedSecret = getConfiguredWebhookSecret()
  if (expectedSecret) {
    const incomingSecret = ctx.request.headers.get('x-telegram-bot-api-secret-token') || ''
    if (!timingSafeEqualStrings(incomingSecret, expectedSecret)) {
      ctx.set.status = 401
      return { ok: false, error: 'Invalid Telegram webhook secret token' }
    }
  }

  return await handleTelegramWebhook(ctx)
})

// Local development Long Polling entrypoint (`bun run dev:bot`)
if (import.meta.main) {
  if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN environment variable is required to start polling!')
  }

  const runner = run(bot, {
    runner: {
      fetch: {
        allowed_updates: ['message', 'callback_query', 'message_reaction'],
      },
    },
    sink: {
      concurrency: 500,
    },
  })

  console.log('🤖 Telegram bot runner (Long Polling) started!')

  const stopRunner = async () => {
    if (runner.isRunning()) {
      console.log('Stopping Telegram bot runner...')
      await runner.stop()
    }
  }

  process.once('SIGINT', stopRunner)
  process.once('SIGTERM', stopRunner)
}
