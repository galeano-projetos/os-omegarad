'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const adminNavItems: NavItem[] = [
  {
    label: 'Ordens de Serviço',
    href: '/os',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    label: 'Clientes',
    href: '/clientes',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'Configurações',
    href: '/config',
    icon: <Settings className="h-5 w-5" />,
  },
]

const clienteNavItems: NavItem[] = [
  {
    label: 'Minhas Ordens de Serviço',
    href: '/cliente/os',
    icon: <ClipboardList className="h-5 w-5" />,
  },
]

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].substring(0, 2).toUpperCase()
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    colaborador: 'Colaborador',
    tecnico: 'Técnico',
    cliente: 'Cliente',
  }
  return labels[role] || role
}

function getPageTitle(pathname: string): string {
  if (pathname === '/os') return 'Ordens de Serviço'
  if (pathname.startsWith('/os/nova')) return 'Nova Ordem de Serviço'
  if (pathname.startsWith('/os/')) return 'Detalhes da OS'
  if (pathname === '/clientes') return 'Clientes'
  if (pathname.startsWith('/clientes/')) return 'Detalhes do Cliente'
  if (pathname === '/config') return 'Configurações'
  if (pathname === '/cliente/os') return 'Minhas Ordens de Serviço'
  if (pathname.startsWith('/cliente/os/')) return 'Detalhes da OS'
  return 'Dashboard'
}

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [{ label: 'Início' }]

  if (pathname.startsWith('/os')) {
    crumbs.push({ label: 'Ordens de Serviço', href: '/os' })
    if (pathname === '/os/nova') {
      crumbs.push({ label: 'Nova OS' })
    } else if (pathname !== '/os') {
      crumbs.push({ label: 'Detalhes' })
    }
  } else if (pathname.startsWith('/clientes')) {
    crumbs.push({ label: 'Clientes', href: '/clientes' })
    if (pathname !== '/clientes') {
      crumbs.push({ label: 'Detalhes' })
    }
  } else if (pathname.startsWith('/config')) {
    crumbs.push({ label: 'Configurações' })
  } else if (pathname.startsWith('/cliente/os')) {
    crumbs.push({ label: 'Minhas OS', href: '/cliente/os' })
    if (pathname !== '/cliente/os') {
      crumbs.push({ label: 'Detalhes' })
    }
  }

  return crumbs
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Close sidebar on ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSidebarOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-dark-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session) {
    return null
  }

  const user = session.user
  const isCliente = user.role === 'cliente'
  const navItems = isCliente ? clienteNavItems : adminNavItems
  const pageTitle = getPageTitle(pathname)
  const breadcrumbs = getBreadcrumbs(pathname)

  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-dark-900 flex flex-col transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-dark-700/50">
          <Link href={isCliente ? '/cliente/os' : '/os'} className="block">
            <Image
              src="/logos/logo-branca-fundo-escuro.jpeg"
              alt="Omegarad"
              width={140}
              height={56}
              className="rounded"
              priority
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-dark-300 hover:text-white p-1 rounded-md transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-dark-700/60 text-white border-l-[3px] border-primary pl-[9px]'
                    : 'text-dark-300 hover:bg-dark-700/40 hover:text-white border-l-[3px] border-transparent pl-[9px]'
                )}
              >
                <span
                  className={cn(
                    'shrink-0',
                    isActive ? 'text-primary' : 'text-dark-400'
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-dark-700/50 px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-dark-400 truncate">
                {getRoleLabel(user.role)}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full text-dark-400 hover:text-red-400 text-sm py-1.5 px-1 rounded transition-colors duration-150"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-dark-100 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {/* Hamburger */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-dark-500 hover:text-dark-800 active:text-dark-900 p-2 -ml-2 rounded-lg transition-colors"
                aria-label="Abrir menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <span key={index} className="flex items-center gap-1.5">
                    {index > 0 && (
                      <ChevronRight className="h-3.5 w-3.5 text-dark-300" />
                    )}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-dark-400 hover:text-dark-700 transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          index === breadcrumbs.length - 1
                            ? 'text-dark-800 font-medium'
                            : 'text-dark-400'
                        )}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </span>
                ))}
              </div>

              {/* Mobile title */}
              <h1 className="sm:hidden text-base font-semibold text-dark-800 truncate">
                {pageTitle}
              </h1>
            </div>

            {/* User avatar (top bar) */}
            <div className="flex items-center gap-3">
              <span className="hidden md:block text-sm text-dark-500">
                {user.name}
              </span>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-dark-900 text-xs font-bold">
                {getInitials(user.name)}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
