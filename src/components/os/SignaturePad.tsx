'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Eraser, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export interface SignatureData {
  nome: string
  cpf: string
  cargo: string
  imageBase64: string
}

export interface SignaturePadProps {
  onSave: (data: SignatureData) => void
  onCancel?: () => void
  /** Pre-fill name */
  initialName?: string
  /** Pre-fill CPF */
  initialCpf?: string
  /** Pre-fill cargo */
  initialCargo?: string
  /** Whether name is required */
  requireName?: boolean
  /** Show the CPF field */
  showCpf?: boolean
  /** Show the cargo field */
  showCargo?: boolean
  disabled?: boolean
  className?: string
}

function formatCPFInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function SignaturePad({
  onSave,
  onCancel,
  initialName = '',
  initialCpf = '',
  initialCargo = '',
  requireName = true,
  showCpf = true,
  showCargo = true,
  disabled = false,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<SignatureCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [nome, setNome] = useState(initialName)
  const [cpf, setCpf] = useState(initialCpf)
  const [cargo, setCargo] = useState(initialCargo)
  const [isEmpty, setIsEmpty] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Resize canvas to fit container on mount and window resize
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return
    const canvas = canvasRef.current.getCanvas()
    const container = containerRef.current
    const ratio = Math.max(window.devicePixelRatio || 1, 1)

    canvas.width = container.offsetWidth * ratio
    canvas.height = container.offsetHeight * ratio
    canvas.getContext('2d')?.scale(ratio, ratio)

    canvas.style.width = `${container.offsetWidth}px`
    canvas.style.height = `${container.offsetHeight}px`

    // Clear after resize since canvas content is lost
    canvasRef.current.clear()
    setIsEmpty(true)
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  const handleClear = useCallback(() => {
    canvasRef.current?.clear()
    setIsEmpty(true)
  }, [])

  const handleEnd = useCallback(() => {
    if (canvasRef.current) {
      setIsEmpty(canvasRef.current.isEmpty())
    }
  }, [])

  const handleCpfChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCpf(formatCPFInput(e.target.value))
    },
    []
  )

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (requireName && !nome.trim()) {
      newErrors.nome = 'Nome é obrigatório.'
    }

    if (isEmpty) {
      newErrors.signature = 'A assinatura é obrigatória.'
    }

    // CPF validation (basic: must be 11 digits if provided)
    if (cpf) {
      const cpfDigits = cpf.replace(/\D/g, '')
      if (cpfDigits.length !== 11) {
        newErrors.cpf = 'CPF deve ter 11 dígitos.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [requireName, nome, isEmpty, cpf])

  const handleSave = useCallback(() => {
    if (!validate()) return
    if (!canvasRef.current) return

    const imageBase64 = canvasRef.current
      .getCanvas()
      .toDataURL('image/png')

    onSave({
      nome: nome.trim(),
      cpf: cpf.replace(/\D/g, ''),
      cargo: cargo.trim(),
      imageBase64,
    })
  }, [validate, onSave, nome, cpf, cargo])

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Name field */}
      <Input
        label="Nome completo"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        error={errors.nome}
        required={requireName}
        disabled={disabled}
        placeholder="Nome do signatário"
      />

      {/* CPF field */}
      {showCpf && (
        <Input
          label="CPF"
          value={cpf}
          onChange={handleCpfChange}
          error={errors.cpf}
          disabled={disabled}
          placeholder="000.000.000-00"
          maxLength={14}
          inputMode="numeric"
        />
      )}

      {/* Cargo field */}
      {showCargo && (
        <Input
          label="Cargo / Função"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          disabled={disabled}
          placeholder="Ex: Físico Médico, Técnico..."
        />
      )}

      {/* Signature canvas */}
      <div>
        <label className="block text-sm font-medium text-dark-700 mb-1">
          Assinatura <span className="text-red-500">*</span>
        </label>
        <div
          ref={containerRef}
          className={cn(
            'relative w-full h-48 sm:h-56 border-2 rounded-lg overflow-hidden bg-white',
            errors.signature ? 'border-red-400' : 'border-dark-200',
            disabled && 'opacity-50 pointer-events-none'
          )}
        >
          <SignatureCanvas
            ref={canvasRef}
            penColor="#1a1a1a"
            minWidth={1.5}
            maxWidth={3}
            onEnd={handleEnd}
            canvasProps={{
              className: 'signature-canvas w-full h-full',
              style: { touchAction: 'none' },
            }}
          />
          {/* Placeholder hint */}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-dark-300">Assine aqui</p>
            </div>
          )}
          {/* Dashed baseline */}
          <div className="absolute bottom-8 left-6 right-6 border-b border-dashed border-dark-200 pointer-events-none" />
        </div>
        {errors.signature && (
          <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errors.signature}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          icon={<Eraser className="h-4 w-4" />}
        >
          Limpar
        </Button>
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onCancel}
              disabled={disabled}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={disabled}
            icon={<Check className="h-4 w-4" />}
          >
            Salvar Assinatura
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SignaturePad
