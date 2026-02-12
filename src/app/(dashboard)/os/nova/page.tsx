'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Upload,
  XCircle,
} from 'lucide-react'
import { formatCNPJ, formatDate, cn } from '@/lib/utils'
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
}

interface Equipment {
  equipmentName: string
  serviceTypeNames: string[]
  periodicidade: string
  fabricante: string
  modelo: string
  numeroSerie: string
}

interface ExistingEquipment {
  id: string
  nome: string
  fabricante: string | null
  modelo: string | null
  numeroSerie: string | null
}

interface PhotoFile {
  file: File
  preview: string
  legenda: string
  equipmentIndex: number | null
}

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
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

const STEPS = ['Cliente', 'Equipamentos', 'Detalhes', 'Revisao']

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

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="flex items-center justify-center px-2">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                index < currentStep
                  ? 'bg-primary border-primary text-dark-900'
                  : index === currentStep
                  ? 'border-primary bg-primary/10 text-primary-dark'
                  : 'border-dark-200 bg-white text-dark-400'
              )}
            >
              {index < currentStep ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'mt-1 text-[10px] sm:text-xs font-medium whitespace-nowrap',
                index <= currentStep ? 'text-dark-700' : 'text-dark-300'
              )}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 sm:w-16 h-0.5 mx-1 mt-[-18px]',
                index < currentStep ? 'bg-primary' : 'bg-dark-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function NovaOSPage() {
  const router = useRouter()

  // State
  const [currentStep, setCurrentStep] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Step 1 - Cliente
  const [clienteSearch, setClienteSearch] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)

  // Step 2 - Equipamentos
  const [equipments, setEquipments] = useState<Equipment[]>([
    {
      equipmentName: '',
      serviceTypeNames: [],
      periodicidade: '',
      fabricante: '',
      modelo: '',
      numeroSerie: '',
    },
  ])
  const [existingEquipments, setExistingEquipments] = useState<ExistingEquipment[]>([])

  // Step 3 - Detalhes
  const [serviceDate, setServiceDate] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [observations, setObservations] = useState('')
  const [photos, setPhotos] = useState<PhotoFile[]>([])

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Toast helpers ───────────────────────────────────────────────────────

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Search Clientes ─────────────────────────────────────────────────────

  const searchClientes = useCallback(async (search: string) => {
    if (!search.trim() && search !== '') return
    try {
      setSearchLoading(true)
      const res = await fetch(`/api/clientes?search=${encodeURIComponent(search)}`)
      if (res.ok) {
        const data = await res.json()
        setClientes(data)
      }
    } catch {
      // silent fail
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      searchClientes(clienteSearch)
    }, 300)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [clienteSearch, searchClientes])

  // Load initial clients
  useEffect(() => {
    searchClientes('')
  }, [searchClientes])

  // ── Fetch existing equipment on client selection ────────────────────────

  useEffect(() => {
    if (!selectedCliente) {
      setExistingEquipments([])
      return
    }
    const fetchEquipments = async () => {
      try {
        const res = await fetch(`/api/equipamentos?clienteId=${selectedCliente.id}`)
        if (res.ok) {
          const data = await res.json()
          setExistingEquipments(data)
        }
      } catch {
        // silent
      }
    }
    fetchEquipments()
  }, [selectedCliente])

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

  const fillFromExisting = (equipIndex: number, existing: ExistingEquipment) => {
    setEquipments((prev) =>
      prev.map((e, i) =>
        i === equipIndex
          ? {
              ...e,
              equipmentName: existing.nome,
              fabricante: existing.fabricante || '',
              modelo: existing.modelo || '',
              numeroSerie: existing.numeroSerie || '',
            }
          : e
      )
    )
  }

  // ── Photo handlers ──────────────────────────────────────────────────────

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newPhotos: PhotoFile[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      legenda: '',
      equipmentIndex: null,
    }))
    setPhotos((prev) => [...prev, ...newPhotos])
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ── Validation ──────────────────────────────────────────────────────────

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 0) {
      if (!selectedCliente) {
        newErrors.cliente = 'Selecione um cliente'
      }
    }

    if (step === 1) {
      if (equipments.length === 0) {
        newErrors.equipments = 'Adicione pelo menos um equipamento'
      }
      equipments.forEach((e, i) => {
        if (!e.equipmentName.trim()) {
          newErrors[`equip_${i}_name`] = 'Nome do equipamento obrigatorio'
        }
      })
    }

    if (step === 2) {
      if (!serviceDate) {
        newErrors.serviceDate = 'Data do servico obrigatoria'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  const goNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const goPrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedCliente) return

    try {
      setSubmitting(true)

      // Create OS
      const osRes = await fetch('/api/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: selectedCliente.id,
          serviceDate,
          horaInicio: horaInicio || null,
          horaFim: horaFim || null,
          observations: observations || null,
          equipments: equipments.filter((e) => e.equipmentName.trim()),
        }),
      })

      if (!osRes.ok) {
        const data = await osRes.json()
        throw new Error(data.error || 'Erro ao criar OS')
      }

      const newOS = await osRes.json()

      // Upload photos
      if (photos.length > 0) {
        for (const photo of photos) {
          const formData = new FormData()
          formData.append('file', photo.file)
          if (photo.legenda) formData.append('legenda', photo.legenda)
          if (photo.equipmentIndex !== null) {
            formData.append('equipmentIndex', String(photo.equipmentIndex))
          }

          try {
            await fetch(`/api/os/${newOS.id}/photos`, {
              method: 'POST',
              body: formData,
            })
          } catch {
            addToast('error', `Erro ao enviar foto: ${photo.file.name}`)
          }
        }
      }

      addToast('success', 'OS criada com sucesso!')
      router.push(`/os/${newOS.id}`)
    } catch (err: any) {
      addToast('error', err.message || 'Erro ao criar OS')
      setSubmitting(false)
    }
  }

  // ── Render Step 1: Cliente ──────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-dark-800">Selecione o Cliente</h2>

      <Input
        label="Buscar cliente"
        placeholder="Digite o nome ou CNPJ..."
        value={clienteSearch}
        onChange={(e) => setClienteSearch(e.target.value)}
        icon={<Search className="h-4 w-4" />}
        error={errors.cliente}
      />

      {selectedCliente && (
        <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-primary-dark shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-dark-800 truncate">
              {selectedCliente.razaoSocial}
            </p>
            {selectedCliente.cnpj && (
              <p className="text-xs text-dark-500">{formatCNPJ(selectedCliente.cnpj)}</p>
            )}
          </div>
          <button
            onClick={() => setSelectedCliente(null)}
            className="text-dark-400 hover:text-dark-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="border border-dark-100 rounded-lg max-h-80 overflow-y-auto">
        {searchLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-dark-400">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <ul className="divide-y divide-dark-50">
            {clientes.map((cliente) => (
              <li key={cliente.id}>
                <button
                  onClick={() => {
                    setSelectedCliente(cliente)
                    setErrors((prev) => ({ ...prev, cliente: '' }))
                  }}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-dark-50 transition-colors',
                    selectedCliente?.id === cliente.id && 'bg-primary-50'
                  )}
                >
                  <p className="text-sm font-medium text-dark-800">{cliente.razaoSocial}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {cliente.cnpj && (
                      <span className="text-xs text-dark-400">
                        {formatCNPJ(cliente.cnpj)}
                      </span>
                    )}
                    {cliente.nomeFantasia && (
                      <span className="text-xs text-dark-400">{cliente.nomeFantasia}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  // ── Render Step 2: Equipamentos ─────────────────────────────────────────

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark-800">Equipamentos</h2>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={addEquipment}
        >
          Adicionar Equipamento
        </Button>
      </div>

      {errors.equipments && (
        <p className="text-xs text-red-600">{errors.equipments}</p>
      )}

      {existingEquipments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-2">
            Equipamentos cadastrados do cliente (clique para preencher):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {existingEquipments.map((eq) => (
              <button
                key={eq.id}
                onClick={() => {
                  // Fill first empty equipment or add new
                  const emptyIndex = equipments.findIndex(
                    (e) => !e.equipmentName.trim()
                  )
                  if (emptyIndex >= 0) {
                    fillFromExisting(emptyIndex, eq)
                  } else {
                    setEquipments((prev) => [
                      ...prev,
                      {
                        equipmentName: eq.nome,
                        serviceTypeNames: [],
                        periodicidade: '',
                        fabricante: eq.fabricante || '',
                        modelo: eq.modelo || '',
                        numeroSerie: eq.numeroSerie || '',
                      },
                    ])
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-white border border-blue-200 rounded-md hover:bg-blue-100 active:bg-blue-200 text-blue-700 transition-colors"
              >
                <Plus className="h-3 w-3" />
                {eq.nome}
                {eq.numeroSerie && ` (${eq.numeroSerie})`}
              </button>
            ))}
          </div>
        </div>
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
  )

  // ── Render Step 3: Detalhes ─────────────────────────────────────────────

  const renderStep3 = () => (
    <div className="space-y-4">
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
        <label className="block text-sm font-medium text-dark-700 mb-1">
          Observacoes
        </label>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={4}
          className="block w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-sm text-dark-800 placeholder:text-dark-300 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary focus:ring-primary/30 transition-colors"
          placeholder="Observacoes sobre o servico..."
        />
      </div>

      {/* Photo Upload */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-dark-700">Fotos</label>

        <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-dark-200 rounded-lg hover:border-primary hover:bg-primary-50/30 cursor-pointer transition-colors">
          <Upload className="h-8 w-8 text-dark-300" />
          <span className="text-sm text-dark-500">
            Clique para selecionar fotos ou arraste aqui
          </span>
          <span className="text-xs text-dark-300">
            JPEG, PNG ou WebP. Maximo 10MB por arquivo.
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handlePhotoUpload}
            className="sr-only"
          />
        </label>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
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
                  onClick={() => removePhoto(index)}
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
                      setPhotos((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, legenda: e.target.value } : p
                        )
                      )
                    }}
                    className="w-full text-xs border-0 bg-transparent text-dark-600 placeholder:text-dark-300 focus:outline-none"
                  />
                  {equipments.length > 0 && (
                    <select
                      value={photo.equipmentIndex ?? ''}
                      onChange={(e) => {
                        setPhotos((prev) =>
                          prev.map((p, i) =>
                            i === index
                              ? {
                                  ...p,
                                  equipmentIndex:
                                    e.target.value === '' ? null : parseInt(e.target.value),
                                }
                              : p
                          )
                        )
                      }}
                      className="w-full text-xs border-0 bg-transparent text-dark-500 focus:outline-none mt-1"
                    >
                      <option value="">Sem equipamento</option>
                      {equipments.map((eq, ei) => (
                        <option key={ei} value={ei}>
                          {eq.equipmentName || `Equip. ${ei + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── Render Step 4: Revisao ──────────────────────────────────────────────

  const renderStep4 = () => {
    const validEquipments = equipments.filter((e) => e.equipmentName.trim())

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-dark-800">Revisao</h2>

        <div className="bg-dark-50 rounded-lg p-4 space-y-4">
          {/* Cliente */}
          <div>
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-1">
              Cliente
            </h3>
            <p className="text-sm font-medium text-dark-800">
              {selectedCliente?.razaoSocial}
            </p>
            {selectedCliente?.cnpj && (
              <p className="text-xs text-dark-500">
                {formatCNPJ(selectedCliente.cnpj)}
              </p>
            )}
          </div>

          {/* Equipamentos */}
          <div>
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-1">
              Equipamentos ({validEquipments.length})
            </h3>
            <ul className="space-y-1">
              {validEquipments.map((e, i) => (
                <li key={i} className="text-sm text-dark-700">
                  {i + 1}. {e.equipmentName}
                  {e.serviceTypeNames.length > 0 && (
                    <span className="text-dark-400">
                      {' '}
                      - {e.serviceTypeNames.join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Detalhes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-1">
                Data
              </h3>
              <p className="text-sm text-dark-700">
                {serviceDate ? formatDate(serviceDate) : '-'}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-1">
                Horario
              </h3>
              <p className="text-sm text-dark-700">
                {horaInicio || '-'} - {horaFim || '-'}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-1">
                Fotos
              </h3>
              <p className="text-sm text-dark-700">{photos.length} foto(s)</p>
            </div>
          </div>

          {observations && (
            <div>
              <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-1">
                Observacoes
              </h3>
              <p className="text-sm text-dark-700 whitespace-pre-wrap">
                {observations}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/os"
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border border-dark-200 hover:bg-dark-50 active:bg-dark-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-dark-600" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-dark-800">Nova Ordem de Servico</h1>
      </div>

      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-dark-100 shadow-sm p-4 sm:p-6">
        {currentStep === 0 && renderStep1()}
        {currentStep === 1 && renderStep2()}
        {currentStep === 2 && renderStep3()}
        {currentStep === 3 && renderStep4()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 0 && (
            <Button
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={goPrev}
              disabled={submitting}
            >
              Anterior
            </Button>
          )}
        </div>
        <div>
          {currentStep < STEPS.length - 1 ? (
            <Button
              variant="primary"
              onClick={goNext}
            >
              Proximo
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={submitting}
            >
              Criar OS
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
