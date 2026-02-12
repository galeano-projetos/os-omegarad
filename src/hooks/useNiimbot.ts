'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

type NiimbotClient = any

export function useNiimbot() {
  const clientRef = useRef<NiimbotClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [printerName, setPrinterName] = useState<string | null>(null)

  const isBluetoothSupported = useCallback(() => {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator
  }, [])

  const connect = useCallback(async () => {
    if (!isBluetoothSupported()) {
      throw new Error('Web Bluetooth não suportado neste navegador. Use Chrome ou Edge.')
    }

    setError(null)

    try {
      const { NiimbotBluetoothClient } = await import('@mmote/niimbluelib')
      const client = new NiimbotBluetoothClient()

      client.on('connect', (e: any) => {
        setIsConnected(true)
        setPrinterName(e?.info?.deviceName || 'Niimbot')
      })

      client.on('disconnect', () => {
        setIsConnected(false)
        setPrinterName(null)
        clientRef.current = null
      })

      const connInfo = await client.connect()
      clientRef.current = client

      try {
        await client.fetchPrinterInfo()
      } catch {
        // Non-critical: printer info fetch may fail on some models
      }

      return connInfo
    } catch (err: any) {
      const msg = err?.message || 'Erro ao conectar à impressora'
      setError(msg)
      throw err
    }
  }, [isBluetoothSupported])

  const disconnect = useCallback(async () => {
    try {
      if (clientRef.current) {
        await clientRef.current.disconnect()
      }
    } catch {
      // Ignore disconnect errors
    }
    clientRef.current = null
    setIsConnected(false)
    setPrinterName(null)
    setError(null)
  }, [])

  const print = useCallback(async (canvas: HTMLCanvasElement, copies: number = 1) => {
    if (!clientRef.current || !isConnected) {
      throw new Error('Impressora não conectada')
    }

    setIsPrinting(true)
    setError(null)

    try {
      const { ImageEncoder } = await import('@mmote/niimbluelib')
      const client = clientRef.current

      // Use printer's preferred direction, fallback to 'left'
      const meta = client.getModelMetadata?.()
      const direction = meta?.printDirection || 'left'

      const encoded = ImageEncoder.encodeCanvas(canvas, direction)

      // Get the appropriate print task type for this printer
      const taskType = client.getPrintTaskType?.() || 'B1'

      const printTask = client.abstraction.newPrintTask(taskType, {
        totalPages: copies,
        statusPollIntervalMs: 100,
        statusTimeoutMs: 10_000,
        pageTimeoutMs: 15_000,
      })

      await printTask.printInit()

      for (let i = 0; i < copies; i++) {
        await printTask.printPage(encoded, 1)
        await printTask.waitForFinished()
      }

      await client.abstraction.printEnd()
    } catch (err: any) {
      const msg = err?.message || 'Erro ao imprimir'
      setError(msg)
      throw err
    } finally {
      setIsPrinting(false)
    }
  }, [isConnected])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect().catch(() => {})
        clientRef.current = null
      }
    }
  }, [])

  return {
    connect,
    disconnect,
    print,
    isConnected,
    isPrinting,
    error,
    printerName,
    isBluetoothSupported,
  }
}
