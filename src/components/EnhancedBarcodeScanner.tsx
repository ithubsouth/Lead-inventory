import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScanBarcode, Type, X, Scan } from 'lucide-react';
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
                  requestAnimationFrame(scanImage); // Continue scanning at maximum speed
                }
              })
              .catch(() => {
                if (scanningRef.current) {
                  requestAnimationFrame(scanImage); // Continue scanning on error
                }
              });
          } else if (scanningRef.current) {
            requestAnimationFrame(scanImage);
          }
        } else if (scanningRef.current) {
          requestAnimationFrame(scanImage);
        }
      } catch (error) {
        if (scanningRef.current) {
          requestAnimationFrame(scanImage);
        }
      }
    };

    // Wait a bit for camera to initialize then start scanning
    setTimeout(scanImage, 100);
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
          
          // Use Tesseract.js for OCR text recognition
          try {
              const { createWorker } = await import('tesseract.js');
              const worker = await createWorker('eng');
              const { data: { text } } = await worker.recognize(canvas.toDataURL());
              await worker.terminate();
              
              const cleanText = text.trim().replace(/[^\w\s]/g, '');
              if (cleanText && cleanText.length > 0) {
                onScan(cleanText);
                onClose();
                toast({
                  title: "Text Recognized",
                  description: `Captured: ${cleanText}`,
                });
              } else {
                toast({
                  title: "No Text Found",
                  description: "Please ensure text is clearly visible",
                  variant: "destructive"
                });
              }
          } catch (ocrError) {
            // Fallback to manual input if OCR fails
            const inputText = prompt("OCR failed. Enter the text manually:");
            if (inputText && inputText.trim()) {
              onScan(inputText.trim());
              onClose();
              toast({
                title: "Text Added",
                description: `Added: ${inputText.trim()}`,
              });
            }
          }
        }
      }
    } catch (error) {
      const inputText = prompt("Enter text manually:");
      if (inputText && inputText.trim()) {
        onScan(inputText.trim());
        onClose();
        toast({
          title: "Text Added",
          description: `Added: ${inputText.trim()}`,
        });
      }
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

  const getAspectRatio = () => {
    return scanMode === 'barcode' ? 'aspect-[4/1]' : 'aspect-[4/1]';
  };

  const getVideoConstraints = () => {
    return { width: 800, height: 600, facingMode: "environment" };
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5" />
            Enhanced Scanner
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Scan Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'barcode' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScanMode('barcode')}
              className="flex-1"
            >
              <ScanBarcode className="w-4 h-4 mr-1" />
              Scan Barcode/QR
            </Button>
            <Button
              variant={scanMode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScanMode('text')}
              className="flex-1"
            >
              <Type className="w-4 h-4 mr-1" />
              Text Reader
            </Button>
          </div>

          {scanMode === 'barcode' ? (
            <>
              {/* Camera View */}
              <div className={`relative ${getAspectRatio()} bg-muted rounded-lg overflow-hidden`}>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={getVideoConstraints()}
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning overlay - Single box */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-primary rounded-lg bg-transparent" 
                    style={{ width: '70%', height: '35%' }}>
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                Position the barcode/QR code within the frame - scanning continuously
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleManualScan} variant="default" className="flex-1">
                  <Scan className="w-4 h-4 mr-2" />
                  Manual Scan
                </Button>
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Text Input Mode */}
              {/* Camera View for Text Reading */}
              <div className={`relative ${getAspectRatio()} bg-muted rounded-lg overflow-hidden`}>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={getVideoConstraints()}
                  className="w-full h-full object-cover"
                />
                
                {/* Text reading overlay */}
                <div className="absolute inset-0 border-2 border-secondary rounded-lg">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white bg-black/50 p-2 rounded">
                    <Type className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-sm">Point camera at text</span>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                Position text clearly in view and click "Read Text" to capture
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleTextInput} className="flex-1">
                  <Type className="w-4 h-4 mr-2" />
                  Read Text
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedBarcodeScanner;