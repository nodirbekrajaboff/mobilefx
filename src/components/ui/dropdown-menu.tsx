'use client'

import { IconCheck, IconChevronRight } from '@tabler/icons-react'
import { cn } from 'cn'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import * as React from 'react'

function DropdownMenu({
  modal = false,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" modal={modal} {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'bg-popover/96 text-popover-foreground data-[side=bottom]:slide-in-from-top-1.5 data-[side=left]:slide-in-from-right-1.5 data-[side=right]:slide-in-from-left-1.5 data-[side=top]:slide-in-from-bottom-1.5 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:bg-popover/95 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-48 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl p-1.5 shadow-[0_14px_36px_-6px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_0_rgba(255,255,255,0.85)] ring-1 ring-slate-950/[0.07] backdrop-blur-xl duration-150 ease-out data-[state=closed]:overflow-hidden dark:shadow-[0_18px_42px_-6px_rgba(0,0,0,0.55),0_4px_14px_-2px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.07)] dark:ring-white/[0.09]',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item text-foreground/90 focus:text-foreground dark:focus:text-foreground [&_svg:not([class*='text-'])]:text-muted-foreground group-focus/dropdown-menu-item:[&_svg:not([class*='text-'])]:text-foreground relative flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] leading-tight font-medium outline-hidden transition-colors duration-100 select-none focus:bg-slate-950/[0.045] data-disabled:pointer-events-none data-disabled:opacity-45 data-inset:pl-8 data-[variant=destructive]:text-rose-600 data-[variant=destructive]:focus:bg-rose-500/10 data-[variant=destructive]:focus:text-rose-600 dark:focus:bg-white/[0.07] dark:data-[variant=destructive]:text-rose-400 dark:data-[variant=destructive]:focus:bg-rose-500/15 dark:data-[variant=destructive]:focus:text-rose-400 [&_svg]:pointer-events-none [&_svg]:mr-0! [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-rose-600 dark:data-[variant=destructive]:*:[svg]:text-rose-400",
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "text-foreground/90 focus:text-foreground dark:focus:text-foreground relative flex cursor-pointer items-center gap-2.5 rounded-xl py-2 pr-8 pl-2.5 text-[13px] leading-tight font-medium outline-hidden transition-colors duration-100 select-none focus:bg-slate-950/[0.045] data-disabled:pointer-events-none data-disabled:opacity-45 data-inset:pl-8 dark:focus:bg-white/[0.07] [&_svg]:pointer-events-none [&_svg]:mr-0! [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span
        className="text-primary pointer-events-none absolute right-2.5 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <IconCheck />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "text-foreground/90 focus:text-foreground dark:focus:text-foreground relative flex cursor-pointer items-center gap-2.5 rounded-xl py-2 pr-8 pl-2.5 text-[13px] leading-tight font-medium outline-hidden transition-colors duration-100 select-none focus:bg-slate-950/[0.045] data-disabled:pointer-events-none data-disabled:opacity-45 data-inset:pl-8 dark:focus:bg-white/[0.07] [&_svg]:pointer-events-none [&_svg]:mr-0! [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className="text-primary pointer-events-none absolute right-2.5 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <IconCheck />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'text-muted-foreground/80 truncate px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-tight select-none data-inset:pl-8',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('mx-1.5 my-1 h-px bg-slate-950/[0.06] dark:bg-white/[0.07]', className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        'text-muted-foreground/75 group-focus/dropdown-menu-item:text-foreground/80 ml-auto font-mono text-[11px] tracking-wider',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "text-foreground/90 focus:text-foreground data-open:text-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] leading-tight font-medium outline-hidden transition-colors duration-100 select-none focus:bg-slate-950/[0.045] data-inset:pl-8 data-open:bg-slate-950/[0.045] dark:focus:bg-white/[0.07] dark:data-open:bg-white/[0.07] [&_svg]:pointer-events-none [&_svg]:mr-0! [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <IconChevronRight className="text-muted-foreground/70 ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'bg-popover/96 text-popover-foreground data-[side=bottom]:slide-in-from-top-1.5 data-[side=left]:slide-in-from-right-1.5 data-[side=right]:slide-in-from-left-1.5 data-[side=top]:slide-in-from-bottom-1.5 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:bg-popover/95 z-50 min-w-36 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-2xl p-1.5 shadow-[0_14px_36px_-6px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_0_rgba(255,255,255,0.85)] ring-1 ring-slate-950/[0.07] backdrop-blur-xl duration-150 ease-out dark:shadow-[0_18px_42px_-6px_rgba(0,0,0,0.55),0_4px_14px_-2px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.07)] dark:ring-white/[0.09]',
        className,
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
