import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { X, ZoomIn, ZoomOut, ScanBarcode, Flashlight, CameraOff, RotateCcw, Keyboard, CheckCircle2 } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useToast } from '@/hooks/use-toast';
import { scanFeedback } from '@/lib/scanFeedback';

interface EnhancedBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  totalIFPQty?: string;
  existingSerials?: string[];
  /**
   * Keep the camera open after each scan (used by the audit screen).
   * The same code is ignored for a short cooldown so one barcode isn't read twice.
   */
  continuous?: boolean;
}

type CameraState = 'starting' | 'ready' | 'denied' | 'unavailable' | 'error';

// Limiting formats to what LEAD's assets actually carry makes each decode pass faster.
const HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ],
  ],
]);

const REPEAT_COOLDOWN_MS = 2000;

export const EnhancedBarcodeScanner = ({
  isOpen,
  onClose,
  onScan,
  totalIFPQty = '0',
  existingSerials = [],
  continuous = false,
}: EnhancedBarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader>();
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const lockedRef = useRef(false);
  const lastCodeRef = useRef<{ text: string; at: number } | null>(null);
  const [camera, setCamera] = useState<CameraState>('starting');
  const [errorText, setErrorText] = useState('');
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manual, setManual] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const { toast } = useToast();

  // Keep the latest props in refs: the decode callback is registered once per camera
  // session, and previously it kept seeing the serial list from when it opened.
  const propsRef = useRef({ onScan, onClose, existingSerials, totalIFPQty, continuous });
  propsRef.current = { onScan, onClose, existingSerials, totalIFPQty, continuous };

  const stopScanning = useCallback(() => {
    try {
      codeReader.current?.reset();
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
  }, []);

  const accept = useCallback(
    (raw: string, source: 'camera' | 'manual') => {
      const text = raw.trim();
      if (!text) return;
      const { existingSerials: existing, totalIFPQty: qty, onScan: emit, onClose: close, continuous: keepOpen } = propsRef.current;

      if (source === 'camera') {
        if (lockedRef.current) return;
        const last = lastCodeRef.current;
        if (last && last.text === text && Date.now() - last.at < REPEAT_COOLDOWN_MS) return;
        lastCodeRef.current = { text, at: Date.now() };
      }

      const norm = text.toUpperCase();
      if (existing.some((s) => (s || '').trim().toUpperCase() === norm)) {
        scanFeedback('warn');
        toast({ title: 'Already added', description: `${text} is already in this list.`, variant: 'destructive' });
        return;
      }
      const limit = parseInt(qty) || 0;
      if (limit > 0 && existing.length >= limit) {
        scanFeedback('error');
        toast({ title: 'Quantity reached', description: `This line only needs ${limit} serial numbers.`, variant: 'destructive' });
        return;
      }

      emit(text);
      if (keepOpen) {
        // Audit screen gives its own matched / not-found feedback.
        setRecent((r) => [text, ...r.filter((x) => x !== text)].slice(0, 5));
        setFlash(true);
        window.setTimeout(() => setFlash(false), 250);
      } else {
        scanFeedback('ok');
        lockedRef.current = true;
        stopScanning();
        close();
        toast({ title: 'Scanned', description: text });
      }
    },
    [stopScanning, toast]
  );

  const startScanning = useCallback(async () => {
    lockedRef.current = false;
    setCamera('starting');
    setErrorText('');
    const video = videoRef.current;
    if (!video) return;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamera('unavailable');
      setErrorText('The camera only works over HTTPS. Type the serial number instead.');
      setShowManual(true);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch (err: any) {
        if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') throw err;
        // Some older phones reject HD constraints; fall back to whatever the camera offers.
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      }

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      const caps: any = track?.getCapabilities?.() || {};
      if (caps.zoom && typeof caps.zoom.max === 'number' && caps.zoom.max > (caps.zoom.min ?? 1)) {
        setZoomRange({ min: caps.zoom.min ?? 1, max: Math.min(caps.zoom.max, 5), step: caps.zoom.step || 0.5 });
        setZoom(caps.zoom.min ?? 1);
      } else {
        setZoomRange(null);
      }
      setTorchSupported(!!caps.torch);

      if (!codeReader.current) {
        codeReader.current = new BrowserMultiFormatReader(HINTS as any, 80);
      }
      // Decode from the stream we already opened. The old code opened a second camera
      // stream through decodeFromVideoDevice, which was slow and failed on some phones.
      await codeReader.current.decodeFromStream(stream, video, (result) => {
        if (result) accept(result.getText(), 'camera');
      });
      setCamera('ready');
    } catch (err: any) {
      console.error('Scanner initialization error:', err);
      stopScanning();
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setCamera('denied');
        setErrorText('Camera access is blocked. Allow the camera for this site in your browser settings, then tap Try again.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
        setCamera('unavailable');
        setErrorText('No camera was found on this device.');
      } else if (err?.name === 'NotReadableError') {
        setCamera('error');
        setErrorText('The camera is being used by another app. Close it and tap Try again.');
      } else {
        setCamera('error');
        setErrorText('The camera could not start. Tap Try again or type the serial number.');
      }
      setShowManual(true);
    }
  }, [accept, stopScanning]);

  useEffect(() => {
    if (isOpen) {
      setRecent([]);
      lastCodeRef.current = null;
      startScanning();
    } else {
      stopScanning();
    }
    return () => stopScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  const applyZoom = async (next: number) => {
    if (!zoomRange || !trackRef.current) return;
    const value = Math.max(zoomRange.min, Math.min(zoomRange.max, next));
    try {
      await trackRef.current.applyConstraints({ advanced: [{ zoom: value } as any] });
      setZoom(value);
    } catch {
      /* camera refused this zoom level */
    }
  };

  const toggleTorch = async () => {
    if (!trackRef.current) return;
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn(!torchOn);
    } catch {
      setTorchSupported(false);
    }
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    accept(manual, 'manual');
    setManual('');
  };

  if (!isOpen) return null;

  const cameraFailed = camera === 'denied' || camera === 'unavailable' || camera === 'error';

  return (
    <div
      className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4'
      role='dialog'
      aria-modal='true'
      aria-label='Scan barcode'
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <Card className='w-full max-w-md'>
        <CardContent className='p-4 sm:p-6'>
          <div className='flex justify-between items-center mb-3'>
            <h3 className='text-lg font-semibold flex items-center gap-2'>
              <ScanBarcode className='h-5 w-5' />
              {continuous ? 'Scan to audit' : 'Scan barcode'}
            </h3>
            <Button variant='ghost' size='icon' onClick={handleClose} aria-label='Close scanner'>
              <X className='h-4 w-4' />
            </Button>
          </div>

          <div className='space-y-3'>
            <div className={`relative bg-black rounded-lg overflow-hidden transition-shadow ${flash ? 'ring-4 ring-green-500' : ''}`}>
              <video
                ref={videoRef}
                className={`w-full h-56 sm:h-64 object-cover ${cameraFailed ? 'hidden' : ''}`}
                autoPlay
                playsInline
                muted
              />

              {cameraFailed && (
                <div className='h-56 sm:h-64 flex flex-col items-center justify-center gap-3 px-6 text-center text-white'>
                  <CameraOff className='h-8 w-8 opacity-80' />
                  <p className='text-sm'>{errorText}</p>
                  {camera !== 'unavailable' && (
                    <Button size='sm' variant='secondary' onClick={startScanning}>
                      <RotateCcw className='h-4 w-4 mr-1' /> Try again
                    </Button>
                  )}
                </div>
              )}

              {camera === 'starting' && (
                <div className='absolute inset-0 flex items-center justify-center text-white text-sm'>
                  <span className='animate-pulse'>Starting camera…</span>
                </div>
              )}

              {camera === 'ready' && (
                <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                  <div className='relative w-3/4 h-1/3 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]'>
                    <div className='absolute left-2 right-2 top-1/2 h-0.5 bg-red-500/80 motion-safe:animate-pulse' />
                  </div>
                </div>
              )}

              {camera === 'ready' && (zoomRange || torchSupported) && (
                <div className='absolute bottom-2 right-2 flex gap-1'>
                  {torchSupported && (
                    <Button
                      size='icon'
                      variant='outline'
                      className={`h-9 w-9 border-white/20 text-white hover:bg-white/20 ${torchOn ? 'bg-yellow-500/70' : 'bg-black/50'}`}
                      onClick={toggleTorch}
                      aria-label={torchOn ? 'Turn light off' : 'Turn light on'}
                      aria-pressed={torchOn}
                    >
                      <Flashlight className='h-4 w-4' />
                    </Button>
                  )}
                  {zoomRange && (
                    <>
                      <Button size='icon' variant='outline' className='h-9 w-9 bg-black/50 border-white/20 text-white hover:bg-white/20' onClick={() => applyZoom(zoom - zoomRange.step * 2)} disabled={zoom <= zoomRange.min} aria-label='Zoom out'>
                        <ZoomOut className='h-4 w-4' />
                      </Button>
                      <Button size='icon' variant='outline' className='h-9 w-9 bg-black/50 border-white/20 text-white hover:bg-white/20' onClick={() => applyZoom(zoom + zoomRange.step * 2)} disabled={zoom >= zoomRange.max} aria-label='Zoom in'>
                        <ZoomIn className='h-4 w-4' />
                      </Button>
                    </>
                  )}
                </div>
              )}
              {zoomRange && zoom > zoomRange.min && (
                <div className='absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded'>{zoom.toFixed(1)}×</div>
              )}
            </div>

            {camera === 'ready' && (
              <p className='text-center text-sm text-muted-foreground'>
                Hold the barcode inside the frame. It scans automatically{continuous ? ' — keep scanning, the camera stays on.' : '.'}
              </p>
            )}

            {continuous && recent.length > 0 && (
              <div className='rounded-md border bg-muted/40 p-2'>
                <div className='text-xs font-medium text-muted-foreground mb-1'>Scanned ({recent.length})</div>
                <ul className='space-y-0.5'>
                  {recent.map((s) => (
                    <li key={s} className='flex items-center gap-1.5 text-xs font-mono'>
                      <CheckCircle2 className='h-3 w-3 text-green-600 flex-shrink-0' />
                      <span className='truncate'>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showManual ? (
              <form onSubmit={submitManual} className='flex gap-2'>
                <Input
                  autoFocus={cameraFailed}
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder='Type serial number'
                  aria-label='Serial number'
                  autoCapitalize='characters'
                  autoComplete='off'
                  spellCheck={false}
                />
                <Button type='submit' disabled={!manual.trim()}>Add</Button>
              </form>
            ) : (
              <button
                type='button'
                className='w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1'
                onClick={() => setShowManual(true)}
              >
                <Keyboard className='h-4 w-4' /> Barcode won't scan? Type it instead
              </button>
            )}

            <Button variant='outline' className='w-full' onClick={handleClose}>
              {continuous ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedBarcodeScanner;
