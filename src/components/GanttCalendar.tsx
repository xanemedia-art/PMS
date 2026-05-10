import React, { useState } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  parseISO, 
  addMonths, 
  subMonths,
  differenceInDays,
  startOfDay,
  isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GanttCalendar({ bookings, rooms }: { bookings: any[], rooms: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // A fixed cell width for each day
  const cellWidth = 48; // 48px

  // Organize bookings by room and filter out irrelevant ones
  const roomBookings = rooms.map(room => {
    return {
      ...room,
      bookings: bookings.filter(b => b.roomId === room.id)
    };
  });

  return (
    <div className="flex flex-col border border-slate-200 rounded-md bg-white overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50">
        <h2 className="text-xl font-semibold text-slate-800">{format(currentDate, 'MMMM yyyy')}</h2>
        <div className="space-x-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto relative scrollbar-thin scrollbar-thumb-slate-300">
        <div style={{ minWidth: `${daysInMonth.length * cellWidth + 150}px` }}> {/* +150 for room column */}
          {/* Header Row */}
          <div className="flex border-b border-slate-200 bg-slate-100">
            {/* Room Column Header */}
            <div className="w-[150px] flex-shrink-0 p-3 border-r border-slate-200 font-medium text-sm text-slate-600 sticky left-0 z-20 bg-slate-100">
              Room
            </div>
            {/* Days Headers */}
            <div className="flex flex-grow">
              {daysInMonth.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={idx} style={{ width: cellWidth }} className={`flex-shrink-0 flex flex-col items-center justify-center p-2 border-r border-slate-200 last:border-r-0 ${isToday ? 'bg-blue-50 text-blue-700' : ''}`}>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{format(day, 'EEEEEE')}</span>
                    <span className={`text-sm font-semibold ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Rows */}
          {roomBookings.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No rooms available.</div>
          ) : (
            <div className="flex flex-col relative bg-slate-50 pb-4">
              {roomBookings.map((room) => (
                <div key={room.id} className="flex border-b border-slate-200 group">
                  {/* Room Label */}
                  <div className="w-[150px] flex-shrink-0 p-3 border-r border-slate-200 font-medium sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[1px_0_0_rgba(0,0,0,0.05)] flex items-center h-[60px]">
                    <div>
                      <div className="font-semibold text-sm text-slate-800">{room.number}</div>
                      <div className="text-xs text-slate-500">{room.roomType?.name || room.roomType}</div>
                    </div>
                  </div>
                  
                  {/* Days Grid & Bookings for this room */}
                  <div className="flex flex-grow relative bg-white h-[60px]">
                    {/* Background cells */}
                    {daysInMonth.map((day, i) => (
                      <div 
                        key={i} 
                        style={{ width: cellWidth }} 
                        className={`flex-shrink-0 border-r border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors ${isSameDay(day, new Date()) ? 'bg-blue-50/30' : ''}`} 
                        onClick={() => {
                          if (window.confirm(`Would you like to make a booking for ${room.number} starting on ${format(day, 'MMM d, yyyy')}?`)) {
                            // Focus on new booking form or dispatch event
                            const customEvent = new CustomEvent('open-new-booking', {
                              detail: { roomId: room.id, date: format(day, 'yyyy-MM-dd') }
                            });
                            window.dispatchEvent(customEvent);
                          }
                        }}
                      />
                    ))}
                    
                    {/* Absolutely positioned Bookings */}
                    {room.bookings.map((booking: any) => {
                      const checkIn = startOfDay(parseISO(booking.checkInDate));
                      const checkOut = startOfDay(parseISO(booking.checkOutDate));
                      
                      // Filter if booking entirely outside this month view
                      if (checkOut <= monthStart || checkIn > monthEnd) return null;

                      // Display bounds constrained to the current month view
                      const displayStart = checkIn < monthStart ? monthStart : checkIn;
                      // Display until checkOut date or end of month
                      const displayEnd = checkOut > (addMonths(monthStart, 1)) ? addMonths(monthStart, 1) : checkOut;

                      const startOffsetDays = differenceInDays(displayStart, monthStart);
                      const durationDays = differenceInDays(displayEnd, displayStart);

                      const left = startOffsetDays * cellWidth;
                      const width = durationDays * cellWidth;
                      
                      // Ensure minimum width when checking in and out same day (which shouldn't happen usually for hotels)
                      const finalWidth = Math.max(width, cellWidth - 4);

                      const statusStyles: any = {
                        confirmed: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200',
                        checked_in: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
                        checked_out: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
                        pending: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
                        cancelled: 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200',
                      };

                      return (
                        <div
                          key={booking.id}
                          className={`absolute top-1/2 -translate-y-1/2 h-[44px] border rounded-md px-3 overflow-hidden text-xs flex flex-col justify-center shadow-sm z-10 cursor-pointer transition-colors ${statusStyles[booking.status] || statusStyles.pending}`}
                          style={{ left: left + 2, width: finalWidth - 4 }}
                          title={`${booking.guestName} - ${booking.status.replace('_', ' ')}`}
                        >
                          <div className="font-semibold truncate">{booking.guestName}</div>
                          <div className="opacity-75 truncate">{format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
