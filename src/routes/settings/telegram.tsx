import { IconBrandTelegram, IconCheck, IconClock, IconSend } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { getApi } from '#/lib/api'
import { useCurrency } from '#/lib/currency'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/settings/telegram')({
  component: SettingsTelegramPage,
})

function SettingsTelegramPage() {
  const queryClient = useQueryClient()
  const { currency, overviewData, refetchOverview } = useCurrency()

  const settings = overviewData?.settings

  const [storeName, setStoreName] = useState('Mobile Fix')
  const [storePhone, setStorePhone] = useState('+998 90 123 45 67')
  const [storeAddress, setStoreAddress] = useState('')
  const [cbuRate, setCbuRate] = useState('12800')
  const [internalRate, setInternalRate] = useState('12820')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [dailyReportTime, setDailyReportTime] = useState('21:00')
  const [printerPaperWidth, setPrinterPaperWidth] = useState<'58mm' | '80mm'>('58mm')
  const [tgPreview, setTgPreview] = useState<string>('')

  useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName)
      setStorePhone(settings.storePhone)
      setStoreAddress(settings.storeAddress)
      setCbuRate(String(settings.cbuRate))
      setInternalRate(String(settings.internalRate))
      setTelegramChatId(settings.telegramChatId || '')
      setDailyReportTime(settings.dailyReportTime || '21:00')
      setPrinterPaperWidth(settings.printerPaperWidth === '80mm' ? '80mm' : '58mm')
    }
  }, [settings])

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await getApi().analytics.settings.put({
        storeName,
        storePhone,
        storeAddress,
        cbuRate: Number(cbuRate) || 12800,
        internalRate: Number(internalRate) || 12820,
        defaultCurrency: currency,
        telegramChatId,
        dailyReportTime,
        printerPaperWidth,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['analytics'] })
      void queryClient.invalidateQueries({ queryKey: ['overview'] })
      refetchOverview()
      toast.success(m.store_saved_toast())
    },
  })

  const tgTriggerMutation = useMutation({
    mutationFn: async (type: 'overdue_repairs' | 'due_debts' | 'daily_report' | 'all') => {
      const { data, error } = await getApi().analytics['telegram-notify'].post({
        type,
        chatId: telegramChatId || undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: (res) => {
      setTgPreview(res?.previewMessage || '')
      if (res?.sentToTelegram) {
        toast.success(m.tg_sent_toast())
      } else {
        toast.info(m.tg_preview_toast())
      }
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-6">
        <div className="flex flex-col gap-1 border-b border-slate-950/[0.06] pb-4 dark:border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <IconBrandTelegram className="size-5" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-bold tracking-tight">{m.tg_title()}</h2>
              <p className="text-muted-foreground text-xs">{m.tg_desc()}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.tg_chat_id_label()}</Label>
                <Input
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder={m.tg_chat_id_placeholder()}
                  className="font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.tg_daily_report_label()}</Label>
                <Input
                  value={dailyReportTime}
                  onChange={(e) => setDailyReportTime(e.target.value)}
                  placeholder="21:00"
                  className="font-mono"
                />
              </div>
            </div>

            <Button
              disabled={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate()}
            >
              <IconCheck data-icon="inline-start" />
              {saveSettingsMutation.isPending ? m.saving() : m.save()}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-foreground text-sm font-bold">{m.tg_quick_send_title()}</h3>
            <p className="text-muted-foreground text-xs">{m.tg_quick_send_desc()}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={tgTriggerMutation.isPending}
              onClick={() => tgTriggerMutation.mutate('overdue_repairs')}
            >
              <IconClock data-icon="inline-start" />
              {m.tg_btn_stale()}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={tgTriggerMutation.isPending}
              onClick={() => tgTriggerMutation.mutate('due_debts')}
            >
              <IconSend data-icon="inline-start" />
              {m.tg_btn_debts()}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={tgTriggerMutation.isPending}
              onClick={() => tgTriggerMutation.mutate('daily_report')}
            >
              <IconSend data-icon="inline-start" />
              {m.tg_btn_daily()}
            </Button>
            <Button
              size="sm"
              disabled={tgTriggerMutation.isPending}
              onClick={() => tgTriggerMutation.mutate('all')}
            >
              <IconSend data-icon="inline-start" />
              {m.tg_btn_all()}
            </Button>
          </div>
        </div>

        {tgPreview && (
          <pre className="bg-muted/40 text-foreground mt-4 max-h-56 overflow-auto rounded-xl border border-slate-950/[0.06] p-3.5 font-mono text-xs whitespace-pre-wrap dark:border-white/[0.08]">
            {tgPreview}
          </pre>
        )}
      </Card>
    </div>
  )
}
