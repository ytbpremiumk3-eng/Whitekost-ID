import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Search,
  Pencil,
  ImagePlus,
  X,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Circle,
  DoorOpen,
  DoorClosed,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth, API } from "@/context/AuthContext";
import KtpViewer from "@/components/KtpViewer";
import BulkImportDialog from "@/components/BulkImportDialog";
import Footer from "@/components/Footer";
import { formatLamaTinggal, formatTanggalID } from "@/lib/duration";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "occupied", label: "Terisi" },
  { key: "empty", label: "Kosong" },
];

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
  // floor keys: '1','2','3','4' -> match '101'..'106' etc.
  return nomor.length === 3 && nomor.startsWith(group);
};

export default function AdminDashboard() {
  const { authHeaders, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [group, setGroup] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nama_penghuni: "", foto_ktp: "", tanggal_masuk: "" });
  const [saving, setSaving] = useState(false);
  const [emptyConfirm, setEmptyConfirm] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/rooms`, { headers: authHeaders });
      setRooms(res.data);
    } catch (e) {
      toast.error("Gagal memuat data kamar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (!matchGroup(r.nomor_kamar, group)) return false;
      if (filter === "occupied" && !r.is_occupied) return false;
      if (filter === "empty" && r.is_occupied) return false;
      if (!q) return true;
      return (
        r.nomor_kamar.toLowerCase().includes(q) ||
        (r.nama_penghuni || "").toLowerCase().includes(q)
      );
    });
  }, [rooms, search, filter, group]);

  const stats = useMemo(() => {
    const occupied = rooms.filter((r) => r.is_occupied).length;
    return { total: rooms.length, occupied, empty: rooms.length - occupied };
  }, [rooms]);

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      nama_penghuni: r.nama_penghuni || "",
      foto_ktp: r.foto_ktp || "",
      tanggal_masuk: r.tanggal_masuk || "",
    });
    setSheetOpen(true);
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran maksimal 5MB");
      return;
    }
    const b64 = await fileToBase64(file);
    setForm((f) => ({ ...f, foto_ktp: b64 }));
  };

  const saveOccupied = async () => {
    if (!form.nama_penghuni.trim() || !form.foto_ktp || !form.tanggal_masuk) {
      toast.error("Nama, foto KTP, dan tanggal masuk wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await axios.put(
        `${API}/rooms/${editing.nomor_kamar}`,
        {
          is_occupied: true,
          nama_penghuni: form.nama_penghuni.trim(),
          foto_ktp: form.foto_ktp,
          tanggal_masuk: form.tanggal_masuk,
        },
        { headers: authHeaders }
      );
      toast.success(`Kamar ${editing.nomor_kamar} diperbarui`);
      setSheetOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const setEmpty = async (room) => {
    try {
      await axios.put(
        `${API}/rooms/${room.nomor_kamar}`,
        { is_occupied: false },
        { headers: authHeaders }
      );
      toast.success(`Kamar ${room.nomor_kamar} dikosongkan`);
      setEmptyConfirm(null);
      setSheetOpen(false);
      load();
    } catch (e) {
      toast.error("Gagal mengosongkan kamar");
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24">
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-white/80 border-b border-[#E5E5EA]">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 shrink-0 rounded-[14px] bg-white shadow-sm border border-[#E5E5EA] flex items-center justify-center overflow-hidden p-1">
              <img src="/whitekost-logo.jpg" alt="White Kost 35" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#34C759] font-semibold flex items-center gap-1 whitespace-nowrap">
                <ShieldCheck className="h-3 w-3" strokeWidth={2} /> Admin · White Kost 35
              </p>
              <h1 className="text-[17px] font-semibold tracking-tight text-[#1C1C1E] truncate">
                Kelola Kamar Kost
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBulkOpen(true)}
              data-testid="bulk-import-button"
              title="Import Massal"
              aria-label="Import Massal"
              className="h-10 w-10 rounded-full flex items-center justify-center text-[#007AFF] hover:bg-[#E5F0FF] active:bg-[#D6E4FF] transition-colors"
            >
              <Upload className="h-[19px] w-[19px]" strokeWidth={1.9} />
            </button>
            <button
              onClick={logout}
              data-testid="logout-button"
              title="Keluar"
              aria-label="Keluar"
              className="h-10 w-10 rounded-full flex items-center justify-center text-[#007AFF] hover:bg-[#E5F0FF] active:bg-[#D6E4FF] transition-colors"
            >
              <LogOut className="h-[19px] w-[19px]" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} tone="stone" />
          <StatCard label="Terisi" value={stats.occupied} tone="green" icon={<DoorClosed className="h-4 w-4" />} />
          <StatCard label="Kosong" value={stats.empty} tone="red" icon={<DoorOpen className="h-4 w-4" />} />
        </div>

        {/* Search + segmented filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-[#8E8E93] absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor kamar atau nama..."
              data-testid="search-input"
              className="pl-11 h-12 rounded-[14px] bg-white border-[#E5E5EA] focus-visible:ring-[#007AFF]/40"
            />
          </div>
          <div className="bg-[#E5E5EA] p-1 rounded-[14px] flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                data-testid={`filter-${f.key}`}
                className={`px-4 h-10 rounded-[10px] text-sm font-medium transition-all ${
                  filter === f.key
                    ? "bg-white text-[#1C1C1E] shadow-sm"
                    : "text-[#8E8E93] hover:text-[#1C1C1E]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

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

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 text-stone-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-200/70">
            <p className="text-sm text-stone-500">Tidak ada kamar cocok filter/pencarian.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            <AnimatePresence>
              {filtered.map((r, i) => (
                <motion.div
                  key={r.nomor_kamar}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  data-testid={`room-card-${r.nomor_kamar}`}
                  className={`group text-left rounded-[22px] border transition-all overflow-hidden ${
                    r.is_occupied
                      ? "bg-white border-[#34C759]/30 shadow-[0_4px_20px_-8px_rgba(52,199,89,0.25)] hover:shadow-[0_10px_30px_-8px_rgba(52,199,89,0.35)]"
                      : "bg-white border-dashed border-[#FF3B30]/40"
                  }`}
                >
                  <div
                    className={`relative aspect-[16/10] ${r.is_occupied ? "bg-[#F2F2F7] cursor-pointer" : "bg-[#FFF5F5]"} overflow-hidden`}
                    onClick={() =>
                      r.is_occupied &&
                      setViewer({
                        src: r.foto_ktp,
                        name: r.nama_penghuni,
                        room: r.nomor_kamar,
                      })
                    }
                  >
                    {r.is_occupied ? (
                      <img
                        src={r.foto_ktp}
                        alt={`KTP ${r.nama_penghuni}`}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#FF3B30]">
                        <DoorOpen className="h-8 w-8 mb-1.5" strokeWidth={1.5} />
                        <span className="text-xs font-semibold">Kamar Kosong</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5 ${
                            r.is_occupied
                              ? "bg-[#34C759]/15 text-[#248A3D]"
                              : "bg-[#FF3B30]/12 text-[#D70015]"
                          }`}
                        >
                          {r.nomor_kamar}
                        </span>
                        {r.is_occupied ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#34C759]" strokeWidth={2.2} />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-[#FF3B30]/50" strokeWidth={2} />
                        )}
                      </div>
                      <p className={`text-sm truncate ${r.is_occupied ? "text-[#1C1C1E] font-medium" : "text-[#FF3B30]/70 italic"}`}>
                        {r.is_occupied ? r.nama_penghuni : "Belum ada penghuni"}
                      </p>
                      {r.is_occupied && r.tanggal_masuk && (
                        <p className="text-[11px] text-[#8E8E93] truncate mt-0.5">
                          {formatLamaTinggal(r.tanggal_masuk)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(r)}
                      data-testid={`edit-button-${r.nomor_kamar}`}
                      className="h-9 w-9 shrink-0 rounded-full text-[#007AFF] hover:bg-[#E5F0FF]"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Kamar {editing?.nomor_kamar}</SheetTitle>
            <SheetDescription>
              Isi data penghuni untuk menandai kamar sebagai terisi, atau kosongkan kamar.
            </SheetDescription>
          </SheetHeader>

          {editing && (
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nama_penghuni">Nama Penghuni</Label>
                <Input
                  id="nama_penghuni"
                  value={form.nama_penghuni}
                  onChange={(e) => setForm({ ...form, nama_penghuni: e.target.value })}
                  placeholder="Nama lengkap sesuai KTP"
                  data-testid="input-nama-penghuni"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal_masuk">Tanggal Masuk</Label>
                <Input
                  id="tanggal_masuk"
                  type="date"
                  value={form.tanggal_masuk}
                  onChange={(e) => setForm({ ...form, tanggal_masuk: e.target.value })}
                  max={new Date().toISOString().split("T")[0]}
                  data-testid="input-tanggal-masuk"
                  className="h-11 rounded-xl"
                />
                {form.tanggal_masuk && (
                  <p className="text-xs text-[#8E8E93]">
                    Lama tinggal: <span className="font-medium text-[#1C1C1E]">{formatLamaTinggal(form.tanggal_masuk) || "-"}</span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Foto KTP</Label>
                {form.foto_ktp ? (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200">
                    <img src={form.foto_ktp} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      onClick={() => setForm({ ...form, foto_ktp: "" })}
                      data-testid="remove-ktp-preview"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="ktp-file"
                    className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 hover:bg-amber-50/60 hover:border-amber-300 cursor-pointer transition-colors"
                  >
                    <ImagePlus className="h-6 w-6 text-stone-400 mb-2" />
                    <p className="text-sm text-stone-600">Klik untuk unggah foto KTP</p>
                    <p className="text-xs text-stone-400 mt-1">JPG/PNG · maks 5MB</p>
                    <input
                      id="ktp-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onFileChange}
                      data-testid="input-foto-ktp"
                    />
                  </label>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={saveOccupied}
                  disabled={saving}
                  data-testid="submit-button"
                  className="w-full h-11 rounded-xl bg-stone-900 hover:bg-stone-800"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan sebagai Terisi"}
                </Button>
                {editing.is_occupied && (
                  <Button
                    variant="outline"
                    onClick={() => setEmptyConfirm(editing)}
                    data-testid="mark-empty-button"
                    className="w-full h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Kosongkan Kamar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setSheetOpen(false)}
                  className="w-full h-10 rounded-xl text-stone-500"
                  data-testid="cancel-button"
                >
                  Batal
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!emptyConfirm} onOpenChange={(o) => !o && setEmptyConfirm(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Kosongkan kamar {emptyConfirm?.nomor_kamar}?</AlertDialogTitle>
            <AlertDialogDescription>
              Nama penghuni dan foto KTP akan dihapus. Kamar ini akan disembunyikan dari akun User (RT/RW/Owner).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="empty-cancel" className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => setEmpty(emptyConfirm)}
              data-testid="empty-confirm"
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              Kosongkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewer && (
        <KtpViewer
          src={viewer.src}
          name={viewer.name}
          room={viewer.room}
          onClose={() => setViewer(null)}
          restricted={false}
        />
      )}

      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSuccess={load}
        authHeaders={authHeaders}
      />

      <Footer />
    </div>
  );
}

const StatCard = ({ label, value, tone, icon }) => {
  const tones = {
    stone: "bg-white border-[#E5E5EA] text-[#1C1C1E]",
    green: "bg-[#34C759]/12 border-[#34C759]/25 text-[#248A3D]",
    red: "bg-[#FF3B30]/10 border-[#FF3B30]/25 text-[#D70015]",
  };
  return (
    <div className={`rounded-[18px] border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-semibold tracking-tight mt-1">{value}</p>
    </div>
  );
};
