import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogOut, Search, Eye, ShieldAlert, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API } from "@/context/AuthContext";
import KtpViewer from "@/components/KtpViewer";
import { useNoCapture } from "@/hooks/useNoCapture";

const GROUPS = [
  { key: "all", label: "Semua" },
  { key: "A", label: "Blok A" },
  { key: "B", label: "Blok B" },
  { key: "C", label: "Blok C" },
  { key: "D", label: "Blok D" },
  { key: "1", label: "Lantai 1" },
  { key: "2", label: "Lantai 2" },
  { key: "3", label: "Lantai 3" },
  { key: "4", label: "Lantai 4" },
];

const matchGroup = (nomor, group) => {
  if (group === "all") return true;
  if (["A", "B", "C", "D"].includes(group)) return nomor.startsWith(group);
  return nomor.length === 3 && nomor.startsWith(group);
};

export default function ViewerDashboard() {
  const { authHeaders, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [viewer, setViewer] = useState(null);

  useNoCapture();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/rooms`, { headers: authHeaders });
        setRooms(res.data);
      } catch (e) {
        toast.error("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authHeaders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (!matchGroup(r.nomor_kamar, group)) return false;
      if (!q) return true;
      return (
        r.nomor_kamar.toLowerCase().includes(q) ||
        (r.nama_penghuni || "").toLowerCase().includes(q)
      );
    });
  }, [rooms, search, group]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF9F5] to-[#FFF8EC] pb-24 select-none">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-stone-200/60">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white shadow-sm border border-stone-200 flex items-center justify-center overflow-hidden p-1">
              <img src="/whitekost-logo.jpg" alt="White Kost" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-stone-500 font-medium flex items-center gap-1">
                <Eye className="h-3 w-3" /> RT · White Kost 35
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-stone-900">
                Data Penghuni Kost
              </h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            data-testid="logout-button"
            className="rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          >
            <LogOut className="h-4 w-4 mr-1.5" /> Keluar
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-6">
        <div className="mb-5 rounded-[18px] bg-[#FFF9E6] border border-[#FFCC00]/30 px-4 py-3 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-[#FF9500] mt-0.5 shrink-0" strokeWidth={2} />
          <div className="text-sm text-[#3C3C43] leading-relaxed">
            Data ini bersifat rahasia. Screenshot, unduh, dan simpan gambar
            <span className="font-semibold text-[#1C1C1E]"> dilarang</span> dan dinonaktifkan di sistem.
            Hanya kamar terisi yang ditampilkan.
          </div>
        </div>

        <div className="relative mb-5">
          <Search className="h-4 w-4 text-[#8E8E93] absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor kamar atau nama..."
            data-testid="search-input"
            className="pl-11 h-12 rounded-[14px] bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF]/40"
          />
        </div>

        {/* Block / Floor quick tabs */}
        <div className="mb-5 -mx-5 px-5 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {GROUPS.map((g) => (
              <button
                key={g.key}
                onClick={() => setGroup(g.key)}
                data-testid={`group-${g.key}`}
                className={`px-4 h-9 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
                  group === g.key
                    ? "bg-[#1C1C1E] text-white border-[#1C1C1E] shadow-sm"
                    : "bg-white text-[#3C3C43] border-[#E5E5EA] hover:border-[#C7C7CC] hover:bg-[#F2F2F7]"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 text-sm text-[#8E8E93]">
          <span className="font-semibold text-[#1C1C1E]">{filtered.length}</span> kamar
          {group !== "all" ? ` di ${GROUPS.find(g => g.key === group)?.label}` : " terisi"}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 text-stone-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-200/70">
            <p className="text-sm text-stone-500">Tidak ada data untuk ditampilkan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((r, i) => (
              <motion.button
                key={r.nomor_kamar}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() =>
                  setViewer({ src: r.foto_ktp, name: r.nama_penghuni, room: r.nomor_kamar })
                }
                data-testid={`room-card-${r.nomor_kamar}`}
                className="group text-left bg-white rounded-[22px] border border-[#34C759]/25 shadow-[0_4px_20px_-8px_rgba(52,199,89,0.2)] hover:shadow-[0_10px_30px_-8px_rgba(52,199,89,0.3)] transition-all overflow-hidden"
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="relative aspect-[16/10] bg-[#F2F2F7] overflow-hidden">
                  <img
                    src={r.foto_ktp}
                    alt={`KTP ${r.nama_penghuni}`}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full object-cover pointer-events-none group-hover:scale-[1.02] transition-transform duration-300"
                    style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="inline-flex items-center gap-1 text-white text-xs bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                      <Lock className="h-3 w-3" strokeWidth={2} /> Ketuk untuk lihat penuh
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="inline-flex items-center rounded-full bg-[#34C759]/15 text-[#248A3D] text-[11px] font-semibold px-2 py-0.5">
                      {r.nomor_kamar}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#1C1C1E] truncate">
                    {r.nama_penghuni}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>

      {viewer && (
        <KtpViewer
          src={viewer.src}
          name={viewer.name}
          room={viewer.room}
          onClose={() => setViewer(null)}
          restricted={true}
        />
      )}
    </div>
  );
}
