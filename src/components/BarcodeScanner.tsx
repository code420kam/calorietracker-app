import React, { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader, NotFoundException, Result } from '@zxing/library'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

type CamState = 'idle' | 'requesting' | 'active' | 'denied' | 'error' | 'manual'

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [camState, setCamState] = useState<CamState>('idle')
  const [torchOn, setTorchOn] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    scannerRef.current?.reset()
    scannerRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  async function startCamera() {
    setCamState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCamState('active')

      // Decode at intervals instead of continuous callback
      scannerRef.current = new BrowserMultiFormatReader()
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !scannerRef.current || videoRef.current.readyState < 2) return
        try {
          const result: Result | undefined = await scannerRef.current.decodeFromVideoElement(videoRef.current)
          if (result) {
            const code = result.getText()
            stopCamera()
            onScan(code)
          }
        } catch (err) {
          if (!(err instanceof NotFoundException)) {
            console.warn('Scan error:', err)
          }
        }
      }, 500) // alle 500ms ein Scan-Versuch
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission denied') || msg.includes('NotAllowedError') || msg.includes('DeniedCameraAccess')) {
        setCamState('denied')
      } else {
        setCamState('error')
      }
    }
  }

  useEffect(() => {
    startCamera()
  }, [])

  async function toggleTorch() {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
      setTorchOn(prev => !prev)
    } catch { /* torch not supported */ }
  }

  function handleManualSubmit() {
    const code = manualBarcode.trim().replace(/[^0-9]/g, '')
    if (code.length >= 8) {
      stopCamera()
      onScan(code)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{
        background: 'rgba(0,0,0,0.7)', padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <button onClick={() => { stopCamera(); onClose() }}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer', padding: 4 }}>
          ✕
        </button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Barcode scannen</span>
        <div style={{ width: 40 }} />
      </div>

      {/* Camera preview */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {camState === 'active' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 260, height: 180 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 32, height: 32, borderTop: '3px solid #00CDBB', borderLeft: '3px solid #00CDBB', borderRadius: '4px 0 0 0' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: 32, height: 32, borderTop: '3px solid #00CDBB', borderRight: '3px solid #00CDBB', borderRadius: '0 4px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: 32, height: 32, borderBottom: '3px solid #00CDBB', borderLeft: '3px solid #00CDBB', borderRadius: '0 0 0 4px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderBottom: '3px solid #00CDBB', borderRight: '3px solid #00CDBB', borderRadius: '0 0 4px 0' }} />
              <div style={{
                position: 'absolute', left: 4, right: 4, height: 2,
                background: 'linear-gradient(90deg, transparent, #00CDBB, transparent)',
                top: '50%',
                animation: 'scanline 2s linear infinite',
              }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: 20, fontSize: 14, textAlign: 'center', maxWidth: 260 }}>
              Barcode vor die Kamera halten<br />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Automatische Erkennung läuft...</span>
            </p>
          </div>
        )}

        {camState === 'requesting' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#00CDBB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'white', fontSize: 15 }}>Kamera wird aktiviert...</p>
          </div>
        )}

        {camState === 'denied' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>📷</div>
            <h3 style={{ color: 'white', fontSize: 18, margin: 0 }}>Kamerazugriff verweigert</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6 }}>
              Bitte in den Browser-Einstellungen die Kamera-Berechtigung für diese Website aktivieren.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => startCamera()}>
              Erneut versuchen
            </button>
          </div>
        )}

        {camState === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>⚠️</div>
            <h3 style={{ color: 'white', fontSize: 18, margin: 0 }}>Kamera nicht verfügbar</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              Es konnte keine Kamera gefunden werden.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => startCamera()}>
              Erneut versuchen
            </button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{
        background: 'rgba(0,0,0,0.7)',
        padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {/* Manual barcode entry */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{
              flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8, padding: '10px 14px', color: 'white', fontSize: 15,
              outline: 'none',
            }}
            placeholder="Barcode manuell eingeben..."
            value={manualBarcode}
            onChange={e => setManualBarcode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
            inputMode="numeric"
          />
          <button
            onClick={handleManualSubmit}
            style={{
              background: '#00CDBB', border: 'none', borderRadius: 8,
              padding: '10px 16px', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
            OK
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          <button
            onClick={toggleTorch}
            style={{
              background: torchOn ? '#00CDBB' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
              padding: '10px 20px', color: 'white', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {torchOn ? '💡' : '🔦'} Taschenlampe
          </button>
          <button
            onClick={startCamera}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
              padding: '10px 20px', color: 'white', fontSize: 13, cursor: 'pointer',
            }}>
            🔄 Neu starten
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scanline { 0% { top: 10%; } 50% { top: 85%; } 100% { top: 10%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
