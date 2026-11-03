import { and, eq, gte } from 'drizzle-orm'

import { db } from '#/db'
import { debtsRepo, repairsRepo } from '#/db/eav'
import { posSales, storeSettings } from '#/db/schema'
import { isServerFeatureEnabled } from '#/lib/features.server'

function formatUzs(amount: number): string {
  return `${Math.round(amount).toLocaleString('ru-RU')} so'm`
}

export async function buildOverdueRepairsReport() {
  const allRepairs = await repairsRepo.list()
  const readyRepairs = allRepairs.filter((r) => r.status === 'ready')

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  const buckets = {
    days30: [] as Array<(typeof readyRepairs)[number] & { waitingDays: number }>,
    days20: [] as Array<(typeof readyRepairs)[number] & { waitingDays: number }>,
    days10: [] as Array<(typeof readyRepairs)[number] & { waitingDays: number }>,
  }

  for (const r of readyRepairs) {
    const baseTime = r.readyAt ? new Date(r.readyAt).getTime() : new Date(r.createdAt).getTime()
    const waitingDays = Math.floor((now - baseTime) / dayMs)
    if (waitingDays >= 30) {
      buckets.days30.push({ ...r, waitingDays })
    } else if (waitingDays >= 20) {
      buckets.days20.push({ ...r, waitingDays })
    } else if (waitingDays >= 10) {
      buckets.days10.push({ ...r, waitingDays })
    }
  }

  const totalOverdue = buckets.days30.length + buckets.days20.length + buckets.days10.length

  const lines: string[] = [
    '⚠️ *USTAXONADA QOLIB KETGAN TELEFONLAR (10 / 20 / 30 KUN)*',
    `Jami olib ketilmagan (10+ kun): *${totalOverdue} ta*`,
    '',
  ]

  if (buckets.days30.length > 0) {
    lines.push('🔴 *30+ kun qolib ketganlar:*')
    for (const r of buckets.days30) {
      lines.push(
        `• #${r.id} *${r.phoneModel}* — ${r.customerName} (${r.customerPhone}) — *${r.waitingDays} kun* | Qoldiq: ${formatUzs(r.agreedPrice - r.advancePayment)}`,
      )
    }
    lines.push('')
  }

  if (buckets.days20.length > 0) {
    lines.push('🟠 *20+ kun qolib ketganlar:*')
    for (const r of buckets.days20) {
      lines.push(
        `• #${r.id} *${r.phoneModel}* — ${r.customerName} (${r.customerPhone}) — *${r.waitingDays} kun* | Qoldiq: ${formatUzs(r.agreedPrice - r.advancePayment)}`,
      )
    }
    lines.push('')
  }

  if (buckets.days10.length > 0) {
    lines.push('🟡 *10+ kun qolib ketganlar:*')
    for (const r of buckets.days10) {
      lines.push(
        `• #${r.id} *${r.phoneModel}* — ${r.customerName} (${r.customerPhone}) — *${r.waitingDays} kun* | Qoldiq: ${formatUzs(r.agreedPrice - r.advancePayment)}`,
      )
    }
    lines.push('')
  }

  if (totalOverdue === 0) {
    lines.push('✅ Hozirda 10 kundan ortiq qolib ketgan telefonlar yo`q.')
  }

  return {
    totalOverdue,
    buckets,
    messageText: lines.join('\n'),
  }
}

export async function buildDueDebtsReport() {
  const now = new Date()
  const allDebts = await debtsRepo.list()
  const openDebts = allDebts.filter(
    (d) => d.status === 'open' && d.dueDate && new Date(d.dueDate).getTime() <= now.getTime(),
  )

  const customerDue = openDebts.filter((d) => d.debtType === 'customer')
  const supplierDue = openDebts.filter((d) => d.debtType === 'supplier')

  const lines: string[] = [
    '📒 *MUDDATI KELGAN QARZLAR ESLATMASI*',
    `Jami muddati kelgan qarzlar: *${openDebts.length} ta*`,
    '',
  ]

  if (customerDue.length > 0) {
    lines.push('📥 *Mijozlar qarzi (Bizga berishlari kerak):*')
    for (const d of customerDue) {
      lines.push(
        `• *${d.counterpartyName}* (${d.counterpartyPhone || '-'}) — *${formatUzs(d.remainingAmount)}* (${d.description})`,
      )
    }
    lines.push('')
  }

  if (supplierDue.length > 0) {
    lines.push('📤 *Ta`minotchilar qarzi (Biz berishimiz kerak):*')
    for (const d of supplierDue) {
      lines.push(
        `• *${d.counterpartyName}* (${d.counterpartyPhone || '-'}) — *${formatUzs(d.remainingAmount)}* (${d.description})`,
      )
    }
    lines.push('')
  }

  if (openDebts.length === 0) {
    lines.push('✅ Muddati o`tgan qarzlar yo`q.')
  }

  return {
    dueCount: openDebts.length,
    customerDue,
    supplierDue,
    messageText: lines.join('\n'),
  }
}

export async function buildDailySummaryReport() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const todaySales = await db
    .select()
    .from(posSales)
    .where(and(gte(posSales.createdAt, startOfDay), eq(posSales.isDeleted, false)))

  const allRepairs = await repairsRepo.list()
  const todayDeliveredRepairs = allRepairs.filter(
    (r) =>
      r.status === 'delivered' &&
      r.deliveredAt &&
      new Date(r.deliveredAt).getTime() >= startOfDay.getTime(),
  )

  const phonesSoldToday = todaySales.filter((s) => s.saleType === 'phone').length
  const partsSoldToday = todaySales
    .filter((s) => s.saleType === 'part')
    .reduce((acc, s) => acc + s.quantity, 0)

  const posProfit = todaySales.reduce((acc, s) => acc + s.profitAmount, 0)
  const repairsProfit = todayDeliveredRepairs.reduce(
    (acc, r) => acc + (r.agreedPrice - r.partCostSnapshot),
    0,
  )
  const totalNetProfit = posProfit + repairsProfit
  const totalRevenue =
    todaySales.reduce((acc, s) => acc + s.totalAmount, 0) +
    todayDeliveredRepairs.reduce((acc, r) => acc + r.agreedPrice, 0)

  const lines: string[] = [
    '📊 *MOBILE FIX — KUNLIK KECHKI HISOBOT*',
    `📅 Sana: *${new Date().toLocaleDateString('uz-UZ')}*`,
    '',
    `📱 Bugun sotilgan telefonlar: *${phonesSoldToday} ta*`,
    `🔋 Sotilgan ehtiyot qismlar: *${partsSoldToday} dona*`,
    `🛠️ Topshirilgan buyurtmalar: *${todayDeliveredRepairs.length} ta*`,
    `💰 Jami kunlik aylanma: *${formatUzs(totalRevenue)}*`,
    `✨ *Bugungi sof foyda: ${formatUzs(totalNetProfit)}*`,
    `   ├ Savdodan sof foyda: ${formatUzs(posProfit)}`,
    `   └ Ustaxonadan sof foyda: ${formatUzs(repairsProfit)}`,
  ]

  return {
    phonesSoldToday,
    partsSoldToday,
    repairsDeliveredToday: todayDeliveredRepairs.length,
    totalRevenue,
    totalNetProfit,
    messageText: lines.join('\n'),
  }
}

export async function sendStoreTelegramNotification(
  type: 'overdue_repairs' | 'due_debts' | 'daily_report' | 'all',
  overrideChatId?: string,
) {
  if (!isServerFeatureEnabled('telegram_bot')) {
    return {
      sentToTelegram: false,
      telegramError: 'Telegram Bot funksiyasi qulflangan (.env APP_FEATURES)',
      chatId: null,
      previewMessage: '',
      stats: {
        overdueCount: 0,
        dueDebtsCount: 0,
        phonesSoldToday: 0,
        repairsDeliveredToday: 0,
        totalNetProfit: 0,
      },
    }
  }

  const [settings] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.isDeleted, false))
    .limit(1)
  const chatId = overrideChatId || settings?.telegramChatId || process.env.ADMIN_CHAT_ID

  const overdue = await buildOverdueRepairsReport()
  const dueDebts = await buildDueDebtsReport()
  const daily = await buildDailySummaryReport()

  const textParts: string[] = []
  if (type === 'overdue_repairs' || type === 'all') textParts.push(overdue.messageText)
  if (type === 'due_debts' || type === 'all') textParts.push(dueDebts.messageText)
  if (type === 'daily_report' || type === 'all') textParts.push(daily.messageText)

  const combinedMessage = textParts.join('\n\n────────────────────\n\n')

  const token = process.env.BOT_TOKEN
  const hasRealToken =
    Boolean(token) && token !== 'your-telegram-bot-token' && !token?.includes('placeholder')

  let sentToTelegram = false
  let telegramError: string | null = null

  if (hasRealToken && chatId) {
    try {
      const { bot } = await import('./bot')
      await bot.api.sendMessage(chatId, combinedMessage, {
        parse_mode: 'Markdown',
      })
      sentToTelegram = true
    } catch (err) {
      telegramError = err instanceof Error ? err.message : 'Telegram xatosi'
    }
  }

  return {
    sentToTelegram,
    telegramError,
    chatId: chatId || null,
    previewMessage: combinedMessage,
    stats: {
      overdueCount: overdue.totalOverdue,
      dueDebtsCount: dueDebts.dueCount,
      phonesSoldToday: daily.phonesSoldToday,
      repairsDeliveredToday: daily.repairsDeliveredToday,
      totalNetProfit: daily.totalNetProfit,
    },
  }
}
