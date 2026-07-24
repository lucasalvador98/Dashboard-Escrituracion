import React, { useMemo } from "react";
import useDataLoader from "./hooks/useDataLoader";

function multiField(obj, ...fields) {
  for (const f of fields) {
    if (obj[f] != null && obj[f] !== "") return obj[f];
  }
  return null;
}

export default function EscribanosTab() {
  const { data, loading, error } = useDataLoader("escrituracion");

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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
          Escribanos
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Carga de trabajo por escribano designado
        </p>
      </div>

      {escribanos.length === 0 ? (
        <div className="text-center py-16 text-slate-400 font-medium">
          No hay datos de escribanos disponibles
        </div>
      ) : (
        <div className="table-wrap overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Escribano</th>
                <th className="text-center">Total</th>
                <th className="text-center">En Trámite</th>
                <th className="text-center">Finalizada</th>
                <th className="text-center">Entregada</th>
                <th className="text-center">De Baja</th>
              </tr>
            </thead>
            <tbody>
              {escribanos.map((e, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{e.nombre}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-900">{e.total}</td>
                  <td className="px-4 py-3 text-center">
                    {e.enTramite > 0 && (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {e.enTramite}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {e.finalizada > 0 && (
                      <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                        {e.finalizada}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {e.entregada > 0 && (
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        {e.entregada}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {e.deBaja > 0 && (
                      <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        {e.deBaja}
                      </span>
                    )}
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
