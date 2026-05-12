import React from 'react';
import { User, Info, CheckCircle2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export interface RoomCardProps {
  id: string;
  name: string;
  capacity: number;
  price: number;
  availableCount: number;
  imageUrl?: string;
  images?: string[];
  description?: string;
  amenities?: string[];
  onAddRoom: (roomId: string) => void;
  onViewDetails: (rt: any) => void;
  onImageClick: (rt: any) => void;
  selectedCount: number;
}

export default function RoomCard({ 
  id, 
  name, 
  capacity, 
  price, 
  availableCount, 
  imageUrl,
  images = [],
  description = '',
  amenities = [],
  onAddRoom,
  onViewDetails,
  onImageClick,
  selectedCount
}: RoomCardProps) {
  const displayImage = imageUrl || images[0] || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col h-full"
    >
      <div className="relative h-72 overflow-hidden cursor-pointer" onClick={() => onImageClick({ id, name, images: images.length ? images : [displayImage] })}>
        <img 
          src={displayImage} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        
        <div className="absolute top-6 left-6 flex gap-2">
          {availableCount > 0 && availableCount <= 3 && (
            <div className="bg-red-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
              {availableCount} Left
            </div>
          )}
          <div className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/30">
            {capacity} Guests
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
           <h3 className="text-3xl font-black text-white tracking-tight mb-2">{name}</h3>
           <div className="flex items-center justify-between">
              <button 
                onClick={(e) => { e.stopPropagation(); onViewDetails({ id, name, description, amenities, images, price, capacity }); }}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors flex items-center gap-2"
              >
                <Info size={14} /> View Details
              </button>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60 block">Starting from</span>
                <span className="text-2xl font-black text-white">₹{price.toLocaleString('en-IN')}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col justify-between">
        <div className="space-y-4 mb-8">
           {amenities.slice(0, 4).map((amenity, idx) => (
             <div key={idx} className="flex items-center text-sm text-slate-500 font-medium">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3" />
               {amenity}
             </div>
           ))}
           {amenities.length === 0 && (
             <div className="flex items-center text-sm text-slate-500 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3" />
                Premium Boutique Sanctuary
             </div>
           )}
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => onAddRoom(id)}
            disabled={availableCount === 0 || (selectedCount || 0) >= availableCount}
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
              availableCount === 0 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-slate-200 hover:shadow-blue-200'
            }`}
          >
            {availableCount === 0 ? 'Fully Booked' : (selectedCount > 0 ? `Selected (${selectedCount})` : 'Select This Sanctuary')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}


