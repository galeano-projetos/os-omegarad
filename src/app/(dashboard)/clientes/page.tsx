'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { formatCNPJ, formatCPF, formatPhone, cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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
  active: boolean
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [cnpjMessage, setCnpjMessage] = useState('')
  const cnpjTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Form state
  const [form, setForm] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
  })

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/clientes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClientes(data)
      }
    } catch {
      // erro silencioso
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(fetchClientes, 300)
    return () => clearTimeout(timer)
  }, [fetchClientes])

  // Formata CNPJ enquanto digita
  const formatCNPJInput = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }

  // Busca dados do CNPJ na Receita Federal (BrasilAPI)
  const buscarCNPJ = useCallback(async (cnpjDigits: string) => {
    if (cnpjDigits.length !== 14) return

    setCnpjLoading(true)
    setCnpjStatus('idle')
    setCnpjMessage('')

    try {
      const res = await fetch(`/api/cnpj/${cnpjDigits}`)
      if (res.ok) {
        const data = await res.json()
        setForm(prev => ({
          ...prev,
          razaoSocial: data.razaoSocial || prev.razaoSocial,
          nomeFantasia: data.nomeFantasia || prev.nomeFantasia,
          email: data.email || prev.email,
          telefone: data.telefone || prev.telefone,
          endereco: data.endereco || prev.endereco,
          cidade: data.cidade || prev.cidade,
          estado: data.estado || prev.estado,
          cep: data.cep || prev.cep,
        }))
        setCnpjStatus('success')
        setCnpjMessage('Dados preenchidos automaticamente!')
      } else {
        const err = await res.json().catch(() => ({}))
        setCnpjStatus('error')
        setCnpjMessage(err.error || 'CNPJ nao encontrado')
      }
    } catch {
      setCnpjStatus('error')
      setCnpjMessage('Erro ao consultar CNPJ')
    } finally {
      setCnpjLoading(false)
      // Limpa mensagem após 4 segundos
      setTimeout(() => {
        setCnpjStatus('idle')
        setCnpjMessage('')
      }, 4000)
    }
  }, [])

  const handleCnpjChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJInput(e.target.value)
    setForm(prev => ({ ...prev, cnpj: formatted }))

    // Limpa timeout anterior
    if (cnpjTimeoutRef.current) clearTimeout(cnpjTimeoutRef.current)

    // Se tem 14 dígitos, busca após debounce
    const digits = formatted.replace(/\D/g, '')
    if (digits.length === 14) {
      cnpjTimeoutRef.current = setTimeout(() => buscarCNPJ(digits), 500)
    }
  }, [buscarCNPJ])

  const resetForm = () => {
    setForm({ razaoSocial: '', nomeFantasia: '', cnpj: '', cpf: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', cep: '' })
    setEditingId(null)
    setShowForm(false)
    setCnpjStatus('idle')
    setCnpjMessage('')
  }

  const startEdit = (c: Cliente) => {
    setForm({
      razaoSocial: c.razaoSocial,
      nomeFantasia: c.nomeFantasia || '',
      cnpj: c.cnpj || '',
      cpf: c.cpf || '',
      email: c.email || '',
      telefone: c.telefone || '',
      endereco: c.endereco || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
      cep: c.cep || '',
    })
    setEditingId(c.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.razaoSocial.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        resetForm()
        fetchClientes()
      }
    } catch {
      // erro
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-dark-800">Clientes</h1>
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => { resetForm(); setShowForm(true) }}
        >
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-300" />
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="bg-white border border-dark-200 rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-800">
              {editingId ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <button onClick={resetForm} className="text-dark-400 hover:text-dark-600 active:text-dark-800 p-1.5 rounded-lg hover:bg-dark-50">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Razao Social"
                required
                value={form.razaoSocial}
                onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
                placeholder="Nome da empresa"
              />
              <Input
                label="Nome Fantasia"
                value={form.nomeFantasia}
                onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
                placeholder="Nome fantasia"
              />
              <div className="relative">
                <Input
                  label="CNPJ"
                  value={form.cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  hint={cnpjLoading ? undefined : cnpjStatus === 'idle' ? 'Digite o CNPJ para buscar dados automaticamente' : undefined}
                />
                {cnpjLoading && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Consultando Receita Federal...</span>
                  </div>
                )}
                {cnpjStatus === 'success' && cnpjMessage && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{cnpjMessage}</span>
                  </div>
                )}
                {cnpjStatus === 'error' && cnpjMessage && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{cnpjMessage}</span>
                  </div>
                )}
              </div>
              <Input
                label="CPF"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@empresa.com"
              />
              <Input
                label="Telefone"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
              <Input
                label="Endereco"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                placeholder="Rua, numero"
              />
              <Input
                label="Cidade"
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                placeholder="Cidade"
              />
              <Input
                label="Estado"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                placeholder="UF"
              />
              <Input
                label="CEP"
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: e.target.value })}
                placeholder="00000-000"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" loading={saving}>
                {editingId ? 'Salvar Alteracoes' : 'Criar Cliente'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-16 w-16 text-dark-200 mb-4" />
          <h3 className="text-lg font-medium text-dark-600">Nenhum cliente encontrado</h3>
          <p className="text-sm text-dark-400 mt-1">
            {search ? 'Tente outro termo de busca.' : 'Adicione seu primeiro cliente.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientes.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-dark-100 rounded-xl overflow-hidden hover:border-dark-200 transition-colors"
            >
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-dark-800 truncate">{c.razaoSocial}</h3>
                    <p className="text-xs text-dark-400">
                      {c.cnpj ? formatCNPJ(c.cnpj) : c.cpf ? formatCPF(c.cpf) : 'Sem documento'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(c) }}
                    className="p-2 text-dark-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  {expandedId === c.id
                    ? <ChevronUp className="h-4 w-4 text-dark-300" />
                    : <ChevronDown className="h-4 w-4 text-dark-300" />
                  }
                </div>
              </div>

              {expandedId === c.id && (
                <div className="px-5 pb-4 pt-0 border-t border-dark-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-sm">
                    {c.nomeFantasia && (
                      <div className="flex items-center gap-2 text-dark-600">
                        <Building2 className="h-4 w-4 text-dark-300" />
                        {c.nomeFantasia}
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2 text-dark-600">
                        <Mail className="h-4 w-4 text-dark-300" />
                        {c.email}
                      </div>
                    )}
                    {c.telefone && (
                      <div className="flex items-center gap-2 text-dark-600">
                        <Phone className="h-4 w-4 text-dark-300" />
                        {formatPhone(c.telefone)}
                      </div>
                    )}
                    {(c.endereco || c.cidade) && (
                      <div className="flex items-center gap-2 text-dark-600">
                        <MapPin className="h-4 w-4 text-dark-300" />
                        {[c.endereco, c.cidade, c.estado].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
