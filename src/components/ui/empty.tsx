import { motion } from 'motion/react'
import type * as React from 'react'

import { cn } from '#/lib/utils'

export function EmptyIllustrationSvg({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 120 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-24 select-none', className)}
      initial="hidden"
      animate="visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="empty-card-grad"
          x1="24"
          y1="18"
          x2="96"
          y2="78"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient
          id="empty-stroke-grad"
          x1="22"
          y1="16"
          x2="98"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      {/* Soft ambient base shadow */}
      <motion.ellipse
        cx="60"
        cy="82"
        rx="34"
        ry="5"
        fill="currentColor"
        className="text-slate-900/[0.05] dark:text-white/[0.05]"
        variants={{
          hidden: { scaleX: 0.6, opacity: 0 },
          visible: {
            scaleX: 1,
            opacity: 1,
            transition: { duration: 0.45, ease: 'easeOut' },
          },
        }}
      />

      {/* Back tilted sheet */}
      <motion.rect
        x="30"
        y="20"
        width="52"
        height="48"
        rx="10"
        transform="rotate(-6 30 20)"
        fill="currentColor"
        className="text-slate-900/[0.03] dark:text-white/[0.04]"
        stroke="currentColor"
        strokeOpacity="0.14"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        variants={{
          hidden: { opacity: 0, y: 6 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.35, ease: 'easeOut' },
          },
        }}
      />

      {/* Main folder / document card */}
      <motion.rect
        x="28"
        y="22"
        width="58"
        height="48"
        rx="11"
        fill="url(#empty-card-grad)"
        stroke="url(#empty-stroke-grad)"
        strokeWidth="1.8"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
          },
        }}
      />

      {/* Drawn content lines inside card */}
      <motion.path
        d="M39 36H64"
        stroke="#6366F1"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity="0.65"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: { delay: 0.2, duration: 0.45, ease: 'easeOut' },
          },
        }}
      />
      <motion.path
        d="M39 45H56"
        stroke="#6366F1"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity="0.4"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: { delay: 0.3, duration: 0.45, ease: 'easeOut' },
          },
        }}
      />
      <motion.path
        d="M39 54H49"
        stroke="#6366F1"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity="0.25"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: { delay: 0.38, duration: 0.4, ease: 'easeOut' },
          },
        }}
      />

      {/* Drawn magnifying glass badge */}
      <motion.g
        variants={{
          hidden: { scale: 0.75, opacity: 0 },
          visible: {
            scale: 1,
            opacity: 1,
            transition: {
              delay: 0.25,
              type: 'spring',
              stiffness: 320,
              damping: 20,
            },
          },
        }}
      >
        <circle cx="78" cy="56" r="13" className="fill-card" />
        <motion.circle
          cx="78"
          cy="56"
          r="10.5"
          fill="#EEF2FF"
          className="dark:fill-indigo-950/70"
          stroke="url(#empty-stroke-grad)"
          strokeWidth="2"
          variants={{
            hidden: { pathLength: 0 },
            visible: {
              pathLength: 1,
              transition: { delay: 0.32, duration: 0.55, ease: 'easeOut' },
            },
          }}
        />
        {/* Question/empty dash inside lens */}
        <motion.path
          d="M74.5 56H81.5"
          stroke="#6366F1"
          strokeWidth="2"
          strokeLinecap="round"
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: {
              pathLength: 1,
              opacity: 1,
              transition: { delay: 0.5, duration: 0.3 },
            },
          }}
        />
        {/* Magnifier handle */}
        <motion.path
          d="M86 64L93 71"
          stroke="#6366F1"
          strokeWidth="2.6"
          strokeLinecap="round"
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: {
              pathLength: 1,
              opacity: 1,
              transition: { delay: 0.45, duration: 0.35, ease: 'easeOut' },
            },
          }}
        />
      </motion.g>

      {/* Subtle drawn sparkle accent */}
      <motion.path
        d="M92 24V30M89 27H95"
        stroke="#A855F7"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeOpacity="0.55"
        variants={{
          hidden: { pathLength: 0, opacity: 0, scale: 0.6 },
          visible: {
            pathLength: 1,
            opacity: 1,
            scale: 1,
            transition: { delay: 0.4, duration: 0.35, ease: 'easeOut' },
          },
        }}
      />
      <motion.circle
        cx="21"
        cy="48"
        r="2"
        fill="#6366F1"
        fillOpacity="0.35"
        variants={{
          hidden: { scale: 0, opacity: 0 },
          visible: {
            scale: 1,
            opacity: 1,
            transition: { delay: 0.48, duration: 0.3 },
          },
        }}
      />
    </motion.svg>
  )
}

export interface EmptyStateProps extends React.ComponentProps<'div'> {
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-1.5 py-8' : 'gap-2 py-12',
        className,
      )}
      {...props}
    >
      <EmptyIllustrationSvg className={compact ? 'size-20' : 'size-24'} />
      <div className="text-foreground text-sm font-semibold">{title}</div>
      {description && <p className="text-muted-foreground max-w-[260px] text-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
