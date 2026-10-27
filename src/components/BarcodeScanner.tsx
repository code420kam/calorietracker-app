import React, { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

type CamState = 'idle' | 'requesting' | 'active' | 'denied' | 'error' | 'no-api'

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [camState, setCamState] = useState<CamState>('idle')
  const [torchOn, setTorchOn] = useState(false)
  const [manual, setManual] = useState('')
  const [lastScanned, setLastScanned] = useState('')

  const stopCamera = useCallback(() => {
    if (scanRef.current) { clearInterval(scanRef.current); scanRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  // ── BarcodeDetector (Chrome/Edge, Android WebView) ──
  async function startWithBarcodeDetector() {
    if (!('BarcodeDetector' in window)) return null
    try {
      const formats = await BarcodeDetector.getSupportedFormats()
      const supported = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
      const available = supported.filter(f => formats.includes(f))
      if (!available.length) return null
      return new BarcodeDetector({ formats: available })
    } catch { return null }
  }

  // ── ZXing fallback ──
  async function startWithZXing() {
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library')
      return new BrowserMultiFormatReader()
    } catch { return null }
  }

  async function startCamera() {
    setCamState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCamState('active')

      // Detect method: BarcodeDetector first, then ZXing
      const detector = await startWithBarcodeDetector()
      if (detector) {
        // Native BarcodeDetector – schnell und zuverlässig
        scanRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue
              if (code !== lastScanned) {
                setLastScanned(code)
                stopCamera()
                onScan(code)
              }
            }
          } catch { /* ignore */ }
        }, 200)
      } else {
        // ZXing fallback
        const reader = await startWithZXing()
        if (reader) {
          scanRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return
            try {
              const result = await reader.decodeFromVideoElement(videoRef.current)
              if (result) {
                const code = result.getText()
                if (code !== lastScanned) {
                  setLastScanned(code)
                  stopCamera()
                  onScan(code)
                }
              }
            } catch { /* NotFoundException normal */ }
          }, 500)
        } else {
          setCamState('no-api')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('Denied')) {
        setCamState('denied')
      } else {
        setCamState('error')
      }
    }
  }

  useEffect(() => { startCamera() }, [])

  async function toggleTorch() {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
      setTorchOn(p => !p)
    } catch { /* unsupported */ }
  }

  function handleManual() {
    const code = manual.replace(/[^0-9]/g, '').trim()
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
      {/* Header */}
      <div style={{
        background: 'rgba(0,0,0,0.7)',
        padding: '16px 20px',
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

      {/* Camera */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

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
              Barcode vor die Kamera halten
            </p>
          </div>
        )}

        {camState === 'requesting' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#00CDBB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'white', fontSize: 15 }}>Kamera wird aktiviert...</p>
          </div>
        )}

        {(camState === 'denied' || camState === 'error' || camState === 'no-api') && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 52 }}>
              {camState === 'denied' ? '📷' : camState === 'no-api' ? '📱' : '⚠️'}
            </div>
            <h3 style={{ color: 'white', fontSize: 18, margin: 0 }}>
              {camState === 'denied' ? 'Kamerazugriff verweigert' : camState === 'no-api' ? 'Barcode-Erkennung nicht verfügbar' : 'Kamera-Fehler'}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              {camState === 'denied' ? 'Bitte in den Browser-Einstellungen die Kamera erlauben.'
                : camState === 'no-api' ? 'Diese Funktion funktioniert in diesem Browser nicht. Bitte Barcode manuell eingeben.'
                : 'Kamera konnte nicht geöffnet werden.'}
            </p>
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
        {/* Manual barcode entry – ALWAYS visible, most reliable */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{
              flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 8, padding: '12px 14px', color: 'white', fontSize: 16,
              outline: 'none', letterSpacing: 2,
            }}
            placeholder="Barcode-Nr. (z.B. 4311...)"
            value={manual}
            onChange={e => setManual(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManual()}
            inputMode="numeric"
          />
          <button onClick={handleManual}
            style={{
              background: '#00CDBB', border: 'none', borderRadius: 8,
              padding: '12px 18px', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}>
            OK
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button onClick={toggleTorch} style={{
            background: torchOn ? '#00CDBB' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
            padding: '10px 18px', color: 'white', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {torchOn ? '💡' : '🔦'} Taschenlampe
          </button>
          <button onClick={startCamera} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
            padding: '10px 18px', color: 'white', fontSize: 13, cursor: 'pointer',
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
