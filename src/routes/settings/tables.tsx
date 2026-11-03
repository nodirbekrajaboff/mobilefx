import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'

import { TableFieldsManagerCard } from '#/components/TableFieldsManagerCard'

export const Route = createFileRoute('/settings/tables')({
  component: SettingsTablesPage,
})

function SettingsTablesPage() {
  return (
    <div className="flex flex-col gap-4">
      <TableFieldsManagerCard onNotify={(msg) => toast.success(msg)} />
    </div>
  )
}
