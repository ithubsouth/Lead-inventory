import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X, RotateCcw, ZoomIn, ZoomOut, ScanBarcode } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useToast } from '@/hooks/use-toast';

interface EnhancedBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  totalIFPQty?: string;
  existingSerials?: string[];
}

export const EnhancedBarcodeScanner = ({
  isOpen,
  onClose,
  onScan,
  totalIFPQty = '0',
  existingSerials = [],
}: EnhancedBarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | null>(null);
  const codeReader = useRef<BrowserMultiFormatReader>();
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);

      if (!codeReader.current) {
        codeReader.current = new BrowserMultiFormatReader();
        codeReader.current.timeBetweenDecodingAttempts = 50;
      }

      const videoElement = videoRef.current;
      if (!videoElement) throw new Error('Video element not found');

      // Request camera with fallback to lower resolutions if needed
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, min: 10 },
        },
      }).catch(async (err) => {
        console.error('Initial camera access failed:', err);
        // Retry with minimal constraints
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 },
        });
      });

      videoElement.srcObject = stream;
      streamRef.current = stream;

      videoElement.setAttribute('playsinline', 'true');
      videoElement.setAttribute('webkit-playsinline', 'true');

      await videoElement.play().catch((playErr) => {
        console.error('Video play failed:', playErr);
        throw new Error('Unable to play video stream');
      });

      const decodeLoop = () => {
        if (!codeReader.current || !videoElement || !isScanning) return;

        codeReader.current.decodeFromVideoDevice(undefined, videoElement, (result, err) => {
          if (result) {
            const scannedText = result.getText().trim();
            validateAndHandleScan(scannedText);
          } else if (err) {
            if (err.name !== 'NotFoundException') {
              console.error('Decoding error:', err);
              setError('Failed to scan barcode. Retrying...');
            }
            // Continue scanning with a slight delay to avoid overwhelming
            setTimeout(() => requestAnimationFrame(decodeLoop), 500);
          } else {
            requestAnimationFrame(decodeLoop);
          }
        });
      };

      requestAnimationFrame(decodeLoop);
    } catch (err) {
      console.error('Scanner initialization error:', err);
      setError('Failed to access camera. Retrying...');
      setIsScanning(false);
      // Retry after a short delay
      setTimeout(startScanning, 3000);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }

    const videoElement = videoRef.current;
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoElement.srcObject = null;
    }

    setIsScanning(false);
    streamRef.current = null;
  };

  const validateAndHandleScan = (scannedText: string) => {
    const isDuplicate = existingSerials.some(
      (item) => (typeof item === 'string' ? item : item.serial) === scannedText
    );
    const ifpQty = parseInt(totalIFPQty) || 0;
    const isWithinLimit = ifpQty === 0 || existingSerials.length < ifpQty;

    if (isDuplicate) {
      toast({
        title: 'Duplicate Serial Number',
        description: `Serial number ${scannedText} has already been added to the list`,
        variant: 'destructive',
      });
    } else if (!isWithinLimit) {
      toast({
        title: 'Quantity Limit Reached',
        description: `Cannot add more than ${ifpQty} serial numbers (IFP quantity limit)`,
        variant: 'destructive',
      });
    } else {
      onScan(scannedText);
      stopScanning();
      onClose();
      toast({
        title: 'Serial Number Scanned',
        description: `Serial number ${scannedText} scanned successfully`,
      });
    }
  };

  const handleRetry = () => {
    setError('');
    startScanning();
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
  };

  const handleVideoClick = (event: React.MouseEvent<HTMLVideoElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setTapPosition({ x, y });

    setTimeout(() => setTapPosition(null), 500);

    if (codeReader.current && videoRef.current) {
      try {
        codeReader.current.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (result) {
            const scannedText = result.getText().trim();
            validateAndHandleScan(scannedText);
          }
          if (err && !(err.name === 'NotFoundException')) {
            console.error('Tap scan error:', err);
            toast({
              title: 'Scan Failed',
              description: 'Unable to read barcode. Please try again.',
              variant: 'destructive',
            });
          }
        });
      } catch (error) {
        console.error('Error scanning at tap position:', error);
        toast({
          title: 'Scanner Error',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              Scan Barcode
            </h3>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error ? (
            <div className="text-center space-y-4">
              <div className="text-red-500 text-sm">{error}</div>
              <Button onClick={handleRetry} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover cursor-crosshair"
                  autoPlay
                  playsInline
                  muted
                  onClick={handleVideoClick}
                  style={{
                    imageRendering: 'crisp-edges',
                    filter: 'contrast(1.1) brightness(1.1)',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-out',
                  }}
                />
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-primary bg-transparent w-3/4 h-1/2 rounded-lg">
                      <div className="absolute -top-1 -left-1 w-6 h-6">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded"></div>
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded"></div>
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6">
                        <div className="absolute top-0 right-0 w-full h-1 bg-primary rounded"></div>
                        <div className="absolute top-0 right-0 w-1 h-full bg-primary rounded"></div>
                      </div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6">
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded"></div>
                        <div className="absolute bottom-0 left-0 w-1 h-full bg-primary rounded"></div>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6">
                        <div className="absolute bottom-0 right-0 w-full h-1 bg-primary rounded"></div>
                        <div className="absolute bottom-0 right-0 w-1 h-full bg-primary rounded"></div>
                      </div>
                    </div>
                  </div>
                )}
                {tapPosition && (
                  <div
                    className="absolute w-8 h-8 border-2 border-blue-400 rounded-full bg-blue-400/20 animate-ping pointer-events-none"
                    style={{
                      left: `${tapPosition.x}%`,
                      top: `${tapPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                )}

                <div className="absolute bottom-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 bg-black/50 border-white/20 text-white hover:bg-white/20"
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 bg-black/50 border-white/20 text-white hover:bg-white/20"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>

                {zoom > 1 && (
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {zoom.toFixed(1)}x
                  </div>
                )}
              </div>

              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>Tap on a barcode to scan it directly</p>
                <p className="text-xs">🔍 Use zoom controls or tap specific barcodes to scan</p>
                <p className="text-xs">📱 Keep steady and ensure good lighting for best results</p>
              </div>

              <Button variant="outline" className="w-full" onClick={onClose}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedBarcodeScanner;
