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
        
        if (videoElement.videoWidth > 0) {
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
                  setTimeout(scanImage, 1000); // Scan every 1 second
                }
              })
              .catch(() => {
                if (scanningRef.current) {
                  setTimeout(scanImage, 1000); // Retry every 1 second
                }
              });
          }
        } else if (scanningRef.current) {
          setTimeout(scanImage, 1000);
        }
      } catch (error) {
        if (scanningRef.current) {
          setTimeout(scanImage, 1000);
        }
      }
    };

    setTimeout(scanImage, 300);
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

  const handleTextInput = () => {
    const inputText = prompt("Enter text manually:");
    if (inputText && inputText.trim()) {
      onScan(inputText.trim());
      onClose();
      toast({
        title: "Text Added",
        description: `Added: ${inputText.trim()}`,
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
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 border-2 border-primary rounded-lg">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-primary rounded-lg opacity-50"
                    style={{
                      width: '80%',
                      height: '40%'
                    }}>
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                Position the barcode/QR code within the frame - scanning every 1 second
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
              <div className="text-center p-8 bg-muted rounded-lg">
                <Type className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Text Reader Mode</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Manually enter text instead of scanning
                </p>
                <Button onClick={handleTextInput} className="w-full">
                  <Type className="w-4 h-4 mr-2" />
                  Enter Text
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