import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'

import { LoginForm } from '#/components/login-form'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginHeroIllustration() {
  return (
    <svg
      viewBox="0 0 800 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block size-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="800" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="48%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        <radialGradient id="glowIndigo" cx="0.5" cy="0.42" r="0.48">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.42" />
          <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="glowTeal" cx="0.72" cy="0.26" r="0.35">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>

        <linearGradient
          id="phoneBody"
          x1="250"
          y1="190"
          x2="550"
          y2="690"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>

        <linearGradient
          id="screenSurface"
          x1="268"
          y1="210"
          x2="532"
          y2="670"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        <linearGradient id="cardGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>

        <linearGradient id="accentEmerald" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        <linearGradient id="accentAmber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>

        <linearGradient id="accentCoral" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="800" height="900" fill="url(#bgGrad)" />
      <motion.rect
        width="800"
        height="900"
        fill="url(#glowIndigo)"
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.rect
        width="800"
        height="900"
        fill="url(#glowTeal)"
        animate={{ opacity: [0.65, 1, 0.65] }}
        transition={{
          duration: 6,
          delay: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Subtle Geometric Grid Lines */}
      <g stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1">
        <line x1="120" y1="0" x2="120" y2="900" />
        <line x1="260" y1="0" x2="260" y2="900" />
        <line x1="400" y1="0" x2="400" y2="900" />
        <line x1="540" y1="0" x2="540" y2="900" />
        <line x1="680" y1="0" x2="680" y2="900" />
        <line x1="0" y1="160" x2="800" y2="160" />
        <line x1="0" y1="320" x2="800" y2="320" />
        <line x1="0" y1="480" x2="800" y2="480" />
        <line x1="0" y1="640" x2="800" y2="640" />
        <line x1="0" y1="800" x2="800" y2="800" />
      </g>

      {/* Concentric Orbit Rings */}
      <motion.circle
        cx="400"
        cy="440"
        r="270"
        stroke="#818cf8"
        strokeOpacity="0.22"
        strokeWidth="1.5"
        strokeDasharray="8 10"
        style={{ transformOrigin: '400px 440px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 42, repeat: Infinity, ease: 'linear' }}
      />
      <motion.circle
        cx="400"
        cy="440"
        r="205"
        stroke="#38bdf8"
        strokeOpacity="0.24"
        strokeWidth="1.5"
        strokeDasharray="12 14"
        style={{ transformOrigin: '400px 440px' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
      />

      {/* Central Smartphone Device */}
      <motion.g
        initial={{ y: -10 }}
        animate={{ y: [-14, -4, -14] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Shadow */}
        <rect x="268" y="204" width="264" height="488" rx="44" fill="#020617" fillOpacity="0.55" />
        {/* Outer Frame */}
        <rect x="260" y="190" width="264" height="488" rx="42" fill="url(#phoneBody)" />
        {/* Inner Screen */}
        <rect x="272" y="202" width="240" height="464" rx="34" fill="url(#screenSurface)" />
        {/* Dynamic Island */}
        <rect x="354" y="216" width="76" height="18" rx="9" fill="#020617" />
        <circle cx="416" cy="225" r="4" fill="#1e293b" />

        {/* Screen Content: Diagnostics & ERP Dashboard */}
        {/* Status Pill */}
        <rect
          x="294"
          y="254"
          width="196"
          height="46"
          rx="14"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <circle cx="316" cy="277" r="9" fill="url(#accentEmerald)" />
        <path
          d="M312 277l3 3 5-6"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="334" y="268" width="92" height="8" rx="4" fill="#e2e8f0" />
        <rect x="334" y="282" width="60" height="6" rx="3" fill="#64748b" />

        {/* Analytics Chart Card inside Phone */}
        <rect
          x="294"
          y="314"
          width="196"
          height="142"
          rx="18"
          fill="#0f172a"
          stroke="#312e81"
          strokeWidth="1.5"
        />
        <rect x="312" y="332" width="74" height="8" rx="4" fill="#94a3b8" />
        <rect x="312" y="348" width="112" height="14" rx="5" fill="#f8fafc" />

        {/* Animated Bar chart columns */}
        <motion.rect
          x="314"
          y="408"
          width="18"
          height="30"
          rx="5"
          fill="#4f46e5"
          style={{ transformOrigin: '323px 438px' }}
          animate={{ scaleY: [1, 1.25, 0.9, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.rect
          x="342"
          y="394"
          width="18"
          height="44"
          rx="5"
          fill="#6366f1"
          style={{ transformOrigin: '351px 438px' }}
          animate={{ scaleY: [1, 0.85, 1.18, 1] }}
          transition={{
            duration: 2.8,
            delay: 0.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.rect
          x="370"
          y="382"
          width="18"
          height="56"
          rx="5"
          fill="#38bdf8"
          style={{ transformOrigin: '379px 438px' }}
          animate={{ scaleY: [1, 1.16, 0.88, 1] }}
          transition={{
            duration: 2.5,
            delay: 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.rect
          x="398"
          y="398"
          width="18"
          height="40"
          rx="5"
          fill="#818cf8"
          style={{ transformOrigin: '407px 438px' }}
          animate={{ scaleY: [1, 1.28, 0.92, 1] }}
          transition={{
            duration: 3,
            delay: 0.15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.rect
          x="426"
          y="370"
          width="18"
          height="68"
          rx="5"
          fill="url(#accentEmerald)"
          style={{ transformOrigin: '435px 438px' }}
          animate={{ scaleY: [1, 0.9, 1.14, 1] }}
          transition={{
            duration: 2.7,
            delay: 0.35,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.rect
          x="454"
          y="358"
          width="18"
          height="80"
          rx="5"
          fill="url(#accentAmber)"
          style={{ transformOrigin: '463px 438px' }}
          animate={{ scaleY: [1, 1.12, 0.92, 1] }}
          transition={{
            duration: 2.9,
            delay: 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Repair & Parts Module Cards inside Phone */}
        <rect
          x="294"
          y="472"
          width="92"
          height="92"
          rx="16"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <circle cx="340" cy="504" r="16" fill="#0f172a" />
        <path
          d="M333 497l14 14M347 497l-14 14"
          stroke="#2dd4bf"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <rect x="312" y="532" width="56" height="7" rx="3.5" fill="#cbd5e1" />
        <rect x="320" y="545" width="40" height="6" rx="3" fill="#64748b" />

        <rect
          x="398"
          y="472"
          width="92"
          height="92"
          rx="16"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <circle cx="444" cy="504" r="16" fill="#0f172a" />
        <path d="M444 493l-5 11h8l-3 10 9-13h-8l4-8z" fill="#fbbf24" />
        <rect x="416" y="532" width="56" height="7" rx="3.5" fill="#cbd5e1" />
        <rect x="424" y="545" width="40" height="6" rx="3" fill="#64748b" />

        {/* Bottom Action Bar inside Phone */}
        <rect x="294" y="580" width="196" height="50" rx="14" fill="#4f46e5" />
        <rect x="342" y="601" width="100" height="8" rx="4" fill="#ffffff" />
      </motion.g>

      {/* Floating Left Card: Ustaxona (Repair Tool Badge) */}
      <motion.g
        initial={{ x: 96, y: 230 }}
        animate={{ x: 96, y: [230, 218, 230] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect
          width="190"
          height="96"
          rx="22"
          fill="url(#cardGlass)"
          stroke="#ffffff"
          strokeOpacity="0.2"
          strokeWidth="1.5"
        />
        <rect x="18" y="20" width="56" height="56" rx="16" fill="#0f172a" fillOpacity="0.7" />
        {/* Crossed Wrench & Screwdriver SVG */}
        <path d="M36 38L56 58" stroke="#14b8a6" strokeWidth="6" strokeLinecap="round" />
        <path d="M56 38L36 58" stroke="#fb7185" strokeWidth="6" strokeLinecap="round" />
        <circle cx="46" cy="48" r="4" fill="#ffffff" />
        <rect x="88" y="28" width="76" height="9" rx="4.5" fill="#ffffff" />
        <rect x="88" y="45" width="54" height="7" rx="3.5" fill="#94a3b8" />
        <rect x="88" y="60" width="64" height="8" rx="4" fill="#34d399" />
      </motion.g>

      {/* Floating Right Top Card: Ehtiyot qismlar & Ombor */}
      <motion.g
        initial={{ x: 508, y: 185 }}
        animate={{ x: 508, y: [185, 197, 185] }}
        transition={{
          duration: 4.3,
          delay: 0.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <rect
          width="200"
          height="104"
          rx="22"
          fill="url(#cardGlass)"
          stroke="#ffffff"
          strokeOpacity="0.2"
          strokeWidth="1.5"
        />
        <rect x="20" y="22" width="60" height="60" rx="18" fill="#0f172a" fillOpacity="0.7" />
        {/* Isometric Cube */}
        <path d="M50 32L68 42L50 52L32 42L50 32Z" fill="#fbbf24" />
        <path d="M32 42L50 52V72L32 62V42Z" fill="#f59e0b" />
        <path d="M68 42L50 52V72L68 62V42Z" fill="#8b5cf6" />
        <rect x="94" y="30" width="84" height="9" rx="4.5" fill="#ffffff" />
        <rect x="94" y="47" width="62" height="7" rx="3.5" fill="#94a3b8" />
        <rect x="94" y="63" width="72" height="8" rx="4" fill="#38bdf8" />
      </motion.g>

      {/* Floating Right Bottom Card: Savdo kassasi & Valyuta */}
      <motion.g
        initial={{ x: 500, y: 520 }}
        animate={{ x: 500, y: [520, 508, 520] }}
        transition={{
          duration: 4.1,
          delay: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <rect
          width="210"
          height="108"
          rx="22"
          fill="url(#cardGlass)"
          stroke="#ffffff"
          strokeOpacity="0.2"
          strokeWidth="1.5"
        />
        <circle cx="52" cy="54" r="28" fill="url(#accentEmerald)" />
        <path
          d="M42 55l7 7 14-15"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="94" y="32" width="90" height="9" rx="4.5" fill="#ffffff" />
        <rect x="94" y="49" width="70" height="13" rx="5" fill="#34d399" />
        <rect x="94" y="70" width="56" height="7" rx="3.5" fill="#cbd5e1" />
      </motion.g>

      {/* Floating Left Bottom Card: Analitika & Foyda */}
      <motion.g
        initial={{ x: 92, y: 535 }}
        animate={{ x: 92, y: [535, 547, 535] }}
        transition={{
          duration: 4.5,
          delay: 0.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <rect
          width="196"
          height="100"
          rx="22"
          fill="url(#cardGlass)"
          stroke="#ffffff"
          strokeOpacity="0.2"
          strokeWidth="1.5"
        />
        <rect x="20" y="24" width="12" height="52" rx="6" fill="url(#accentCoral)" />
        <rect x="38" y="38" width="12" height="38" rx="6" fill="url(#accentAmber)" />
        <rect x="56" y="18" width="12" height="58" rx="6" fill="url(#accentEmerald)" />
        <rect x="86" y="30" width="86" height="9" rx="4.5" fill="#ffffff" />
        <rect x="86" y="47" width="68" height="12" rx="5" fill="#fbbf24" />
        <rect x="86" y="66" width="52" height="7" rx="3.5" fill="#94a3b8" />
      </motion.g>
    </svg>
  )
}

function LoginPage() {
  return (
    <div className="bg-background grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2.5 font-bold">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl shadow-xs">
              <svg viewBox="0 0 32 32" className="size-5" fill="none">
                <path
                  d="M8 10L22 24"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M22 10L8 24"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  opacity="0.75"
                />
                <circle cx="15" cy="17" r="2.5" fill="currentColor" />
              </svg>
            </div>
            <span className="text-base font-extrabold tracking-tight">Mobile Fix</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>

      <div
        className="relative hidden min-h-svh overflow-hidden lg:block"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 48%, #0f172a 100%)',
        }}
      >
        <LoginHeroIllustration />
      </div>
    </div>
  )
}
