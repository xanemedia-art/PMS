import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function PlansPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    priceMultiplier: '1.0',
    description: ''
  });

  // Optimized fetching with React Query
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },
    staleTime: 300000,
  });

  // Mutations
  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsDialogOpen(false);
      setFormData({ name: '', priceMultiplier: '1.0', description: '' });
    },
    onError: (err: any) => alert(err.message)
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (err: any) => alert(err.message)
  });

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    createPlanMutation.mutate({
      ...formData,
      priceMultiplier: parseFloat(formData.priceMultiplier)
    });
  };

  const handleDeletePlan = (id: number) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    deletePlanMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Room Plans</h1>
          <p className="text-slate-500 mt-1">Manage room meal plans (EP, CP, MAP, AP).</p>
        </div>
        
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button>New Plan</Button>} />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Room Plan</DialogTitle>
                <DialogDescription>
                  Enter plan details (e.g. CP - Continental Plan).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePlan}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input 
                      id="name" 
                      className="col-span-3" 
                      placeholder="e.g. MAP"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="priceMultiplier" className="text-right">Price Mult.</Label>
                    <Input 
                      id="priceMultiplier" 
                      type="number"
                      step="0.01"
                      className="col-span-3" 
                      placeholder="1.0"
                      value={formData.priceMultiplier}
                      onChange={(e) => setFormData({...formData, priceMultiplier: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Description</Label>
                    <Input 
                      id="description" 
                      className="col-span-3" 
                      placeholder="Includes breakfast and dinner"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createPlanMutation.isPending}>
                    {createPlanMutation.isPending ? 'Saving...' : 'Save Plan'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Plan Name</TableHead>
                <TableHead>Price Multiplier</TableHead>
                <TableHead>Description</TableHead>
                {(user?.role === 'admin' || user?.role === 'manager') && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-slate-500">Loading plans...</TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-slate-500">No plans found.</TableCell>
                </TableRow>
              ) : (
                plans.map((plan: any) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.id}</TableCell>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{plan.priceMultiplier}x</TableCell>
                    <TableCell className="text-slate-500">{plan.description}</TableCell>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          className="text-red-500" 
                          size="sm" 
                          onClick={() => handleDeletePlan(plan.id)}
                          disabled={deletePlanMutation.isPending}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
