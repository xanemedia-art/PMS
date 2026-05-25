import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function RoomsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
    staleTime: 60000, // 1 minute cache
  });

  const resetPinMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const res = await fetch(`/api/rooms/${roomId}/reset-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to reset PIN');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      alert(`PIN successfully reset. New PIN: ${data.guestPin}`);
    },
    onError: (err: any) => alert(err.message)
  });

  const statusColors = {
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-red-100 text-red-800',
    dirty: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Rooms</h1>
          <p className="text-slate-500 mt-1">Manage physical rooms and real-time status.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Price/Night</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Guest PIN</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-slate-500">Loading rooms...</TableCell>
                  </TableRow>
                ) : rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-slate-500">No rooms found.</TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room: any) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-semibold text-slate-900">{room.number}</TableCell>
                      <TableCell>{room.roomType}</TableCell>
                      <TableCell>{room.capacity} Guests</TableCell>
                      <TableCell>₹{Number(room.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${statusColors[room.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                          {room.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {room.status === 'occupied' ? (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            {room.guestPin || 'Not set'}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {room.status === 'occupied' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => {
                                if (confirm(`Regenerate Guest PIN for Room ${room.number}?`)) {
                                  resetPinMutation.mutate(room.id);
                                }
                              }}
                              disabled={resetPinMutation.isPending}
                            >
                              Reset PIN
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">Manage</Button>
                        </div>
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
