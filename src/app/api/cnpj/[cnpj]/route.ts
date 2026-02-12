import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/cnpj/[cnpj] - Consulta CNPJ na BrasilAPI (Receita Federal)
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
    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      console.error(`BrasilAPI error: status=${response.status} body=${errorBody}`)
      if (response.status === 404) {
        return NextResponse.json({ error: 'CNPJ não encontrado' }, { status: 404 })
      }
      if (response.status === 429) {
        return NextResponse.json({ error: 'Muitas consultas, tente novamente em instantes' }, { status: 429 })
      }
      return NextResponse.json({ error: `Erro ao consultar CNPJ (${response.status})` }, { status: 502 })
    }

    const data = await response.json()

    // Monta endereço completo
    const partsEndereco = [
      data.descricao_tipo_de_logradouro,
      data.logradouro,
      data.numero,
      data.complemento,
      data.bairro,
    ].filter(Boolean)

    const endereco = partsEndereco.join(', ')

    // Formata telefone (pode vir como "1133334444" ou "11 3333-4444")
    let telefone = (data.ddd_telefone_1 || '').replace(/\D/g, '')
    if (telefone.length === 10) {
      telefone = `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`
    } else if (telefone.length === 11) {
      telefone = `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`
    }

    return NextResponse.json({
      razaoSocial: data.razao_social || '',
      nomeFantasia: data.nome_fantasia || '',
      email: (data.email || '').toLowerCase(),
      telefone,
      endereco,
      cidade: data.municipio || '',
      estado: data.uf || '',
      cep: data.cep || '',
    })
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error)
    return NextResponse.json({ error: 'Erro ao consultar CNPJ' }, { status: 500 })
  }
}
