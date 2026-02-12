import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOSSession } from '@/lib/os-auth'
import { gerarPdfOS } from '@/lib/pdf-os'
import { formatOSNumber } from '@/lib/utils'

// POST /api/os/[id]/pdf - Gerar PDF
export async function POST(
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
        tecnico: { select: { name: true } },
        fotos: true,
        assinaturas: true,
      },
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    const pdfBytes = await gerarPdfOS({
      osNumber: os.osNumber,
      serviceDate: os.serviceDate,
      horaInicio: os.horaInicio,
      horaFim: os.horaFim,
      observations: os.observations,
      equipments: (os.equipments as any[]) || [],
      cliente: os.cliente,
      tecnico: os.tecnico,
      fotos: os.fotos.map(f => ({
        conteudo: Buffer.from(f.conteudo),
        mimeType: f.mimeType,
        legenda: f.legenda,
        equipmentIndex: f.equipmentIndex,
      })),
      assinaturas: os.assinaturas.map(a => ({
        tipo: a.tipo,
        nomeSignatario: a.nomeSignatario,
        cpfSignatario: a.cpfSignatario,
        cargoSignatario: a.cargoSignatario,
        imagemAssinatura: Buffer.from(a.imagemAssinatura),
        assinadoEm: a.assinadoEm,
      })),
      createdAt: os.createdAt,
    })

    // Salva PDF no banco
    await prisma.serviceOrder.update({
      where: { id: params.id },
      data: { pdfConteudo: Buffer.from(pdfBytes) },
    })

    return NextResponse.json({ message: 'PDF gerado com sucesso' })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }
}

// GET /api/os/[id]/pdf - Baixar PDF
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
      select: { pdfConteudo: true, osNumber: true },
    })

    if (!os || !os.pdfConteudo) {
      return NextResponse.json({ error: 'PDF não encontrado. Gere o PDF primeiro.' }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(os.pdfConteudo), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="OS-${formatOSNumber(os.osNumber)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Erro ao baixar PDF:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
