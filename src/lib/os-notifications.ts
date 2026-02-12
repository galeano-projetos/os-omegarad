import { Resend } from 'resend'
import axios from 'axios'
import { formatOSNumber, formatDate } from './utils'

interface EmailOSParams {
  to: string
  osNumber: number
  serviceDate: Date
  tecnicoName: string
  clienteName: string
  pdfBuffer?: Buffer
}

interface WhatsAppOSParams {
  phone: string
  osNumber: number
  serviceDate: Date
  tecnicoName: string
  clienteName: string
  portalUrl?: string
}

export async function enviarEmailOS(params: EmailOSParams) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY não configurada')
    return { success: false, error: 'API key não configurada' }
  }

  const resend = new Resend(apiKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@omegarad.com.br'

  try {
    const attachments = params.pdfBuffer
      ? [{ filename: `OS-${formatOSNumber(params.osNumber)}.pdf`, content: params.pdfBuffer }]
      : []

    await resend.emails.send({
      from: `Omegarad <${fromEmail}>`,
      to: params.to,
      subject: `Ordem de Servico ${formatOSNumber(params.osNumber)} - Omegarad`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #1a1a1a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #D1B829; margin: 0; font-size: 24px;">OMEGARAD</h1>
            <p style="color: #ccc; margin: 5px 0 0; font-size: 12px;">Fisica Medica e Radioprotecao</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
            <h2 style="color: #333; margin-top: 0;">Ordem de Servico</h2>
            <div style="background-color: #fff; padding: 15px; border-radius: 6px; border-left: 4px solid #D1B829;">
              <p style="margin: 5px 0;"><strong>OS:</strong> ${formatOSNumber(params.osNumber)}</p>
              <p style="margin: 5px 0;"><strong>Data do Servico:</strong> ${formatDate(params.serviceDate)}</p>
              <p style="margin: 5px 0;"><strong>Tecnico:</strong> ${params.tecnicoName}</p>
              <p style="margin: 5px 0;"><strong>Cliente:</strong> ${params.clienteName}</p>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              ${params.pdfBuffer ? 'O PDF da Ordem de Servico esta anexado a este email.' : 'A Ordem de Servico foi registrada em nosso sistema.'}
            </p>
          </div>
          <div style="text-align: center; padding: 15px; color: #999; font-size: 11px;">
            <p>Omegarad - Fisica Medica e Radioprotecao</p>
          </div>
        </div>
      `,
      attachments,
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return { success: false, error: String(error) }
  }
}

export async function enviarWhatsAppOS(params: WhatsAppOSParams) {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE_NAME

  if (!apiUrl || !apiKey || !instance) {
    console.warn('Evolution API nao configurada')
    return { success: false, error: 'WhatsApp nao configurado' }
  }

  const phone = params.phone.replace(/\D/g, '')
  const message = [
    `*OMEGARAD - Ordem de Servico*`,
    ``,
    `OS: *${formatOSNumber(params.osNumber)}*`,
    `Data: ${formatDate(params.serviceDate)}`,
    `Tecnico: ${params.tecnicoName}`,
    `Cliente: ${params.clienteName}`,
    ``,
    params.portalUrl ? `Acesse o portal: ${params.portalUrl}` : '',
    ``,
    `_Omegarad - Fisica Medica e Radioprotecao_`,
  ].filter(Boolean).join('\n')

  try {
    await axios.post(
      `${apiUrl}/message/sendText/${instance}`,
      {
        number: `55${phone}`,
        text: message,
      },
      {
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
      }
    )

    return { success: true }
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error)
    return { success: false, error: String(error) }
  }
}
