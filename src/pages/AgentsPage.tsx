import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Agent {
  id: number;
  name: string;
  email: string;
  bookingsCount: number;
  totalRevenue: number;
}

export default function AgentsPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  // Pricing configuration states
  const [pricingAgent, setPricingAgent] = useState<Agent | null>(null);
  const [pricingSheet, setPricingSheet] = useState<any[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  const handleOpenPricing = async (agent: Agent) => {
    setPricingAgent(agent);
    setLoadingPricing(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/pricing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch pricing');
      const data = await res.json();
      setPricingSheet(data);
    } catch (err: any) {
      alert(err.message);
      setPricingAgent(null);
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingAgent) return;
    setSavingPricing(true);
    
    // Construct payload: { pricing: { [roomTypeId]: price } }
    const pricingPayload: Record<number, number | null> = {};
    pricingSheet.forEach(row => {
      pricingPayload[row.roomTypeId] = row.customPrice !== null && row.customPrice !== '' ? parseFloat(row.customPrice) : null;
    });

    try {
      const res = await fetch(`/api/agents/${pricingAgent.id}/pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pricing: pricingPayload })
      });
      if (!res.ok) throw new Error('Failed to save pricing overrides');
      alert('Pricing overrides saved successfully!');
      setPricingAgent(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingPricing(false);
    }
  };

  // Optimized fetching with React Query
  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
    staleTime: 60000,
  });

  // Mutations
  const addAgentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add agent');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setOpen(false);
    },
    onError: (err: any) => alert(err.message)
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to remove agent');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setAgentToDelete(null);
    },
    onError: (err: any) => alert(err.message)
  });

  const handleAddAgent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    addAgentMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Agents</h1>
          <p className="text-slate-500 mt-1">Manage travel agents and view their performance.</p>
        </div>

        {/* Add Agent Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button>Add Agent</Button>} />
          <DialogContent>
            <form onSubmit={handleAddAgent}>
              <DialogHeader>
                <DialogTitle>Add New Agent</DialogTitle>
                <DialogDescription>
                  Create an account for a new travel agent. They will receive access to their dashboard.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="name" className="text-left sm:text-right text-xs sm:text-sm">Name</Label>
                  <Input id="name" name="name" className="col-span-3" required />
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="email" className="text-left sm:text-right text-xs sm:text-sm">Email</Label>
                  <Input id="email" name="email" type="email" className="col-span-3" required />
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="password" className="text-left sm:text-right text-xs sm:text-sm">Password</Label>
                  <Input id="password" name="password" type="password" className="col-span-3" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addAgentMutation.isPending}>
                  {addAgentMutation.isPending ? 'Adding...' : 'Save Agent'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!agentToDelete} onOpenChange={(o) => { if (!o) setAgentToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{agentToDelete?.name}</strong>? This action cannot be undone.
              Their existing bookings will remain in the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgentToDelete(null)} disabled={deleteAgentMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => agentToDelete && deleteAgentMutation.mutate(agentToDelete.id)}
              disabled={deleteAgentMutation.isPending}
            >
              {deleteAgentMutation.isPending ? 'Removing...' : 'Remove Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Bookings</TableHead>
                  <TableHead>Revenue Generated</TableHead>
                  {user?.role === 'admin' && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'admin' ? 5 : 4} className="text-center py-6 text-slate-500 animate-pulse">
                      Loading agents...
                    </TableCell>
                  </TableRow>
                ) : agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'admin' ? 5 : 4} className="text-center py-6 text-slate-500">
                      No agents found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map(agent => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell className="text-slate-500">{agent.email}</TableCell>
                      <TableCell>{agent.bookingsCount}</TableCell>
                      <TableCell>
                        ₹{(agent.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      {user?.role === 'admin' && (
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-slate-700 border-slate-200 hover:bg-slate-50"
                            onClick={() => handleOpenPricing(agent)}
                          >
                            Configure Pricing
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setAgentToDelete(agent)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Configure Agent Pricing Dialog */}
      <Dialog open={!!pricingAgent} onOpenChange={(o) => { if (!o) setPricingAgent(null); }}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
          <form onSubmit={handleSavePricing}>
            <DialogHeader className="bg-slate-900 text-white px-6 py-4 rounded-t-lg -mx-6 -mt-6">
              <DialogTitle className="text-lg font-bold">Configure Custom Pricing: {pricingAgent?.name}</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Set agent-specific overrides for room categories. Empty fields default to hotel pricing.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {loadingPricing ? (
                <p className="text-center text-slate-500 py-4 animate-pulse">Loading room categories...</p>
              ) : pricingSheet.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No room categories found.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <Table className="w-full">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs uppercase font-bold text-slate-400">Category</TableHead>
                        <TableHead className="w-24 text-right text-xs uppercase font-bold text-slate-400">Default</TableHead>
                        <TableHead className="w-32 text-right text-xs uppercase font-bold text-slate-400">Agent Rate (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingSheet.map((row, i) => (
                        <TableRow key={row.roomTypeId}>
                          <TableCell className="font-semibold text-slate-800 text-xs">{row.name}</TableCell>
                          <TableCell className="text-right text-slate-500 text-xs">₹{row.defaultPrice}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              placeholder="Default"
                              value={row.customPrice !== null && row.customPrice !== undefined ? row.customPrice : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedSheet = [...pricingSheet];
                                updatedSheet[i] = {
                                  ...updatedSheet[i],
                                  customPrice: val !== '' ? parseFloat(val) : null
                                };
                                setPricingSheet(updatedSheet);
                              }}
                              className="text-right h-8 text-xs bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter className="-mx-6 -mb-6 bg-slate-50 px-6 py-4 rounded-b-lg border-t border-slate-100 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setPricingAgent(null)} disabled={savingPricing} className="text-slate-500">
                Cancel
              </Button>
              <Button type="submit" disabled={loadingPricing || savingPricing} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {savingPricing ? 'Saving...' : 'Save Price Overrides'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
