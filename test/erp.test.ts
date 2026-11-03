import { describe, expect, test } from 'bun:test'

import { treaty } from '@elysiajs/eden'

import { formatRemainingLiveTime, parseAppFeaturesEnv, parseAppLiveHoursEnv } from '#/lib/features'
import { escapeHtml } from '#/lib/print'
import { checkRateLimit, resetRateLimitStore, timingSafeEqualStrings } from '#/lib/security.server'
import { app } from '#/server'

const api = treaty(app).api

describe('Mobile Fix ERP — ElysiaJS + Eden Treaty + PostgreSQL Transactions', () => {
  test('1. Global Overview returns currency rates, notifications (10/20/30 days) and 6 Launchpad badges', async () => {
    const { data, error } = await api.overview.get()
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data?.settings.storeName.length).toBeGreaterThan(0)
    expect(data?.settings.internalRate).toBe(12820)
    expect(data?.badges.repairs).toBeDefined()
    expect(data?.badges.phones).toBeDefined()
    expect(data?.badges.parts).toBeDefined()
    expect(data?.notifications.overdueRepairs.length).toBeGreaterThanOrEqual(3)
  })

  test('2. Workshop (/repairs): Part is NOT deducted on creation, ONLY deducted (-1) when Ready is clicked, and Debt is created on Deliver', async () => {
    const beforeParts = await api.parts.get()
    const targetPart = beforeParts.data!.parts[0]!
    const initialQty = targetPart.quantity

    // Create repair with selected part
    const createdRes = await api.repairs.post({
      customerType: 'regular',
      customerName: 'Test Mijoz',
      customerPhone: '+998 90 000 11 22',
      phoneModel: 'iPhone 13 Pro',
      imei: '350000111122223',
      issueDescription: 'Ekran singan',
      lockType: 'pattern',
      lockCode: '1-2-3-6-9',
      partId: targetPart.id,
      agreedPrice: 2000000,
      advancePayment: 500000,
    })
    expect(createdRes.error).toBeNull()
    const repairId = createdRes.data!.id
    expect(createdRes.data!.partDeducted).toBe(false)

    // Verify part quantity did NOT decrease on creation
    const midParts = await api.parts.get()
    const midPart = midParts.data!.parts.find((p) => p.id === targetPart.id)!
    expect(midPart.quantity).toBe(initialQty)

    // Click [Tayyor bo'ldi ✅] -> Part MUST decrease by -1 and readyAt timer starts
    const readyRes = await api.repairs({ id: String(repairId) }).ready.post()
    expect(readyRes.error).toBeNull()
    expect(readyRes.data && 'status' in readyRes.data ? readyRes.data.status : '').toBe('ready')
    expect(
      readyRes.data && 'partDeducted' in readyRes.data ? readyRes.data.partDeducted : false,
    ).toBe(true)

    const afterReadyParts = await api.parts.get()
    const afterPart = afterReadyParts.data!.parts.find((p) => p.id === targetPart.id)!
    expect(afterPart.quantity).toBe(initialQty - 1)

    // Click [Topshirildi 🤝] with partial payment and writeToDebt = true
    const deliverRes = await api.repairs({ id: String(repairId) }).deliver.post({
      paidNow: 500000, // 2,000,000 - 500,000 avans - 500,000 hozir = 1,000,000 qarz!
      writeToDebt: true,
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    })
    expect(deliverRes.error).toBeNull()
    if (deliverRes.data && 'createdDebt' in deliverRes.data) {
      expect(deliverRes.data.createdDebt).not.toBeNull()
      expect(deliverRes.data.createdDebt?.remainingAmount).toBe(1000000)
      expect(deliverRes.data.createdDebt?.debtType).toBe('customer')
    }
  })

  test('3. Phones Inventory (/phones): Intake on credit automatically records Supplier Debt', async () => {
    const intakeRes = await api.phones.post({
      model: 'iPhone 16 Pro 256GB',
      color: 'Desert Titanium',
      imei: '359999888877776',
      condition: 'new',
      batteryHealth: 100,
      boxAndCharger: 'To`liq (Quti + Kabel)',
      sourceName: 'Dubay Optom Test',
      supplierPhone: '+998 99 777 66 55',
      purchasePrice: 20000000,
      extraExpenses: 0,
      salePrice: 22000000,
      paidAmount: 10000000, // 10 mln berildi -> 10 mln qarzga yozilishi shart
    })

    expect(intakeRes.error).toBeNull()
    expect(intakeRes.data?.createdDebt).not.toBeNull()
    expect(intakeRes.data?.createdDebt?.remainingAmount).toBe(10000000)
    expect(intakeRes.data?.createdDebt?.debtType).toBe('supplier')
    expect(intakeRes.data?.createdDebt?.categoryTag).toBe('phone')
  })

  test('4. Parts Inventory (/parts): Excel-style batch intake updates stock and records Supplier Debt', async () => {
    const batchRes = await api.parts['batch-intake'].post({
      supplierName: 'Malika Excel Optom',
      supplierPhone: '+998 90 111 00 99',
      paidAmount: 1000000,
      items: [
        {
          name: 'Test iPhone 15 OLED Ekran',
          categoryId: 1,
          quantity: 2,
          costPrice: 1500000, // Jami 3,000,000 so'm
          salePrice: 2000000,
        },
      ],
    })

    expect(batchRes.error).toBeNull()
    expect(batchRes.data?.batch.totalCost).toBe(3000000)
    expect(batchRes.data?.createdDebt?.remainingAmount).toBe(2000000)
    expect(batchRes.data?.createdDebt?.debtType).toBe('supplier')
  })

  test('5. POS Cashier (/pos): Phone sale with Trade-In calculates difference and adds old phone to inventory', async () => {
    const posData = await api.pos.get()
    const phoneToSell = posData.data!.availablePhones[0]!

    const saleRes = await api.pos['phone-sale'].post({
      phoneId: phoneToSell.id,
      salePrice: 22000000,
      customerName: 'Trade-In Xaridor',
      customerPhone: '+998 91 222 33 44',
      paymentMethod: 'cash',
      warrantyMonths: 6,
      tradeIn: {
        model: 'iPhone 11 128GB (Trade-In)',
        imei: '351111222233334',
        color: 'Oq',
        batteryHealth: 82,
        acceptedPrice: 3500000,
        resalePrice: 4200000,
      },
    })

    expect(saleRes.error).toBeNull()
    if (saleRes.data && 'sale' in saleRes.data) {
      // Farq summasi = 22,000,000 - 3,500,000 = 18,500,000
      expect(saleRes.data.sale.payableAmount).toBe(18500000)
      expect(saleRes.data.tradeInPhone).not.toBeNull()
      expect(saleRes.data.tradeInPhone?.status).toBe('in_stock')
      expect(saleRes.data.tradeInPhone?.isTradeIn).toBe(true)
    }
  })

  test('6. Analytics & grammY Telegram Bot notification builder works', async () => {
    const notifyRes = await api.analytics['telegram-notify'].post({
      type: 'all',
    })
    expect(notifyRes.error).toBeNull()
    expect(notifyRes.data?.previewMessage).toContain('MOBILE FIX')
    expect(notifyRes.data?.previewMessage).toContain('USTAXONADA QOLIB KETGAN TELEFONLAR')
  })

  test('7. Dynamic Table Fields (/table-fields): Add, edit, hide/show, inline cell update, and delete custom columns', async () => {
    const initial = await api['table-fields'].get()
    expect(initial.error).toBeNull()
    expect(initial.data?.byTable.phones.length).toBeGreaterThanOrEqual(9)
    expect(initial.data?.byTable.repairs.length).toBeGreaterThanOrEqual(8)

    // 1. Add a new dynamic field to phones table
    const createdFieldRes = await api['table-fields'].post({
      tableKey: 'phones',
      label: 'Kafolat muddati',
      fieldType: 'select',
      options: ['1 oy', '6 oy', '1 yil'],
      defaultValue: '6 oy',
      isVisible: true,
      isRequired: false,
    })
    expect(createdFieldRes.error).toBeNull()
    const createdField = createdFieldRes.data!
    expect(createdField.label).toBe('Kafolat muddati')
    expect(createdField.isSystem).toBe(false)
    expect(createdField.options).toEqual(['1 oy', '6 oy', '1 yil'])

    // 2. Edit / Hide the field
    const updatedFieldRes = await api['table-fields']({
      id: String(createdField.id),
    }).put({
      label: 'Rasmiy kafolat',
      isVisible: false,
    })
    expect(updatedFieldRes.error).toBeNull()
    if (updatedFieldRes.data && 'label' in updatedFieldRes.data) {
      expect(updatedFieldRes.data.label).toBe('Rasmiy kafolat')
      expect(updatedFieldRes.data.isVisible).toBe(false)
    }

    // 3. Inline cell update on a phone row
    const phonesRes = await api.phones.get()
    const firstPhone = phonesRes.data!.phones[0]!
    const cellRes = await api['table-fields'].cell.patch({
      tableKey: 'phones',
      rowId: firstPhone.id,
      fieldKey: createdField.fieldKey,
      value: '1 yil',
    })
    expect(cellRes.error).toBeNull()
    if (cellRes.data && 'customFields' in cellRes.data) {
      expect(cellRes.data.customFields[createdField.fieldKey]).toBe('1 yil')
    }

    // 4. Delete the custom field
    const delRes = await api['table-fields']({
      id: String(createdField.id),
    }).delete()
    expect(delRes.error).toBeNull()

    // 5. Verify languages (uz-UZ, ru-RU, en-US) and create/delete custom Data Table with uz-UZ translation & Latin key
    const tfRes = await api['table-fields'].get()
    expect(tfRes.error).toBeNull()
    const langCodes = tfRes.data!.languages.map((l) => l.code)
    expect(langCodes).toContain('uz-UZ')
    expect(langCodes).toContain('ru-RU')
    expect(langCodes).toContain('en-US')

    const createdDtRes = await api['table-fields']['data-tables'].post({
      name: "Qo'shimcha Aksessuarlar",
      description: 'G`iloflar va himoya oynalari jadvali',
    })
    expect(createdDtRes.error).toBeNull()
    expect(createdDtRes.data?.key).toBe('qoshimcha_aksessuarlar')
    expect(createdDtRes.data?.translations?.['uz-UZ']?.name).toBe("Qo'shimcha Aksessuarlar")
    expect(createdDtRes.data?.translations?.['uz-UZ']?.description).toBe(
      'G`iloflar va himoya oynalari jadvali',
    )

    const delDtRes = await api['table-fields']
      ['data-tables']({
        id: String(createdDtRes.data!.id),
      })
      .delete()
    expect(delDtRes.error).toBeNull()
  })

  test('8. Customers Base (/customers): Create, update, list, and delete customers', async () => {
    const listBefore = await api.customers.get()
    expect(listBefore.error).toBeNull()
    expect(listBefore.data?.customers.length).toBeGreaterThanOrEqual(1)

    const createdRes = await api.customers.post({
      fullName: 'VIP Mijoz Test',
      phone: '+998 90 555 66 77',
      segment: 'vip',
      address: 'Toshkent, Yunusobod',
      notes: 'Doimiy xaridor',
      customFields: {},
    })
    expect(createdRes.error).toBeNull()
    expect(createdRes.data?.fullName).toBe('VIP Mijoz Test')

    const customerId = createdRes.data!.id
    const updatedRes = await api.customers({ id: String(customerId) }).put({
      fullName: 'VIP Mijoz Yangilandi',
      segment: 'wholesale',
    })
    expect(updatedRes.error).toBeNull()
    if (updatedRes.data && 'fullName' in updatedRes.data) {
      expect(updatedRes.data.fullName).toBe('VIP Mijoz Yangilandi')
      expect(updatedRes.data.segment).toBe('wholesale')
    }

    const delRes = await api.customers({ id: String(customerId) }).delete()
    expect(delRes.error).toBeNull()
  })

  test('9. Multi-Item POS Checkout (/pos/checkout): Sell phone + multiple spare parts in a single transaction', async () => {
    const posBefore = await api.pos.get()
    const phoneToSell = posBefore.data!.availablePhones.find((p) => p.status === 'in_stock')!
    const partToSell = posBefore.data!.availableParts.find((pt) => pt.quantity >= 2)!
    const initialPartQty = partToSell.quantity

    const checkoutRes = await api.pos.checkout.post({
      items: [
        {
          type: 'phone',
          phoneId: phoneToSell.id,
          quantity: 1,
          unitSalePrice: phoneToSell.salePrice,
        },
        {
          type: 'part',
          partId: partToSell.id,
          quantity: 2,
          unitSalePrice: partToSell.salePrice,
        },
      ],
      customerName: 'Ko`p Tovarli Xaridor',
      customerPhone: '+998 99 123 00 00',
      paymentMethod: 'cash',
      cashPaid: phoneToSell.salePrice + partToSell.salePrice * 2,
      warrantyMonths: 3,
      tradeIn: null,
    })

    expect(checkoutRes.error).toBeNull()
    if (checkoutRes.data && 'sales' in checkoutRes.data) {
      expect(checkoutRes.data.sales.length).toBe(2)
      expect(checkoutRes.data.cartTotalAmount).toBe(
        phoneToSell.salePrice + partToSell.salePrice * 2,
      )
    }

    const posAfter = await api.pos.get()
    const updatedPart = posAfter.data!.availableParts.find((pt) => pt.id === partToSell.id)!
    expect(updatedPart.quantity).toBe(initialPartQty - 2)
  })

  test('10. Environment Feature Flags (APP_FEATURES) & Live Demo Timer (APP_LIVE_HOURS) work on Frontend & Backend', async () => {
    // 1. Verify parseAppFeaturesEnv
    const allParsed = parseAppFeaturesEnv('all')
    expect(allParsed.isAll).toBe(true)
    expect(allParsed.locked.length).toBe(0)

    const partialParsed = parseAppFeaturesEnv('repairs,warehouse,pos')
    expect(partialParsed.isAll).toBe(false)
    expect(partialParsed.enabled).toContain('repairs')
    expect(partialParsed.enabled).toContain('phones')
    expect(partialParsed.enabled).toContain('parts')
    expect(partialParsed.enabled).toContain('pos')
    expect(partialParsed.locked).toContain('analytics')

    // 2. Verify parseAppLiveHoursEnv when unset vs active vs expired
    const disabledTimer = parseAppLiveHoursEnv('')
    expect(disabledTimer.enabled).toBe(false)
    expect(disabledTimer.isExpired).toBe(false)

    const baseStart = Date.parse('2026-11-03T10:00:00.000Z')
    const activeTimer = parseAppLiveHoursEnv(
      '4',
      '2026-11-03T10:00:00.000Z',
      baseStart,
      baseStart + 60 * 60 * 1000, // 1 hour elapsed out of 4 hours
    )
    expect(activeTimer.enabled).toBe(true)
    expect(activeTimer.hours).toBe(4)
    expect(activeTimer.isExpired).toBe(false)
    expect(activeTimer.remainingMs).toBe(3 * 60 * 60 * 1000)
    expect(formatRemainingLiveTime(activeTimer.remainingMs)).toBe('03:00:00')

    const expiredTimer = parseAppLiveHoursEnv(
      '2',
      '2026-11-03T10:00:00.000Z',
      baseStart,
      baseStart + 3 * 60 * 60 * 1000, // 3 hours elapsed out of 2 hours
    )
    expect(expiredTimer.enabled).toBe(true)
    expect(expiredTimer.isExpired).toBe(true)
    expect(expiredTimer.remainingMs).toBe(0)
    expect(formatRemainingLiveTime(expiredTimer.remainingMs)).toBe('00:00:00')

    // 3. Verify Backend runtime enforcement when APP_LIVE_HOURS is expired
    const prevHours = process.env.APP_LIVE_HOURS
    const prevStart = process.env.APP_LIVE_START_TIME
    try {
      process.env.APP_LIVE_HOURS = '1'
      process.env.APP_LIVE_START_TIME = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

      // /api/overview still responds with liveTimer.isExpired = true so UI can show expired screen
      const overviewExpired = await api.overview.get()
      expect(overviewExpired.error).toBeNull()
      expect(overviewExpired.data?.liveTimer.enabled).toBe(true)
      expect(overviewExpired.data?.liveTimer.isExpired).toBe(true)

      // Protected business endpoint (/api/repairs) is blocked with 403
      const blockedRepairs = await api.repairs.get()
      expect(blockedRepairs.error).not.toBeNull()
      expect(blockedRepairs.error?.status).toBe(403)
    } finally {
      if (prevHours === undefined) delete process.env.APP_LIVE_HOURS
      else process.env.APP_LIVE_HOURS = prevHours

      if (prevStart === undefined) delete process.env.APP_LIVE_START_TIME
      else process.env.APP_LIVE_START_TIME = prevStart
    }
  })

  test('11. Security Audit Controls: Rate Limiting (429), Constant-Time Auth, Token Redaction, XSS Escaping & Webhook Secret', async () => {
    resetRateLimitStore()

    // 1. Constant-time string comparison & HTML XSS escaping
    expect(timingSafeEqualStrings('secret-token-123', 'secret-token-123')).toBe(true)
    expect(timingSafeEqualStrings('secret-token-123', 'secret-token-124')).toBe(false)
    expect(timingSafeEqualStrings('short', 'longer-string')).toBe(false)

    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>'
    const escaped = escapeHtml(xssPayload)
    expect(escaped).not.toContain('<script>')
    expect(escaped).toContain('&lt;script&gt;')

    // 2. HTTP Security Headers & Rate Limit Headers on API responses
    const healthRes = await app.handle(new Request('http://localhost/api/overview'))
    expect(healthRes.headers.get('x-content-type-options')).toBe('nosniff')
    expect(healthRes.headers.get('x-frame-options')).toBe('SAMEORIGIN')
    expect(healthRes.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(healthRes.headers.get('x-ratelimit-limit')).toBe('300')

    // 3. Session Token Redaction in /api/auth-guard/sessions
    const sessionsRes = await api['auth-guard'].sessions.get()
    expect(sessionsRes.error).toBeNull()
    for (const dev of sessionsRes.data?.devices ?? []) {
      expect(dev.sessionToken).toBe('[REDACTED]')
    }

    // 4. Login Brute-Force Rate Limiting (max 10 per minute per IP -> 11th returns 429)
    resetRateLimitStore()
    let lastStatus = 200
    for (let i = 1; i <= 11; i++) {
      const loginReq = new Request('http://localhost/api/auth-guard/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.77',
        },
        body: JSON.stringify({
          login: 'admin@mobilefix.uz',
          password: 'wrong-password',
        }),
      })
      const res = await app.handle(loginReq)
      lastStatus = res.status
      if (i <= 10) {
        expect(res.status).toBe(200)
      } else {
        expect(res.status).toBe(429)
        expect(res.headers.get('retry-after')).toBeDefined()
      }
    }
    expect(lastStatus).toBe(429)
    resetRateLimitStore()

    // 5. Telegram Webhook Secret Verification (401 when secret mismatches)
    const prevWebhookSecret = process.env.WEBHOOK_SECRET
    try {
      process.env.WEBHOOK_SECRET = 'real-production-telegram-secret-999'
      const unauthorizedWebhook = await app.handle(
        new Request('http://localhost/api/bot/webhook', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-telegram-bot-api-secret-token': 'forged-secret',
          },
          body: JSON.stringify({ update_id: 1 }),
        }),
      )
      expect(unauthorizedWebhook.status).toBe(401)
    } finally {
      if (prevWebhookSecret === undefined) delete process.env.WEBHOOK_SECRET
      else process.env.WEBHOOK_SECRET = prevWebhookSecret
    }

    // 6. Unit test sliding window rate limiter
    const bucketKey = 'unit-test-ip'
    expect(checkRateLimit(bucketKey, 2, 10_000, 1000).allowed).toBe(true)
    expect(checkRateLimit(bucketKey, 2, 10_000, 2000).allowed).toBe(true)
    expect(checkRateLimit(bucketKey, 2, 10_000, 3000).allowed).toBe(false)
    // Window expires after 10_000ms
    expect(checkRateLimit(bucketKey, 2, 10_000, 12000).allowed).toBe(true)
    resetRateLimitStore()
  })
})
