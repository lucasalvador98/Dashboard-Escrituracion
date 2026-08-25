/**
 * Single source of truth for milestone deadlines and the semaphore rule.
 *
 * The app tracks five intervals between six milestones of an expediente.
 * Counting uses business days: weekdays only, start-exclusive and
 * end-inclusive (the day after the first date through the second date).
 * The semaphore rule is shared by every view: green <= expected,
 * yellow <= ceil(expected * 1.3), red beyond.
 */

export const INTERVALS = [
  { key: "diferencia_ingreso_sorteo", label: "Ing→Sort", fullLabel: "Ingreso Colegio → Sorteo", fecha1: "Fecha Ingreso Colegio de Escribanos", fecha2: "Fecha de Sorteo", esperado: 10 },
  { key: "diferencia_sorteo_aceptacion", label: "Sort→Acep", fullLabel: "Sorteo → Aceptación", fecha1: "Fecha de Sorteo", fecha2: "Fecha de Aceptacion", esperado: 5 },
  { key: "diferencia_aceptacion_firma", label: "Acep→Firma", fullLabel: "Aceptación → Firma", fecha1: "Fecha de Aceptacion", fecha2: "Fecha de Firma", esperado: 20 },
  { key: "diferencia_firma_ingreso", label: "Firma→IngD", fullLabel: "Firma → Ingreso Diario", fecha1: "Fecha de Firma", fecha2: "Fecha de Ingreso al Registro", esperado: 5 },
  { key: "diferencia_ingreso_testimonio", label: "IngD→Test", fullLabel: "Ingreso Diario → Testimonio", fecha1: "Fecha de Ingreso al Registro", fecha2: "Fecha de envío PT digital", esperado: 15 },
];

export const INTERVAL_KEYS = INTERVALS.map(iv => iv.key);

/**
 * Parse "dd/mm/yyyy" or ISO "yyyy-mm-dd" into a local-calendar Date.
 * Returns null for empty, "N/A", or unparseable input. Invalid calendar
 * dates (e.g. 31/02/2024) are rejected via a round-trip check.
 */
export function parseDate(f) {
  if (f == null || f === "" || f === "N/A") return null;
  if (f instanceof Date) return isNaN(f.getTime()) ? null : f;
  const s = String(f).trim();
  if (!s) return null;

  let y, m, d;
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length !== 3) return null;
    [d, m, y] = parts.map(Number);
  } else {
    // ISO: take the date portion only ("2024-06-15" or "2024-06-15T10:00:00")
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!iso) return null;
    [, y, m, d] = iso.map(Number);
  }

  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return null;

  const date = new Date(y, m - 1, d);
  // Reject dates the calendar rolls over (e.g. 31/02/2024 → 02/03/2024)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/**
 * Business days between two dates: weekdays only, start-exclusive,
 * end-inclusive. Accepts Date objects or date strings. Returns 0 for
 * invalid input or when the second date is not after the first.
 */
export function contarDiasHabiles(inicio, fin) {
  const d1 = inicio instanceof Date ? inicio : parseDate(inicio);
  const d2 = fin instanceof Date ? fin : parseDate(fin);
  if (!d1 || !d2) return 0;

  let count = 0;
  const current = new Date(d1);
  current.setDate(current.getDate() + 1);
  while (current <= d2) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Business days between two date strings, or "N/A" when a date is
 * missing or unparseable.
 */
export function calcularDiferenciaDias(fecha1, fecha2) {
  if (!fecha1 || !fecha2 || fecha1 === "N/A" || fecha2 === "N/A") return "N/A";
  const date1 = parseDate(fecha1);
  const date2 = parseDate(fecha2);
  if (!date1 || !date2) return "N/A";
  return contarDiasHabiles(date1, date2);
}

/**
 * Enrich rows with a diferencia_* field per interval without mutating
 * the original items.
 */
export function generarReporte(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(orig => {
    const item = { ...orig };
    INTERVALS.forEach(({ fecha1, fecha2, key }) => {
      item[key] = calcularDiferenciaDias(item[fecha1], item[fecha2]);
    });
    return item;
  });
}

/**
 * Shared semaphore rule: gray (no data) / green <= expected /
 * yellow <= ceil(expected * 1.3) / red beyond.
 */
export function diffClass(val, esperado) {
  if (val === "N/A" || val === "" || val == null) return "gray";
  const n = Number(val);
  if (isNaN(n)) return "gray";
  const amarillo = Math.ceil(esperado * 1.3);
  if (n <= esperado) return "green";
  if (n <= amarillo) return "yellow";
  return "red";
}