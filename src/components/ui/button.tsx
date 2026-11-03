import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'
import * as React from 'react'

const buttonVariants = cva(
  "group/button focus-visible:border-ring focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-xs font-semibold whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:ring-3 active:not-aria-[haspopup]:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 aria-invalid:ring-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/92 shadow-[0_1px_2px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.22)] hover:shadow-[0_3px_10px_-2px_rgba(79,70,229,0.28),inset_0_1px_0_rgba(255,255,255,0.25)]',
        outline:
          'text-foreground aria-expanded:text-foreground border-slate-950/[0.09] bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-slate-950/[0.15] hover:bg-white aria-expanded:bg-slate-100/85 dark:border-white/[0.1] dark:bg-white/[0.04] dark:shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] dark:hover:border-white/[0.16] dark:hover:bg-white/[0.08] dark:aria-expanded:bg-white/[0.09]',
        secondary:
          'text-secondary-foreground aria-expanded:text-secondary-foreground bg-slate-950/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] hover:bg-slate-950/[0.08] aria-expanded:bg-slate-950/[0.08] dark:bg-white/[0.07] dark:shadow-none dark:hover:bg-white/[0.11] dark:aria-expanded:bg-white/[0.11]',
        ghost:
          'text-foreground/80 hover:text-foreground aria-expanded:text-foreground hover:bg-slate-950/[0.05] aria-expanded:bg-slate-950/[0.06] dark:hover:bg-white/[0.07] dark:aria-expanded:bg-white/[0.09]',
        destructive:
          'focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 ring-inset hover:bg-rose-500/15 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/25 dark:hover:bg-rose-500/25',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-10 gap-2 px-4 text-xs font-semibold has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5',
        xs: "h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold in-data-[slot=button-group]:rounded-xl has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4",
        lg: 'h-11 gap-2 rounded-xl px-5 text-sm font-semibold has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-10 rounded-xl',
        'icon-xs':
          "size-8 rounded-lg in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        'icon-sm': 'size-9 rounded-xl in-data-[slot=button-group]:rounded-xl',
        'icon-lg': 'size-11 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
