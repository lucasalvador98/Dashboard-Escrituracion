import { useCallback } from "react";

/**
 * Hook que devuelve una función para exportar datos a CSV.
 *
 * @param {Object} options
 * @param {Array<Object>} options.data - Array de items a exportar
 * @param {string} options.filename - Nombre base del archivo (sin extensión)
 * @param {Array<{key: string, label: string}>} options.columns - Columnas incluir
 * @param {string} options.separator - Separador CSV (default ";")
 * @returns {{ exportCSV: () => void }}
 */
export default function useExportCSV({ data, filename = "export", columns, separator = ";" }) {
  const exportCSV = useCallback(() => {
    if (!data || data.length === 0 || !columns || columns.length === 0) return;

    // Header
    const header = columns.map(c => `"${c.label}"`).join(separator);

    // Rows
    const rows = data.map(item => {
      return columns
        .map(col => {
          const val = item[col.key];
          if (val == null || val === "") return "";
          // Escape quotes: "" dentro de un campo entrecomillado
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(separator);
    });

    const csv = [header, ...rows].join("\r\n");
    const bom = "\uFEFF"; // BOM para que Excel abra bien los acentos
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, filename, columns, separator]);

  return { exportCSV };
}
