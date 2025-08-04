import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, BrowserQRCodeReader, BrowserCodeReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, QrCode, Type, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnhancedBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

type ScanMode = 'barcode' | 'qr' | 'text';

const EnhancedBarcodeScanner: React.FC<EnhancedBarcodeScannerProps> = ({ 
  isOpen, 
  onClose, 
  onScan 
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  const readerRef = useRef<BrowserCodeReader | null>(null);
  const scanningRef = useRef<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
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

    switch (scanMode) {
      case 'barcode':
        readerRef.current = new BrowserMultiFormatReader();
        break;
      case 'qr':
        readerRef.current = new BrowserQRCodeReader();
        break;
      case 'text':
        readerRef.current = new BrowserMultiFormatReader();
        break;
      default:
        readerRef.current = new BrowserMultiFormatReader();
    }
  };

  const startContinuousScanning = async () => {
    if (!readerRef.current || !webcamRef.current?.video || scanningRef.current) return;

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
                  setTimeout(scanImage, 100); // Faster scanning
                }
              })
              .catch(() => {
                if (scanningRef.current) {
                  setTimeout(scanImage, 100);
                }
              });
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

    setTimeout(scanImage, 300);
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
    switch (scanMode) {
      case 'barcode':
        return 'aspect-[4/1]'; // Wider for barcodes
      case 'qr':
        return 'aspect-square'; // Square for QR codes
      case 'text':
        return 'aspect-[4/1]'; // Standard for text
      default:
        return 'aspect-square';
    }
  };

  const getVideoConstraints = () => {
    switch (scanMode) {
      case 'barcode':
        return { width: 800, height: 600, facingMode: "environment" };
      case 'qr':
        return { width: 640, height: 640, facingMode: "environment" };
      case 'text':
        return { width: 720, height: 480, facingMode: "environment" };
      default:
        return { width: 640, height: 640, facingMode: "environment" };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
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
              <Camera className="w-4 h-4 mr-1" />
              Barcode
            </Button>
            <Button
              variant={scanMode === 'qr' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScanMode('qr')}
              className="flex-1"
            >
              <QrCode className="w-4 h-4 mr-1" />
              QR Code
            </Button>
            <Button
              variant={scanMode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScanMode('text')}
              className="flex-1"
            >
              <Type className="w-4 h-4 mr-1" />
              Text
            </Button>
          </div>

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
                  width: scanMode === 'barcode' ? '80%' : scanMode === 'qr' ? '60%' : '70%',
                  height: scanMode === 'barcode' ? '40%' : scanMode === 'qr' ? '60%' : '50%'
                }}>
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
              </div>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Position the {scanMode} within the frame - scanning automatically
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleClose} variant="outline" className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedBarcodeScanner;
