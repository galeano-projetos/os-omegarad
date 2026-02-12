'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SignatureCanvas from 'react-signature-canvas'
import {
  ArrowLeft,
  PenTool,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  RotateCcw,
  Save,
} from 'lucide-react'
import { formatOSNumber, formatDate, cn } from '@/lib/utils'
import { OSStatusBadge } from '@/components/os/OSStatusBadge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tecnico {
  id: string
  name: string
  email: string
}

interface Cliente {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  cnpj: string | null
}

interface Assinatura {
  id: string
  tipo: string
  nomeSignatario: string
  cpfSignatario: string | null
  cargoSignatario: string | null
  assinadoEm: string
}

interface OSData {
  id: string
  osNumber: number
  status: string
  serviceDate: string
  cliente: Cliente
  tecnico: Tecnico
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

// ─── Signature Section ────────────────────────────────────────────────────────

interface SignatureSectionProps {
  title: string
  tipo: 'tecnico' | 'cliente'
  existingSignature: Assinatura | undefined
  osId: string
  onSaved: () => void
  addToast: (type: Toast['type'], message: string) => void
}

function SignatureSection({
  title,
  tipo,
  existingSignature,
  osId,
  onSaved,
  addToast,
}: SignatureSectionProps) {
  const sigRef = useRef<SignatureCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [cargo, setCargo] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Resize canvas to match container width
  useEffect(() => {
    const resizeCanvas = () => {
      if (sigRef.current && containerRef.current) {
        const canvas = sigRef.current.getCanvas()
        const container = containerRef.current
        const rect = container.getBoundingClientRect()
        // Only resize if size actually changed
        const targetH = window.innerWidth < 640 ? 160 : 200
        if (canvas.width !== Math.floor(rect.width) || canvas.height !== targetH) {
          sigRef.current.clear()
          canvas.width = Math.floor(rect.width)
          canvas.height = targetH
        }
      }
    }

    // small delay to let container mount
    const timer = setTimeout(resizeCanvas, 100)
    window.addEventListener('resize', resizeCanvas)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [existingSignature])

  const handleClear = () => {
    sigRef.current?.clear()
  }

  const handleSave = async () => {
    const newErrors: Record<string, string> = {}
    if (!nome.trim()) {
      newErrors.nome = 'Nome obrigatorio'
    }
    if (sigRef.current?.isEmpty()) {
      newErrors.signature = 'Assinatura obrigatoria'
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      setSaving(true)

      const canvas = sigRef.current?.getCanvas()
      const imageBase64 = canvas?.toDataURL('image/png') || ''

      const res = await fetch(`/api/os/${osId}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          nome: nome.trim(),
          cpf: cpf.trim() || null,
          cargo: cargo.trim() || null,
          imageBase64,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar assinatura')
      }

      addToast('success', `Assinatura do ${tipo === 'tecnico' ? 'tecnico' : 'cliente'} salva com sucesso!`)
      onSaved()
    } catch (err: any) {
      addToast('error', err.message || 'Erro ao salvar assinatura')
    } finally {
      setSaving(false)
    }
  }

  // If signature already exists, show it
  if (existingSignature) {
    return (
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-dark-800 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          {title}
        </h3>
        <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3">
          <div className="bg-white rounded-lg p-3 flex items-center justify-center border border-green-100">
            <img
              src={`/api/os/${osId}/signatures?tipo=${tipo}`}
              alt={`Assinatura do ${tipo}`}
              className="max-h-24 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
          <div className="text-sm space-y-1">
            <p>
              <span className="text-dark-400">Nome: </span>
              <span className="text-dark-800 font-medium">{existingSignature.nomeSignatario}</span>
            </p>
            {existingSignature.cpfSignatario && (
              <p>
                <span className="text-dark-400">CPF: </span>
                <span className="text-dark-800">{existingSignature.cpfSignatario}</span>
              </p>
            )}
            {existingSignature.cargoSignatario && (
              <p>
                <span className="text-dark-400">Cargo: </span>
                <span className="text-dark-800">{existingSignature.cargoSignatario}</span>
              </p>
            )}
            <p>
              <span className="text-dark-400">Assinado em: </span>
              <span className="text-dark-800">
                {new Date(existingSignature.assinadoEm).toLocaleString('pt-BR')}
              </span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Signature pad form
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-dark-800 flex items-center gap-2">
        <PenTool className="h-5 w-5 text-primary" />
        {title}
      </h3>

      <div className="border border-dark-100 rounded-lg p-4 space-y-4">
        <Input
          label="Nome"
          required
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            setErrors((prev) => ({ ...prev, nome: '' }))
          }}
          error={errors.nome}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="CPF"
            placeholder="000.000.000-00 (opcional)"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
          />
          <Input
            label="Cargo"
            placeholder="Cargo (opcional)"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-dark-700">
              Assinatura <span className="text-red-500">*</span>
            </label>
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs text-dark-400 hover:text-dark-600 active:text-dark-800 rounded-md hover:bg-dark-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar
            </button>
          </div>
          <div
            ref={containerRef}
            className={cn(
              'border-2 rounded-lg bg-white overflow-hidden',
              errors.signature ? 'border-red-400' : 'border-dark-200'
            )}
          >
            <SignatureCanvas
              ref={sigRef}
              penColor="#1a1a1a"
              canvasProps={{
                className: 'w-full',
                style: { width: '100%', height: '200px', touchAction: 'none' },
              }}
              onBegin={() => setErrors((prev) => ({ ...prev, signature: '' }))}
            />
          </div>
          {errors.signature && (
            <p className="mt-1 text-xs text-red-600">{errors.signature}</p>
          )}
          <p className="mt-1 text-xs text-dark-300">
            Assine usando o mouse ou toque na area acima.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Save className="h-4 w-4" />}
          onClick={handleSave}
          loading={saving}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          Salvar Assinatura
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function AssinarOSPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [os, setOs] = useState<OSData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const toastId = Date.now()
    setToasts((prev) => [...prev, { id: toastId, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId))
    }, 5000)
  }, [])

  const dismissToast = useCallback((toastId: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId))
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
      const data: OSData = await res.json()

      // Cannot sign completed or canceled OS
      if (data.status === 'COMPLETED' || data.status === 'CANCELED') {
        router.replace(`/os/${id}`)
        return
      }

      setOs(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar OS')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchOS()
  }, [fetchOS])

  const handleSignatureSaved = () => {
    // Refetch OS to update signatures and status
    fetchOS()
  }

  // Check if both signatures complete after refetch
  useEffect(() => {
    if (!os) return
    const hasTecnico = os.assinaturas.some((a) => a.tipo === 'tecnico')
    const hasCliente = os.assinaturas.some((a) => a.tipo === 'cliente')
    if (hasTecnico && hasCliente) {
      addToast('success', 'Ambas as assinaturas foram registradas! OS concluida.')
      setTimeout(() => {
        router.push(`/os/${id}`)
      }, 2000)
    }
  }, [os, addToast, id, router])

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

  const tecnicoSignature = os.assinaturas.find((a) => a.tipo === 'tecnico')
  const clienteSignature = os.assinaturas.find((a) => a.tipo === 'cliente')

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/os/${id}`}
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border border-dark-200 hover:bg-dark-50 active:bg-dark-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-dark-600" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-dark-800">
          Assinar OS {formatOSNumber(os.osNumber)}
        </h1>
        <OSStatusBadge status={os.status} />
      </div>

      {/* OS Summary */}
      <div className="bg-dark-50 rounded-xl border border-dark-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-dark-400">OS: </span>
            <span className="text-dark-800 font-medium">
              {formatOSNumber(os.osNumber)}
            </span>
          </div>
          <div>
            <span className="text-dark-400">Cliente: </span>
            <span className="text-dark-800 font-medium">{os.cliente.razaoSocial}</span>
          </div>
          <div>
            <span className="text-dark-400">Data: </span>
            <span className="text-dark-800">{formatDate(os.serviceDate)}</span>
          </div>
          <div>
            <span className="text-dark-400">Tecnico: </span>
            <span className="text-dark-800">{os.tecnico.name}</span>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex-1 h-2 rounded-full',
            tecnicoSignature ? 'bg-green-400' : 'bg-dark-200'
          )}
        />
        <div
          className={cn(
            'flex-1 h-2 rounded-full',
            clienteSignature ? 'bg-green-400' : 'bg-dark-200'
          )}
        />
      </div>
      <p className="text-xs text-dark-400 text-center">
        {tecnicoSignature && clienteSignature
          ? 'Ambas as assinaturas foram registradas'
          : tecnicoSignature || clienteSignature
          ? '1 de 2 assinaturas registradas'
          : '0 de 2 assinaturas registradas'}
      </p>

      {/* Signature Sections */}
      <div className="space-y-8">
        <SignatureSection
          title="Assinatura do Tecnico"
          tipo="tecnico"
          existingSignature={tecnicoSignature}
          osId={id}
          onSaved={handleSignatureSaved}
          addToast={addToast}
        />

        <div className="border-t border-dark-100" />

        <SignatureSection
          title="Assinatura do Cliente"
          tipo="cliente"
          existingSignature={clienteSignature}
          osId={id}
          onSaved={handleSignatureSaved}
          addToast={addToast}
        />
      </div>

      {/* Back button */}
      <div className="pt-4">
        <Link href={`/os/${id}`}>
          <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
            Voltar para detalhes da OS
          </Button>
        </Link>
      </div>
    </div>
  )
}
