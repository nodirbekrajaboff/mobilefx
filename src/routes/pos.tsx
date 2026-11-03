import {
  IconCheck,
  IconDeviceMobile,
  IconLock,
  IconMinus,
  IconPlus,
  IconPrinter,
  IconRefresh,
  IconSearch,
  IconTool,
  IconTrash,
  IconUser,
  IconUsers,
  IconX,
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { toast } from 'sonner'

import { compilePosReceiptEscPos, PosThermalReceipt } from '#/components/PosThermalReceipt'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { DatePicker } from '#/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { EmptyState } from '#/components/ui/empty'
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
import { Switch } from '#/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { getApi } from '#/lib/api'
import { useCurrency } from '#/lib/currency'
import {
  getThermalPageStyle,
  sendEscPosToThermalPrinter,
  type ThermalPaperWidth,
} from '#/lib/print'
import { cn } from '#/lib/utils'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/pos')({
  component: PosCashierPage,
})

function AnimatedMoney({
  value,
  formatMoney,
  prefix = '',
  className,
}: {
  value: number
  formatMoney: (amountUzs: number | null | undefined) => string
  prefix?: string
  className?: string
}) {
  const motionValue = useMotionValue(value)
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.48,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest))
      },
    })
    return () => controls.stop()
  }, [value, motionValue])

  return (
    <motion.span
      key={value}
      initial={{ scale: 1.04 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      className={cn('inline-block tabular-nums', className)}
    >
      {prefix}
      {formatMoney(displayValue)}
    </motion.span>
  )
}

interface CartItem {
  key: string
  type: 'phone' | 'part'
  phoneId?: number
  partId?: number
  title: string
  subtitle: string
  quantity: number
  maxQuantity: number
  costPrice: number
  unitSalePrice: number
}

function PosCashierPage() {
  const queryClient = useQueryClient()
  const { formatMoney, overviewData, refetchOverview, isFeatureLocked, notifyFeatureLocked } =
    useCurrency()
  const isTradeInLocked = isFeatureLocked('trade_in')
  const isPrintLocked = isFeatureLocked('thermal_print')
  const receiptRef = useRef<HTMLDivElement>(null)
  const storeSettings = overviewData?.settings
  const printerPaperWidth: ThermalPaperWidth =
    storeSettings?.printerPaperWidth === '80mm' ? '80mm' : '58mm'

  const [catalogTab, setCatalogTab] = useState<'phones' | 'parts'>('phones')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])

  // Customer state ('walkin' = Chakana xarid, 'existing' = Mavjud mijoz, 'new' = Yangi mijoz kiritish)
  const [customerTab, setCustomerTab] = useState<'walkin' | 'existing' | 'new'>('walkin')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walkin')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('+998 ')

  // Payment & Warranty state
  const [warrantyMonths, setWarrantyMonths] = useState('6')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed' | 'credit'>('cash')
  const [cashPaid, setCashPaid] = useState('')
  const [cardPaid, setCardPaid] = useState('')
  const [initialPaidAmount, setInitialPaidAmount] = useState('0')
  const [dueDate, setDueDate] = useState('')

  // Trade-In state
  const [hasTradeIn, setHasTradeIn] = useState(false)
  const [tradeInModel, setTradeInModel] = useState('')
  const [tradeInImei, setTradeInImei] = useState('')
  const [tradeInBattery, setTradeInBattery] = useState('85')
  const [tradeInAcceptedPrice, setTradeInAcceptedPrice] = useState('')
  const [tradeInResalePrice, setTradeInResalePrice] = useState('')

  // Receipt dialog
  const [receiptSale, setReceiptSale] = useState<{
    id: number
    itemsSummary: string
    customerName: string
    totalAmount: number
    tradeInModel?: string | null
    tradeInAcceptedPrice: number
    payableAmount: number
    warrantyMonths: number
    createdAt: string
  } | null>(null)

  const handleBrowserPrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: receiptSale ? `POS-Receipt-${receiptSale.id}` : 'POS-Receipt',
    pageStyle: getThermalPageStyle(printerPaperWidth),
  })

  const handleEscPosDirectPrint = async () => {
    if (!receiptSale) return
    try {
      const bytes = await compilePosReceiptEscPos({
        saleId: receiptSale.id,
        storeName: storeSettings?.storeName || 'Mobile Fix',
        storePhone: storeSettings?.storePhone || '+998 90 123 45 67',
        storeAddress: storeSettings?.storeAddress || '',
        itemsSummary: receiptSale.itemsSummary,
        customerName: receiptSale.customerName,
        totalAmountFormatted: formatMoney(receiptSale.totalAmount),
        tradeInModel: receiptSale.tradeInModel,
        tradeInAcceptedFormatted:
          receiptSale.tradeInAcceptedPrice > 0
            ? formatMoney(receiptSale.tradeInAcceptedPrice)
            : undefined,
        payableAmountFormatted: formatMoney(receiptSale.payableAmount),
        warrantyMonths: receiptSale.warrantyMonths,
        createdAt: receiptSale.createdAt,
        paperWidth: printerPaperWidth,
      })
      await sendEscPosToThermalPrinter(bytes)
    } catch {
      handleBrowserPrint()
    }
  }

  const posQuery = useQuery({
    queryKey: ['pos'],
    queryFn: async () => {
      const { data, error } = await getApi().pos.get()
      if (error) throw error
      return data
    },
  })

  const availablePhones = posQuery.data?.availablePhones ?? []
  const availableParts = posQuery.data?.availableParts ?? []
  const customersList = posQuery.data?.customers ?? []

  const filteredPhones = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return availablePhones
    return availablePhones.filter(
      (p) =>
        p.model.toLowerCase().includes(q) ||
        p.imei.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q),
    )
  }, [availablePhones, searchQuery])

  const filteredParts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return availableParts
    return availableParts.filter((p) => p.name.toLowerCase().includes(q))
  }, [availableParts, searchQuery])

  const togglePhoneInCart = (phone: (typeof availablePhones)[number]) => {
    const itemKey = `phone-${phone.id}`
    setCart((prev) => {
      const exists = prev.some((i) => i.key === itemKey)
      if (exists) {
        return prev.filter((i) => i.key !== itemKey)
      }
      return [
        ...prev,
        {
          key: itemKey,
          type: 'phone',
          phoneId: phone.id,
          title: `${phone.model} (${phone.color})`,
          subtitle: `IMEI: ${phone.imei || '—'} • ${phone.condition === 'new' ? m.phones_cond_new() : `${m.phones_cond_used()} (${phone.batteryHealth}%)`}`,
          quantity: 1,
          maxQuantity: 1,
          costPrice: phone.costPrice,
          unitSalePrice: phone.salePrice,
        },
      ]
    })
  }

  const addPartToCart = (part: (typeof availableParts)[number]) => {
    const itemKey = `part-${part.id}`
    setCart((prev) => {
      const existing = prev.find((i) => i.key === itemKey)
      if (existing) {
        if (existing.quantity >= part.quantity) return prev
        return prev.map((i) => (i.key === itemKey ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [
        ...prev,
        {
          key: itemKey,
          type: 'part',
          partId: part.id,
          title: part.name,
          subtitle: m.pos_in_stock({ count: part.quantity }),
          quantity: 1,
          maxQuantity: part.quantity,
          costPrice: part.costPrice,
          unitSalePrice: part.salePrice,
        },
      ]
    })
  }

  const updateCartQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item
          const nextQty = item.quantity + delta
          if (nextQty <= 0) return null
          return {
            ...item,
            quantity: Math.min(item.maxQuantity, nextQty),
          }
        })
        .filter((x): x is CartItem => x !== null),
    )
  }

  const updateCartPrice = (key: string, nextPrice: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, unitSalePrice: Math.max(0, Math.round(nextPrice)) } : item,
      ),
    )
  }

  const removeCartItem = (key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key))
  }

  const cartTotalAmount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity * item.unitSalePrice, 0),
    [cart],
  )

  const numericTradeInAccepted = hasTradeIn ? Number(tradeInAcceptedPrice) || 0 : 0
  const payableAmount = Math.max(0, cartTotalAmount - numericTradeInAccepted)
  const hasPhoneInCart = cart.some((i) => i.type === 'phone')

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await getApi().pos.checkout.post({
        items: cart.map((item) => ({
          type: item.type,
          phoneId: item.phoneId ?? null,
          partId: item.partId ?? null,
          title: item.title,
          quantity: item.quantity,
          unitSalePrice: item.unitSalePrice,
        })),
        customerId:
          selectedCustomerId !== 'walkin' && selectedCustomerId !== 'new'
            ? Number(selectedCustomerId)
            : null,
        customerName: customerName.trim() || m.pos_walkin_short(),
        customerPhone:
          selectedCustomerId === 'walkin' && paymentMethod !== 'credit' ? '' : customerPhone.trim(),
        paymentMethod,
        cashPaid: Number(cashPaid) || 0,
        cardPaid: Number(cardPaid) || 0,
        initialPaidAmount: Number(initialPaidAmount) || 0,
        dueDate: dueDate || null,
        warrantyMonths: Number(warrantyMonths) || 1,
        tradeIn:
          hasTradeIn && tradeInModel.trim()
            ? {
                model: tradeInModel,
                color: 'Qora',
                imei: tradeInImei,
                batteryHealth: Number(tradeInBattery) || 85,
                boxAndCharger: 'Faqat telefon (Trade-In)',
                acceptedPrice: Number(tradeInAcceptedPrice) || 0,
                resalePrice:
                  Number(tradeInResalePrice) || (Number(tradeInAcceptedPrice) || 0) + 500000,
              }
            : null,
      })
      if (error) throw error
      return data
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['pos'] })
      void queryClient.invalidateQueries({ queryKey: ['phones'] })
      void queryClient.invalidateQueries({ queryKey: ['parts'] })
      void queryClient.invalidateQueries({ queryKey: ['debts'] })
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      void queryClient.invalidateQueries({ queryKey: ['analytics'] })
      void queryClient.invalidateQueries({ queryKey: ['overview'] })
      refetchOverview()

      if (res && 'sale' in res) {
        const itemsSummary = cart
          .map((i) => (i.quantity > 1 ? `${i.title} ×${i.quantity}` : i.title))
          .join(', ')
        setReceiptSale({
          id: res.sale.id,
          itemsSummary,
          customerName: res.sale.customerName ?? m.pos_field_customer(),
          totalAmount: res.cartTotalAmount,
          tradeInModel: res.tradeInPhone?.model ?? null,
          tradeInAcceptedPrice: numericTradeInAccepted,
          payableAmount: res.payableAmount,
          warrantyMonths: res.sale.warrantyMonths,
          createdAt: String(res.sale.createdAt),
        })
        toast.success(
          m.pos_toast_completed({
            count: cart.length,
            amount: formatMoney(res.payableAmount),
          }),
        )
      }

      setCart([])
      setCustomerTab('walkin')
      setSelectedCustomerId('walkin')
      setCustomerName('')
      setCustomerPhone('+998 ')
      setHasTradeIn(false)
      setTradeInModel('')
      setTradeInImei('')
      setTradeInAcceptedPrice('')
      setTradeInResalePrice('')
    },
  })

  return (
    <div className="flex flex-col gap-5">
      {/* MAIN POS SPLIT: Left Catalog & Right Cart/Checkout */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* LEFT COLUMN (7 cols): Tovarlar katalogi */}
        <Card className="bg-card h-fit gap-0 overflow-hidden py-0 lg:col-span-7">
          <Tabs
            value={catalogTab}
            onValueChange={(v) => setCatalogTab(v as 'phones' | 'parts')}
            className="gap-0"
          >
            <CardHeader className="border-border/70 border-b pb-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="phones" className="px-4">
                    <IconDeviceMobile data-icon="inline-start" />
                    {m.app_phones()} ({availablePhones.length})
                  </TabsTrigger>
                  <TabsTrigger value="parts" className="px-4">
                    <IconTool data-icon="inline-start" />
                    {m.app_parts()} ({availableParts.length})
                  </TabsTrigger>
                </TabsList>

                <div className="relative w-full sm:max-w-xs">
                  <IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      catalogTab === 'phones' ? m.pos_search_phones() : m.pos_search_parts()
                    }
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="max-h-[560px] overflow-y-auto p-0">
              <TabsContent value="phones" className="divide-border/60 divide-y">
                {filteredPhones.length === 0 ? (
                  <EmptyState
                    compact
                    title={m.pos_empty_phones_title()}
                    description={m.pos_empty_phones_desc()}
                  />
                ) : (
                  filteredPhones.map((p) => {
                    const inCart = cart.some((i) => i.key === `phone-${p.id}`)
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePhoneInCart(p)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors',
                          inCart ? 'bg-primary/[0.06] dark:bg-primary/[0.12]' : 'hover:bg-muted/40',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground truncate text-sm font-semibold">
                              {p.model}
                            </span>
                            <span className="text-muted-foreground text-xs">{p.color}</span>
                            <Badge
                              variant={p.condition === 'new' ? 'secondary' : 'outline'}
                              className="h-5 px-1.5 text-[10px]"
                            >
                              {p.condition === 'new' ? m.phones_cond_new() : `${p.batteryHealth}%`}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                            IMEI: {p.imei || '—'}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-foreground text-sm font-semibold tabular-nums">
                            {formatMoney(p.salePrice)}
                          </span>
                          <span
                            className={cn(
                              'flex size-7 items-center justify-center rounded-full transition-colors',
                              inCart
                                ? 'bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground border',
                            )}
                          >
                            {inCart ? (
                              <IconCheck className="size-3.5 stroke-[2.5]" />
                            ) : (
                              <IconPlus className="size-3.5" />
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </TabsContent>

              <TabsContent value="parts" className="divide-border/60 divide-y">
                {filteredParts.length === 0 ? (
                  <EmptyState
                    compact
                    title={m.pos_empty_parts_title()}
                    description={m.pos_empty_parts_desc()}
                  />
                ) : (
                  filteredParts.map((part) => {
                    const cartEntry = cart.find((i) => i.key === `part-${part.id}`)
                    return (
                      <div
                        key={part.id}
                        onClick={() => addPartToCart(part)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors',
                          cartEntry
                            ? 'bg-primary/[0.06] dark:bg-primary/[0.12]'
                            : 'hover:bg-muted/40',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground truncate text-sm font-semibold">
                            {part.name}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                            {m.pos_in_stock({ count: part.quantity })}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-foreground text-sm font-semibold tabular-nums">
                            {formatMoney(part.salePrice)}
                          </span>
                          {cartEntry ? (
                            <Badge className="h-6 px-2 text-xs tabular-nums">
                              {m.common_count_dona({
                                count: cartEntry.quantity,
                              })}
                            </Badge>
                          ) : (
                            <span className="border-border bg-background text-muted-foreground flex size-7 items-center justify-center rounded-full border">
                              <IconPlus className="size-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* RIGHT COLUMN (5 cols): Split into distinct Cards (Savat, Xaridor va To'lov, Trade-In, Yakuniy hisob) */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (cart.length === 0) return
            checkoutMutation.mutate()
          }}
          className="flex flex-col gap-4 lg:col-span-5"
        >
          {/* CARD 1: Savat (Cart Items) */}
          <Card className="bg-card h-fit gap-0 overflow-hidden py-0">
            <CardHeader className="border-border/70 border-b pb-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-foreground text-sm font-semibold">
                    {m.pos_cart_title()}
                  </CardTitle>
                  {cart.length > 0 && (
                    <Badge variant="secondary" className="tabular-nums">
                      {m.common_count_pcs({
                        count: cart.reduce((s, i) => s + i.quantity, 0),
                      })}
                    </Badge>
                  )}
                </div>

                {cart.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setCart([])}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <IconTrash data-icon="inline-start" />
                    {m.common_clear()}
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {cart.length === 0 ? (
                <EmptyState
                  compact
                  title={m.pos_cart_empty_title()}
                  description={m.pos_cart_empty_desc()}
                />
              ) : (
                <div className="divide-border/60 divide-y">
                  {cart.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-2.5 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground truncate text-xs font-semibold">
                          {item.title}
                        </div>
                        <div className="text-muted-foreground truncate text-[11px]">
                          {item.subtitle}
                        </div>
                      </div>

                      {item.type === 'part' && (
                        <div className="border-border bg-muted/40 flex items-center gap-0.5 rounded-lg border p-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => updateCartQty(item.key, -1)}
                          >
                            <IconMinus />
                          </Button>
                          <span className="w-6 text-center text-xs font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={item.quantity >= item.maxQuantity}
                            onClick={() => updateCartQty(item.key, 1)}
                          >
                            <IconPlus />
                          </Button>
                        </div>
                      )}

                      <div className="w-28 shrink-0">
                        <Input
                          type="number"
                          value={item.unitSalePrice}
                          onChange={(e) => updateCartPrice(item.key, Number(e.target.value))}
                          aria-label={m.parts_col_sale()}
                          className="h-8 px-2.5 text-right text-xs font-semibold tabular-nums"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeCartItem(item.key)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <IconX className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {cart.length > 0 && (
            <>
              {/* CARD 2: Xaridor va To'lov (Client & Payment Card) */}
              <Card className="bg-card h-fit">
                <CardHeader className="border-border/70 border-b pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-foreground text-sm font-semibold">
                      {m.pos_client_card_title()}
                    </CardTitle>
                    {hasPhoneInCart && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {m.pos_field_warranty()}:
                        </span>
                        <Select value={warrantyMonths} onValueChange={setWarrantyMonths}>
                          <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="1">
                                {m.pos_warranty_months({ months: 1 })}
                              </SelectItem>
                              <SelectItem value="3">
                                {m.pos_warranty_months({ months: 3 })}
                              </SelectItem>
                              <SelectItem value="6">
                                {m.pos_warranty_months({ months: 6 })}
                              </SelectItem>
                              <SelectItem value="12">
                                {m.pos_warranty_months({ months: 12 })}
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3.5 pt-4">
                  {/* Customer Selection Tabs + TabsContent */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-muted-foreground text-xs">
                      {m.pos_field_customer()}
                    </Label>
                    <Tabs
                      value={customerTab}
                      onValueChange={(val) => {
                        const mode = val as 'walkin' | 'existing' | 'new'
                        setCustomerTab(mode)
                        if (mode === 'walkin') {
                          setSelectedCustomerId('walkin')
                          setCustomerName('')
                          setCustomerPhone('+998 ')
                        } else if (mode === 'new') {
                          setSelectedCustomerId('new')
                          setCustomerName('')
                          setCustomerPhone('+998 ')
                        } else {
                          const first = customersList[0]
                          if (first) {
                            setSelectedCustomerId(String(first.id))
                            setCustomerName(first.fullName)
                            setCustomerPhone(first.phone)
                          } else {
                            setSelectedCustomerId('')
                            setCustomerName('')
                            setCustomerPhone('+998 ')
                          }
                        }
                      }}
                    >
                      <TabsList className="w-full">
                        <TabsTrigger value="walkin" className="flex-1">
                          <IconUser className="size-3.5" />
                          {m.pos_walkin_short()}
                        </TabsTrigger>
                        <TabsTrigger value="existing" className="flex-1">
                          <IconUsers className="size-3.5" />
                          {m.app_customers()} ({customersList.length})
                        </TabsTrigger>
                        <TabsTrigger value="new" className="flex-1">
                          <IconPlus className="size-3.5" />
                          {m.pos_new_customer().replace('...', '')}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="walkin" className="pt-1">
                        {paymentMethod === 'credit' ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-muted-foreground text-xs">
                                {m.pos_field_customer_name()}
                              </Label>
                              <Input
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder={m.pos_field_customer_name_placeholder()}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-muted-foreground text-xs">
                                {m.repairs_field_phone().replace(' *', '')}
                              </Label>
                              <Input
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="+998 90 123 45 67"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="border-border/70 bg-muted/30 text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                            <IconUser className="size-3.5 shrink-0" />
                            <span>{m.pos_walkin()}</span>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="existing" className="pt-1">
                        <Select
                          value={
                            selectedCustomerId !== 'walkin' && selectedCustomerId !== 'new'
                              ? selectedCustomerId
                              : undefined
                          }
                          onValueChange={(val) => {
                            setSelectedCustomerId(val)
                            const found = customersList.find((c) => String(c.id) === val)
                            if (found) {
                              setCustomerName(found.fullName)
                              setCustomerPhone(found.phone)
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={m.pos_field_customer()} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {customersList.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.fullName} ({c.phone})
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TabsContent>

                      <TabsContent value="new" className="pt-1">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-muted-foreground text-xs">
                              {m.pos_field_customer_name()}
                            </Label>
                            <Input
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder={m.pos_field_customer_name_placeholder()}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-muted-foreground text-xs">
                              {m.repairs_field_phone().replace(' *', '')}
                            </Label>
                            <Input
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              placeholder="+998 90 123 45 67"
                            />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Payment Method Tabs + TabsContent */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-muted-foreground text-xs">
                      {m.pos_field_payment_type()}
                    </Label>
                    <Tabs
                      value={paymentMethod}
                      onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
                    >
                      <TabsList className="w-full">
                        <TabsTrigger value="cash" className="flex-1">
                          {m.pos_pay_cash()}
                        </TabsTrigger>
                        <TabsTrigger value="card" className="flex-1">
                          {m.pos_pay_card()}
                        </TabsTrigger>
                        <TabsTrigger value="mixed" className="flex-1">
                          {m.pos_pay_mixed()}
                        </TabsTrigger>
                        <TabsTrigger value="credit" className="flex-1">
                          {m.pos_pay_credit()}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="mixed" className="pt-1.5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-muted-foreground text-xs">
                              {m.pos_field_cash_amount()}
                            </Label>
                            <Input
                              type="number"
                              value={cashPaid}
                              onChange={(e) => setCashPaid(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-muted-foreground text-xs">
                              {m.pos_field_card_amount()}
                            </Label>
                            <Input
                              type="number"
                              value={cardPaid}
                              onChange={(e) => setCardPaid(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="credit" className="pt-1.5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-muted-foreground text-xs">
                              {m.pos_field_initial_pay()}
                            </Label>
                            <Input
                              type="number"
                              value={initialPaidAmount}
                              onChange={(e) => setInitialPaidAmount(e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-muted-foreground text-xs">
                              {m.pos_field_due_date()}
                            </Label>
                            <DatePicker
                              value={dueDate}
                              onChange={setDueDate}
                              placeholder={m.pos_due_date_placeholder()}
                            />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 3: Trade-In (Obmen Card) */}
              <Card className={cn('bg-card h-fit gap-0 py-0', isTradeInLocked && 'opacity-75')}>
                <CardHeader
                  className={cn(
                    'pb-4',
                    hasTradeIn && !isTradeInLocked && 'border-border/70 border-b pb-3',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="trade-in-switch"
                      onClick={(e) => {
                        if (isTradeInLocked) {
                          e.preventDefault()
                          notifyFeatureLocked('trade_in')
                        }
                      }}
                      className="text-foreground cursor-pointer text-sm font-semibold"
                    >
                      {isTradeInLocked ? (
                        <IconLock className="size-4 text-amber-500" />
                      ) : (
                        <IconRefresh className="text-muted-foreground size-4" />
                      )}
                      {m.pos_tradein_title()}
                    </Label>
                    <Switch
                      id="trade-in-switch"
                      checked={!isTradeInLocked && hasTradeIn}
                      onCheckedChange={(checked) => {
                        if (isTradeInLocked) {
                          notifyFeatureLocked('trade_in')
                          return
                        }
                        setHasTradeIn(Boolean(checked))
                      }}
                    />
                  </div>
                </CardHeader>

                {!isTradeInLocked && hasTradeIn && (
                  <CardContent className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-muted-foreground text-xs">
                        {m.pos_tradein_model()}
                      </Label>
                      <Input
                        required={hasTradeIn}
                        value={tradeInModel}
                        onChange={(e) => setTradeInModel(e.target.value)}
                        placeholder="iPhone 12 128GB"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-muted-foreground text-xs">
                        {m.pos_tradein_imei_battery()}
                      </Label>
                      <div className="flex gap-1.5">
                        <Input
                          value={tradeInImei}
                          onChange={(e) => setTradeInImei(e.target.value)}
                          placeholder="IMEI"
                        />
                        <Input
                          type="number"
                          value={tradeInBattery}
                          onChange={(e) => setTradeInBattery(e.target.value)}
                          className="w-16 text-center"
                          placeholder="85"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-muted-foreground text-xs">
                        {m.pos_tradein_accepted()}
                      </Label>
                      <Input
                        type="number"
                        required={hasTradeIn}
                        value={tradeInAcceptedPrice}
                        onChange={(e) => {
                          setTradeInAcceptedPrice(e.target.value)
                          setTradeInResalePrice(String((Number(e.target.value) || 0) + 600000))
                        }}
                        placeholder="3500000"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-muted-foreground text-xs">
                        {m.pos_tradein_resale()}
                      </Label>
                      <Input
                        type="number"
                        required={hasTradeIn}
                        value={tradeInResalePrice}
                        onChange={(e) => setTradeInResalePrice(e.target.value)}
                        placeholder="4100000"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* CARD 4: Yakuniy hisob va Tasdiqlash (Summary & Checkout Card) */}
              <Card className="bg-card h-fit py-4">
                <CardContent className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5 text-xs">
                    {hasTradeIn && numericTradeInAccepted > 0 && (
                      <>
                        <div className="text-muted-foreground flex items-center justify-between">
                          <span>{m.pos_cart_sum()}</span>
                          <AnimatedMoney value={cartTotalAmount} formatMoney={formatMoney} />
                        </div>
                        <div className="text-muted-foreground flex items-center justify-between">
                          <span>{m.pos_tradein_discount()}</span>
                          <AnimatedMoney
                            value={numericTradeInAccepted}
                            formatMoney={formatMoney}
                            prefix="−"
                          />
                        </div>
                      </>
                    )}
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground text-xs font-medium">
                        {m.pos_total_payable()}
                      </span>
                      <AnimatedMoney
                        value={payableAmount}
                        formatMoney={formatMoney}
                        className="text-foreground text-xl font-bold tracking-tight"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={checkoutMutation.isPending}
                    className="h-10 w-full"
                  >
                    <IconCheck data-icon="inline-start" />
                    {checkoutMutation.isPending ? m.pos_btn_checking_out() : m.pos_btn_checkout()}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </form>
      </div>

      {/* RECEIPT DIALOG */}
      <Dialog open={Boolean(receiptSale)} onOpenChange={(open) => !open && setReceiptSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle>{m.pos_receipt_title()}</DialogTitle>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {printerPaperWidth}
              </Badge>
            </div>
            <DialogDescription>{m.pos_receipt_desc()}</DialogDescription>
          </DialogHeader>

          {receiptSale && (
            <div className="bg-muted/40 flex justify-center overflow-x-auto rounded-xl p-3">
              <PosThermalReceipt
                ref={receiptRef}
                saleId={receiptSale.id}
                storeName={storeSettings?.storeName || 'Mobile Fix'}
                storePhone={storeSettings?.storePhone || '+998 90 123 45 67'}
                storeAddress={storeSettings?.storeAddress || ''}
                itemsSummary={receiptSale.itemsSummary}
                customerName={receiptSale.customerName}
                totalAmountFormatted={formatMoney(receiptSale.totalAmount)}
                tradeInModel={receiptSale.tradeInModel}
                tradeInAcceptedFormatted={
                  receiptSale.tradeInAcceptedPrice > 0
                    ? formatMoney(receiptSale.tradeInAcceptedPrice)
                    : undefined
                }
                payableAmountFormatted={formatMoney(receiptSale.payableAmount)}
                warrantyMonths={receiptSale.warrantyMonths}
                createdAt={receiptSale.createdAt}
                paperWidth={printerPaperWidth}
              />
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setReceiptSale(null)}>
              {m.common_close()}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className={cn(isPrintLocked && 'opacity-70')}
                onClick={() => {
                  if (isPrintLocked) {
                    notifyFeatureLocked('thermal_print')
                    return
                  }
                  void handleEscPosDirectPrint()
                }}
              >
                {isPrintLocked ? (
                  <IconLock data-icon="inline-start" className="text-amber-500" />
                ) : (
                  <IconPrinter data-icon="inline-start" />
                )}
                ESC/POS ({printerPaperWidth})
              </Button>
              <Button
                className={cn(isPrintLocked && 'opacity-70')}
                onClick={() => {
                  if (isPrintLocked) {
                    notifyFeatureLocked('thermal_print')
                    return
                  }
                  handleBrowserPrint()
                }}
              >
                {isPrintLocked ? (
                  <IconLock data-icon="inline-start" />
                ) : (
                  <IconPrinter data-icon="inline-start" />
                )}
                {m.common_print()}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
