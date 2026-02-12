'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Download,
  Send,
  Edit,
  PenTool,
  Loader2,
  AlertCircle,
  X,
  Camera,
  Clock,
  User,
  Wrench,
  Mail,
  MessageCircle,
  CheckCircle,
  XCircle,
  Printer,
} from 'lucide-react'
import { formatOSNumber, formatDate, formatDateTime, formatCNPJ, formatPhone, cn } from '@/lib/utils'
import { OSStatusBadge } from '@/components/os/OSStatusBadge'
import Button from '@/components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  cnpj: string | null
  cpf: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
}

interface Tecnico {
  id: string
  name: string
  email: string
}

interface Foto {
  id: string
  mimeType: string
  nomeArquivo: string | null
  tamanho: number
  legenda: string | null
  equipmentIndex: number | null
  createdAt: string
}

interface Assinatura {
  id: string
  tipo: string
  nomeSignatario: string
  cpfSignatario: string | null
  cargoSignatario: string | null
  assinadoEm: string
}

interface Equipment {
  equipmentName: string
  serviceTypeNames: string[]
  periodicidade: string
  fabricante: string
  modelo: string
  numeroSerie: string
}

interface OSData {
  id: string
  osNumber: number
  status: string
  clienteId: string
  tecnicoId: string
  serviceDate: string
  horaInicio: string | null
  horaFim: string | null
  observations: string | null
  equipments: Equipment[]
  emailEnviadoEm: string | null
  whatsappEnviadoEm: string | null
  pdfConteudo: unknown
  createdAt: string
  updatedAt: string
  cliente: Cliente
  tecnico: Tecnico
  fotos: Foto[]
  assinaturas: Assinatura[]
}

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

// ─── Toast Component ──────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg shadow-lg border text-sm',
            toast.type === 'success' && 'bg-green-50 border-green-200 text-green-800',
            toast.type === 'error' && 'bg-red-50 border-red-200 text-red-800',
            toast.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-800'
          )}
        >
          {toast.type === 'success' && <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />}
          {toast.type === 'error' && <XCircle className="h-5 w-5 shrink-0 text-red-500" />}
          {toast.type === 'info' && <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} className="shrink-0 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Photo Modal ──────────────────────────────────────────────────────────────

function PhotoModal({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-dark-200 transition-colors"
      >
        <X className="h-8 w-8" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

// ─── Card Component ───────────────────────────────────────────────────────────

function Card({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('bg-white rounded-xl border border-dark-100 shadow-sm', className)}>
      <div className="flex items-center gap-2 px-6 py-4 border-b border-dark-100">
        {icon && <span className="text-primary">{icon}</span>}
        <h2 className="text-lg font-semibold text-dark-800">{title}</h2>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  )
}

// ─── Info Row Component ───────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 py-2">
      <span className="text-sm font-medium text-dark-400 sm:w-40 shrink-0">{label}</span>
      <span className="text-sm text-dark-800">{value}</span>
    </div>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function OSDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [os, setOs] = useState<OSData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; alt: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  let toastIdCounter = 0

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now() + (toastIdCounter++)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const fetchOS = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/os/${id}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao carregar OS')
      }
      const data = await res.json()
      setOs(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar OS')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOS()
  }, [fetchOS])

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleBaixarPdf = () => {
    window.open(`/api/os/${id}/pdf`, '_blank')
  }

  const handleEnviar = async () => {
    try {
      setActionLoading('send')
      const res = await fetch(`/api/os/${id}/send`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao enviar OS')
      }
      const results = await res.json()

      if (results.email?.success) {
        addToast('success', 'Email enviado com sucesso!')
      } else if (results.email?.error) {
        addToast('error', `Email: ${results.email.error}`)
      }

      if (results.whatsapp?.success) {
        addToast('success', 'WhatsApp enviado com sucesso!')
      } else if (results.whatsapp?.error) {
        addToast('error', `WhatsApp: ${results.whatsapp.error}`)
      }

      // Refresh data to update send timestamps
      fetchOS()
    } catch (err: any) {
      addToast('error', err.message || 'Erro ao enviar OS')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Loading State ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-dark-400">Carregando OS...</p>
        </div>
      </div>
    )
  }

  // ── Error State ─────────────────────────────────────────────────────────

  if (error || !os) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-dark-800">Erro ao carregar OS</h2>
            <p className="text-sm text-dark-400 mt-1">{error || 'OS nao encontrada'}</p>
          </div>
          <Link href="/os">
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
              Voltar para lista
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  const equipments: Equipment[] = Array.isArray(os.equipments) ? os.equipments : []
  const isDraft = os.status === 'DRAFT'
  const canSign = os.status !== 'COMPLETED' && os.status !== 'CANCELED'

  const getEquipmentPhotos = (index: number): Foto[] => {
    return os.fotos.filter((f) => f.equipmentIndex === index)
  }

  const generalPhotos = os.fotos.filter(
    (f) => f.equipmentIndex === null || f.equipmentIndex === undefined
  )

  const tecnicoSignature = os.assinaturas.find((a) => a.tipo === 'tecnico')
  const clienteSignature = os.assinaturas.find((a) => a.tipo === 'cliente')

  const clienteEndereco = [os.cliente.endereco, os.cliente.cidade, os.cliente.estado]
    .filter(Boolean)
    .join(', ')

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {selectedPhoto && (
        <PhotoModal
          src={selectedPhoto.src}
          alt={selectedPhoto.alt}
          onClose={() => setSelectedPhoto(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/os"
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border border-dark-200 hover:bg-dark-50 active:bg-dark-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-dark-600" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-dark-800 truncate">
            OS {formatOSNumber(os.osNumber)}
          </h1>
          <OSStatusBadge status={os.status} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          onClick={handleBaixarPdf}
          disabled={actionLoading !== null}
        >
          Baixar PDF
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Send className="h-4 w-4" />}
          onClick={handleEnviar}
          loading={actionLoading === 'send'}
          disabled={actionLoading !== null}
        >
          Enviar
        </Button>
        <Link href={`/os/${id}/etiqueta`}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Printer className="h-4 w-4" />}
            disabled={actionLoading !== null}
          >
            Etiqueta
          </Button>
        </Link>
        {isDraft && (
          <Link href={`/os/${id}/editar`}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit className="h-4 w-4" />}
              disabled={actionLoading !== null}
            >
              Editar
            </Button>
          </Link>
        )}
        {canSign && (
          <Link href={`/os/${id}/assinar`}>
            <Button
              variant="primary"
              size="sm"
              icon={<PenTool className="h-4 w-4" />}
              disabled={actionLoading !== null}
            >
              Assinar
            </Button>
          </Link>
        )}
      </div>

      {/* Dados do Cliente */}
      <Card title="Dados do Cliente" icon={<User className="h-5 w-5" />}>
        <div className="divide-y divide-dark-50">
          <InfoRow label="Razao Social" value={os.cliente.razaoSocial} />
          <InfoRow label="Nome Fantasia" value={os.cliente.nomeFantasia} />
          <InfoRow
            label="CNPJ"
            value={os.cliente.cnpj ? formatCNPJ(os.cliente.cnpj) : null}
          />
          <InfoRow label="Email" value={os.cliente.email} />
          <InfoRow
            label="Telefone"
            value={os.cliente.telefone ? formatPhone(os.cliente.telefone) : null}
          />
          <InfoRow label="Endereco" value={clienteEndereco || null} />
        </div>
      </Card>

      {/* Dados do Servico */}
      <Card title="Dados do Servico" icon={<Wrench className="h-5 w-5" />}>
        <div className="divide-y divide-dark-50">
          <InfoRow label="Tecnico" value={os.tecnico.name} />
          <InfoRow label="Data" value={formatDate(os.serviceDate)} />
          <InfoRow label="Horario Inicio" value={os.horaInicio || '-'} />
          <InfoRow label="Horario Fim" value={os.horaFim || '-'} />
          <InfoRow
            label="Observacoes"
            value={
              os.observations ? (
                <span className="whitespace-pre-wrap">{os.observations}</span>
              ) : (
                '-'
              )
            }
          />
        </div>
      </Card>

      {/* Equipamentos */}
      <Card title="Equipamentos" icon={<Wrench className="h-5 w-5" />}>
        {equipments.length === 0 ? (
          <p className="text-sm text-dark-400 py-2">Nenhum equipamento registrado.</p>
        ) : (
          <div className="space-y-4">
            {equipments.map((equip, index) => {
              const equipPhotos = getEquipmentPhotos(index)
              return (
                <div
                  key={index}
                  className="border border-dark-100 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-dark-800">
                      {index + 1}. {equip.equipmentName}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="text-dark-400">Servicos: </span>
                      <span className="text-dark-700">
                        {equip.serviceTypeNames?.join(', ') || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-dark-400">Periodicidade: </span>
                      <span className="text-dark-700">{equip.periodicidade || '-'}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">Fabricante: </span>
                      <span className="text-dark-700">{equip.fabricante || '-'}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">Modelo: </span>
                      <span className="text-dark-700">{equip.modelo || '-'}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">N. Serie: </span>
                      <span className="text-dark-700">{equip.numeroSerie || '-'}</span>
                    </div>
                  </div>
                  {equipPhotos.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-dark-400 mb-2">
                        Fotos do equipamento
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {equipPhotos.map((foto) => (
                          <button
                            key={foto.id}
                            onClick={() =>
                              setSelectedPhoto({
                                src: `/api/os/${id}/photos/${foto.id}`,
                                alt: foto.legenda || foto.nomeArquivo || 'Foto',
                              })
                            }
                            className="aspect-square rounded-lg overflow-hidden border border-dark-100 hover:border-primary transition-colors"
                          >
                            <img
                              src={`/api/os/${id}/photos/${foto.id}`}
                              alt={foto.legenda || foto.nomeArquivo || 'Foto'}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Fotos (general) */}
      <Card title="Fotos" icon={<Camera className="h-5 w-5" />}>
        {os.fotos.length === 0 ? (
          <p className="text-sm text-dark-400 py-2">Nenhuma foto registrada.</p>
        ) : generalPhotos.length === 0 ? (
          <p className="text-sm text-dark-400 py-2">
            Todas as fotos estao vinculadas a equipamentos acima.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {generalPhotos.map((foto) => (
              <button
                key={foto.id}
                onClick={() =>
                  setSelectedPhoto({
                    src: `/api/os/${id}/photos/${foto.id}`,
                    alt: foto.legenda || foto.nomeArquivo || 'Foto',
                  })
                }
                className="group relative aspect-square rounded-lg overflow-hidden border border-dark-100 hover:border-primary transition-colors"
              >
                <img
                  src={`/api/os/${id}/photos/${foto.id}`}
                  alt={foto.legenda || foto.nomeArquivo || 'Foto'}
                  className="w-full h-full object-cover"
                />
                {foto.legenda && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white truncate">{foto.legenda}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Assinaturas */}
      <Card title="Assinaturas" icon={<PenTool className="h-5 w-5" />}>
        {os.assinaturas.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-dark-400">Nenhuma assinatura registrada.</p>
            {canSign && (
              <Link href={`/os/${id}/assinar`}>
                <Button variant="primary" size="sm" className="mt-3">
                  Assinar agora
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Tecnico Signature */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-dark-700">Assinatura do Tecnico</h3>
              {tecnicoSignature ? (
                <div className="border border-dark-100 rounded-lg p-4 space-y-2">
                  <div className="bg-dark-50 rounded-lg p-3 flex items-center justify-center">
                    <img
                      src={`/api/os/${id}/signatures?tipo=tecnico`}
                      alt="Assinatura do tecnico"
                      className="max-h-24 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-dark-400">Nome: </span>
                      <span className="text-dark-800">{tecnicoSignature.nomeSignatario}</span>
                    </p>
                    {tecnicoSignature.cpfSignatario && (
                      <p>
                        <span className="text-dark-400">CPF: </span>
                        <span className="text-dark-800">{tecnicoSignature.cpfSignatario}</span>
                      </p>
                    )}
                    {tecnicoSignature.cargoSignatario && (
                      <p>
                        <span className="text-dark-400">Cargo: </span>
                        <span className="text-dark-800">{tecnicoSignature.cargoSignatario}</span>
                      </p>
                    )}
                    <p>
                      <span className="text-dark-400">Data: </span>
                      <span className="text-dark-800">
                        {formatDateTime(tecnicoSignature.assinadoEm)}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-dark-200 rounded-lg p-6 text-center">
                  <p className="text-sm text-dark-400">Pendente</p>
                </div>
              )}
            </div>

            {/* Cliente Signature */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-dark-700">Assinatura do Cliente</h3>
              {clienteSignature ? (
                <div className="border border-dark-100 rounded-lg p-4 space-y-2">
                  <div className="bg-dark-50 rounded-lg p-3 flex items-center justify-center">
                    <img
                      src={`/api/os/${id}/signatures?tipo=cliente`}
                      alt="Assinatura do cliente"
                      className="max-h-24 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-dark-400">Nome: </span>
                      <span className="text-dark-800">{clienteSignature.nomeSignatario}</span>
                    </p>
                    {clienteSignature.cpfSignatario && (
                      <p>
                        <span className="text-dark-400">CPF: </span>
                        <span className="text-dark-800">{clienteSignature.cpfSignatario}</span>
                      </p>
                    )}
                    {clienteSignature.cargoSignatario && (
                      <p>
                        <span className="text-dark-400">Cargo: </span>
                        <span className="text-dark-800">{clienteSignature.cargoSignatario}</span>
                      </p>
                    )}
                    <p>
                      <span className="text-dark-400">Data: </span>
                      <span className="text-dark-800">
                        {formatDateTime(clienteSignature.assinadoEm)}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-dark-200 rounded-lg p-6 text-center">
                  <p className="text-sm text-dark-400">Pendente</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Historico */}
      <Card title="Historico" icon={<Clock className="h-5 w-5" />}>
        <div className="divide-y divide-dark-50">
          <InfoRow label="Criado em" value={formatDateTime(os.createdAt)} />
          {os.emailEnviadoEm && (
            <div className="flex items-center gap-2 py-2">
              <Mail className="h-4 w-4 text-green-500" />
              <span className="text-sm text-dark-400">Email enviado em:</span>
              <span className="text-sm text-dark-800">
                {formatDateTime(os.emailEnviadoEm)}
              </span>
            </div>
          )}
          {os.whatsappEnviadoEm && (
            <div className="flex items-center gap-2 py-2">
              <MessageCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-dark-400">WhatsApp enviado em:</span>
              <span className="text-sm text-dark-800">
                {formatDateTime(os.whatsappEnviadoEm)}
              </span>
            </div>
          )}
          {!os.emailEnviadoEm && !os.whatsappEnviadoEm && (
            <p className="text-sm text-dark-400 py-2">Nenhum envio registrado.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
