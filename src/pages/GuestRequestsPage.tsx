import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Sparkles, Send, User, CheckCircle2, Clock, Trash, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function GuestRequestsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Chat states
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [activeRoomNumber, setActiveRoomNumber] = useState<string>('');
  const [activeGuestName, setActiveGuestName] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Queries
  // 1. Fetch active chat rooms
  const { data: activeChats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ['adminChats'],
    queryFn: async () => {
      const res = await fetch('/api/guest/admin/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch chats');
      return res.json();
    },
    refetchInterval: 4000 // Poll every 4 seconds
  });

  // 2. Fetch messages for selected room
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['adminChatMessages', activeBookingId],
    queryFn: async () => {
      if (!activeBookingId) return [];
      const res = await fetch(`/api/guest/admin/chats/${activeBookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      const chatLogs = await res.json();
      return chatLogs.reverse(); // Chronological order
    },
    enabled: !!activeBookingId,
    refetchInterval: 3000 // Poll faster when open
  });

  // 3. Fetch housekeeping tasks
  const { data: housekeepingTasks = [], isLoading: hkLoading } = useQuery({
    queryKey: ['housekeepingTasksAdmin'],
    queryFn: async () => {
      const res = await fetch('/api/housekeeping', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch housekeeping');
      return res.json();
    },
    refetchInterval: 8000
  });

  // Mutations
  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!activeBookingId) return;
      const res = await fetch(`/api/guest/admin/chats/${activeBookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['adminChatMessages', activeBookingId] });
      queryClient.invalidateQueries({ queryKey: ['adminChats'] });
    }
  });

  // Complete Housekeeping Task
  const completeHousekeepingMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const res = await fetch(`/api/housekeeping/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeepingTasksAdmin'] });
      alert('Housekeeping request status updated!');
    }
  });

  // Scroll chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Select a chat room helper
  const selectChat = (chat: any) => {
    setActiveBookingId(chat.bookingId);
    setActiveRoomNumber(chat.roomNumber);
    setActiveGuestName(chat.guestName);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() === '') return;
    sendMessageMutation.mutate(messageText);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Guest Portal Requests</h1>
        <p className="text-slate-500 mt-1">Manage guest live chat channels and housekeeping task requests.</p>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Live Guest Chats
          </TabsTrigger>
          <TabsTrigger value="housekeeping" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Housekeeping Requests
          </TabsTrigger>
        </TabsList>

        {/* ── LIVE CHATS TAB ── */}
        <TabsContent value="chat">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[72vh]">
            
            {/* Chats List Column */}
            <Card className="md:col-span-1 border border-slate-200 flex flex-col overflow-hidden h-full shadow-sm">
              <CardHeader className="pb-3 border-b bg-slate-50">
                <CardTitle className="text-sm font-semibold uppercase text-slate-600 tracking-wider">Active Conversations</CardTitle>
                <CardDescription className="text-xs">Select a room to begin chatting.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-slate-100">
                {chatsLoading ? (
                  <div className="p-8 text-center text-slate-400 animate-pulse italic text-xs">Loading conversations...</div>
                ) : activeChats.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-xs flex flex-col items-center justify-center h-48 space-y-2">
                    <MessageSquare size={24} className="text-slate-300" />
                    <span>No active chats from guests.</span>
                  </div>
                ) : (
                  activeChats.map((chat: any) => {
                    const isSelected = chat.bookingId === activeBookingId;
                    return (
                      <button
                        key={chat.bookingId}
                        onClick={() => selectChat(chat)}
                        className={`w-full p-4 text-left transition flex justify-between items-start gap-2 hover:bg-slate-50 ${
                          isSelected ? 'bg-blue-50/60 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-800 text-xs">Room {chat.roomNumber}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 truncate">{chat.guestName}</p>
                          <p className={`text-xs mt-1 truncate ${chat.lastSender === 'guest' ? 'font-bold text-blue-600' : 'text-slate-400'}`}>
                            {chat.lastSender === 'guest' ? 'Guest: ' : 'You: '} {chat.lastMessage}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Conversational Chat View Column */}
            <Card className="md:col-span-2 border border-slate-200 flex flex-col overflow-hidden h-full shadow-sm">
              {activeBookingId ? (
                <>
                  <CardHeader className="pb-3 border-b bg-slate-50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">Room {activeRoomNumber}</CardTitle>
                      <CardDescription className="text-xs font-semibold text-slate-500">{activeGuestName}</CardDescription>
                    </div>
                  </CardHeader>
                  
                  {/* Message Stream */}
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {messages.map((msg: any) => {
                      const isStaff = msg.sender === 'staff';
                      return (
                        <div key={msg.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs ${
                            isStaff 
                              ? 'bg-blue-600 text-white rounded-br-none shadow-sm shadow-blue-100' 
                              : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
                          }`}>
                            <p className="leading-relaxed font-medium">{msg.message}</p>
                            <span className={`block text-[9px] text-right mt-1 ${isStaff ? 'text-slate-200' : 'text-slate-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatBottomRef} />
                  </CardContent>

                  {/* Message Input Box */}
                  <div className="p-4 border-t bg-white">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        placeholder={`Reply to Room ${activeRoomNumber}...`}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        required
                        className="bg-slate-50 border-none focus-visible:ring-blue-500 h-10 rounded-xl"
                      />
                      <Button type="submit" disabled={sendMessageMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4">
                        <Send className="w-4 h-4 mr-2" /> Send
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                  <div className="bg-slate-100 p-4 rounded-full text-slate-400 mb-3">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800">No Chat Selected</h3>
                  <p className="text-xs text-slate-400 max-w-xs text-center mt-1">Select a room from the conversations sidebar to reply to guest inquiries in real-time.</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ── HOUSEKEEPING REQUESTS TAB ── */}
        <TabsContent value="housekeeping">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50">
              <CardTitle className="text-sm font-semibold uppercase text-slate-600 tracking-wider">Housekeeping Service Tracker</CardTitle>
              <CardDescription className="text-xs">Live list of dirty, clean, or in-progress cleaning requests.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {hkLoading ? (
                <div className="p-8 text-center text-slate-400 animate-pulse italic text-xs">Loading requests...</div>
              ) : housekeepingTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-xs">No active service tasks found.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 border-b font-bold text-slate-500">
                        <th className="p-4">Room</th>
                        <th className="p-4">Requested Service / Notes</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {housekeepingTasks.map((task: any) => (
                        <tr key={task.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-slate-900">Room {task.roomNumber || task.roomId}</td>
                          <td className="p-4 font-semibold text-slate-700">{task.notes || 'Routine maintenance'}</td>
                          <td className="p-4">
                            <Badge className={`capitalize border-none font-bold font-sans ${
                              task.status === 'clean' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : task.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {task.status !== 'clean' && (
                                <>
                                  {task.status === 'dirty' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                      onClick={() => completeHousekeepingMutation.mutate({ taskId: task.id, status: 'in_progress' })}
                                    >
                                      Start Service
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    onClick={() => completeHousekeepingMutation.mutate({ taskId: task.id, status: 'clean' })}
                                  >
                                    Mark Clean
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
