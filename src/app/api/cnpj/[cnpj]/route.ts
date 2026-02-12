import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface CNPJResult {
  razaoSocial: string
  nomeFantasia: string
  email: string
  telefone: string
  endereco: string
  cidade: string
  estado: string
  cep: string
}

// Tenta BrasilAPI
async function fetchBrasilAPI(cnpj: string): Promise<CNPJResult | null> {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null

  const data = await res.json()
  const partsEndereco = [
    data.descricao_tipo_de_logradouro,
    data.logradouro,
    data.numero,
    data.complemento,
    data.bairro,
  ].filter(Boolean)

  let telefone = (data.ddd_telefone_1 || '').replace(/\D/g, '')
  if (telefone.length === 10) {
    telefone = `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`
  } else if (telefone.length === 11) {
    telefone = `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`
  }

  return {
    razaoSocial: data.razao_social || '',
    nomeFantasia: data.nome_fantasia || '',
    email: (data.email || '').toLowerCase(),
    telefone,
    endereco: partsEndereco.join(', '),
    cidade: data.municipio || '',
    estado: data.uf || '',
    cep: data.cep || '',
  }
}

// Fallback: ReceitaWS
async function fetchReceitaWS(cnpj: string): Promise<CNPJResult | null> {
  const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null

  const data = await res.json()
  if (data.status === 'ERROR') return null

  const partsEndereco = [
    data.logradouro,
    data.numero,
    data.complemento,
    data.bairro,
  ].filter(Boolean)

  let telefone = (data.telefone || '').replace(/[^\d]/g, '')
  if (telefone.length > 11) telefone = telefone.slice(0, 11)
  if (telefone.length === 10) {
    telefone = `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`
  } else if (telefone.length === 11) {
    telefone = `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`
  }

  return {
    razaoSocial: data.nome || '',
    nomeFantasia: data.fantasia || '',
    email: (data.email || '').toLowerCase(),
    telefone,
    endereco: partsEndereco.join(', '),
    cidade: data.municipio || '',
    estado: data.uf || '',
    cep: (data.cep || '').replace(/[^\d]/g, ''),
  }
}

// GET /api/cnpj/[cnpj] - Consulta CNPJ com fallback entre APIs
export async function GET(
  _request: NextRequest,
  { params }: { params: { cnpj: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const cnpjDigits = params.cnpj.replace(/\D/g, '')

  if (cnpjDigits.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos' }, { status: 400 })
  }

  try {
    // Tenta BrasilAPI primeiro, depois ReceitaWS como fallback
    let result = await fetchBrasilAPI(cnpjDigits).catch(() => null)

    if (!result) {
      console.log('BrasilAPI falhou, tentando ReceitaWS...')
      result = await fetchReceitaWS(cnpjDigits).catch(() => null)
    }

    if (!result) {
      return NextResponse.json({ error: 'CNPJ não encontrado' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error)
    return NextResponse.json({ error: 'Erro ao consultar CNPJ' }, { status: 500 })
  }
}
