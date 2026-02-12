import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOSSession } from '@/lib/os-auth'

// GET /api/equipamentos - Listar equipamentos de um cliente
export async function GET(request: NextRequest) {
  const session = await getOSSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clienteId = searchParams.get('clienteId')

  if (!clienteId) {
    return NextResponse.json({ error: 'clienteId é obrigatório' }, { status: 400 })
  }

  try {
    const equipamentos = await prisma.equipamento.findMany({
      where: { clienteId, active: true },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json(equipamentos)
  } catch (error) {
    console.error('Erro ao listar equipamentos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
