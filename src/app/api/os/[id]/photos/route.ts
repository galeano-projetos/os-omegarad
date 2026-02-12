import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOSSession } from '@/lib/os-auth'

// POST /api/os/[id]/photos - Upload de foto
export async function POST(
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
      select: { id: true, tecnicoId: true },
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const legenda = formData.get('legenda') as string | null
    const equipmentIndex = formData.get('equipmentIndex') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.' }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const photo = await prisma.serviceOrderPhoto.create({
      data: {
        serviceOrderId: params.id,
        conteudo: buffer,
        mimeType: file.type,
        nomeArquivo: file.name,
        tamanho: file.size,
        legenda: legenda || null,
        equipmentIndex: equipmentIndex ? parseInt(equipmentIndex) : null,
      },
      select: {
        id: true,
        mimeType: true,
        nomeArquivo: true,
        tamanho: true,
        legenda: true,
        equipmentIndex: true,
        createdAt: true,
      },
    })

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    console.error('Erro ao upload foto:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
