import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Coffee, Plus, Minus, AlertTriangle, ChefHat, CheckCircle2, ClipboardList, Edit, Trash2, Layers, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function RestaurantPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  // Dialog & Form states - Inventory
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [newInvName, setNewInvName] = useState('');
  const [newInvQty, setNewInvQty] = useState('0');
  const [newInvUnit, setNewInvUnit] = useState('kg');
  const [newInvMin, setNewInvMin] = useState('0');

  // Adjust stock states
  const [selectedInvItem, setSelectedInvItem] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState('');

  // Dialog & Form states - Menu Items
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  const [menuForm, setMenuForm] = useState({
    name: '',
    category: 'Starters',
    price: '',
    description: '',
    isAvailable: true
  });

  // KOT Edit states
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editingItems, setEditingItems] = useState<any[]>([]);

  // Queries
  // 1. Fetch Orders / KOTs
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['restaurantOrders'],
    queryFn: async () => {
      const res = await fetch('/api/restaurant/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch restaurant orders');
      return res.json();
    },
    refetchInterval: 8000
  });

  // 2. Fetch Inventory
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['restaurantInventory'],
    queryFn: async () => {
      const res = await fetch('/api/restaurant/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    }
  });

  // 3. Fetch Menu Items (Admin)
  const { data: menuItems = [], isLoading: menuLoading } = useQuery({
    queryKey: ['restaurantMenuAdmin'],
    queryFn: async () => {
      const res = await fetch('/api/restaurant/admin/menu', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch restaurant menu');
      return res.json();
    }
  });

  // Unique categories for navigation groups
  const menuCategories = useMemo<string[]>(() => {
    const cats = new Set<string>(menuItems.map((m: any) => m.category as string));
    return ['All', ...Array.from(cats)];
  }, [menuItems]);

  // Mutations
  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await fetch(`/api/restaurant/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });
    }
  });

  // Update restaurant order items & total
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, items, totalAmount }: { id: number; items: any[]; totalAmount: number }) => {
      const res = await fetch(`/api/restaurant/orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items, totalAmount })
      });
      if (!res.ok) throw new Error('Failed to update order');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });
      setEditingOrder(null);
      setEditingItems([]);
    },
    onError: (err: any) => alert(err.message)
  });

  // Add Inventory item
  const addInventoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/restaurant/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create inventory item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantInventory'] });
      setIsAddInventoryOpen(false);
      setNewInvName('');
      setNewInvQty('0');
      setNewInvMin('0');
    },
    onError: (err: any) => alert(err.message)
  });

  // Update Inventory Stock (Adjust)
  const adjustInventoryMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      const res = await fetch(`/api/restaurant/inventory/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });
      if (!res.ok) throw new Error('Failed to update inventory');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantInventory'] });
      setSelectedInvItem(null);
      setAdjustQty('');
    },
    onError: (err: any) => alert(err.message)
  });

  // Add Menu Item
  const addMenuItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/restaurant/admin/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create menu item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantMenuAdmin'] });
      setIsAddMenuOpen(false);
      setMenuForm({ name: '', category: 'Starters', price: '', description: '', isAvailable: true });
    },
    onError: (err: any) => alert(err.message)
  });

  // Edit Menu Item
  const editMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/restaurant/admin/menu/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update menu item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantMenuAdmin'] });
      setIsEditMenuOpen(false);
      setSelectedMenuItem(null);
    },
    onError: (err: any) => alert(err.message)
  });

  // Delete Menu Item
  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/restaurant/admin/menu/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete menu item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantMenuAdmin'] });
    },
    onError: (err: any) => alert(err.message)
  });

  // Delete Inventory Item
  const deleteInventoryItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/restaurant/inventory/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete inventory item');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      alert('Inventory item deleted successfully');
    },
    onError: (err: any) => alert(err.message)
  });

  // Delete Restaurant Order (KOT)
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/restaurant/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete order');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });
      alert('Order KOT ticket deleted successfully');
    },
    onError: (err: any) => alert(err.message)
  });

  // Handle Inventory Submit
  const handleAddInventorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvName) return;
    addInventoryMutation.mutate({
      name: newInvName,
      quantity: parseFloat(newInvQty) || 0,
      unit: newInvUnit,
      minStock: parseFloat(newInvMin) || 0
    });
  };

  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvItem || adjustQty === '') return;
    const currentQty = selectedInvItem.quantity;
    const change = parseFloat(adjustQty) || 0;
    adjustInventoryMutation.mutate({
      id: selectedInvItem.id,
      quantity: currentQty + change
    });
  };

  // Handle Menu Submit
  const handleAddMenuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.name || !menuForm.price) return;
    addMenuItemMutation.mutate({
      name: menuForm.name,
      category: menuForm.category,
      price: parseFloat(menuForm.price) || 0,
      description: menuForm.description,
      isAvailable: menuForm.isAvailable
    });
  };

  const handleEditMenuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuItem || !menuForm.name || !menuForm.price) return;
    editMenuItemMutation.mutate({
      id: selectedMenuItem.id,
      data: {
        name: menuForm.name,
        category: menuForm.category,
        price: parseFloat(menuForm.price) || 0,
        description: menuForm.description,
        isAvailable: menuForm.isAvailable
      }
    });
  };

  const openEditMenuDialog = (item: any) => {
    setSelectedMenuItem(item);
    setMenuForm({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      description: item.description || '',
      isAvailable: item.isAvailable
    });
    setIsEditMenuOpen(true);
  };

  const orderStatusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    preparing: 'bg-blue-100 text-blue-800 border-blue-200',
    delivered: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-slate-100 text-slate-800 border-slate-200'
  };

  // Filtered menu items for category groups
  const filteredMenuItems = useMemo(() => {
    if (selectedCategoryFilter === 'All') return menuItems;
    return menuItems.filter((item: any) => item.category === selectedCategoryFilter);
  }, [menuItems, selectedCategoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Restaurant Desk</h1>
          <p className="text-slate-500 mt-1">Manage kitchen order tickets, storage ingredient levels, and the food menu.</p>
        </div>
      </div>

      <Tabs defaultValue="kot" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="kot" className="flex items-center gap-2">
            <ChefHat className="w-4 h-4" /> Active Kitchen Tickets (KOTs)
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Kitchen Storage & Inventory
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <Coffee className="w-4 h-4" /> Food & Drinks Menu
          </TabsTrigger>
        </TabsList>

        {/* ── TICKET DESK (KOTs) TAB ── */}
        <TabsContent value="kot" className="space-y-6">
          {ordersLoading ? (
            <div className="p-8 text-center text-slate-400 animate-pulse italic text-sm">Loading order tickets...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic text-sm bg-white rounded-2xl border">No active kitchen orders found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map((order: any) => {
                const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                return (
                  <Card key={order.id} className="border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                    <CardHeader className="pb-3 border-b bg-slate-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline" className={`font-bold font-sans uppercase text-[10px] ${orderStatusColors[order.status as keyof typeof orderStatusColors] || ''}`}>
                            {order.status}
                          </Badge>
                          <h3 className="font-extrabold text-sm text-slate-800 mt-2">
                            {order.type === 'room_service' ? `Room Service Order` : `${order.type} Order`}
                          </h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">KOT #{order.id}</span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-600">
                        {order.type === 'room_service' ? (
                          <span>Room: <strong>{order.roomNumber}</strong> ({order.guestName})</span>
                        ) : (
                          <span>Table: <strong>{order.tableNumber || 'N/A'}</strong></span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="py-4 flex-1">
                      <ul className="space-y-2 divide-y divide-slate-100 text-xs">
                        {parsedItems.map((item: any, index: number) => (
                          <li key={index} className="pt-2 flex justify-between font-medium">
                            <span className="text-slate-800">{item.name} <strong className="text-blue-600 ml-1">x{item.quantity}</strong></span>
                            <span className="text-slate-500 font-mono">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="border-t border-dashed mt-4 pt-3 flex justify-between text-xs font-black">
                        <span className="text-slate-500 uppercase">Total Amount</span>
                        <span className="text-slate-900 font-mono text-sm">₹{Number(order.totalAmount).toFixed(2)}</span>
                      </div>
                    </CardContent>

                    <div className="p-4 border-t bg-slate-50 flex items-center justify-end gap-2">
                      {(order.status === 'pending' || order.status === 'preparing') && (
                        <Button 
                          size="sm"
                          variant="outline"
                          className="font-bold border-slate-300 hover:bg-slate-100"
                          onClick={() => {
                            setEditingOrder(order);
                            setEditingItems(parsedItems);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" /> Edit Ticket
                        </Button>
                      )}
                      {order.status === 'pending' && (
                        <Button 
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full"
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'preparing' })}
                        >
                          Accept & Prepare
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button 
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full"
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'delivered' })}
                        >
                          Mark Delivered
                        </Button>
                      )}
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <Button 
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50 font-bold"
                          onClick={() => {
                            if (confirm('Cancel this kitchen order ticket?')) {
                              updateStatusMutation.mutate({ orderId: order.id, status: 'cancelled' });
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      {(order.status === 'delivered' || order.status === 'cancelled') && (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs text-slate-400 font-bold italic py-1">KOT Completed</span>
                          {(user?.role === 'admin' || user?.role === 'manager') && (
                            <Button 
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 h-8 w-8 p-0"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete KOT #${order.id} order ticket?`)) {
                                  deleteOrderMutation.mutate(order.id);
                                }
                              }}
                              disabled={deleteOrderMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Edit Order Dialog */}
          <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Edit KOT Ticket #{editingOrder?.id}</DialogTitle>
                <DialogDescription>
                  Adjust quantities or remove items from this order.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {editingItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 py-2 border-b last:border-0 border-slate-100">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">₹{Number(item.price).toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingItems(prev => {
                            const updated = [...prev];
                            if (updated[index].quantity > 1) {
                              updated[index] = { ...updated[index], quantity: updated[index].quantity - 1 };
                            }
                            return updated;
                          });
                        }}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingItems(prev => {
                            const updated = [...prev];
                            updated[index] = { ...updated[index], quantity: updated[index].quantity + 1 };
                            return updated;
                          });
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-650 hover:bg-red-50"
                        onClick={() => {
                          setEditingItems(prev => prev.filter((_, idx) => idx !== index));
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {editingItems.length === 0 && (
                  <p className="text-sm text-slate-400 italic text-center py-4">No items left in the ticket. Save will update total amount to ₹0.</p>
                )}
              </div>

              <div className="border-t pt-3 flex justify-between items-center font-bold">
                <span className="text-sm text-slate-500 uppercase">Updated Total</span>
                <span className="text-base text-slate-900 font-mono">
                  ₹{editingItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                </span>
              </div>

              <DialogFooter className="pt-4 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingOrder(null)}>Cancel</Button>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  disabled={updateOrderMutation.isPending}
                  onClick={() => {
                    if (!editingOrder) return;
                    const total = editingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
                    updateOrderMutation.mutate({
                      id: editingOrder.id,
                      items: editingItems,
                      totalAmount: total
                    });
                  }}
                >
                  {updateOrderMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── STORAGE & INVENTORY TAB ── */}
        <TabsContent value="inventory" className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Ingredient Stock Levels</h3>
              <p className="text-xs text-slate-400 mt-0.5">Control kitchen raw materials and alert thresholds.</p>
            </div>
            
            <Dialog open={isAddInventoryOpen} onOpenChange={setIsAddInventoryOpen}>
              <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold"><Plus className="w-4 h-4 mr-2" /> Add Item</Button>} />
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Ingredient / Item</DialogTitle>
                  <DialogDescription>Create a new raw item tracked by the kitchen inventory system.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddInventorySubmit} className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="itemName">Item Name</Label>
                    <Input id="itemName" value={newInvName} onChange={(e) => setNewInvName(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="itemQty">Initial Quantity</Label>
                      <Input id="itemQty" type="number" min="0" step="any" value={newInvQty} onChange={(e) => setNewInvQty(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="itemUnit">Unit</Label>
                      <select id="itemUnit" value={newInvUnit} onChange={(e) => setNewInvUnit(e.target.value)} className="flex h-10 w-full rounded-md border bg-slate-50 px-3 py-2 text-sm outline-none">
                        <option value="kg">kg</option>
                        <option value="pcs">pcs</option>
                        <option value="liters">liters</option>
                        <option value="grams">grams</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="itemMin">Low-Stock Alert Level</Label>
                    <Input id="itemMin" type="number" min="0" step="any" value={newInvMin} onChange={(e) => setNewInvMin(e.target.value)} required />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white w-full">Save Item</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {inventoryLoading ? (
                <div className="p-8 text-center text-slate-400 animate-pulse italic text-xs">Loading kitchen inventory...</div>
              ) : inventory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-xs">No inventory items found.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 border-b font-bold text-slate-500">
                        <th className="p-4 pl-6">Ingredient</th>
                        <th className="p-4 text-center">Remaining Quantity</th>
                        <th className="p-4 text-center">Alert Limit</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventory.map((item: any) => {
                        const isLowStock = item.quantity <= item.minStock;
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/50 ${isLowStock ? 'bg-amber-50/30' : ''}`}>
                            <td className="p-4 pl-6 font-bold text-slate-900">{item.name}</td>
                            <td className="p-4 text-center font-mono font-bold text-slate-700">{item.quantity} {item.unit}</td>
                            <td className="p-4 text-center font-mono text-slate-400">{item.minStock} {item.unit}</td>
                            <td className="p-4 text-center">
                              {isLowStock ? (
                                <Badge className="bg-amber-100 text-amber-800 border-none font-bold flex items-center gap-1 w-max mx-auto">
                                  <AlertTriangle size={14} /> Low Stock
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold w-max mx-auto">Adequate</Badge>
                              )}
                            </td>
                            <td className="p-4 text-right pr-6 flex items-center justify-end gap-2">
                              <Button 
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => setSelectedInvItem(item)}
                              >
                                Adjust Stock
                              </Button>
                              {(user?.role === 'admin' || user?.role === 'manager') && (
                                <Button 
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-600 h-8 w-8 p-0"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete inventory item "${item.name}"?`)) {
                                      deleteInventoryItemMutation.mutate(item.id);
                                    }
                                  }}
                                  disabled={deleteInventoryItemMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={!!selectedInvItem} onOpenChange={(open) => !open && setSelectedInvItem(null)}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Adjust Ingredient Stock</DialogTitle>
                <DialogDescription>Modify storage counts for <strong>{selectedInvItem?.name}</strong>.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdjustStockSubmit} className="space-y-4 py-3">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-600">
                  <p>Current Storage Count: <strong>{selectedInvItem?.quantity} {selectedInvItem?.unit}</strong></p>
                  <p>Threshold Warning Limit: <strong>{selectedInvItem?.minStock} {selectedInvItem?.unit}</strong></p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adjustVal">Add / Subtract Quantity</Label>
                  <Input 
                    id="adjustVal" 
                    type="number" 
                    step="any"
                    placeholder="e.g. 5 to add, -3 to subtract"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    required 
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={adjustInventoryMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                    {adjustInventoryMutation.isPending ? 'Saving...' : 'Apply Adjustment'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── FOOD & DRINKS MENU TAB ── */}
        <TabsContent value="menu" className="space-y-6 animate-in fade-in duration-300">
          
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Restaurant Menu Catalog</h3>
              <p className="text-xs text-slate-400 mt-0.5">Customize food, beverages, price catalog, and availability.</p>
            </div>
            
            {/* Add Menu Item Trigger */}
            <Dialog open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
              <DialogTrigger render={
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => {
                  setMenuForm({ name: '', category: 'Starters', price: '', description: '', isAvailable: true });
                }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Menu Item
                </Button>
              } />
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle>Add Menu Item</DialogTitle>
                  <DialogDescription>Add a new dish or drink to the restaurant catalog.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMenuSubmit} className="space-y-4 py-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="menuName">Name</Label>
                    <Input id="menuName" placeholder="e.g. Garlic Herb Pasta" value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="menuCategory">Category / Group</Label>
                      <select id="menuCategory" value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})} className="flex h-10 w-full rounded-md border bg-slate-50 px-3 py-2 text-sm outline-none">
                        <option value="Starters">Starters</option>
                        <option value="Mains">Mains</option>
                        <option value="Drinks">Drinks</option>
                        <option value="Desserts">Desserts</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="menuPrice">Price (₹)</Label>
                      <Input id="menuPrice" type="number" step="any" min="0" placeholder="0.00" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="menuDesc">Description</Label>
                    <textarea id="menuDesc" placeholder="Describe the dish ingredients..." rows={3} value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="menuAvail" checked={menuForm.isAvailable} onChange={e => setMenuForm({...menuForm, isAvailable: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                    <Label htmlFor="menuAvail" className="text-xs font-bold text-slate-700 cursor-pointer">Available for Ordering</Label>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white w-full">Save Item</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Easy Navigation Category Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1 shrink-0">
              <Layers size={13} /> Filter Groups:
            </span>
            {menuCategories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`font-bold font-sans text-xs rounded-xl shadow-none shrink-0 ${
                  selectedCategoryFilter === cat 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Menu items card list */}
          {menuLoading ? (
            <div className="p-8 text-center text-slate-400 animate-pulse italic text-xs">Loading menu items...</div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic text-xs bg-white rounded-2xl border">No menu items found in this category group.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenuItems.map((item: any) => (
                <Card key={item.id} className={`border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition ${!item.isAvailable ? 'bg-slate-50/70 border-slate-100 opacity-75' : ''}`}>
                  <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className={`font-black font-sans uppercase text-[9px] border-none tracking-wide ${
                          item.category === 'Starters' ? 'bg-amber-100 text-amber-700' :
                          item.category === 'Mains' ? 'bg-blue-100 text-blue-700' :
                          item.category === 'Drinks' ? 'bg-teal-100 text-teal-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {item.category}
                        </Badge>
                        <h4 className="font-extrabold text-sm text-slate-800 mt-2">{item.name}</h4>
                      </div>
                      <span className="text-xs font-black text-blue-600 font-mono">₹{Number(item.price).toFixed(2)}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="py-3 flex-1 text-xs text-slate-500 font-medium">
                    <p className="line-clamp-3 leading-relaxed italic">{item.description || 'No description provided.'}</p>
                  </CardContent>
                  
                  <div className="p-3 border-t bg-slate-50/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-blue-500 p-1 h-8 w-8"
                        onClick={() => openEditMenuDialog(item)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-red-500 p-1 h-8 w-8"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                            deleteMenuItemMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>

                    {/* Toggle Availability Quick Action */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`text-xs font-bold flex items-center gap-1.5 h-8 px-2.5 rounded-lg border-none ${
                        item.isAvailable 
                          ? 'text-emerald-600 hover:bg-emerald-50' 
                          : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      onClick={() => editMenuItemMutation.mutate({
                        id: item.id,
                        data: { isAvailable: !item.isAvailable }
                      })}
                    >
                      {item.isAvailable ? (
                        <>
                          <ToggleRight size={18} className="text-emerald-500" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={18} className="text-slate-300" />
                          <span>Muted</span>
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Menu Item Dialog */}
          <Dialog open={isEditMenuOpen} onOpenChange={(open) => !open && setIsEditMenuOpen(false)}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Edit Menu Item</DialogTitle>
                <DialogDescription>Modify fields for <strong>{selectedMenuItem?.name}</strong>.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditMenuSubmit} className="space-y-4 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editMenuName">Name</Label>
                  <Input id="editMenuName" value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="editMenuCategory">Category / Group</Label>
                    <select id="editMenuCategory" value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})} className="flex h-10 w-full rounded-md border bg-slate-50 px-3 py-2 text-sm outline-none">
                      <option value="Starters">Starters</option>
                      <option value="Mains">Mains</option>
                      <option value="Drinks">Drinks</option>
                      <option value="Desserts">Desserts</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editMenuPrice">Price (₹)</Label>
                    <Input id="editMenuPrice" type="number" step="any" min="0" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editMenuDesc">Description</Label>
                  <textarea id="editMenuDesc" rows={3} value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="editMenuAvail" checked={menuForm.isAvailable} onChange={e => setMenuForm({...menuForm, isAvailable: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                  <Label htmlFor="editMenuAvail" className="text-xs font-bold text-slate-700 cursor-pointer">Available for Ordering</Label>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={editMenuItemMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                    {editMenuItemMutation.isPending ? 'Saving...' : 'Apply Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
