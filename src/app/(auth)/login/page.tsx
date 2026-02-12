'use client'

import { useState, useEffect, useRef, FormEvent, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'

/* ───────────────────────────── Partículas de radiação ───────────────────────────── */
interface Particle {
  x: number
  y: number
  size: number
  opacity: number
  color: string
  vx: number
  vy: number
  life: number
  maxLife: number
  type: 'dot' | 'ring' | 'spark'
}

const RAD_COLORS = [
  '#D1B829',   // brand gold
  '#E8D44D',   // light gold
  '#F5E97D',   // pale gold
  '#22D3EE',   // cyan-400
  '#06B6D4',   // cyan-500
  '#67E8F9',   // cyan-300
  '#A3E635',   // lime-400
  '#84CC16',   // lime-500
]

function RadiationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const starsRef = useRef<{ x: number; y: number; size: number; twinkle: number; speed: number }[]>([])
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Estrelas de fundo
    starsRef.current = []
    for (let i = 0; i < 200; i++) {
      starsRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.8 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.015,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Desenha estrelas
      for (const s of starsRef.current) {
        s.twinkle += s.speed
        const alpha = 0.3 + Math.sin(s.twinkle) * 0.3
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }

      // Desenha e atualiza partículas
      const particles = particlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life--
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.98
        p.vy *= 0.98
        const progress = p.life / p.maxLife
        p.opacity = progress * 0.9

        ctx.save()
        ctx.globalAlpha = p.opacity

        if (p.type === 'dot') {
          // Partícula com glow
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
          gradient.addColorStop(0, p.color)
          gradient.addColorStop(0.4, p.color + '80')
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
          ctx.fill()
          // Centro brilhante
          ctx.fillStyle = '#fff'
          ctx.globalAlpha = p.opacity * 0.8
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.type === 'ring') {
          // Anel expandindo (como onda de radiação)
          const ringSize = p.size * (1 + (1 - progress) * 3)
          ctx.strokeStyle = p.color
          ctx.lineWidth = 1.5 * progress
          ctx.beginPath()
          ctx.arc(p.x, p.y, ringSize, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          // Faísca - linha com glow
          const angle = Math.atan2(p.vy, p.vx)
          const len = p.size * 3 * progress
          ctx.strokeStyle = p.color
          ctx.lineWidth = 1.5
          ctx.shadowColor = p.color
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.moveTo(p.x - Math.cos(angle) * len, p.y - Math.sin(angle) * len)
          ctx.lineTo(p.x + Math.cos(angle) * len, p.y + Math.sin(angle) * len)
          ctx.stroke()
        }

        ctx.restore()

        if (p.life <= 0) particles.splice(i, 1)
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const spawnParticles = useCallback((x: number, y: number) => {
    const count = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const types: Particle['type'][] = ['dot', 'dot', 'dot', 'ring', 'spark']
      const type = types[Math.floor(Math.random() * types.length)]
      const maxLife = 40 + Math.random() * 60
      const angle = Math.random() * Math.PI * 2
      const speed = 0.5 + Math.random() * 2.5
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        size: type === 'ring' ? 3 + Math.random() * 5 : type === 'spark' ? 3 + Math.random() * 5 : 1.5 + Math.random() * 3,
        opacity: 0.9,
        type,
        color: RAD_COLORS[Math.floor(Math.random() * RAD_COLORS.length)],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
      })
    }
  }, [])

  useEffect(() => {
    let lastSpawn = 0
    const handleMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      const now = Date.now()
      if (now - lastSpawn > 40) {
        spawnParticles(e.clientX, e.clientY)
        lastSpawn = now
      }
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [spawnParticles])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}

/* ───────────────────────── Nebulosas e glow de fundo ───────────────────────── */
function CosmicGlow() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Nebulosa dourada principal */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15 blur-[140px] animate-pulse"
        style={{
          background: 'radial-gradient(circle, #D1B829, transparent)',
          top: '-10%',
          left: '-8%',
          animationDuration: '6s',
        }}
      />
      {/* Nebulosa cyan */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-[120px] animate-pulse"
        style={{
          background: 'radial-gradient(circle, #22D3EE, transparent)',
          bottom: '-5%',
          right: '-8%',
          animationDuration: '8s',
          animationDelay: '2s',
        }}
      />
      {/* Nebulosa verde sutil */}
      <div
        className="absolute w-[350px] h-[350px] rounded-full opacity-8 blur-[100px] animate-pulse"
        style={{
          background: 'radial-gradient(circle, #84CC16, transparent)',
          top: '60%',
          left: '55%',
          animationDuration: '7s',
          animationDelay: '1s',
        }}
      />
      {/* Nebulosa dourada secundária */}
      <div
        className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[90px] animate-pulse"
        style={{
          background: 'radial-gradient(circle, #E8D44D, transparent)',
          top: '15%',
          right: '15%',
          animationDuration: '5s',
          animationDelay: '3s',
        }}
      />
    </div>
  )
}

/* ───────────────── Símbolo de radiação animado de fundo ───────────────── */
function RadiationSymbol() {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
      <svg
        viewBox="0 0 200 200"
        className="w-[500px] h-[500px] opacity-[0.025]"
        style={{ animation: 'spin 60s linear infinite' }}
      >
        {/* Trefoil radiation symbol */}
        {[0, 120, 240].map((angle) => (
          <path
            key={angle}
            d="M100,100 L100,30 A70,70 0 0,1 160.62,135 L100,100"
            fill="#D1B829"
            transform={`rotate(${angle} 100 100)`}
          />
        ))}
        <circle cx="100" cy="100" r="18" fill="#D1B829" />
        <circle cx="100" cy="100" r="10" fill="#000" />
      </svg>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

/* ──────────────── Grid holográfico de fundo ──────────────── */
function HoloGrid() {
  return (
    <div
      className="fixed inset-0 pointer-events-none opacity-[0.04]"
      style={{
        zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(209,184,41,0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(209,184,41,0.3) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
      }}
    />
  )
}

/* ────────────────────────────── Login Page ────────────────────────────── */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos.')
      return
    }

    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Credenciais invalidas. Verifique seu e-mail e senha.')
      } else if (result?.ok) {
        router.push('/os')
        router.refresh()
      }
    } catch {
      setError('Erro ao conectar com o servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 20% 50%, #0a0f1a 0%, #050508 50%, #02060e 100%)',
      }}
    >
      <CosmicGlow />
      <HoloGrid />
      <RadiationSymbol />
      <RadiationCanvas />

      {/* Card de login */}
      <div className="w-full max-w-md relative" style={{ zIndex: 2 }}>
        <div
          className="relative rounded-2xl p-5 sm:p-8 shadow-2xl overflow-hidden"
          style={{
            background: 'rgba(10, 15, 26, 0.75)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(209, 184, 41, 0.12)',
          }}
        >
          {/* Borda superior brilhante animada */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div
              className="h-full w-[200%]"
              style={{
                background: 'linear-gradient(90deg, transparent, #D1B829, #22D3EE, #D1B829, transparent)',
                animation: 'shimmer 4s linear infinite',
              }}
            />
          </div>

          {/* Glow de canto */}
          <div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-[60px]"
            style={{ background: '#D1B829' }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full opacity-10 blur-[60px]"
            style={{ background: '#22D3EE' }}
          />

          {/* Logo */}
          <div className="flex justify-center mb-6 relative">
            <div className="relative">
              {/* Glow atrás da logo */}
              <div
                className="absolute -inset-4 rounded-2xl opacity-30 blur-xl animate-pulse"
                style={{
                  background: 'radial-gradient(circle, #D1B829, transparent)',
                  animationDuration: '3s',
                }}
              />
              <Image
                src="/logos/logo-amarela-fundo-escuro.jpeg"
                alt="Omegarad Logo"
                width={200}
                height={80}
                className="rounded-xl relative w-[160px] sm:w-[200px] h-auto"
                priority
              />
            </div>
          </div>

          {/* Titulo */}
          <h1 className="text-xl font-bold text-center text-white mb-1 tracking-wide">
            Portal de Ordens de Servico
          </h1>
          <p className="text-sm text-center mb-8" style={{ color: 'rgba(209, 184, 41, 0.5)' }}>
            Faca login para acessar o sistema
          </p>

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-6 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(209, 184, 41, 0.7)' }}>
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                disabled={loading}
                className="block w-full rounded-lg px-4 py-3 text-sm text-white transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(209, 184, 41, 0.15)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(209, 184, 41, 0.4)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(209, 184, 41, 0.1), 0 0 20px rgba(209, 184, 41, 0.05)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(209, 184, 41, 0.15)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(209, 184, 41, 0.7)' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  className="block w-full rounded-lg px-4 py-3 pr-12 text-sm text-white transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(209, 184, 41, 0.15)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(209, 184, 41, 0.4)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(209, 184, 41, 0.1), 0 0 20px rgba(209, 184, 41, 0.05)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(209, 184, 41, 0.15)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors duration-200 p-2"
                  style={{ color: 'rgba(209, 184, 41, 0.4)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(209, 184, 41, 0.8)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(209, 184, 41, 0.4)')}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-3 text-sm transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{
                background: loading
                  ? 'rgba(209, 184, 41, 0.2)'
                  : 'linear-gradient(135deg, #D1B829, #b89e1c)',
                color: loading ? '#D1B829' : '#0a0a0a',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(209, 184, 41, 0.25), 0 0 60px rgba(209, 184, 41, 0.08)',
              }}
            >
              {/* Hover glow effect */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(135deg, #E8D44D, #D1B829)',
                }}
              />
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </span>
            </button>
          </form>

          {/* Indicadores de radiação decorativos */}
          <div className="flex items-center justify-center gap-2 mt-6 mb-2">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(209, 184, 41, 0.2))' }} />
            <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ fill: 'rgba(209, 184, 41, 0.25)' }}>
              {[0, 120, 240].map((angle) => (
                <path
                  key={angle}
                  d="M12,12 L12,4 A8,8 0 0,1 18.93,16 L12,12"
                  transform={`rotate(${angle} 12 12)`}
                />
              ))}
              <circle cx="12" cy="12" r="2.5" />
              <circle cx="12" cy="12" r="1.5" fill="#0a0f1a" />
            </svg>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(209, 184, 41, 0.2))' }} />
          </div>

          {/* Footer */}
          <p className="text-xs text-center" style={{ color: 'rgba(209, 184, 41, 0.25)' }}>
            Omegarad - Fisica Medica e Radioprotecao
          </p>
        </div>
      </div>

      {/* CSS global para animações */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        input::placeholder {
          color: rgba(255, 255, 255, 0.2) !important;
        }
      `}</style>
    </div>
  )
}
