import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOSSession } from '@/lib/os-auth'

// GET /api/os/[id]/photos/[photoId] - Baixar foto
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  const session = await getOSSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const photo = await prisma.serviceOrderPhoto.findFirst({
      where: {
        id: params.photoId,
        serviceOrderId: params.id,
      },
    })

    if (!photo) {
      return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(photo.conteudo), {
      headers: {
        'Content-Type': photo.mimeType,
        'Content-Disposition': `inline; filename="${photo.nomeArquivo || 'photo'}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erro ao buscar foto:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE /api/os/[id]/photos/[photoId] - Excluir foto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  const session = await getOSSession()
  if (!session || !session.canEdit) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    await prisma.serviceOrderPhoto.delete({
      where: { id: params.photoId },
    })

    return NextResponse.json({ message: 'Foto excluída' })
  } catch (error) {
    console.error('Erro ao excluir foto:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
