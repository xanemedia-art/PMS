import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { QrCode, Trash2, Printer, Download, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQrCodePngUrl, downloadQrCode, printStandeeCard } from '../utils/qrCode';

export default function RoomsPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoomForQr, setSelectedRoomForQr] = useState<any>(null);
  
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
    staleTime: 60000, // 1 minute cache
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete room');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      alert(data.message || 'Room deleted successfully');
    },
    onError: (err: any) => alert(err.message)
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 h-8 px-2.5"
                            onClick={() => setSelectedRoomForQr(room)}
                            title="View & Print Room QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#C5A880]" />
                            <span className="text-xs font-semibold">QR Code</span>
                          </Button>

                          {room.status === 'occupied' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 px-2.5 text-xs font-semibold"
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

                          {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0"
                              onClick={() => {
                                if (room.status === 'occupied') {
                                  alert(`Cannot delete Room ${room.number} because it is currently occupied. Please check out the guest first.`);
                                  return;
                                }
                                if (confirm(`Are you sure you want to permanently delete Room ${room.number}?`)) {
                                  deleteRoomMutation.mutate(room.id);
                                }
                              }}
                              disabled={deleteRoomMutation.isPending}
                              title="Delete Room"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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

      {/* ROOM QR CODE & STANDEE DIALOG */}
      <Dialog open={!!selectedRoomForQr} onOpenChange={(open) => !open && setSelectedRoomForQr(null)}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6">
          <DialogHeader className="text-center pb-2">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-[#C5A880] mb-2 border border-amber-100">
              <QrCode className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Room {selectedRoomForQr?.number} Smart QR
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Place this QR standee in the room for instant guest room service orders & housekeeping requests.
            </DialogDescription>
          </DialogHeader>

          {selectedRoomForQr && (() => {
            const guestPortalUrl = `${window.location.origin}/guest/login?room=${selectedRoomForQr.number}`;
            return (
              <div className="space-y-6 pt-2">
                <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                  <img 
                    src={getQrCodePngUrl(guestPortalUrl, 300)} 
                    alt={`Room ${selectedRoomForQr.number} QR`} 
                    className="w-48 h-48 rounded-xl shadow-sm bg-white p-2"
                  />
                  <div className="mt-3 text-center">
                    <span className="text-[11px] font-mono text-slate-400 font-bold break-all">
                      {guestPortalUrl}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 font-medium leading-relaxed">
                    When guests scan this code on their mobile, it automatically directs them to Room <strong>{selectedRoomForQr.number}</strong>'s guest portal.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-slate-700"
                    onClick={() => downloadQrCode(guestPortalUrl, `Room-${selectedRoomForQr.number}-QR.png`)}
                  >
                    <Download className="w-4 h-4" /> Download PNG
                  </Button>
                  <Button 
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-bold bg-[#C5A880] hover:bg-[#b0946d] text-white shadow-md shadow-[#C5A880]/20"
                    onClick={() => printStandeeCard(
                      `Room ${selectedRoomForQr.number}`,
                      "Scan to order fresh room service, chat with front desk, and request housekeeping amenities.",
                      guestPortalUrl,
                      "Xane PMS • Smart Luxury In-Room Guest Experience"
                    )}
                  >
                    <Printer className="w-4 h-4" /> Print Standee
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
