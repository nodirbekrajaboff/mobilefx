import { cn } from 'cn'
import * as React from 'react'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-muted-foreground/75 focus-visible:border-primary/60 focus-visible:ring-primary/15 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:focus-visible:ring-primary/25 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-16 w-full rounded-xl border border-slate-950/[0.09] bg-white/85 px-3.5 py-2.5 text-base shadow-[0_1px_2px_rgba(15,23,42,0.03),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-150 outline-none hover:border-slate-950/[0.15] focus-visible:bg-white focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:ring-3 md:text-sm dark:border-white/[0.1] dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:hover:border-white/[0.16] dark:focus-visible:bg-white/[0.05]',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
