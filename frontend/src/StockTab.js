import React, { useState, useEffect } from "react";
import axios from "axios";
import API_CONFIG from "./config-api";

const API_URL = API_CONFIG.BASE_URL_BACKEND;

const COLUMNS = [
  { key: "NRO", label: "N°", width: "w-12" },
  { key: "BARRIO", label: "BARRIO", width: "w-24" },
  { key: "MZA", label: "MZA", width: "w-16" },
  { key: "LOTE", label: "LOTE", width: "w-16" },
  { key: "APELLIDO_Y_NOMBRE", label: "APELLIDO Y NOMBRE", width: "min-w-[200px]" },
  { key: "DNI", label: "DNI", width: "w-28" },
  { key: "TELEFONO", label: "Teléfono", width: "w-36" },
  { key: "COTITULAR_NOMBRE", label: "COTITULAR", width: "min-w-[180px]" },
  { key: "COTITULAR_DNI", label: "DNI Cotitular", width: "w-28" },
  { key: "TELEFONO_COTITULAR", label: "Tel. Cotitular", width: "w-36" },
];

export default function StockTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get(`${API_URL}/stock-personas`)
      .then((res) => {
        if (!cancelled) {
          setData(Array.isArray(res.data?.data) ? res.data.data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Error al cargar datos");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = `${API_URL}/stock-personas/exportar`;
    a.download = "VILLA CARLOS PAZ (TU CASA TU ESCRITURA- ENTREGA).xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filtered = search
    ? data.filter((item) =>
        Object.values(item).some(
          (v) => v && String(v).toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            VILLA CARLOS PAZ
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            TU CASA TU ESCRITURA - Ley 9811
          </p>
        </div>

        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar Excel
        </button>
      </div>

      {/* Buscador */}
      <div className="w-full max-w-sm">
        <input
          type="text"
          placeholder="Buscar por nombre, DNI, barrio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm"
        />
      </div>

      {/* Tabla */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="spinner"></div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="table-wrap">
          <div className="overflow-x-auto">
            <table className="stock-table w-full">
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="whitespace-nowrap text-[11px]">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="text-center py-12 text-slate-400 font-medium">
                      No se encontraron beneficiarios
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, idx) => (
                    <tr key={item.NRO ?? idx} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="text-sm">
                          {item[col.key] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-200/60 text-sm text-slate-500">
            <span className="font-medium">
              {filtered.length} beneficiario{filtered.length !== 1 ? "s" : ""}
              {search && filtered.length !== data.length
                ? ` (filtrado de ${data.length})`
                : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
