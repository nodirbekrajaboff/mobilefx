export type ManagedTableKey = 'repairs' | 'phones' | 'parts' | 'debts' | 'customers'

export const DEFAULT_SYSTEM_TABLE_FIELDS: Record<
  ManagedTableKey,
  Array<{
    fieldKey: string
    label: string
    sortOrder: number
  }>
> = {
  repairs: [
    { fieldKey: 'id', label: '№', sortOrder: 1 },
    { fieldKey: 'customerName', label: 'Mijoz', sortOrder: 2 },
    { fieldKey: 'phoneModel', label: 'Model', sortOrder: 3 },
    { fieldKey: 'issueDescription', label: 'Nosozlik', sortOrder: 4 },
    { fieldKey: 'partNameSnapshot', label: 'Ehtiyot qism', sortOrder: 5 },
    { fieldKey: 'agreedPrice', label: 'Narx', sortOrder: 6 },
    { fieldKey: 'status', label: 'Holati', sortOrder: 7 },
    { fieldKey: 'createdAt', label: 'Sana', sortOrder: 8 },
  ],
  phones: [
    { fieldKey: 'model', label: 'Model va Xotira', sortOrder: 1 },
    { fieldKey: 'color', label: 'Rangi', sortOrder: 2 },
    { fieldKey: 'imei', label: 'IMEI', sortOrder: 3 },
    { fieldKey: 'condition', label: 'Holati', sortOrder: 4 },
    { fieldKey: 'boxAndCharger', label: 'Quti / Quvvatlagich', sortOrder: 5 },
    { fieldKey: 'sourceName', label: 'Qabul manbasi', sortOrder: 6 },
    { fieldKey: 'costPrice', label: 'Tannarxi', sortOrder: 7 },
    { fieldKey: 'salePrice', label: 'Sotuv narxi', sortOrder: 8 },
    { fieldKey: 'status', label: 'Holat', sortOrder: 9 },
  ],
  parts: [
    { fieldKey: 'name', label: 'Ehtiyot qism nomi', sortOrder: 1 },
    { fieldKey: 'categoryName', label: 'Toifa', sortOrder: 2 },
    { fieldKey: 'quantity', label: 'Qoldiq', sortOrder: 3 },
    { fieldKey: 'costPrice', label: 'Tannarxi (1 dona)', sortOrder: 4 },
    { fieldKey: 'salePrice', label: 'Sotuv narxi (1 dona)', sortOrder: 5 },
    { fieldKey: 'totalSaleValue', label: 'Jami summa (Qoldiq × Sotuv)', sortOrder: 6 },
    { fieldKey: 'actions', label: 'Amal', sortOrder: 7 },
  ],
  debts: [
    { fieldKey: 'counterpartyName', label: "Mijoz / Ta'minotchi", sortOrder: 1 },
    { fieldKey: 'description', label: 'Manba va tavsif', sortOrder: 2 },
    { fieldKey: 'totalAmount', label: 'Jami summa', sortOrder: 3 },
    { fieldKey: 'paidAmount', label: "To'langan", sortOrder: 4 },
    { fieldKey: 'remainingAmount', label: 'Qoldiq', sortOrder: 5 },
    { fieldKey: 'dueDate', label: "To'lov muddati", sortOrder: 6 },
    { fieldKey: 'actions', label: "To'lov amali", sortOrder: 7 },
  ],
  customers: [
    { fieldKey: 'fullName', label: 'Mijoz F.I.Sh', sortOrder: 1 },
    { fieldKey: 'phone', label: 'Telefon raqami', sortOrder: 2 },
    { fieldKey: 'segment', label: 'Toifasi', sortOrder: 3 },
    { fieldKey: 'address', label: 'Manzil va izoh', sortOrder: 4 },
    { fieldKey: 'ordersCount', label: 'Murojaatlar soni', sortOrder: 5 },
    { fieldKey: 'totalSpent', label: 'Jami xarid aylanmasi', sortOrder: 6 },
    { fieldKey: 'actions', label: 'Amal', sortOrder: 7 },
  ],
}
