'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Bluetooth,
  BluetoothOff,
  Printer,
  AlertCircle,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react'
import LabelCanvas, { type LabelData } from '@/components/os/LabelCanvas'
import { useNiimbot } from '@/hooks/useNiimbot'
import Button from '@/components/ui/Button'

interface OSInfo {
  id: string
  osNumber: number
  status: string
  serviceDate: string
  cliente: {
    razaoSocial: string
    nomeFantasia?: string
  }
  tecnico: {
    name: string
  }
  equipments?: {
    equipmentName: string
    serviceTypeNames?: string[]
    serviceTypeName?: string
    periodicidade?: string
    fabricante?: string
    modelo?: string
    numeroSerie?: string
  }[]
}

interface LabelConfig {
  key: string
  equipmentName: string
  fabricante?: string
  modelo?: string
  serviceTypes: string[]
  servicoTipo: string
  validadeYears: number
  dataValidade: string
  disclaimer: string
}

const DEFAULT_TELEFONE = '(65) 9.9818-2222'
const DEFAULT_RESPONSAVEL = 'Dr Diego C. Galeano'

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function formatServiceDateBR(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return formatDateBR(d)
}

function calcValidade(serviceDate: string, years: number): string {
  const d = new Date(serviceDate)
  if (isNaN(d.getTime())) return ''
  d.setFullYear(d.getFullYear() + years)
  return formatDateBR(d)
}

function getValidadeYears(serviceTypes: string[]): number {
  const joined = serviceTypes.join(' ').toLowerCase()
  if (joined.includes('levantamento') || joined.includes('fuga')) return 4
  return 1
}

function getDisclaimer(serviceTypes: string[]): string {
  const joined = serviceTypes.join(' ').toLowerCase()
  if (joined.includes('levantamento') || joined.includes('fuga')) {
    return '*Após a manutenção do equipamento ou troca do tubo um novo teste deve ser realizado.'
  }
  if (joined.includes('controle') || joined.includes('qualidade') || joined.includes('aceitação') || joined.includes('aceitacao')) {
    return '*após manutenção corretiva do equipamento um novo teste deve ser realizado.'
  }
  return '*após manutenção do equipamento um novo teste deve ser realizado.'
}

function generateLabelConfigs(os: OSInfo): LabelConfig[] {
  const configs: LabelConfig[] = []
  const equips = os.equipments || []

  equips.forEach((eq, eIdx) => {
    let svcNames = eq.serviceTypeNames && eq.serviceTypeNames.length > 0
      ? eq.serviceTypeNames
      : (eq.serviceTypeName ? [eq.serviceTypeName] : [])

    if (svcNames.length === 0) {
      configs.push({
        key: `e${eIdx}_g0`,
        equipmentName: eq.equipmentName || 'Equipamento',
        fabricante: eq.fabricante,
        modelo: eq.modelo,
        serviceTypes: [],
        servicoTipo: eq.equipmentName || 'Serviço',
        validadeYears: 1,
        dataValidade: calcValidade(os.serviceDate, 1),
        disclaimer: '*após manutenção do equipamento um novo teste deve ser realizado.',
      })
      return
    }

    // Group service types by validity period:
    // 4 years: Levantamento Radiométrico, Teste de Fuga
    // 1 year: Controle de Qualidade, others
    const fourYearTypes: string[] = []
    const oneYearTypes: string[] = []

    for (const name of svcNames) {
      const lower = name.toLowerCase()
      if (lower.includes('levantamento') || lower.includes('fuga')) {
        fourYearTypes.push(name)
      } else {
        oneYearTypes.push(name)
      }
    }

    let groupIdx = 0

    if (fourYearTypes.length > 0) {
      const years = getValidadeYears(fourYearTypes)
      configs.push({
        key: `e${eIdx}_g${groupIdx++}`,
        equipmentName: eq.equipmentName,
        fabricante: eq.fabricante,
        modelo: eq.modelo,
        serviceTypes: fourYearTypes,
        servicoTipo: fourYearTypes.join(' / '),
        validadeYears: years,
        dataValidade: calcValidade(os.serviceDate, years),
        disclaimer: getDisclaimer(fourYearTypes),
      })
    }

    if (oneYearTypes.length > 0) {
      const years = getValidadeYears(oneYearTypes)
      configs.push({
        key: `e${eIdx}_g${groupIdx++}`,
        equipmentName: eq.equipmentName,
        fabricante: eq.fabricante,
        modelo: eq.modelo,
        serviceTypes: oneYearTypes,
        servicoTipo: oneYearTypes.join(' / '),
        validadeYears: years,
        dataValidade: calcValidade(os.serviceDate, years),
        disclaimer: getDisclaimer(oneYearTypes),
      })
    }
  })

  return configs
}

export default function EtiquetaPage() {
  const params = useParams()
  const id = (params?.id ?? '') as string

  const [os, setOs] = useState<OSInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [labels, setLabels] = useState<LabelConfig[]>([])
  const [responsavel, setResponsavel] = useState(DEFAULT_RESPONSAVEL)
  const [telefone, setTelefone] = useState(DEFAULT_TELEFONE)

  const canvasMap = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null)

  const {
    connect, disconnect, print,
    isConnected, isPrinting, error: printerError,
    printerName, isBluetoothSupported,
  } = useNiimbot()

  // Fetch OS
  useEffect(() => {
    const fetchOS = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/os/${id}`)
        if (!res.ok) throw new Error('OS não encontrada')
        const data = await res.json()
        setOs(data)
      } catch {
        setError('Erro ao carregar ordem de serviço')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchOS()
  }, [id])

  // Generate labels when OS loads
  useEffect(() => {
    if (!os) return
    setLabels(generateLabelConfigs(os))
  }, [os])

  const updateLabel = (key: string, field: keyof LabelConfig, value: string) => {
    setLabels(prev => prev.map(l =>
      l.key === key ? { ...l, [field]: value } : l
    ))
  }

  const handleCanvasReady = useCallback((key: string, canvas: HTMLCanvasElement) => {
    canvasMap.current.set(key, canvas)
  }, [])

  const handleConnect = async () => {
    try { await connect() } catch {}
  }

  const handlePrintLabel = async (key: string) => {
    const canvas = canvasMap.current.get(key)
    if (!canvas) return
    try { await print(canvas) } catch {}
  }

  const handlePrintAll = async () => {
    for (let i = 0; i < labels.length; i++) {
      const canvas = canvasMap.current.get(labels[i].key)
      if (!canvas) continue
      try {
        await print(canvas)
        if (i < labels.length - 1) {
          await new Promise(r => setTimeout(r, 1500))
        }
      } catch { break }
    }
  }

  const handleDownloadLabel = (key: string, label: LabelConfig) => {
    const canvas = canvasMap.current.get(key)
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `etiqueta-${label.equipmentName || 'label'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

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

  if (error || !os) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-red-600">{error || 'OS não encontrada'}</p>
          <Link href={`/os/${id}`}>
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
              Voltar
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const bluetoothOk = isBluetoothSupported()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/os/${os.id}`}
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border border-dark-200 hover:bg-dark-50 active:bg-dark-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-dark-600" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-dark-800">
            Imprimir Etiquetas - OS #{String(os.osNumber).padStart(8, '0')}
          </h1>
          <p className="text-sm text-dark-400">
            {os.cliente.nomeFantasia || os.cliente.razaoSocial} · {labels.length} etiqueta{labels.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Bluetooth warning */}
      {!bluetoothOk && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Bluetooth não disponível</p>
            <p className="text-sm text-amber-700">
              Impressão via Bluetooth requer <strong>Chrome</strong> ou <strong>Edge</strong>.
              Use o botão <strong>Baixar Imagem</strong> para salvar a etiqueta e imprimir por outro meio.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Global fields */}
          <div className="bg-white rounded-xl border border-dark-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-dark-700 uppercase tracking-wide">
              Dados da Etiqueta
            </h3>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Físico Médico Responsável</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Telefone</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
              />
            </div>
            <div className="pt-2 text-xs text-dark-300 space-y-1">
              <p>Realizado em: {formatServiceDateBR(os.serviceDate)}</p>
              <p>Técnico: {os.tecnico.name}</p>
            </div>
          </div>

          {/* Printer controls */}
          <div className="bg-white rounded-xl border border-dark-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-dark-700 uppercase tracking-wide">
              Impressora
            </h3>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-dark-50">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">{printerName}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-dark-300" />
                  <span className="text-sm text-dark-400">Não conectada</span>
                </>
              )}
            </div>

            {printerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {printerError}
              </div>
            )}

            <div className="space-y-2">
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={!bluetoothOk}
                  variant="primary"
                  size="sm"
                  icon={<Bluetooth className="w-4 h-4" />}
                  className="w-full"
                >
                  Conectar
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handlePrintAll}
                    disabled={isPrinting || labels.length === 0}
                    variant="primary"
                    size="sm"
                    loading={isPrinting}
                    icon={!isPrinting ? <Printer className="w-4 h-4" /> : undefined}
                    className="w-full"
                  >
                    {isPrinting ? 'Imprimindo...' : `Imprimir Todas (${labels.length})`}
                  </Button>
                  <Button
                    onClick={disconnect}
                    variant="secondary"
                    size="sm"
                    icon={<BluetoothOff className="w-4 h-4" />}
                    className="w-full"
                  >
                    Desconectar
                  </Button>
                </>
              )}
            </div>

            <div className="text-xs text-dark-300 space-y-1">
              <p>1. Ligue a impressora Niimbot</p>
              <p>2. Conecte via Bluetooth</p>
              <p>3. Imprima as etiquetas</p>
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="lg:col-span-3 space-y-6">
          {labels.map((label) => {
            const servicoDetalhe = label.equipmentName
              ? `${label.equipmentName}${label.fabricante ? ` - ${label.fabricante}` : ''}${label.modelo ? ` ${label.modelo}` : ''}`
              : undefined

            const labelData: LabelData = {
              responsavel,
              telefone,
              servicoTipo: label.servicoTipo,
              servicoDetalhe,
              dataRealizacao: formatServiceDateBR(os.serviceDate),
              dataValidade: label.dataValidade,
              disclaimer: label.disclaimer,
              qrUrl: typeof window !== 'undefined'
                ? `${window.location.origin}/os/${os.id}`
                : `/os/${os.id}`,
            }

            const isExpanded = expandedLabel === label.key

            return (
              <div key={label.key} className="bg-white rounded-xl border border-dark-100 shadow-sm overflow-hidden">
                {/* Label header */}
                <div className="px-4 py-3 border-b border-dark-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-dark-800">
                      {label.equipmentName || 'Equipamento'}
                    </h3>
                    <p className="text-sm text-dark-400">
                      {label.servicoTipo} · Validade: {label.validadeYears} ano{label.validadeYears !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleDownloadLabel(label.key, label)}
                      variant="secondary"
                      size="sm"
                      icon={<Download className="w-3.5 h-3.5" />}
                    >
                      Baixar Imagem
                    </Button>
                    {isConnected && (
                      <Button
                        onClick={() => handlePrintLabel(label.key)}
                        disabled={isPrinting}
                        variant="secondary"
                        size="sm"
                        icon={<Printer className="w-3.5 h-3.5" />}
                      >
                        Imprimir
                      </Button>
                    )}
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4">
                  <LabelCanvas
                    data={labelData}
                    onCanvasReady={(canvas) => handleCanvasReady(label.key, canvas)}
                  />
                  <p className="text-xs text-dark-300 mt-2 text-center">
                    70mm × 40mm @ 203 DPI
                  </p>
                </div>

                {/* Editable fields toggle */}
                <div className="border-t border-dark-100">
                  <button
                    onClick={() => setExpandedLabel(isExpanded ? null : label.key)}
                    className="w-full px-4 py-2 flex items-center justify-between text-xs text-dark-400 hover:bg-dark-50 transition"
                  >
                    <span>Editar campos</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <div>
                        <label className="block text-xs text-dark-400 mb-1">Data de Validade</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          value={label.dataValidade}
                          onChange={e => updateLabel(label.key, 'dataValidade', e.target.value)}
                          placeholder="DD-MM-YYYY"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-dark-400 mb-1">Texto de aviso</label>
                        <textarea
                          className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          rows={2}
                          value={label.disclaimer}
                          onChange={e => updateLabel(label.key, 'disclaimer', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {labels.length === 0 && (
            <div className="bg-white rounded-xl border border-dark-100 shadow-sm p-8 text-center">
              <p className="text-dark-400">Nenhum equipamento encontrado nesta OS.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
