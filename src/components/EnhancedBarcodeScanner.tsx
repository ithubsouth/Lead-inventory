import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScanBarcode, Type, X, Scan, ZoomIn, ZoomOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnhancedBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

type ScanMode = 'barcode' | 'text';

const EnhancedBarcodeScanner: React.FC<EnhancedBarcodeScannerProps> = ({ 
  isOpen, 
  onClose, 
  onScan 
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanningRef = useRef<boolean>(false);
  const [zoom, setZoom] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && scanMode === 'barcode') {
      initializeReader();
      startContinuousScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen, scanMode]);

  const initializeReader = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }

    if (scanMode === 'barcode') {
      readerRef.current = new BrowserMultiFormatReader();
    }
  };

  const startContinuousScanning = async () => {
    if (!readerRef.current || !webcamRef.current?.video || scanningRef.current || scanMode !== 'barcode') return;

    scanningRef.current = true;
    
    const scanImage = () => {
      if (!isOpen || !readerRef.current || !webcamRef.current?.video || !scanningRef.current) return;
      
      try {
        const videoElement = webcamRef.current.video;
        
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (context) {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            context.drawImage(videoElement, 0, 0);
            
            readerRef.current.decodeFromImageUrl(canvas.toDataURL())
              .then((result) => {
                if (result && scanningRef.current) {
                  const scannedText = result.getText();
                  onScan(scannedText);
                  stopScanning();
                  onClose();
                  toast({
                    title: "Scan Successful",
                    description: `Scanned: ${scannedText}`,
                  });
                } else if (scanningRef.current) {
                  setTimeout(scanImage, 100);
                }
              })
              .catch(() => {
                if (scanningRef.current) {
                  setTimeout(scanImage, 100);
                }
              });
          } else if (scanningRef.current) {
            setTimeout(scanImage, 100);
          }
        } else if (scanningRef.current) {
          setTimeout(scanImage, 100);
        }
      } catch (error) {
        if (scanningRef.current) {
          setTimeout(scanImage, 100);
        }
      }
    };

    setTimeout(scanImage, 500);
  };

  const handleManualScan = () => {
    if (!readerRef.current || !webcamRef.current?.video || scanMode !== 'barcode') return;
    
    try {
      const videoElement = webcamRef.current.video;
      
      if (videoElement.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          context.drawImage(videoElement, 0, 0);
          
          readerRef.current.decodeFromImageUrl(canvas.toDataURL())
            .then((result) => {
              if (result) {
                const scannedText = result.getText();
                onScan(scannedText);
                stopScanning();
                onClose();
                toast({
                  title: "Scan Successful",
                  description: `Scanned: ${scannedText}`,
                });
              } else {
                toast({
                  title: "No Code Found",
                  description: "Please position the code clearly in view",
                  variant: "destructive"
                });
              }
            })
            .catch(() => {
              toast({
                title: "Scan Failed",
                description: "Unable to read code. Please try again.",
                variant: "destructive"
              });
            });
        }
      }
    } catch (error) {
      toast({
        title: "Scanner Error",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleTextInput = async () => {
    if (!webcamRef.current?.video) return;
    
    try {
      const videoElement = webcamRef.current.video;
      
      if (videoElement.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          context.drawImage(videoElement, 0, 0);
          
          try {
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('eng');
            
            toast({
              title: "Processing",
              description: "Reading text from image...",
            });
            
            const { data: { text } } = await worker.recognize(canvas.toDataURL());
            await worker.terminate();
            
            const cleanText = text
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .join(' ')
              .replace(/[^\w\s\-_.,@]/g, '')
              .trim();
              
            if (cleanText && cleanText.length > 2) {
              onScan(cleanText);
              onClose();
              toast({
                title: "Text Recognized",
                description: `Captured: ${cleanText.substring(0, 50)}${cleanText.length > 50 ? '...' : ''}`,
              });
            } else {
              toast({
                title: "No Clear Text Found",
                description: "Please ensure text is clearly visible and well-lit",
                variant: "destructive"
              });
            }
          } catch (ocrError) {
            toast({
              title: "Text Recognition Failed",
              description: "Please try with better lighting or clearer text",
              variant: "destructive"
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to capture image",
        variant: "destructive"
      });
    }
  };

  const stopScanning = () => {
    scanningRef.current = false;
    if (readerRef.current) {
      readerRef.current.reset();
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const getVideoConstraints = () => {
    return { 
      width: { ideal: 1280 }, 
      height: { ideal: 720 }, 
      facingMode: "environment",
      zoom: zoom
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 gap-0 bg-scanner-bg border-none">
        <DialogHeader className="p-4 pb-2 bg-scanner-bg">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-scanner-text text-lg">
              <ScanBarcode className="w-5 h-5" />
              Scan {scanMode === 'barcode' ? 'Barcode' : 'Text'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-scanner-text hover:bg-white/10 h-8 w-8 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 bg-scanner-bg">
          <div className="px-4">
            <div className="flex gap-1 bg-muted/20 p-1 rounded-lg">
              <Button
                variant={scanMode === 'barcode' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setScanMode('barcode')}
                className="flex-1 text-xs"
              >
                <ScanBarcode className="w-3 h-3 mr-1" />
                Barcode
              </Button>
              <Button
                variant={scanMode === 'text' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setScanMode('text')}
                className="flex-1 text-xs"
              >
                <Type className="w-3 h-3 mr-1" />
                Text
              </Button>
            </div>
          </div>

          <div className="relative aspect-[4/3] bg-black mx-4 rounded-lg overflow-hidden">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={getVideoConstraints()}
              className="w-full h-full object-cover"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            />
            
            <div className="absolute inset-0 flex items-center justify-center">
              {scanMode === 'barcode' ? (
                <div className="relative">
                  <div 
                    className="border-2 border-scanner-overlay rounded-lg bg-transparent"
                    style={{ width: '250px', height: '80px' }}
                  >
                    <div className="absolute -top-1 -left-1 w-6 h-6">
                      <div className="absolute top-0 left-0 w-full h-1 bg-scanner-overlay rounded"></div>
                      <div className="absolute top-0 left-0 w-1 h-full bg-scanner-overlay rounded"></div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6">
                      <div className="absolute top-0 right-0 w-full h-1 bg-scanner-overlay rounded"></div>
                      <div className="absolute top-0 right-0 w-1 h-full bg-scanner-overlay rounded"></div>
                    </div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6">
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-scanner-overlay rounded"></div>
                      <div className="absolute bottom-0 left-0 w-1 h-full bg-scanner-overlay rounded"></div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6">
                      <div className="absolute bottom-0 right-0 w-full h-1 bg-scanner-overlay rounded"></div>
                      <div className="absolute bottom-0 right-0 w-1 h-full bg-scanner-overlay rounded"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-scanner-overlay rounded-lg p-4 bg-black/20">
                  <div className="text-center text-scanner-text">
                    <Type className="w-8 h-8 mx-auto mb-2" />
                    <span className="text-sm">Position text clearly</span>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleZoomIn}
                className="w-8 h-8 p-0 bg-black/50 border-none hover:bg-black/70"
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleZoomOut}
                className="w-8 h-8 p-0 bg-black/50 border-none hover:bg-black/70"
              >
                <ZoomOut className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
          
          <div className="px-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-scanner-text font-medium">
                {scanMode === 'barcode' ? 
                  'Tap on a barcode to scan it directly' : 
                  'Position text clearly in view'
                }
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ZoomIn className="w-3 h-3" />
                <span>Use zoom controls or tap specific {scanMode === 'barcode' ? 'barcodes' : 'text'} to scan</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep steady and ensure good lighting for best results
              </p>
            </div>
          </div>
          
          <div className="px-4 pb-4 space-y-2">
            {scanMode === 'barcode' ? (
              <Button 
                onClick={handleManualScan} 
                variant="default" 
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Scan className="w-4 h-4 mr-2" />
                Scan Now
              </Button>
            ) : (
              <Button 
                onClick={handleTextInput} 
                variant="default" 
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Type className="w-4 h-4 mr-2" />
                Read Text
              </Button>
            )}
            
            <Button 
              onClick={handleClose} 
              variant="outline" 
              className="w-full border-muted-foreground/30 text-muted-foreground hover:bg-muted/20"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedBarcodeScanner;
