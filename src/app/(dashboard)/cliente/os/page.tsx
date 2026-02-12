'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  FileText,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'
import { OSStatusBadge } from '@/components/os/OSStatusBadge'
import { formatOSNumber, formatDate, cn } from '@/lib/utils'

interface OSItem {
  id: string
  osNumber: number
  serviceDate: string
  status: string
  observations: string | null
  cliente: {
    id: string
    razaoSocial: string
    nomeFantasia: string | null
    cnpj: string
  }
  tecnico: {
    id: string
    name: string
  }
  _count: {
    fotos: number
    assinaturas: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface APIResponse {
  data: OSItem[]
  pagination: Pagination
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os Status' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PENDING_SIGNATURE', label: 'Aguardando Assinatura' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'CANCELED', label: 'Cancelada' },
]

export default function ClienteOSListPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OSItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchOrders = useCallback(
    async (page: number, searchQuery: string, status: string) => {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', '10')
        if (searchQuery.trim()) params.set('search', searchQuery.trim())
        if (status) params.set('status', status)

        const response = await fetch(`/api/os?${params.toString()}`)

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Erro ao carregar dados')
        }

        const result: APIResponse = await response.json()
        setOrders(result.data)
        setPagination(result.pagination)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar ordens de serviço'
        )
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  useEffect(() => {
    fetchOrders(pagination.page, search, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchOrders(1, value, statusFilter)
    }, 400)
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value)
    fetchOrders(1, search, value)
  }

  function handlePageChange(newPage: number) {
    fetchOrders(newPage, search, statusFilter)
  }

  async function handleDownloadPDF(id: string, osNumber: number) {
    try {
      const response = await fetch(`/api/os/${id}/pdf`)
      if (!response.ok) throw new Error('Erro ao baixar PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `OS-${formatOSNumber(osNumber)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao baixar PDF. Tente novamente.')
    }
    setOpenMenuId(null)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // --- Skeletons ---
  function renderTableSkeleton() {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex items-center gap-4 px-4 py-4 bg-white rounded-lg border border-dark-100"
          >
            <div className="h-4 w-20 bg-dark-100 rounded" />
            <div className="h-4 w-40 bg-dark-100 rounded flex-1" />
            <div className="h-4 w-24 bg-dark-100 rounded" />
            <div className="h-4 w-20 bg-dark-100 rounded" />
            <div className="h-4 w-12 bg-dark-100 rounded" />
            <div className="h-4 w-12 bg-dark-100 rounded" />
            <div className="h-5 w-24 bg-dark-100 rounded-full" />
            <div className="h-4 w-8 bg-dark-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  // --- Empty state ---
  function renderEmptyState() {
    return (
      <div className="bg-white rounded-xl border border-dark-100 p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-dark-50 rounded-full flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-dark-300" />
        </div>
        <h3 className="text-lg font-semibold text-dark-700 mb-1">
          Nenhuma OS encontrada
        </h3>
        <p className="text-sm text-dark-400 max-w-sm mx-auto">
          {search || statusFilter
            ? 'Nenhuma ordem de serviço corresponde aos filtros selecionados. Tente ajustar sua busca.'
            : 'Não há ordens de serviço vinculadas à sua conta no momento.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-dark-800">
          Minhas Ordens de Serviço
        </h1>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por número da OS ou observações..."
            className="block w-full rounded-lg border border-dark-200 bg-white pl-10 pr-4 py-2.5 text-sm text-dark-800 placeholder:text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-lg border border-dark-200 bg-white px-4 py-2.5 text-sm text-dark-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors sm:w-56"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        renderTableSkeleton()
      ) : orders.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Table (desktop) */}
          <div className="hidden lg:block bg-white rounded-xl border border-dark-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-100 bg-dark-50/50">
                    <th className="text-left px-4 py-3 font-semibold text-dark-600">
                      OS
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-dark-600">
                      Cliente
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-dark-600">
                      Técnico
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-dark-600">
                      Data
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-dark-600">
                      Fotos
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-dark-600">
                      Assinaturas
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-dark-600">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-dark-600">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {orders.map((os) => (
                    <tr
                      key={os.id}
                      className="hover:bg-dark-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-dark-800">
                          {formatOSNumber(os.osNumber)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-dark-800 font-medium">
                          {os.cliente.nomeFantasia || os.cliente.razaoSocial}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-dark-600">
                        {os.tecnico.name}
                      </td>
                      <td className="px-4 py-3 text-dark-600">
                        {formatDate(os.serviceDate)}
                      </td>
                      <td className="px-4 py-3 text-center text-dark-600">
                        {os._count.fotos}
                      </td>
                      <td className="px-4 py-3 text-center text-dark-600">
                        {os._count.assinaturas}
                      </td>
                      <td className="px-4 py-3">
                        <OSStatusBadge status={os.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block" ref={openMenuId === os.id ? menuRef : undefined}>
                          <button
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === os.id ? null : os.id
                              )
                            }
                            className="p-1.5 rounded-md hover:bg-dark-100 text-dark-500 hover:text-dark-700 transition-colors"
                            aria-label="Ações"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === os.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-dark-100 py-1 z-20">
                              <Link
                                href={`/cliente/os/${os.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                                onClick={() => setOpenMenuId(null)}
                              >
                                <Eye className="h-4 w-4" />
                                Ver detalhes
                              </Link>
                              <button
                                onClick={() =>
                                  handleDownloadPDF(os.id, os.osNumber)
                                }
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                              >
                                <Download className="h-4 w-4" />
                                Baixar PDF
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards (mobile / tablet) */}
          <div className="lg:hidden space-y-3">
            {orders.map((os) => (
              <Link
                key={os.id}
                href={`/cliente/os/${os.id}`}
                className="block bg-white rounded-xl border border-dark-100 p-4 active:bg-dark-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono font-semibold text-dark-800 text-sm">
                      OS {formatOSNumber(os.osNumber)}
                    </span>
                    <p className="text-dark-800 font-medium mt-0.5 truncate">
                      {os.cliente.nomeFantasia || os.cliente.razaoSocial}
                    </p>
                  </div>
                  <OSStatusBadge status={os.status} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-500">
                  <span>Técnico: {os.tecnico.name}</span>
                  <span>Data: {formatDate(os.serviceDate)}</span>
                  <span>Fotos: {os._count.fotos}</span>
                  <span>Assin.: {os._count.assinaturas}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
              <p className="text-sm text-dark-500 order-2 sm:order-1">
                {(pagination.page - 1) * pagination.limit + 1}
                {' - '}
                {Math.min(pagination.page * pagination.limit, pagination.total)}
                {' de '}
                <span className="font-medium">{pagination.total}</span>
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-dark-200 text-dark-600 hover:bg-dark-50 active:bg-dark-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1
                  )
                    .filter((p) => {
                      const current = pagination.page
                      return (
                        p === 1 ||
                        p === pagination.totalPages ||
                        Math.abs(p - current) <= 1
                      )
                    })
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push('ellipsis')
                      }
                      acc.push(p)
                      return acc
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-dark-400"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => handlePageChange(item as number)}
                          className={cn(
                            'h-10 min-w-[2.5rem] px-2 rounded-lg text-sm font-medium transition-colors',
                            pagination.page === item
                              ? 'bg-primary text-dark-900'
                              : 'text-dark-600 hover:bg-dark-50'
                          )}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-dark-200 text-dark-600 hover:bg-dark-50 active:bg-dark-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
