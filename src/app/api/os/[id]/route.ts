import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOSSession } from '@/lib/os-auth'

// GET /api/os/[id] - Detalhes da OS
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getOSSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        tecnico: { select: { id: true, name: true, email: true } },
        fotos: {
          select: { id: true, mimeType: true, nomeArquivo: true, tamanho: true, legenda: true, equipmentIndex: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        assinaturas: { orderBy: { assinadoEm: 'asc' } },
      },
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    // Verifica permissão
    if (session.role === 'tecnico' && os.tecnicoId !== session.userId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (session.role === 'cliente' && session.clienteId) {
      const clienteUser = await prisma.cliente.findUnique({
        where: { id: session.clienteId },
        select: { emailGrupo: true },
      })
      if (clienteUser?.emailGrupo) {
        const cliente = await prisma.cliente.findUnique({
          where: { id: os.clienteId },
          select: { emailGrupo: true },
        })
        if (cliente?.emailGrupo !== clienteUser.emailGrupo) {
          return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }
      } else if (os.clienteId !== session.clienteId) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }
    }

    return NextResponse.json(os)
  } catch (error) {
    console.error('Erro ao buscar OS:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT /api/os/[id] - Atualizar OS
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getOSSession()
  if (!session || !session.canEdit) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: params.id },
      select: { status: true, tecnicoId: true },
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    if (os.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Somente OS em rascunho pode ser editada' }, { status: 400 })
    }

    if (!session.isAdmin && os.tecnicoId !== session.userId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { clienteId, serviceDate, horaInicio, horaFim, observations, equipments, status } = body

    const updateData: any = {}
    if (clienteId) updateData.clienteId = clienteId
    if (serviceDate) updateData.serviceDate = new Date(serviceDate)
    if (horaInicio !== undefined) updateData.horaInicio = horaInicio || null
    if (horaFim !== undefined) updateData.horaFim = horaFim || null
    if (observations !== undefined) updateData.observations = observations || null
    if (equipments !== undefined) updateData.equipments = equipments
    if (status && ['PENDING_SIGNATURE', 'CANCELED'].includes(status)) {
      updateData.status = status
    }

    const updated = await prisma.serviceOrder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        cliente: { select: { razaoSocial: true } },
        tecnico: { select: { name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar OS:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE /api/os/[id] - Excluir OS
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getOSSession()
  if (!session || !session.canDelete) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: params.id },
      select: { tecnicoId: true },
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    if (!session.isAdmin && os.tecnicoId !== session.userId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.serviceOrderPhoto.deleteMany({ where: { serviceOrderId: params.id } }),
      prisma.serviceOrderSignature.deleteMany({ where: { serviceOrderId: params.id } }),
      prisma.serviceOrder.delete({ where: { id: params.id } }),
    ])

    return NextResponse.json({ message: 'OS excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir OS:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
