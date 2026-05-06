"use client";
import { motion } from "motion/react";
import { 
  Building2, 
  MapPin, 
  Home, 
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

const FLOORS = ["Tầng 12", "Tầng 11", "Tầng 10", "Tầng 9"];
const STATUS_COLORS = {
  occupied: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  vacant: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  maintenance: "bg-amber-500/20 text-amber-400 border-amber-500/30"
};

// Generate dummy apartments
const generateApartments = () => {
  const apts = [];
  for (let f = 12; f >= 9; f--) {
    for (let r = 1; r <= 8; r++) {
      const id = `A${f}${r < 10 ? '0'+r : r}`;
      const status = Math.random() > 0.7 ? (Math.random() > 0.5 ? 'vacant' : 'maintenance') : 'occupied';
      const owner = status === 'occupied' ? `Nguyễn Văn ${String.fromCharCode(64 + r)}` : null;
      apts.push({ id, floor: `Tầng ${f}`, status, owner, type: r % 3 === 0 ? "3PN" : "2PN" });
    }
  }
  return apts;
};

const DUMMY_APARTMENTS = generateApartments();

export default function ApartmentsPage() {
  const [selectedFloor, setSelectedFloor] = useState("Tầng 12");
  
  const filteredApts = DUMMY_APARTMENTS.filter(a => a.floor === selectedFloor);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between gap-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <Building2 className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Định Danh <span className="text-indigo-400">Căn Hộ</span></h1>
            <p className="text-sm text-zinc-400 max-w-md">
              Sơ đồ toà nhà, quản lý thông tin cư dân và trạng thái bàn giao của từng căn hộ trong hệ thống TownHub.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-[#111] border border-white/10 rounded-xl p-1 flex">
            {['Tòa A', 'Tòa B', 'Villa'].map(b => (
              <button 
                key={b}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  b === 'Tòa A' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar - Floors */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 space-y-4"
        >
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">Sơ Đồ Tầng</h3>
            {FLOORS.map(floor => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all ${
                  selectedFloor === floor 
                    ? 'bg-indigo-500 border border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.4)] text-white font-bold' 
                    : 'bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className={`w-4 h-4 ${selectedFloor === floor ? 'text-white' : 'text-zinc-500'}`} />
                  {floor}
                </div>
                {selectedFloor === floor && (
                  <span className="flex w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
            ))}
          </div>

          <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Chú Thích</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="w-3 h-3 rounded-full bg-emerald-500/50 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                Đã có cư dân (Định danh)
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="w-3 h-3 rounded-full bg-zinc-500/50 border border-zinc-400" />
                Đang trống
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="w-3 h-3 rounded-full bg-amber-500/50 border border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                Đang bảo trì / Sửa chữa
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Content - Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3 bg-[#111] border border-white/5 rounded-2xl p-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Home className="w-5 h-5 text-indigo-400" />
              Mặt Bằng {selectedFloor}
            </h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Mã căn..." 
                  className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all w-32"
                />
              </div>
              <button className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApts.map((apt, idx) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className={`relative group p-4 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                  apt.status === 'occupied' 
                    ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10' 
                    : apt.status === 'maintenance'
                    ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {/* Status Indicator */}
                <div className="absolute top-3 right-3">
                  {apt.status === 'occupied' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {apt.status === 'maintenance' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                  {apt.status === 'vacant' && <div className="w-2 h-2 rounded-full bg-zinc-500 m-1" />}
                </div>

                <div className="mb-4">
                  <h3 className={`text-2xl font-black tracking-tighter ${
                    apt.status === 'occupied' ? 'text-emerald-400' :
                    apt.status === 'maintenance' ? 'text-amber-400' : 'text-zinc-300'
                  }`}>{apt.id}</h3>
                  <span className="text-xs text-zinc-500 font-medium px-2 py-0.5 rounded bg-black/50 border border-white/5 mt-1 inline-block">
                    {apt.type}
                  </span>
                </div>

                <div className="mt-auto border-t border-white/5 pt-3">
                  {apt.owner ? (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Chủ hộ</p>
                      <p className="text-sm font-medium text-white truncate group-hover:text-emerald-300 transition-colors">{apt.owner}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Trạng thái</p>
                      <p className="text-sm font-medium text-zinc-400 italic">Trống</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}