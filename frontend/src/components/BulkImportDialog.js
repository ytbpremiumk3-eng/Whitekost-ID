import { useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Upload, FileText, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { API } from "@/context/AuthContext";

// Simple CSV parser with quoted-field support
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { header: [], rows: [] };
  const parseLine = (line) => {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((line) => {
    const cols = parseLine(line);
    const r = {};
    header.forEach((h, i) => (r[h] = cols[i] ?? ""));
    return r;
  });
  return { header, rows };
}

function normalizeDate(s) {
  if (!s) return "";
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  let m = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return t;
}

const KEY_MAP = {
  nomor_kamar: ["nomor_kamar", "nomor", "kamar", "no_kamar", "room"],
  nama_penghuni: ["nama_penghuni", "nama", "penghuni", "name"],
  tanggal_masuk: ["tanggal_masuk", "tanggal", "masuk", "tgl_masuk", "date"],
};

function mapRow(row) {
  const out = {};
  for (const [target, aliases] of Object.entries(KEY_MAP)) {
    for (const a of aliases) {
      if (row[a] !== undefined && row[a] !== "") { out[target] = row[a]; break; }
    }
  }
  if (out.tanggal_masuk) out.tanggal_masuk = normalizeDate(out.tanggal_masuk);
  if (out.nomor_kamar) out.nomor_kamar = out.nomor_kamar.trim();
  return out;
}

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const CSV_TEMPLATE = "nomor_kamar,nama_penghuni,tanggal_masuk\nA1,Contoh Nama Penghuni,2024-01-15\n101,Nama Lain,15/03/2025\n";

export default function BulkImportDialog({ open, onOpenChange, onSuccess, authHeaders }) {
  const [tab, setTab] = useState("csv");

  // CSV state
  const [csvRows, setCsvRows] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const csvInputRef = useRef(null);

  // Photos state
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoSubmitting, setPhotoSubmitting] = useState(false);
  const photoInputRef = useRef(null);

  const resetCsv = () => {
    setCsvRows([]);
    setCsvFileName("");
    setCsvError("");
    if (csvInputRef.current) csvInputRef.current.value = "";
  };
  const resetPhotos = () => {
    setPhotoFiles([]);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const onCsvSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvError("");
    try {
      const text = await file.text();
      const { rows } = parseCSV(text);
      const mapped = rows.map(mapRow).filter((r) => r.nomor_kamar);
      if (!mapped.length) {
        setCsvError("CSV kosong atau tidak ada kolom 'nomor_kamar'.");
        setCsvRows([]);
        return;
      }
      setCsvRows(mapped);
    } catch (err) {
      setCsvError("Gagal membaca CSV: " + err.message);
    }
  };

  const submitCsv = async () => {
    if (!csvRows.length) return;
    setCsvSubmitting(true);
    try {
      const res = await axios.post(
        `${API}/rooms/bulk-import`,
        { rows: csvRows },
        { headers: authHeaders }
      );
      toast.success(
        `${res.data.updated} kamar diperbarui` +
          (res.data.skipped?.length ? ` · ${res.data.skipped.length} dilewati` : "")
      );
      if (res.data.skipped?.length) {
        console.warn("Skipped rows:", res.data.skipped);
      }
      resetCsv();
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal mengimpor CSV");
    } finally {
      setCsvSubmitting(false);
    }
  };

  const onPhotosSelect = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    setPhotoFiles(files);
  };

  const submitPhotos = async () => {
    if (!photoFiles.length) return;
    setPhotoSubmitting(true);
    try {
      const rows = [];
      for (const f of photoFiles) {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`${f.name} terlalu besar (maks 5MB), dilewati`);
          continue;
        }
        const stem = f.name.replace(/\.[^/.]+$/, "").trim();
        const b64 = await fileToBase64(f);
        rows.push({ nomor_kamar: stem, foto_ktp: b64 });
      }
      if (!rows.length) {
        toast.error("Tidak ada foto valid untuk diunggah");
        return;
      }
      const res = await axios.post(
        `${API}/rooms/bulk-import`,
        { rows },
        { headers: authHeaders }
      );
      toast.success(
        `${res.data.updated} foto tersimpan` +
          (res.data.skipped?.length ? ` · ${res.data.skipped.length} tidak cocok` : "")
      );
      if (res.data.skipped?.length) {
        console.warn("Unmatched photos:", res.data.skipped);
      }
      resetPhotos();
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal mengunggah foto");
    } finally {
      setPhotoSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-penghuni-white-kost-35.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[22px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-[#1C1C1E]">
            <Upload className="h-5 w-5" strokeWidth={1.75} /> Import Massal
          </DialogTitle>
          <DialogDescription className="text-[#8E8E93]">
            Isi banyak kamar sekaligus lewat CSV atau folder foto KTP.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="px-6 pb-6">
          <TabsList className="grid grid-cols-2 bg-[#E5E5EA] rounded-[14px] p-1 h-11">
            <TabsTrigger
              value="csv"
              data-testid="bulk-tab-csv"
              className="rounded-[10px] data-[state=active]:bg-white data-[state=active]:text-[#1C1C1E] text-[#8E8E93]"
            >
              <FileText className="h-4 w-4 mr-1.5" strokeWidth={1.75} /> Data (CSV)
            </TabsTrigger>
            <TabsTrigger
              value="photos"
              data-testid="bulk-tab-photos"
              className="rounded-[10px] data-[state=active]:bg-white data-[state=active]:text-[#1C1C1E] text-[#8E8E93]"
            >
              <ImageIcon className="h-4 w-4 mr-1.5" strokeWidth={1.75} /> Foto KTP
            </TabsTrigger>
          </TabsList>

          {/* CSV tab */}
          <TabsContent value="csv" className="mt-5 space-y-4">
            <div className="rounded-[14px] bg-[#F2F2F7] p-4 text-sm text-[#3C3C43] space-y-2">
              <p className="font-medium text-[#1C1C1E]">Format kolom (header baris pertama):</p>
              <p className="font-mono text-xs bg-white rounded-lg px-2 py-1 border border-[#E5E5EA]">
                nomor_kamar, nama_penghuni, tanggal_masuk
              </p>
              <p className="text-xs">Tanggal boleh: <b>2024-01-15</b>, <b>15/01/2024</b>, atau <b>15-01-2024</b>.</p>
              <button
                onClick={downloadTemplate}
                data-testid="download-csv-template"
                className="text-[#007AFF] text-xs font-medium inline-flex items-center gap-1 hover:underline"
              >
                <Download className="h-3 w-3" /> Unduh template CSV
              </button>
            </div>

            {!csvRows.length ? (
              <label
                htmlFor="csv-file"
                className="flex flex-col items-center justify-center h-32 rounded-[14px] border-2 border-dashed border-[#C7C7CC] bg-white hover:bg-[#F2F2F7] cursor-pointer transition-colors"
              >
                <FileText className="h-6 w-6 text-[#8E8E93] mb-2" strokeWidth={1.5} />
                <p className="text-sm text-[#1C1C1E]">Klik untuk pilih file .csv</p>
                <input
                  id="csv-file"
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={onCsvSelect}
                  data-testid="csv-file-input"
                />
              </label>
            ) : (
              <div className="rounded-[14px] border border-[#E5E5EA] bg-white overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E5EA] bg-[#F2F2F7]">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#34C759]" strokeWidth={2} />
                    <span className="font-medium text-[#1C1C1E] truncate">{csvFileName}</span>
                    <span className="text-[#8E8E93] text-xs">· {csvRows.length} baris</span>
                  </div>
                  <button
                    onClick={resetCsv}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:bg-[#E5E5EA]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto text-xs">
                  {csvRows.slice(0, 30).map((r, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 px-3 py-1.5 border-b border-[#E5E5EA] last:border-0">
                      <span className="font-semibold text-[#1C1C1E]">{r.nomor_kamar}</span>
                      <span className="text-[#3C3C43] truncate">{r.nama_penghuni || "-"}</span>
                      <span className="text-[#8E8E93]">{r.tanggal_masuk || "-"}</span>
                    </div>
                  ))}
                  {csvRows.length > 30 && (
                    <div className="px-3 py-2 text-center text-[#8E8E93]">
                      +{csvRows.length - 30} baris lagi...
                    </div>
                  )}
                </div>
              </div>
            )}

            {csvError && (
              <div className="rounded-[12px] bg-[#FFF1F0] border border-[#FF3B30]/30 px-3 py-2 flex items-start gap-2 text-sm text-[#D70015]">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {csvError}
              </div>
            )}

            <Button
              onClick={submitCsv}
              disabled={!csvRows.length || csvSubmitting}
              data-testid="csv-submit-button"
              className="w-full h-11 rounded-[14px] bg-[#007AFF] hover:bg-[#0051D5] text-white"
            >
              {csvSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Impor ${csvRows.length} baris`}
            </Button>
          </TabsContent>

          {/* Photos tab */}
          <TabsContent value="photos" className="mt-5 space-y-4">
            <div className="rounded-[14px] bg-[#F2F2F7] p-4 text-sm text-[#3C3C43] space-y-2">
              <p className="font-medium text-[#1C1C1E]">Aturan penamaan file:</p>
              <p>Nama file <b>= nomor kamar</b>. Contoh:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5 text-[#8E8E93]">
                <li><span className="font-mono">A2.jpg</span> → masuk ke kamar <b>A2</b></li>
                <li><span className="font-mono">101.png</span> → masuk ke kamar <b>101</b></li>
              </ul>
              <p className="text-xs">Format: JPG/PNG · maks 5MB per foto.</p>
            </div>

            {!photoFiles.length ? (
              <label
                htmlFor="photo-files"
                className="flex flex-col items-center justify-center h-32 rounded-[14px] border-2 border-dashed border-[#C7C7CC] bg-white hover:bg-[#F2F2F7] cursor-pointer transition-colors"
              >
                <ImageIcon className="h-6 w-6 text-[#8E8E93] mb-2" strokeWidth={1.5} />
                <p className="text-sm text-[#1C1C1E]">Klik untuk pilih beberapa foto sekaligus</p>
                <input
                  id="photo-files"
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPhotosSelect}
                  data-testid="photos-file-input"
                />
              </label>
            ) : (
              <div className="rounded-[14px] border border-[#E5E5EA] bg-white overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E5EA] bg-[#F2F2F7]">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#34C759]" strokeWidth={2} />
                    <span className="font-medium text-[#1C1C1E]">{photoFiles.length} foto siap</span>
                  </div>
                  <button
                    onClick={resetPhotos}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:bg-[#E5E5EA]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto text-xs">
                  {photoFiles.slice(0, 30).map((f, i) => {
                    const stem = f.name.replace(/\.[^/.]+$/, "").trim();
                    return (
                      <div key={i} className="grid grid-cols-[auto,1fr,auto] gap-2 px-3 py-1.5 border-b border-[#E5E5EA] last:border-0 items-center">
                        <span className="inline-flex items-center rounded-full bg-[#34C759]/15 text-[#248A3D] font-semibold px-2 py-0.5 text-[10px]">
                          {stem}
                        </span>
                        <span className="text-[#3C3C43] truncate">{f.name}</span>
                        <span className="text-[#8E8E93]">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                    );
                  })}
                  {photoFiles.length > 30 && (
                    <div className="px-3 py-2 text-center text-[#8E8E93]">
                      +{photoFiles.length - 30} foto lagi...
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={submitPhotos}
              disabled={!photoFiles.length || photoSubmitting}
              data-testid="photos-submit-button"
              className="w-full h-11 rounded-[14px] bg-[#007AFF] hover:bg-[#0051D5] text-white"
            >
              {photoSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Unggah ${photoFiles.length} foto`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
