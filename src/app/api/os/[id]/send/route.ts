import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOSSession } from '@/lib/os-auth'
import { gerarPdfOS } from '@/lib/pdf-os'
import { enviarEmailOS, enviarWhatsAppOS } from '@/lib/os-notifications'

// POST /api/os/[id]/send - Enviar OS por email e WhatsApp
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

    // Regenera PDF
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

    const pdfBuffer = Buffer.from(pdfBytes)

    // Salva PDF
    await prisma.serviceOrder.update({
      where: { id: params.id },
      data: { pdfConteudo: pdfBuffer },
    })

    const results = { email: { success: false, error: '' }, whatsapp: { success: false, error: '' } }

    // Envia email
    if (os.cliente.email) {
      const emailResult = await enviarEmailOS({
        to: os.cliente.email,
        osNumber: os.osNumber,
        serviceDate: os.serviceDate,
        tecnicoName: os.tecnico.name,
        clienteName: os.cliente.razaoSocial,
        pdfBuffer,
      })
      results.email = emailResult as any

      if (emailResult.success) {
        await prisma.serviceOrder.update({
          where: { id: params.id },
          data: { emailEnviadoEm: new Date() },
        })
      }
    } else {
      results.email = { success: false, error: 'Cliente sem email cadastrado' }
    }

    // Envia WhatsApp
    if (os.cliente.telefone) {
      const whatsappResult = await enviarWhatsAppOS({
        phone: os.cliente.telefone,
        osNumber: os.osNumber,
        serviceDate: os.serviceDate,
        tecnicoName: os.tecnico.name,
        clienteName: os.cliente.razaoSocial,
        portalUrl: process.env.NEXTAUTH_URL,
      })
      results.whatsapp = whatsappResult as any

      if (whatsappResult.success) {
        await prisma.serviceOrder.update({
          where: { id: params.id },
          data: { whatsappEnviadoEm: new Date() },
        })
      }
    } else {
      results.whatsapp = { success: false, error: 'Cliente sem telefone cadastrado' }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Erro ao enviar OS:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
