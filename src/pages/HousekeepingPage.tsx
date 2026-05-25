import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function HousekeepingPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    roomId: '',
    notes: ''
  });

  // Optimized fetching with React Query
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['housekeepingTasks'],
    queryFn: async () => {
      const res = await fetch('/api/housekeeping', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    staleTime: 30000,
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
    staleTime: 60000,
  });

  const loading = tasksLoading || roomsLoading;

  // Mutations
  const assignTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/housekeeping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeepingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsDialogOpen(false);
      setFormData({ roomId: '', notes: '' });
    },
    onError: (err: any) => alert(err.message)
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: any) => {
      const res = await fetch(`/api/housekeeping/${taskId}/status`, {
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
      queryClient.invalidateQueries({ queryKey: ['housekeepingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (err: any) => alert(err.message)
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/housekeeping/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete task');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeepingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      alert('Housekeeping task deleted successfully');
    },
    onError: (err: any) => alert(err.message)
  });

  const handleAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    assignTaskMutation.mutate({
      roomId: parseInt(formData.roomId),
      notes: formData.notes
    });
  };

  const statusColors = {
    clean: 'bg-green-100 text-green-800',
    dirty: 'bg-red-100 text-red-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Housekeeping</h1>
          <p className="text-slate-500 mt-1">Manage room cleaning status and assigned tasks.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button>Assign Task</Button>} />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign Housekeeping Task</DialogTitle>
              <DialogDescription>
                Assign a room for cleaning and add any specific notes.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssignTask}>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="roomId" className="text-left sm:text-right text-xs sm:text-sm">Room</Label>
                  <select 
                    id="roomId"
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.roomId}
                    onChange={(e) => setFormData({...formData, roomId: e.target.value})}
                    required
                  >
                    <option value="" disabled>Select room</option>
                    {rooms.map((room: any) => (
                      <option key={room.id} value={room.id}>
                        Room {room.number}
                      </option>
                    ))}
                    {rooms.length === 0 && <option value="" disabled>No rooms found</option>}
                  </select>
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="notes" className="text-left sm:text-right text-xs sm:text-sm">Notes</Label>
                  <Input 
                    id="notes" 
                    className="col-span-3" 
                    placeholder="e.g. Deep cleaning needed"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={assignTaskMutation.isPending}>
                  {assignTaskMutation.isPending ? 'Assigning...' : 'Assign Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-slate-500">Loading tasks...</TableCell>
                  </TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-slate-500">No housekeeping tasks.</TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task: any) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">Room {task.roomNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${statusColors[task.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">{task.notes || '-'}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{new Date(task.updatedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                         {task.status === 'dirty' && (
                           <Button 
                             size="sm" 
                             variant="outline" 
                             onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'in_progress' })}
                             disabled={updateStatusMutation.isPending}
                           >
                             Start
                           </Button>
                         )}
                         {task.status === 'in_progress' && (
                           <Button 
                             size="sm" 
                             variant="default" 
                             onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'clean' })}
                             disabled={updateStatusMutation.isPending}
                           >
                             Mark Clean
                           </Button>
                         )}
                          {task.status !== 'dirty' && task.status !== 'in_progress' && (
                            <Button size="sm" variant="ghost" disabled>Completed</Button>
                          )}
                          {user?.role !== 'agent' && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-500 hover:text-red-600 h-8 w-8 p-0" 
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete the housekeeping task for Room ${task.roomNumber}?`)) {
                                  deleteTaskMutation.mutate(task.id);
                                }
                              }}
                              disabled={deleteTaskMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                       </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
