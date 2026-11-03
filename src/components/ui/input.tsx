import { cn } from 'cn'
import * as React from 'react'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground/75 focus-visible:border-primary/60 focus-visible:ring-primary/15 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:focus-visible:ring-primary/25 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-10 w-full min-w-0 [appearance:textfield] rounded-xl border border-slate-950/[0.1] bg-white px-3.5 py-2 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium hover:border-slate-950/[0.16] focus-visible:bg-white focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:ring-3 md:text-sm dark:border-white/[0.1] dark:bg-slate-900 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:hover:border-white/[0.16] dark:focus-visible:bg-slate-900 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
