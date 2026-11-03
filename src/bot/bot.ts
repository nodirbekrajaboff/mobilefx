import { autoRetry } from '@grammyjs/auto-retry'
import { limit } from '@grammyjs/ratelimiter'
import { sequentialize } from '@grammyjs/runner'
import {
  Bot,
  type Context,
  GrammyError,
  HttpError,
  InlineKeyboard,
  session,
  type SessionFlavor,
} from 'grammy'

import {
  buildDailySummaryReport,
  buildDueDebtsReport,
  buildOverdueRepairsReport,
} from './notifications'

export interface SessionData {
  interactions: number
}

export type MyContext = Context & SessionFlavor<SessionData>

const rawToken = process.env.BOT_TOKEN
const token =
  rawToken && rawToken !== 'your-telegram-bot-token' && rawToken.includes(':')
    ? rawToken
    : '0000000000:AAH_build_placeholder_token_0000000'

export const bot = new Bot<MyContext>(token)

// 1. Outbound API Transformer for Auto-Retry (handles 429 Flood Waits & 5xx errors)
bot.api.config.use(
  autoRetry({
    maxRetryAttempts: 3,
    maxDelaySeconds: 60,
  }),
)

// 2. Session Key Helper
function getSessionKey(ctx: Context): string | undefined {
  return ctx.chat?.id.toString()
}

// 3. Concurrency Lock (MUST come BEFORE session middleware)
bot.use(sequentialize(getSessionKey))

// 4. Inbound Spam Protection (Rate Limiter)
bot.use(
  limit({
    timeFrame: 1000,
    limit: 3,
    keyGenerator: (ctx) => ctx.from?.id.toString(),
    onLimitExceeded: async (ctx) => {
      await ctx.reply('⚠️ Iltimos, biroz sekinroq yozing!')
    },
  }),
)

// 5. Session Middleware
bot.use(
  session({
    getSessionKey,
    initial: (): SessionData => ({
      interactions: 0,
    }),
  }),
)

function getMainMenuKeyboard() {
  return new InlineKeyboard()
    .text('📊 Kunlik hisobot', 'btn:daily_report')
    .row()
    .text('⚠️ Qolib ketgan telefonlar (10/20/30 kun)', 'btn:overdue_repairs')
    .row()
    .text('📒 Muddati kelgan qarzlar', 'btn:due_debts')
}

function escapeTelegramMarkdown(text: string): string {
  return text.replace(/([_*`[\]])/g, '\\$1')
}

// 6. Command Handlers
bot.command('start', async (ctx) => {
  ctx.session.interactions++
  const chatId = ctx.chat?.id
  const safeFirstName = escapeTelegramMarkdown(ctx.from?.first_name || "Do'kon egasi")

  await ctx.reply(
    `👋 Salom, *${safeFirstName}*!\n\n` +
      `🛠️ *Mobile Fix ERP — Rasmiy Telegram Bot*\n` +
      `Sizning Telegram Chat ID raqamingiz: \`${chatId}\`\n\n` +
      `Ushbu Chat ID ni tizimning *Analitika va Sozlamalar* bo'limiga kiriting. Bot sizga avtomatik ravishda:\n` +
      `• Ustaxonada 10, 20, 30 kun qolib ketgan telefonlar,\n` +
      `• Muddati kelgan qarzlar (Mijoz va Ta'minotchi),\n` +
      `• Har kuni kechqurun kunlik sof foyda hisobotini yuboradi.`,
    {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(),
    },
  )
})

bot.command('report', async (ctx) => {
  const report = await buildDailySummaryReport()
  await ctx.reply(report.messageText, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(),
  })
})

bot.command('overdue', async (ctx) => {
  const report = await buildOverdueRepairsReport()
  await ctx.reply(report.messageText, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(),
  })
})

bot.command('debts', async (ctx) => {
  const report = await buildDueDebtsReport()
  await ctx.reply(report.messageText, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(),
  })
})

bot.command('ping', async (ctx) => {
  await ctx.reply('🏓 Mobile Fix Bot ishlayapti!')
})

// 7. Callback Query Handlers
bot.callbackQuery('btn:daily_report', async (ctx) => {
  await ctx.answerCallbackQuery({ text: 'Kunlik hisobot yuklanmoqda...' })
  const report = await buildDailySummaryReport()
  await ctx.reply(report.messageText, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(),
  })
})

bot.callbackQuery('btn:overdue_repairs', async (ctx) => {
  await ctx.answerCallbackQuery({ text: 'Ustaxona tekshirilmoqda...' })
  const report = await buildOverdueRepairsReport()
  await ctx.reply(report.messageText, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(),
  })
})

bot.callbackQuery('btn:due_debts', async (ctx) => {
  await ctx.answerCallbackQuery({ text: 'Qarz daftari tekshirilmoqda...' })
  const report = await buildDueDebtsReport()
  await ctx.reply(report.messageText, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(),
  })
})

bot.on('callback_query:data', async (ctx) => {
  await ctx.answerCallbackQuery()
})

// 8. Message Handlers
bot.on('message:text', async (ctx) => {
  ctx.session.interactions++
  await ctx.reply(`Kerakli bo'limni tanlang (Chat ID: \`${ctx.chat.id}\`):`, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(),
  })
})

// 9. Global Error Handler
bot.catch((err) => {
  const ctx = err.ctx
  console.error(`Error while handling update ${ctx.update.update_id}:`)
  const e = err.error
  if (e instanceof GrammyError) {
    console.error('Error in Telegram request:', e.description)
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e)
  } else {
    console.error('Unknown error:', e)
  }
})
