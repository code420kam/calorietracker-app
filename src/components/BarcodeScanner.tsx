import React, { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader, NotFoundException, Result } from '@zxing/library'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

type CamState = 'idle' | 'requesting' | 'active' | 'denied' | 'error'

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [camState, setCamState] = useState<CamState>('idle')
  const [torchOn, setTorchOn] = useState(false)
  const [lastScanned, setLastScanned] = useState('')

  const stopCamera = useCallback(() => {
    readerRef.current?.reset()
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
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
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCamState('active')

      readerRef.current = new BrowserMultiFormatReader()
      readerRef.current.decodeFromVideoElement(videoRef.current, (result: Result | undefined, err: Error | undefined) => {
        if (result) {
          const code = result.getText()
          if (code !== lastScanned) {
            setLastScanned(code)
            readerRef.current?.pause()
            stopCamera()
            onScan(code)
          }
        }
        if (err && !(err instanceof NotFoundException)) {
          // only real errors, not "not found in this frame"
        }
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission denied') || msg.includes('NotAllowedError') || msg.includes('DeniedCameraAccess')) {
        setCamState('denied')
      } else {
        setCamState('error')
      }
    }
  }

  // Start camera on mount
  useEffect(() => {
    startCamera()
  }, [])

  async function toggleTorch() {
    if (!videoRef.current?.srcObject) return
    const stream = videoRef.current.srcObject as MediaStream
    const track = stream.getVideoTracks()[0]
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
      setTorchOn(prev => !prev)
    } catch {
      // torch not supported
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

        {/* Scan overlay */}
        {camState === 'active' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* Corner brackets */}
            <div style={{ position: 'relative', width: 260, height: 180 }}>
              {/* top-left */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: 32, height: 32, borderTop: '3px solid #00CDBB', borderLeft: '3px solid #00CDBB', borderRadius: '4px 0 0 0' }} />
              {/* top-right */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 32, height: 32, borderTop: '3px solid #00CDBB', borderRight: '3px solid #00CDBB', borderRadius: '0 4px 0 0' }} />
              {/* bottom-left */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: 32, height: 32, borderBottom: '3px solid #00CDBB', borderLeft: '3px solid #00CDBB', borderRadius: '0 0 0 4px' }} />
              {/* bottom-right */}
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderBottom: '3px solid #00CDBB', borderRight: '3px solid #00CDBB', borderRadius: '0 0 4px 0' }} />
              {/* scan line */}
              <div style={{
                position: 'absolute', left: 4, right: 4, height: 2,
                background: 'linear-gradient(90deg, transparent, #00CDBB, transparent)',
                top: '50%',
                animation: 'scanline 2s linear infinite',
              }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: 20, fontSize: 14, textAlign: 'center' }}>
              Barcode vor die Kamera halten
            </p>
          </div>
        )}

        {/* Loading state */}
        {camState === 'requesting' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#00CDBB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'white', fontSize: 15 }}>Kamera wird aktiviert...</p>
          </div>
        )}

        {/* Denied state */}
        {camState === 'denied' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>📷</div>
            <h3 style={{ color: 'white', fontSize: 18, margin: 0 }}>Kamerazugriff verweigert</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6 }}>
              Um den Barcode-Scanner zu nutzen, musst du der App Zugriff auf deine Kamera gewähren.<br /><br />
              Bitte in den Browser-Einstellungen die Berechtigung für diese Website aktivieren.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => startCamera()}>
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Error state */}
        {camState === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>⚠️</div>
            <h3 style={{ color: 'white', fontSize: 18, margin: 0 }}>Kamera nicht verfügbar</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6 }}>
              Es konnte keine Kamera gefunden werden oder die Kamera wird von einer anderen App verwendet.
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
        display: 'flex', justifyContent: 'center', gap: 20, flexShrink: 0,
      }}>
        {camState === 'active' && (
          <>
            <button
              onClick={toggleTorch}
              style={{
                width: 52, height: 52, borderRadius: '50%',
                background: torchOn ? '#00CDBB' : 'rgba(255,255,255,0.15)',
                border: 'none', color: 'white', fontSize: 22, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Taschenlampe"
            >
              💡
            </button>
            <button
              onClick={() => { setLastScanned(''); readerRef.current?.resume() }}
              style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                border: 'none', color: 'white', fontSize: 22, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Erneut scannen"
            >
              🔄
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-80px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
