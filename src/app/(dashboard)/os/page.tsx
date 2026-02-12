'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Search,
  FileText,
  Send,
  Trash2,
  Edit,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
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

export default function OSListPage() {
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
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
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

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const response = await fetch(`/api/os/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Erro ao excluir OS')
      }
      setConfirmDeleteId(null)
      setOpenMenuId(null)
      fetchOrders(pagination.page, search, statusFilter)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(null)
    }
  }

  async function handleGeneratePDF(id: string) {
    try {
      const response = await fetch(`/api/os/${id}/pdf`)
      if (!response.ok) throw new Error('Erro ao gerar PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `os-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao gerar PDF. Tente novamente.')
    }
    setOpenMenuId(null)
  }

  async function handleSend(id: string) {
    try {
      const response = await fetch(`/api/os/${id}/send`, { method: 'POST' })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Erro ao enviar OS')
      }
      fetchOrders(pagination.page, search, statusFilter)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar')
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
        <p className="text-sm text-dark-400 mb-6 max-w-sm mx-auto">
          {search || statusFilter
            ? 'Nenhuma ordem de serviço corresponde aos filtros selecionados. Tente ajustar sua busca.'
            : 'Ainda não há ordens de serviço cadastradas. Crie a primeira OS para começar.'}
        </p>
        {!search && !statusFilter && (
          <Link
            href="/os/nova"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-dark-900 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova OS
          </Link>
        )}
      </div>
    )
  }

  // --- Confirm delete modal ---
  function renderDeleteConfirm() {
    if (!confirmDeleteId) return null
    const os = orders.find((o) => o.id === confirmDeleteId)
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
          <h3 className="text-lg font-semibold text-dark-800 mb-2">
            Excluir Ordem de Serviço
          </h3>
          <p className="text-sm text-dark-500 mb-6">
            Tem certeza que deseja excluir a OS{' '}
            <span className="font-mono font-semibold">
              {os ? formatOSNumber(os.osNumber) : ''}
            </span>
            ? Esta ação não pode ser desfeita.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setConfirmDeleteId(null)}
              disabled={!!deleting}
              className="px-4 py-2 text-sm font-medium text-dark-600 hover:bg-dark-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(confirmDeleteId)}
              disabled={!!deleting}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleting === confirmDeleteId ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-dark-800">
          Ordens de Serviço
        </h1>
        <Link
          href="/os/nova"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-dark-900 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nova OS
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por cliente, CNPJ ou número da OS..."
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
                            className="p-2 rounded-md hover:bg-dark-100 text-dark-500 hover:text-dark-700 transition-colors"
                            aria-label="Ações"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === os.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-dark-100 py-1 z-20">
                              <Link
                                href={`/os/${os.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                                onClick={() => setOpenMenuId(null)}
                              >
                                <Eye className="h-4 w-4" />
                                Ver detalhes
                              </Link>
                              {os.status === 'DRAFT' && (
                                <Link
                                  href={`/os/${os.id}/editar`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  <Edit className="h-4 w-4" />
                                  Editar
                                </Link>
                              )}
                              <button
                                onClick={() => handleGeneratePDF(os.id)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                              >
                                <FileText className="h-4 w-4" />
                                Gerar PDF
                              </button>
                              <button
                                onClick={() => handleSend(os.id)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                              >
                                <Send className="h-4 w-4" />
                                Enviar
                              </button>
                              <hr className="my-1 border-dark-100" />
                              <button
                                onClick={() => {
                                  setConfirmDeleteId(os.id)
                                  setOpenMenuId(null)
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                Excluir
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
                href={`/os/${os.id}`}
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
                              : 'text-dark-600 hover:bg-dark-50 active:bg-dark-100'
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

      {/* Delete confirmation modal */}
      {renderDeleteConfirm()}
    </div>
  )
}
