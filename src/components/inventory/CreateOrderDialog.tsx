import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tablet, Tv, HardDrive, UsbIcon } from 'lucide-react';
import ProductOrderForms from '../ProductOrderForms';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateOrderDialog: React.FC<CreateOrderDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const products = [
    {
      id: 'tablet',
      name: 'Tablet',
      icon: Tablet,
      description: 'Create tablet orders with configuration options'
    },
    {
      id: 'tv',
      name: 'TV',
      icon: Tv,
      description: 'Create TV orders with configuration options'
    },
    {
      id: 'sd-card',
      name: 'SD Card',
      icon: HardDrive,
      description: 'Create SD card orders with size options'
    },
    {
      id: 'pendrive',
      name: 'Pendrive',
      icon: UsbIcon,
      description: 'Create pendrive orders with size options'
    }
  ];

  const handleClose = () => {
    setSelectedProduct(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Order</DialogTitle>
        </DialogHeader>
        
        {!selectedProduct ? (
          <div className="grid grid-cols-2 gap-4 p-4">
            {products.map((product) => {
              const IconComponent = product.icon;
              return (
                <Card 
                  key={product.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedProduct(product.id)}
                >
                  <CardHeader className="text-center">
                    <IconComponent className="h-12 w-12 mx-auto mb-2 text-primary" />
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center">
                      {product.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedProduct(null)}
              >
                ← Back
              </Button>
              <h3 className="text-lg font-semibold">
                Create {products.find(p => p.id === selectedProduct)?.name} Order
              </h3>
            </div>
            
            <ProductOrderForms 
              productType={selectedProduct}
              onClose={handleClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};