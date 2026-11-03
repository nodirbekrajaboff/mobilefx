import { IconCheck, IconLock, IconPrinter } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { toast } from 'sonner'

import { compilePosReceiptEscPos, PosThermalReceipt } from '#/components/PosThermalReceipt'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { getApi } from '#/lib/api'
import { useCurrency } from '#/lib/currency'
import { getThermalPageStyle, sendEscPosToThermalPrinter } from '#/lib/print'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/settings/store')({
  component: SettingsStoreAndPrinterPage,
})

function SettingsStoreAndPrinterPage() {
  const queryClient = useQueryClient()
  const {
    currency,
    formatMoney,
    overviewData,
    refetchOverview,
    isFeatureLocked,
    notifyFeatureLocked,
  } = useCurrency()
  const isPrintLocked = isFeatureLocked('thermal_print')
  const testReceiptRef = useRef<HTMLDivElement>(null)

  const settings = overviewData?.settings

  const [storeName, setStoreName] = useState('Mobile Fix')
  const [storePhone, setStorePhone] = useState('+998 90 123 45 67')
  const [storeAddress, setStoreAddress] = useState('')
  const [cbuRate, setCbuRate] = useState('12800')
  const [internalRate, setInternalRate] = useState('12820')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [dailyReportTime, setDailyReportTime] = useState('21:00')
  const [printerPaperWidth, setPrinterPaperWidth] = useState<'58mm' | '80mm'>('58mm')

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

  const handleTestBrowserPrint = useReactToPrint({
    contentRef: testReceiptRef,
    documentTitle: `Test-POS-Receipt-${printerPaperWidth}`,
    pageStyle: getThermalPageStyle(printerPaperWidth),
  })

  const handleTestEscPosPrint = async () => {
    try {
      const bytes = await compilePosReceiptEscPos({
        saleId: 1001,
        storeName: storeName || 'Mobile Fix',
        storePhone: storePhone || '+998 90 123 45 67',
        storeAddress: storeAddress || 'Toshkent sh., Malika savdo majmuasi',
        itemsSummary: 'iPhone 15 Pro 256GB ×1',
        customerName: 'Test Xaridor',
        totalAmountFormatted: formatMoney(14500000),
        payableAmountFormatted: formatMoney(14500000),
        warrantyMonths: 6,
        paperWidth: printerPaperWidth,
      })
      await sendEscPosToThermalPrinter(bytes)
    } catch {
      handleTestBrowserPrint()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-6">
        <div className="flex flex-col gap-1 border-b border-slate-950/[0.06] pb-4 dark:border-white/[0.07]">
          <h2 className="text-foreground text-base font-bold tracking-tight">{m.store_title()}</h2>
          <p className="text-muted-foreground text-xs">{m.store_desc()}</p>
        </div>

        <div className="flex flex-col gap-4 pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">{m.store_name_label()}</Label>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Mobile Fix"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">{m.store_phone_label()}</Label>
              <Input
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="+998 90 123 45 67"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">{m.store_address_label()}</Label>
              <Input
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Toshkent sh., Malika savdo majmuasi"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                {m.store_printer_width_label()}
                {isPrintLocked && <IconLock className="size-3.5 text-amber-500" />}
              </Label>
              <Select
                disabled={isPrintLocked}
                value={printerPaperWidth}
                onValueChange={(v) => v && setPrinterPaperWidth(v as '58mm' | '80mm')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="58mm">{m.store_printer_58()}</SelectItem>
                    <SelectItem value="80mm">{m.store_printer_80()}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={isPrintLocked ? 'opacity-70' : undefined}
                onClick={() => {
                  if (isPrintLocked) {
                    notifyFeatureLocked('thermal_print')
                    return
                  }
                  handleTestBrowserPrint()
                }}
              >
                {isPrintLocked ? (
                  <IconLock data-icon="inline-start" className="text-amber-500" />
                ) : (
                  <IconPrinter data-icon="inline-start" />
                )}
                {m.common_print()} ({printerPaperWidth})
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={isPrintLocked ? 'opacity-70' : undefined}
                onClick={() => {
                  if (isPrintLocked) {
                    notifyFeatureLocked('thermal_print')
                    return
                  }
                  void handleTestEscPosPrint()
                }}
              >
                {isPrintLocked ? (
                  <IconLock data-icon="inline-start" className="text-amber-500" />
                ) : (
                  <IconPrinter data-icon="inline-start" />
                )}
                ESC/POS ({printerPaperWidth})
              </Button>
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
        <div className="flex flex-col gap-1 border-b border-slate-950/[0.06] pb-4 dark:border-white/[0.07]">
          <h3 className="text-foreground text-sm font-bold tracking-tight">
            {m.pos_receipt_title()} ({printerPaperWidth})
          </h3>
          <p className="text-muted-foreground text-xs">{m.pos_receipt_desc()}</p>
        </div>

        <div className="flex justify-center overflow-x-auto pt-5">
          <PosThermalReceipt
            ref={testReceiptRef}
            saleId={1001}
            storeName={storeName || 'Mobile Fix'}
            storePhone={storePhone || '+998 90 123 45 67'}
            storeAddress={storeAddress || 'Toshkent sh., Malika savdo majmuasi'}
            itemsSummary="iPhone 15 Pro 256GB ×1"
            customerName="Test Xaridor"
            totalAmountFormatted={formatMoney(14500000)}
            payableAmountFormatted={formatMoney(14500000)}
            warrantyMonths={6}
            paperWidth={printerPaperWidth}
          />
        </div>
      </Card>
    </div>
  )
}
