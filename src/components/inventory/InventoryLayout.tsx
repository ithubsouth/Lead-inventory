import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, User, Menu } from 'lucide-react';
import { DevicesList } from './DevicesList';
import { OrdersList } from './OrdersList';
import { CreateOrderDialog } from './CreateOrderDialog';
import { UserProfile } from '../UserProfile';
import OrderSummaryTable from '../OrderSummaryTable';

export const InventoryLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('devices');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Asset Vault</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" title="Import Order">
              <Upload className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowUserProfile(true)}
              title="User Profile"
            >
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Fixed Tabs */}
        <div className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="orders">View Orders</TabsTrigger>
              <TabsTrigger value="summary">Order Summary</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger 
                value="create-order"
                onClick={() => setShowCreateOrder(true)}
              >
                Create Order
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="devices">
            <DevicesList />
          </TabsContent>
          
          <TabsContent value="orders">
            <OrdersList />
          </TabsContent>
          
          <TabsContent value="summary">
            <OrderSummaryTable
              orderSummary={[]}
              selectedWarehouse=""
              setSelectedWarehouse={() => {}}
              selectedAssetType=""
              setSelectedAssetType={() => {}}
              selectedModel=""
              setSelectedModel={() => {}}
              fromDate=""
              setFromDate={() => {}}
              toDate=""
              setToDate={() => {}}
              showDeleted={false}
              setShowDeleted={() => {}}
              searchQuery=""
              setSearchQuery={() => {}}
            />
          </TabsContent>
          
          <TabsContent value="users">
            <div className="p-4 text-center text-muted-foreground">
              User Management functionality is being set up...
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateOrderDialog 
        open={showCreateOrder}
        onOpenChange={setShowCreateOrder}
      />
      
      {showUserProfile && (
        <UserProfile />
      )}
    </div>
  );
};