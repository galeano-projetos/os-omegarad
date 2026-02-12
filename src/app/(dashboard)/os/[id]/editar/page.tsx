'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  Upload,
} from 'lucide-react'
import { formatOSNumber, formatCNPJ, cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  cnpj: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
}

interface Equipment {
  equipmentName: string
  serviceTypeNames: string[]
  periodicidade: string
  fabricante: string
  modelo: string
  numeroSerie: string
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

interface OSData {
  id: string
  osNumber: number
  status: string
  clienteId: string
  serviceDate: string
  horaInicio: string | null
  horaFim: string | null
  observations: string | null
  equipments: Equipment[]
  cliente: Cliente
  fotos: Foto[]
}

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

interface NewPhoto {
  file: File
  preview: string
  legenda: string
  equipmentIndex: number | null
}

const SERVICE_TYPES = [
  'Levantamento Radiometrico',
  'Teste de Constancia',
  'Controle de Qualidade',
  'Outro',
]

const PERIODICIDADE_OPTIONS = [
  { value: 'Diario', label: 'Diario' },
  { value: 'Semanal', label: 'Semanal' },
  { value: 'Mensal', label: 'Mensal' },
  { value: 'Semestral', label: 'Semestral' },
  { value: 'Anual', label: 'Anual' },
  { value: 'Bianual', label: 'Bianual' },
]

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

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function EditarOSPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  // State
  const [os, setOs] = useState<OSData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form fields
  const [serviceDate, setServiceDate] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [observations, setObservations] = useState('')
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [existingPhotos, setExistingPhotos] = useState<Foto[]>([])
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([])

  // ── Toast helpers ───────────────────────────────────────────────────────

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

  // ── Fetch OS data ───────────────────────────────────────────────────────

  useEffect(() => {
    const fetchOS = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/os/${id}`)
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erro ao carregar OS')
        }
        const data: OSData = await res.json()

        // Only DRAFT can be edited
        if (data.status !== 'DRAFT') {
          router.replace(`/os/${id}`)
          return
        }

        setOs(data)

        // Pre-fill form
        const dateStr = data.serviceDate ? new Date(data.serviceDate).toISOString().split('T')[0] : ''
        setServiceDate(dateStr)
        setHoraInicio(data.horaInicio || '')
        setHoraFim(data.horaFim || '')
        setObservations(data.observations || '')
        setEquipments(
          Array.isArray(data.equipments) && data.equipments.length > 0
            ? data.equipments.map((e) => ({
                equipmentName: e.equipmentName || '',
                serviceTypeNames: Array.isArray(e.serviceTypeNames) ? e.serviceTypeNames : [],
                periodicidade: e.periodicidade || '',
                fabricante: e.fabricante || '',
                modelo: e.modelo || '',
                numeroSerie: e.numeroSerie || '',
              }))
            : [
                {
                  equipmentName: '',
                  serviceTypeNames: [],
                  periodicidade: '',
                  fabricante: '',
                  modelo: '',
                  numeroSerie: '',
                },
              ]
        )
        setExistingPhotos(data.fotos || [])
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar OS')
      } finally {
        setLoading(false)
      }
    }

    fetchOS()
  }, [id, router])

  // ── Equipment handlers ──────────────────────────────────────────────────

  const addEquipment = () => {
    setEquipments((prev) => [
      ...prev,
      {
        equipmentName: '',
        serviceTypeNames: [],
        periodicidade: '',
        fabricante: '',
        modelo: '',
        numeroSerie: '',
      },
    ])
  }

  const removeEquipment = (index: number) => {
    setEquipments((prev) => prev.filter((_, i) => i !== index))
  }

  const updateEquipment = (index: number, field: keyof Equipment, value: any) => {
    setEquipments((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    )
  }

  const toggleServiceType = (equipIndex: number, serviceType: string) => {
    setEquipments((prev) =>
      prev.map((e, i) => {
        if (i !== equipIndex) return e
        const types = e.serviceTypeNames.includes(serviceType)
          ? e.serviceTypeNames.filter((t) => t !== serviceType)
          : [...e.serviceTypeNames, serviceType]
        return { ...e, serviceTypeNames: types }
      })
    )
  }

  // ── Photo handlers ──────────────────────────────────────────────────────

  const handleDeleteExistingPhoto = (photoId: string) => {
    setPhotosToDelete((prev) => [...prev, photoId])
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId))
  }

  const handleNewPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const photos: NewPhoto[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      legenda: '',
      equipmentIndex: null,
    }))
    setNewPhotos((prev) => [...prev, ...photos])
    e.target.value = ''
  }

  const removeNewPhoto = (index: number) => {
    setNewPhotos((prev) => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ── Validation ──────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!serviceDate) {
      newErrors.serviceDate = 'Data do servico obrigatoria'
    }

    const validEquipments = equipments.filter((e) => e.equipmentName.trim())
    if (validEquipments.length === 0) {
      newErrors.equipments = 'Adicione pelo menos um equipamento'
    }

    equipments.forEach((e, i) => {
      if (!e.equipmentName.trim()) {
        newErrors[`equip_${i}_name`] = 'Nome do equipamento obrigatorio'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      setSaving(true)

      // Update OS data
      const res = await fetch(`/api/os/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceDate,
          horaInicio: horaInicio || null,
          horaFim: horaFim || null,
          observations: observations || null,
          equipments: equipments.filter((e) => e.equipmentName.trim()),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atualizar OS')
      }

      // Delete removed photos
      for (const photoId of photosToDelete) {
        try {
          await fetch(`/api/os/${id}/photos/${photoId}`, { method: 'DELETE' })
        } catch {
          // continue on failure
        }
      }

      // Upload new photos
      for (const photo of newPhotos) {
        const formData = new FormData()
        formData.append('file', photo.file)
        if (photo.legenda) formData.append('legenda', photo.legenda)
        if (photo.equipmentIndex !== null) {
          formData.append('equipmentIndex', String(photo.equipmentIndex))
        }
        try {
          await fetch(`/api/os/${id}/photos`, { method: 'POST', body: formData })
        } catch {
          addToast('error', `Erro ao enviar foto: ${photo.file.name}`)
        }
      }

      addToast('success', 'OS atualizada com sucesso!')
      setTimeout(() => {
        router.push(`/os/${id}`)
      }, 1000)
    } catch (err: any) {
      addToast('error', err.message || 'Erro ao atualizar OS')
      setSaving(false)
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
          Editar OS {formatOSNumber(os.osNumber)}
        </h1>
      </div>

      {/* Cliente info (read-only) */}
      <div className="bg-dark-50 rounded-xl border border-dark-100 p-4">
        <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-1">
          Cliente
        </h3>
        <p className="text-sm font-medium text-dark-800">{os.cliente.razaoSocial}</p>
        {os.cliente.cnpj && (
          <p className="text-xs text-dark-500">{formatCNPJ(os.cliente.cnpj)}</p>
        )}
      </div>

      {/* Detalhes do Servico */}
      <div className="bg-white rounded-xl border border-dark-100 shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-dark-800">Detalhes do Servico</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Data do Servico"
            type="date"
            required
            value={serviceDate}
            onChange={(e) => {
              setServiceDate(e.target.value)
              setErrors((prev) => ({ ...prev, serviceDate: '' }))
            }}
            error={errors.serviceDate}
          />
          <Input
            label="Hora Inicio"
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
          />
          <Input
            label="Hora Fim"
            type="time"
            value={horaFim}
            onChange={(e) => setHoraFim(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1">Observacoes</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={4}
            className="block w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-sm text-dark-800 placeholder:text-dark-300 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary focus:ring-primary/30 transition-colors"
            placeholder="Observacoes sobre o servico..."
          />
        </div>
      </div>

      {/* Equipamentos */}
      <div className="bg-white rounded-xl border border-dark-100 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-800">Equipamentos</h2>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={addEquipment}
          >
            Adicionar
          </Button>
        </div>

        {errors.equipments && (
          <p className="text-xs text-red-600">{errors.equipments}</p>
        )}

        <div className="space-y-4">
          {equipments.map((equip, index) => (
            <div
              key={index}
              className="border border-dark-100 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-dark-700">
                  Equipamento {index + 1}
                </h3>
                {equipments.length > 1 && (
                  <button
                    onClick={() => removeEquipment(index)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Input
                label="Nome do Equipamento"
                required
                placeholder="Ex: Aparelho de Raio-X"
                value={equip.equipmentName}
                onChange={(e) => updateEquipment(index, 'equipmentName', e.target.value)}
                error={errors[`equip_${index}_name`]}
              />

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  Tipo de Servico
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map((type) => (
                    <label
                      key={type}
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors',
                        equip.serviceTypeNames.includes(type)
                          ? 'border-primary bg-primary-50 text-primary-dark'
                          : 'border-dark-200 bg-white text-dark-600 hover:bg-dark-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={equip.serviceTypeNames.includes(type)}
                        onChange={() => toggleServiceType(index, type)}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center',
                          equip.serviceTypeNames.includes(type)
                            ? 'bg-primary border-primary'
                            : 'border-dark-300 bg-white'
                        )}
                      >
                        {equip.serviceTypeNames.includes(type) && (
                          <CheckCircle className="h-3 w-3 text-dark-900" />
                        )}
                      </div>
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <Select
                label="Periodicidade"
                placeholder="Selecione..."
                value={equip.periodicidade}
                onChange={(e) => updateEquipment(index, 'periodicidade', e.target.value)}
                options={PERIODICIDADE_OPTIONS}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Fabricante"
                  placeholder="Fabricante"
                  value={equip.fabricante}
                  onChange={(e) => updateEquipment(index, 'fabricante', e.target.value)}
                />
                <Input
                  label="Modelo"
                  placeholder="Modelo"
                  value={equip.modelo}
                  onChange={(e) => updateEquipment(index, 'modelo', e.target.value)}
                />
                <Input
                  label="N. Serie"
                  placeholder="Numero de serie"
                  value={equip.numeroSerie}
                  onChange={(e) => updateEquipment(index, 'numeroSerie', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fotos */}
      <div className="bg-white rounded-xl border border-dark-100 shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-dark-800">Fotos</h2>

        {/* Existing photos */}
        {existingPhotos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-dark-400 mb-2">Fotos existentes</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {existingPhotos.map((foto) => (
                <div
                  key={foto.id}
                  className="relative group rounded-lg overflow-hidden border border-dark-100"
                >
                  <img
                    src={`/api/os/${id}/photos/${foto.id}`}
                    alt={foto.legenda || foto.nomeArquivo || 'Foto'}
                    className="w-full aspect-square object-cover"
                  />
                  <button
                    onClick={() => handleDeleteExistingPhoto(foto.id)}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity active:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {foto.legenda && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white truncate">{foto.legenda}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload new photos */}
        <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-dark-200 rounded-lg hover:border-primary hover:bg-primary-50/30 cursor-pointer transition-colors">
          <Upload className="h-8 w-8 text-dark-300" />
          <span className="text-sm text-dark-500">Clique para adicionar fotos</span>
          <span className="text-xs text-dark-300">JPEG, PNG ou WebP. Maximo 10MB.</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleNewPhotoUpload}
            className="sr-only"
          />
        </label>

        {/* New photos preview */}
        {newPhotos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-dark-400 mb-2">Novas fotos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {newPhotos.map((photo, index) => (
                <div
                  key={index}
                  className="relative group rounded-lg overflow-hidden border border-dark-100"
                >
                  <img
                    src={photo.preview}
                    alt={photo.file.name}
                    className="w-full aspect-square object-cover"
                  />
                  <button
                    onClick={() => removeNewPhoto(index)}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity active:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Legenda..."
                      value={photo.legenda}
                      onChange={(e) => {
                        setNewPhotos((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, legenda: e.target.value } : p
                          )
                        )
                      }}
                      className="w-full text-xs border-0 bg-transparent text-dark-600 placeholder:text-dark-300 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link href={`/os/${id}`}>
          <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
            Cancelar
          </Button>
        </Link>
        <Button
          variant="primary"
          icon={<Save className="h-4 w-4" />}
          onClick={handleSubmit}
          loading={saving}
          disabled={saving}
        >
          Salvar Alteracoes
        </Button>
      </div>
    </div>
  )
}
