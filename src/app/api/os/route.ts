import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOSSession } from '@/lib/os-auth'

// GET /api/os - Listar Ordens de Serviço
export async function GET(request: NextRequest) {
  const session = await getOSSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
  const skip = (page - 1) * limit

  try {
    const where: any = {}

    // Filtro por role
    if (session.role === 'colaborador' || session.role === 'tecnico') {
      where.tecnicoId = session.userId
    } else if (session.role === 'cliente' && session.clienteId) {
      const clienteUser = await prisma.cliente.findUnique({
        where: { id: session.clienteId },
        select: { emailGrupo: true },
      })
      if (clienteUser?.emailGrupo) {
        const clienteIds = await prisma.cliente.findMany({
          where: { emailGrupo: clienteUser.emailGrupo },
          select: { id: true },
        })
        where.clienteId = { in: clienteIds.map(c => c.id) }
      } else {
        where.clienteId = session.clienteId
      }
    }

    // Filtro por status
    if (status && ['DRAFT', 'PENDING_SIGNATURE', 'COMPLETED', 'CANCELED'].includes(status)) {
      where.status = status
    }

    // Filtro por busca
    if (search) {
      where.OR = [
        { cliente: { razaoSocial: { contains: search, mode: 'insensitive' } } },
        { cliente: { cnpj: { contains: search } } },
        { observations: { contains: search, mode: 'insensitive' } },
        ...(isNaN(parseInt(search)) ? [] : [{ osNumber: parseInt(search) }]),
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.serviceOrder.findMany({
        where,
        include: {
          cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true } },
          tecnico: { select: { id: true, name: true } },
          _count: { select: { fotos: true, assinaturas: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.serviceOrder.count({ where }),
    ])

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao listar OS:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/os - Criar nova OS
export async function POST(request: NextRequest) {
  const session = await getOSSession()
  if (!session || !session.canCreate) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { clienteId, serviceDate, horaInicio, horaFim, observations, equipments } = body

    if (!clienteId || !serviceDate) {
      return NextResponse.json({ error: 'Cliente e data do serviço são obrigatórios' }, { status: 400 })
    }

    // Gera número da OS com transação
    const result = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear()
      const yearPrefix = year * 10000

      const lastOS = await tx.serviceOrder.findFirst({
        where: { osNumber: { gte: yearPrefix, lt: yearPrefix + 10000 } },
        orderBy: { osNumber: 'desc' },
        select: { osNumber: true },
      })

      const nextNumber = lastOS ? lastOS.osNumber + 1 : yearPrefix + 1

      // Auto-criar equipamentos se necessário
      if (equipments && Array.isArray(equipments)) {
        for (const equip of equipments) {
          if (equip.equipamentoId) continue
          if (equip.numeroSerie) {
            const existing = await tx.equipamento.findUnique({
              where: { clienteId_numeroSerie: { clienteId, numeroSerie: equip.numeroSerie } },
            })
            if (!existing) {
              await tx.equipamento.create({
                data: {
                  clienteId,
                  nome: equip.equipmentName,
                  fabricante: equip.fabricante || null,
                  modelo: equip.modelo || null,
                  numeroSerie: equip.numeroSerie,
                },
              })
            }
          }
        }
      }

      const os = await tx.serviceOrder.create({
        data: {
          osNumber: nextNumber,
          clienteId,
          tecnicoId: session.userId,
          serviceDate: new Date(serviceDate),
          horaInicio: horaInicio || null,
          horaFim: horaFim || null,
          observations: observations || null,
          equipments: equipments || [],
          status: 'DRAFT',
        },
        include: {
          cliente: { select: { razaoSocial: true } },
          tecnico: { select: { name: true } },
        },
      })

      return os
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar OS:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
