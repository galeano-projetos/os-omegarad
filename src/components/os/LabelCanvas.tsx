'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import QRCode from 'qrcode'

export interface LabelData {
  responsavel: string
  telefone: string
  servicoTipo: string
  servicoDetalhe?: string
  dataRealizacao: string   // DD-MM-YYYY
  dataValidade: string     // DD-MM-YYYY
  disclaimer: string
  qrUrl: string
}

interface LabelCanvasProps {
  data: LabelData
  onCanvasReady: (canvas: HTMLCanvasElement) => void
}

// Canvas dimensions (landscape): 70mm x 40mm @ 203 DPI
const W = 560
const H = 320

// Virtual drawing dimensions (portrait, rotated 90°)
const VW = H  // 320
const VH = W  // 560

async function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (!word) continue
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

// Pre-loaded images cache
interface PreloadedAssets {
  qrImg: HTMLImageElement | null
  logoImg: HTMLImageElement | null
}

export default function LabelCanvas({ data, onCanvasReady }: LabelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const callbackRef = useRef(onCanvasReady)
  callbackRef.current = onCanvasReady
  const drawIdRef = useRef(0)
  const [assets, setAssets] = useState<PreloadedAssets | null>(null)

  // Step 1: Pre-load all async assets (QR + logo) without touching the canvas
  useEffect(() => {
    const currentId = ++drawIdRef.current

    const preload = async () => {
      let qrImg: HTMLImageElement | null = null
      try {
        const qrDataUrl = await QRCode.toDataURL(data.qrUrl, {
          width: 400,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        })
        qrImg = await loadImg(qrDataUrl)
      } catch {}

      const logoImg = await loadImg('/logos/logo-preta-fundo-branco.jpeg')

      // Only apply if this is still the latest preload
      if (currentId === drawIdRef.current) {
        setAssets({ qrImg, logoImg })
      }
    }

    preload()
  }, [data.qrUrl])

  // Step 2: Synchronous canvas drawing - no async calls, no race conditions
  const drawSync = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !assets) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Reset canvas completely
    canvas.width = W
    canvas.height = H
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#FFF'
    ctx.fillRect(0, 0, W, H)

    // Apply rotation: virtual portrait (320x560) → landscape canvas (560x320)
    ctx.save()
    ctx.translate(0, H)
    ctx.rotate(-Math.PI / 2)

    // ═══════════════════════════════════════════════════════════
    // Draw in VIRTUAL PORTRAIT space (320 wide × 560 tall)
    // Layout for Omegarad label style
    // ═══════════════════════════════════════════════════════════

    const pad = 10
    const contentW = VW - pad * 2

    // ── ZONE 1: QR Code + Logo + Phone ──

    const headerTopY = 4
    const qrSize = 115
    if (assets.qrImg) {
      ctx.drawImage(assets.qrImg, pad, headerTopY, qrSize, qrSize)
    }

    // Logo next to QR code
    const brandX = pad + qrSize + 6
    const brandMaxW = VW - brandX - pad

    if (assets.logoImg) {
      const logoTargetH = 120
      const aspect = assets.logoImg.width / assets.logoImg.height
      const logoTargetW = Math.min(logoTargetH * aspect, brandMaxW)
      const actualH = logoTargetW / aspect
      const logoX = brandX + (brandMaxW - logoTargetW) / 2
      const logoY = headerTopY + (qrSize - actualH) / 2
      ctx.drawImage(assets.logoImg, logoX, logoY, logoTargetW, actualH)
    } else {
      ctx.fillStyle = '#000'
      ctx.font = 'bold 20px Arial, sans-serif'
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      ctx.fillText('Omegarad', brandX, headerTopY + 10)
      ctx.font = '8px Arial, sans-serif'
      ctx.fillStyle = '#444'
      ctx.fillText('Física Médica e Radioproteção', brandX, headerTopY + 34)
    }

    // Phone — centered in brand area
    const brandCenterX = brandX + brandMaxW / 2
    const phoneY = headerTopY + qrSize + 6

    ctx.font = 'bold 13px Arial, sans-serif'
    ctx.fillStyle = '#000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(data.telefone, brandCenterX, phoneY)

    // Email — centered in brand area below phone
    const emailY = phoneY + 18
    ctx.fillStyle = '#000'
    ctx.font = '12px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('contato@omegarad.com.br', brandCenterX, emailY)

    // Separator
    const sep1Y = emailY + 18
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(pad, sep1Y)
    ctx.lineTo(VW - pad, sep1Y)
    ctx.stroke()

    // ── ZONES 2+3: Physicist + Service ──

    const physLabelH = 14
    const physNameH = 20
    const physGap = 2
    const sepGap = 6

    // Auto-scale service type font to fit available space
    const zoneTop = sep1Y
    const zoneMid = Math.round(VH / 2)
    const availableH = zoneMid - zoneTop - 4

    let svcFontSize = 22
    let svcLineH = 26
    let detFontSize = 14
    let detLineH = 18

    // Measure and auto-scale
    const measureBlock = () => {
      ctx.font = `bold ${svcFontSize}px Arial, sans-serif`
      const sl = wrapText(ctx, data.servicoTipo, contentW)
      ctx.font = `${detFontSize}px Arial, sans-serif`
      const dl = data.servicoDetalhe ? wrapText(ctx, data.servicoDetalhe, contentW) : []
      const sH = sl.length * svcLineH
      const dH = dl.length > 0 ? dl.length * detLineH + 3 : 0
      const total = physLabelH + physGap + physNameH + sepGap + 1 + sepGap + sH + dH
      return { sl, dl, total }
    }

    let measured = measureBlock()

    // Reduce service font if block overflows
    if (measured.total > availableH && svcFontSize > 18) {
      svcFontSize = 18
      svcLineH = 22
      measured = measureBlock()
    }
    if (measured.total > availableH && svcFontSize > 15) {
      svcFontSize = 15
      svcLineH = 19
      detFontSize = 12
      detLineH = 15
      measured = measureBlock()
    }

    const svcLines = measured.sl
    const detLines = measured.dl
    const combinedH = measured.total

    let bY = zoneTop + Math.round((availableH - combinedH) / 2)
    bY = Math.max(bY, zoneTop + 2)

    // Physicist label
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial, sans-serif'
    ctx.fillText('Físico médico responsável:', VW / 2, bY)
    bY += physLabelH + physGap

    // Physicist name
    ctx.fillStyle = '#000'
    ctx.font = 'bold 18px Arial, sans-serif'
    ctx.fillText(data.responsavel, VW / 2, bY)
    bY += physNameH + sepGap

    // Separator line
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(pad, bY)
    ctx.lineTo(VW - pad, bY)
    ctx.stroke()
    bY += 1 + sepGap

    // Service type (auto-scaled, bold, centered)
    ctx.fillStyle = '#000'
    ctx.font = `bold ${svcFontSize}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    let curY = bY
    for (const line of svcLines) {
      ctx.fillText(line, VW / 2, curY)
      curY += svcLineH
    }

    // Equipment detail (centered)
    if (detLines.length > 0) {
      curY += 3
      ctx.fillStyle = '#333'
      ctx.font = `${detFontSize}px Arial, sans-serif`
      for (const line of detLines) {
        ctx.fillText(line, VW / 2, curY)
        curY += 18
      }
    }

    // ── RIGHT HALF: Dates + Disclaimer ──
    const rightStart = Math.round(VH / 2)
    const rightEnd = VH - 6
    const rightSpace = rightEnd - rightStart

    // Pre-calculate disclaimer height
    ctx.font = '12px Arial, sans-serif'
    const discLines = wrapText(ctx, data.disclaimer, contentW)
    const discH = discLines.length * 15

    // Element heights
    const labelH = 22
    const boxH = 58

    const totalContentH = labelH + boxH + labelH + boxH + discH
    const gap = (rightSpace - totalContentH) / 4

    let ey = rightStart

    // 1) "Realizado em:"
    ctx.fillStyle = '#000'
    ctx.font = 'bold 20px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Realizado em:', VW / 2, ey)
    ey += labelH + gap

    // 2) Date box
    ctx.fillStyle = '#000'
    ctx.fillRect(0, Math.round(ey), VW, boxH)
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(data.dataRealizacao, VW / 2, Math.round(ey) + boxH / 2)
    ey += boxH + gap

    // 3) "Válido até:*"
    ctx.fillStyle = '#000'
    ctx.font = 'bold 20px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('Válido até:*', VW / 2, Math.round(ey))
    ey += labelH + gap

    // 4) Validity date box
    ctx.fillStyle = '#000'
    ctx.fillRect(0, Math.round(ey), VW, boxH)
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(data.dataValidade, VW / 2, Math.round(ey) + boxH / 2)
    ey += boxH + gap

    // 5) Disclaimer
    ctx.fillStyle = '#444'
    ctx.font = '12px Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    for (const line of discLines) {
      ctx.fillText(line, pad, Math.round(ey))
      ey += 15
    }

    ctx.restore()

    // ── Rounded border (drawn in canvas/landscape space) ──
    ctx.strokeStyle = '#CCC'
    ctx.lineWidth = 1.5
    const r = 12
    ctx.beginPath()
    ctx.moveTo(r, 0.75)
    ctx.lineTo(W - r, 0.75)
    ctx.arcTo(W - 0.75, 0.75, W - 0.75, r, r)
    ctx.lineTo(W - 0.75, H - r)
    ctx.arcTo(W - 0.75, H - 0.75, W - r, H - 0.75, r)
    ctx.lineTo(r, H - 0.75)
    ctx.arcTo(0.75, H - 0.75, 0.75, H - r, r)
    ctx.lineTo(0.75, r)
    ctx.arcTo(0.75, 0.75, r, 0.75, r)
    ctx.closePath()
    ctx.stroke()

    callbackRef.current(canvas)
  }, [data, assets])

  // Trigger synchronous draw whenever data or assets change
  useEffect(() => { drawSync() }, [drawSync])

  return (
    <div className="flex justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-dark-100 overflow-hidden" style={{ maxWidth: '100%' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ maxWidth: '100%', height: 'auto' }} />
      </div>
    </div>
  )
}
