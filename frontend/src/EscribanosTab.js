import React, { useMemo, useState } from "react";
import useDataLoader from "./hooks/useDataLoader";

function multiField(obj, ...fields) {
  for (const f of fields) {
    if (obj[f] != null && obj[f] !== "") return obj[f];
  }
  return null;
}

export default function EscribanosTab() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const [search, setSearch] = useState("");

  const escribanos = useMemo(() => {
    if (!Array.isArray(data)) return [];

    const map = {};
    data.forEach(item => {
      const nombre = multiField(item,
        "Escribano Designado", "Escribano", "escribano",
        "ESCRIBANO", "EscribanoDesignado"
      );
      if (!nombre || nombre === "N/A") return;

      if (!map[nombre]) {
        map[nombre] = {
          nombre,
          total: 0,
          enTramite: 0,
          finalizada: 0,
          entregada: 0,
          deBaja: 0,
        };
      }
      const e = map[nombre];
      e.total++;

      const estado = (item.Estado || item.estado || item.EstadoProceso || "").toString().trim();
      if (estado === "En Trámite") e.enTramite++;
      else if (estado === "Finalizada sin Entregar") e.finalizada++;
      else if (estado === "Entregada") e.entregada++;
      else if (estado === "De Baja") e.deBaja++;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return escribanos;
    const q = search.trim().toUpperCase();
    return escribanos.filter(e => e.nombre.toUpperCase().includes(q));
  }, [escribanos, search]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error my-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
            Escribanos
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {escribanos.length} escribanos — {filtered.length} mostrados
          </p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Buscar escribano..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium text-sm">
          No se encontraron escribanos
        </div>
      ) : (
        <div className="table-wrap overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Escribano</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">En Trámite</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Finalizada</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Entregada</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">De Baja</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 font-semibold text-slate-800">{e.nombre}</td>
                  <td className="px-3 py-2 text-center font-bold text-slate-900">{e.total}</td>
                  <td className="px-3 py-2 text-center">
                    {e.enTramite > 0 ? (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{e.enTramite}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {e.finalizada > 0 ? (
                      <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{e.finalizada}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {e.entregada > 0 ? (
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">{e.entregada}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {e.deBaja > 0 ? (
                      <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">{e.deBaja}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
