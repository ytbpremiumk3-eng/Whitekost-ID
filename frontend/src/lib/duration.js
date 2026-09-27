// Format duration from ISO date (YYYY-MM-DD) to Indonesian "lama tinggal" string.
export function formatLamaTinggal(isoDate) {
  if (!isoDate) return "";
  const start = new Date(isoDate);
  if (isNaN(start.getTime())) return "";
  const now = new Date();
  if (start > now) return "Belum mulai";

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // borrow days from previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} tahun`);
  if (months > 0) parts.push(`${months} bulan`);
  if (years === 0 && months === 0) parts.push(`${days} hari`);
  return parts.join(" ");
}

export function formatTanggalID(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "";
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}
