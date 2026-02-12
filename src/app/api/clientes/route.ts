import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOSSession } from '@/lib/os-auth'

// GET /api/clientes - Listar clientes
export async function GET(request: NextRequest) {
  const session = await getOSSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

  try {
    const where: any = { active: true }

    if (search) {
      where.OR = [
        { razaoSocial: { contains: search, mode: 'insensitive' } },
        { nomeFantasia: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search } },
      ]
    }

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { razaoSocial: 'asc' },
      take: 50,
    })

    return NextResponse.json(clientes)
  } catch (error) {
    console.error('Erro ao listar clientes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/clientes - Criar cliente
export async function POST(request: NextRequest) {
  const session = await getOSSession()
  if (!session || !session.canCreate) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { razaoSocial, nomeFantasia, cnpj, cpf, email, telefone, endereco, cidade, estado, cep } = body

    if (!razaoSocial) {
      return NextResponse.json({ error: 'Razão social é obrigatória' }, { status: 400 })
    }

    const cliente = await prisma.cliente.create({
      data: {
        razaoSocial,
        nomeFantasia: nomeFantasia || null,
        cnpj: cnpj || null,
        cpf: cpf || null,
        email: email || null,
        telefone: telefone || null,
        endereco: endereco || null,
        cidade: cidade || null,
        estado: estado || null,
        cep: cep || null,
      },
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
