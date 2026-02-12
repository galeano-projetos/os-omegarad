import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { formatCNPJ, formatCPF, formatDate, formatOSNumber } from './utils'

interface Equipment {
  equipmentName: string
  serviceTypeNames: string[]
  periodicidade?: string
  fabricante?: string
  modelo?: string
  numeroSerie?: string
}

interface Photo {
  conteudo: Buffer
  mimeType: string
  legenda?: string | null
  equipmentIndex?: number | null
}

interface Signature {
  tipo: string
  nomeSignatario: string
  cpfSignatario?: string | null
  cargoSignatario?: string | null
  imagemAssinatura: Buffer
  assinadoEm: Date
}

export interface OSPdfData {
  osNumber: number
  serviceDate: Date
  horaInicio?: string | null
  horaFim?: string | null
  observations?: string | null
  equipments: Equipment[]
  cliente: {
    razaoSocial: string
    nomeFantasia?: string | null
    cnpj?: string | null
    cpf?: string | null
    email?: string | null
    telefone?: string | null
    endereco?: string | null
    cidade?: string | null
    estado?: string | null
    cep?: string | null
  }
  tecnico: {
    name: string
  }
  fotos: Photo[]
  assinaturas: Signature[]
  createdAt: Date
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const PRIMARY_COLOR = rgb(0.82, 0.72, 0.16) // Amarelo Omegarad #D1B829
const DARK_COLOR = rgb(0.1, 0.1, 0.1)
const GRAY_COLOR = rgb(0.4, 0.4, 0.4)
const LIGHT_BG = rgb(0.96, 0.96, 0.94)

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, fontSize)
    if (width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export async function gerarPdfOS(data: OSPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  // Tenta carregar a logo
  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedJpg>> | null = null
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logos', 'logo-preta-fundo-branco.jpeg')
    const logoBytes = fs.readFileSync(logoPath)
    logoImage = await pdfDoc.embedJpg(logoBytes)
  } catch {
    // Logo não encontrada - continua sem
  }

  function addNewPage(): PDFPage {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - MARGIN
    return page
  }

  function checkSpace(needed: number) {
    if (y - needed < MARGIN + 30) {
      addNewPage()
    }
  }

  function drawLine() {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    })
    y -= 10
  }

  // === HEADER ===
  if (logoImage) {
    const logoScale = 60 / logoImage.height
    const logoWidth = logoImage.width * logoScale
    page.drawImage(logoImage, {
      x: MARGIN,
      y: y - 60,
      width: logoWidth,
      height: 60,
    })
  }

  page.drawText('ORDEM DE SERVICO', {
    x: PAGE_WIDTH / 2 - fontBold.widthOfTextAtSize('ORDEM DE SERVICO', 18) / 2,
    y: y - 20,
    size: 18,
    font: fontBold,
    color: DARK_COLOR,
  })

  const osLabel = `OS ${formatOSNumber(data.osNumber)}`
  page.drawText(osLabel, {
    x: PAGE_WIDTH / 2 - fontBold.widthOfTextAtSize(osLabel, 12) / 2,
    y: y - 38,
    size: 12,
    font: fontBold,
    color: PRIMARY_COLOR,
  })

  const dateLabel = formatDate(data.serviceDate)
  page.drawText(dateLabel, {
    x: PAGE_WIDTH / 2 - fontRegular.widthOfTextAtSize(dateLabel, 10) / 2,
    y: y - 52,
    size: 10,
    font: fontRegular,
    color: GRAY_COLOR,
  })

  y -= 75
  drawLine()

  // === DADOS DO CLIENTE ===
  checkSpace(120)
  page.drawText('DADOS DO CLIENTE', { x: MARGIN, y, size: 12, font: fontBold, color: DARK_COLOR })
  y -= 18

  const clienteFields = [
    ['Razao Social', data.cliente.razaoSocial],
    ['Nome Fantasia', data.cliente.nomeFantasia],
    ['CNPJ', data.cliente.cnpj ? formatCNPJ(data.cliente.cnpj) : null],
    ['CPF', data.cliente.cpf ? formatCPF(data.cliente.cpf) : null],
    ['Email', data.cliente.email],
    ['Telefone', data.cliente.telefone],
    ['Endereco', [data.cliente.endereco, data.cliente.cidade, data.cliente.estado, data.cliente.cep].filter(Boolean).join(', ')],
  ]

  for (const [label, value] of clienteFields) {
    if (!value) continue
    checkSpace(16)
    page.drawText(`${label}: `, { x: MARGIN + 10, y, size: 9, font: fontBold, color: DARK_COLOR })
    const labelWidth = fontBold.widthOfTextAtSize(`${label}: `, 9)
    page.drawText(String(value), { x: MARGIN + 10 + labelWidth, y, size: 9, font: fontRegular, color: GRAY_COLOR })
    y -= 14
  }

  y -= 10
  drawLine()

  // === DADOS DO SERVICO ===
  checkSpace(80)
  page.drawText('DADOS DO SERVICO', { x: MARGIN, y, size: 12, font: fontBold, color: DARK_COLOR })
  y -= 18

  const serviceFields = [
    ['Tecnico Responsavel', data.tecnico.name],
    ['Data do Servico', formatDate(data.serviceDate)],
    ['Horario', [data.horaInicio, data.horaFim].filter(Boolean).join(' - ') || null],
    ['Data de Criacao', formatDate(data.createdAt)],
  ]

  for (const [label, value] of serviceFields) {
    if (!value) continue
    checkSpace(16)
    page.drawText(`${label}: `, { x: MARGIN + 10, y, size: 9, font: fontBold, color: DARK_COLOR })
    const labelWidth = fontBold.widthOfTextAtSize(`${label}: `, 9)
    page.drawText(String(value), { x: MARGIN + 10 + labelWidth, y, size: 9, font: fontRegular, color: GRAY_COLOR })
    y -= 14
  }

  y -= 10
  drawLine()

  // === EQUIPAMENTOS ===
  if (data.equipments && data.equipments.length > 0) {
    checkSpace(40)
    page.drawText('EQUIPAMENTOS', { x: MARGIN, y, size: 12, font: fontBold, color: DARK_COLOR })
    y -= 18

    for (let i = 0; i < data.equipments.length; i++) {
      const equip = data.equipments[i]
      checkSpace(80)

      // Background do equipamento
      page.drawRectangle({
        x: MARGIN,
        y: y - 60,
        width: CONTENT_WIDTH,
        height: 70,
        color: LIGHT_BG,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 0.5,
      })

      page.drawText(`${i + 1}. ${equip.equipmentName}`, {
        x: MARGIN + 10, y: y - 2, size: 10, font: fontBold, color: DARK_COLOR,
      })
      y -= 14

      if (equip.serviceTypeNames?.length) {
        page.drawText(`Servicos: ${equip.serviceTypeNames.join(', ')}`, {
          x: MARGIN + 10, y: y - 2, size: 8, font: fontRegular, color: GRAY_COLOR,
        })
        y -= 12
      }

      const details = [
        equip.periodicidade ? `Periodicidade: ${equip.periodicidade}` : null,
        equip.fabricante ? `Fabricante: ${equip.fabricante}` : null,
        equip.modelo ? `Modelo: ${equip.modelo}` : null,
        equip.numeroSerie ? `N/S: ${equip.numeroSerie}` : null,
      ].filter(Boolean)

      if (details.length) {
        page.drawText(details.join(' | '), {
          x: MARGIN + 10, y: y - 2, size: 8, font: fontRegular, color: GRAY_COLOR,
        })
        y -= 12
      }

      // Fotos vinculadas ao equipamento
      const equipPhotos = data.fotos.filter(f => f.equipmentIndex === i)
      if (equipPhotos.length > 0) {
        y -= 10
        for (const foto of equipPhotos) {
          checkSpace(160)
          try {
            let img
            if (foto.mimeType === 'image/png') {
              img = await pdfDoc.embedPng(foto.conteudo)
            } else {
              img = await pdfDoc.embedJpg(foto.conteudo)
            }
            const scale = Math.min(150 / img.width, 150 / img.height)
            const w = img.width * scale
            const h = img.height * scale
            page.drawImage(img, { x: MARGIN + 10, y: y - h, width: w, height: h })
            if (foto.legenda) {
              page.drawText(foto.legenda, {
                x: MARGIN + 10, y: y - h - 12, size: 7, font: fontRegular, color: GRAY_COLOR,
              })
              y -= h + 20
            } else {
              y -= h + 10
            }
          } catch {
            // Foto corrompida - pula
          }
        }
      }

      y -= 15
    }

    drawLine()
  }

  // === OBSERVACOES ===
  if (data.observations) {
    checkSpace(60)
    page.drawText('OBSERVACOES', { x: MARGIN, y, size: 12, font: fontBold, color: DARK_COLOR })
    y -= 18

    const lines = wrapText(data.observations, fontRegular, 9, CONTENT_WIDTH - 20)
    for (const line of lines) {
      checkSpace(14)
      page.drawText(line, { x: MARGIN + 10, y, size: 9, font: fontRegular, color: GRAY_COLOR })
      y -= 14
    }

    y -= 10
    drawLine()
  }

  // === FOTOS SEM VINCULO ===
  const unlinkedPhotos = data.fotos.filter(f => f.equipmentIndex == null)
  if (unlinkedPhotos.length > 0) {
    checkSpace(40)
    page.drawText('FOTOS GERAIS', { x: MARGIN, y, size: 12, font: fontBold, color: DARK_COLOR })
    y -= 18

    let xOffset = MARGIN
    for (const foto of unlinkedPhotos) {
      checkSpace(180)
      try {
        let img
        if (foto.mimeType === 'image/png') {
          img = await pdfDoc.embedPng(foto.conteudo)
        } else {
          img = await pdfDoc.embedJpg(foto.conteudo)
        }
        const maxW = (CONTENT_WIDTH - 20) / 2
        const scale = Math.min(maxW / img.width, 160 / img.height)
        const w = img.width * scale
        const h = img.height * scale

        if (xOffset + w > PAGE_WIDTH - MARGIN) {
          xOffset = MARGIN
          y -= 175
          checkSpace(180)
        }

        page.drawImage(img, { x: xOffset, y: y - h, width: w, height: h })
        if (foto.legenda) {
          page.drawText(foto.legenda, {
            x: xOffset, y: y - h - 12, size: 7, font: fontRegular, color: GRAY_COLOR,
          })
        }
        xOffset += w + 15
      } catch {
        // Foto corrompida
      }
    }
    y -= 180
    drawLine()
  }

  // === ASSINATURAS ===
  if (data.assinaturas.length > 0) {
    checkSpace(140)
    page.drawText('ASSINATURAS', { x: MARGIN, y, size: 12, font: fontBold, color: DARK_COLOR })
    y -= 25

    const sigTecnico = data.assinaturas.find(a => a.tipo === 'tecnico')
    const sigCliente = data.assinaturas.find(a => a.tipo === 'cliente')

    const drawSignature = async (sig: Signature, xPos: number) => {
      try {
        const img = await pdfDoc.embedPng(sig.imagemAssinatura)
        const scale = Math.min(180 / img.width, 60 / img.height)
        page.drawImage(img, {
          x: xPos, y: y - 60, width: img.width * scale, height: img.height * scale,
        })
      } catch {
        // Assinatura inválida
      }

      page.drawLine({
        start: { x: xPos, y: y - 65 },
        end: { x: xPos + 200, y: y - 65 },
        thickness: 0.5,
        color: DARK_COLOR,
      })

      page.drawText(sig.nomeSignatario, {
        x: xPos, y: y - 78, size: 9, font: fontBold, color: DARK_COLOR,
      })

      if (sig.cpfSignatario) {
        page.drawText(`CPF: ${sig.cpfSignatario}`, {
          x: xPos, y: y - 90, size: 7, font: fontRegular, color: GRAY_COLOR,
        })
      }
      if (sig.cargoSignatario) {
        page.drawText(sig.cargoSignatario, {
          x: xPos, y: y - 100, size: 7, font: fontRegular, color: GRAY_COLOR,
        })
      }
      page.drawText(formatDate(sig.assinadoEm), {
        x: xPos, y: y - 112, size: 7, font: fontRegular, color: GRAY_COLOR,
      })
    }

    if (sigTecnico) {
      page.drawText('Tecnico', { x: MARGIN + 10, y, size: 9, font: fontBold, color: PRIMARY_COLOR })
      await drawSignature(sigTecnico, MARGIN + 10)
    }

    if (sigCliente) {
      page.drawText('Cliente', { x: PAGE_WIDTH / 2 + 10, y, size: 9, font: fontBold, color: PRIMARY_COLOR })
      await drawSignature(sigCliente, PAGE_WIDTH / 2 + 10)
    }
  }

  // === FOOTER ===
  const pages = pdfDoc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    const footer = `Omegarad - Fisica Medica e Radioprotecao | Pagina ${i + 1} de ${pages.length}`
    p.drawText(footer, {
      x: PAGE_WIDTH / 2 - fontRegular.widthOfTextAtSize(footer, 7) / 2,
      y: 20,
      size: 7,
      font: fontRegular,
      color: GRAY_COLOR,
    })
  }

  return pdfDoc.save()
}
