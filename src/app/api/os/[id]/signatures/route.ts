import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOSSession } from '@/lib/os-auth'
import { gerarPdfOS } from '@/lib/pdf-os'

// POST /api/os/[id]/signatures - Adicionar assinatura
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getOSSession()
  if (!session || !session.canSign) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: params.id },
      include: { assinaturas: true },
    })

    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    if (os.status === 'COMPLETED' || os.status === 'CANCELED') {
      return NextResponse.json({ error: 'OS já finalizada ou cancelada' }, { status: 400 })
    }

    const body = await request.json()
    const { tipo, nome, cpf, cargo, imageBase64 } = body

    if (!tipo || !['tecnico', 'cliente'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo deve ser "tecnico" ou "cliente"' }, { status: 400 })
    }

    if (!nome || !imageBase64) {
      return NextResponse.json({ error: 'Nome e imagem da assinatura são obrigatórios' }, { status: 400 })
    }

    // Verifica se já existe assinatura do mesmo tipo
    const existingSignature = os.assinaturas.find(a => a.tipo === tipo)
    if (existingSignature) {
      return NextResponse.json({ error: `Já existe assinatura do tipo "${tipo}"` }, { status: 400 })
    }

    // Converte base64 para buffer
    const imageBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')

    // Captura IP e User-Agent
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const signature = await prisma.serviceOrderSignature.create({
      data: {
        serviceOrderId: params.id,
        tipo,
        nomeSignatario: nome,
        cpfSignatario: cpf || null,
        cargoSignatario: cargo || null,
        imagemAssinatura: imageBuffer,
        ip,
        userAgent,
      },
    })

    // Atualiza status da OS
    const allSignatures = [...os.assinaturas, signature]
    const hasTecnico = allSignatures.some(a => a.tipo === 'tecnico')
    const hasCliente = allSignatures.some(a => a.tipo === 'cliente')

    let newStatus: string = os.status
    if (hasTecnico && hasCliente) {
      newStatus = 'COMPLETED'
    } else if (os.status === 'DRAFT' && (hasTecnico || hasCliente)) {
      newStatus = 'PENDING_SIGNATURE'
    }

    if (newStatus !== os.status) {
      await prisma.serviceOrder.update({
        where: { id: params.id },
        data: { status: newStatus as any },
      })
    }

    // Gera PDF automaticamente quando a OS é concluída
    if (newStatus === 'COMPLETED') {
      try {
        const fullOS = await prisma.serviceOrder.findUnique({
          where: { id: params.id },
          include: {
            cliente: true,
            tecnico: { select: { name: true } },
            fotos: true,
            assinaturas: true,
          },
        })

        if (fullOS) {
          const pdfBytes = await gerarPdfOS({
            osNumber: fullOS.osNumber,
            serviceDate: fullOS.serviceDate,
            horaInicio: fullOS.horaInicio,
            horaFim: fullOS.horaFim,
            observations: fullOS.observations,
            equipments: (fullOS.equipments as any[]) || [],
            cliente: fullOS.cliente,
            tecnico: fullOS.tecnico,
            fotos: fullOS.fotos.map(f => ({
              conteudo: Buffer.from(f.conteudo),
              mimeType: f.mimeType,
              legenda: f.legenda,
              equipmentIndex: f.equipmentIndex,
            })),
            assinaturas: fullOS.assinaturas.map(a => ({
              tipo: a.tipo,
              nomeSignatario: a.nomeSignatario,
              cpfSignatario: a.cpfSignatario,
              cargoSignatario: a.cargoSignatario,
              imagemAssinatura: Buffer.from(a.imagemAssinatura),
              assinadoEm: a.assinadoEm,
            })),
            createdAt: fullOS.createdAt,
          })

          await prisma.serviceOrder.update({
            where: { id: params.id },
            data: { pdfConteudo: Buffer.from(pdfBytes) },
          })
        }
      } catch (pdfError) {
        console.error('Erro ao gerar PDF automaticamente:', pdfError)
        // Não impede a resposta - o PDF pode ser gerado depois
      }
    }

    return NextResponse.json({
      ...signature,
      imagemAssinatura: undefined,
      newStatus,
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao adicionar assinatura:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
