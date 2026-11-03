import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'
import * as React from 'react'

const badgeVariants = cva(
  'group/badge focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-[11px] font-semibold tracking-tight whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all focus-visible:ring-[3px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 dark:shadow-none [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/85',
        secondary:
          'text-secondary-foreground bg-slate-950/[0.055] dark:bg-white/[0.08] [a]:hover:bg-slate-950/[0.08]',
        destructive:
          'focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 ring-inset dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/25 [a]:hover:bg-rose-500/20',
        outline:
          'text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground border-slate-950/[0.09] bg-white/70 dark:border-white/[0.1] dark:bg-white/[0.03]',
        ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
