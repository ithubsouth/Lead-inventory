import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ isOpen, onClose, onScan }) => {
  const webcamRef = useRef<Webcam>(null);
  const [isScanning, setIsScanning] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && !readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, [isOpen]);

  const startScanning = async () => {
    if (!readerRef.current || !webcamRef.current?.video) return;

    setIsScanning(true);
    
    try {
      const videoElement = webcamRef.current.video;
      
      const scanImage = () => {
        if (!isOpen || !readerRef.current || !videoElement) return;
        
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (context && videoElement.videoWidth > 0) {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            context.drawImage(videoElement, 0, 0);
            
            readerRef.current.decodeFromImageUrl(canvas.toDataURL())
              .then((result: Result) => {
                if (result) {
                  const scannedText = result.getText();
                  onScan(scannedText);
                  setIsScanning(false);
                  onClose();
                  toast({
                    title: "Scan Successful",
                    description: `Scanned: ${scannedText}`,
                  });
                }
              })
              .catch(() => {
                // Continue scanning - no result found
                if (isOpen) {
                  setTimeout(scanImage, 300);
                }
              });
          } else if (isOpen) {
            setTimeout(scanImage, 300);
          }
        } catch (error) {
          console.error('Scanning error:', error);
          if (isOpen) {
            setTimeout(scanImage, 300);
          }
        }
      };

      // Start scanning after a short delay to ensure video is ready
      setTimeout(scanImage, 500);
      
    } catch (error) {
      console.error('Failed to start scanning:', error);
      toast({
        title: "Scanning Error",
        description: "Failed to start camera scanning",
        variant: "destructive"
      });
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (readerRef.current) {
      readerRef.current.reset();
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Barcode Scanner
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 640,
                height: 640,
                facingMode: "environment"
              }}
              className="w-full h-full object-cover"
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 border-2 border-primary rounded-lg">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-lg opacity-50">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
              </div>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Position the barcode or QR code within the frame
          </div>
          
          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Start Scanning
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="outline" className="flex-1">
                Stop Scanning
              </Button>
            )}
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Supports barcodes, QR codes, and text recognition
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;