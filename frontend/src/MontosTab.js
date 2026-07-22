import React, { useMemo } from "react";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import SelectFilters from "./components/SelectFilters";

function parseMonto(m) {
  if (m == null) return 0;
  if (typeof m === "number") return m;
  let s = String(m).trim();
  s = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatMoney(val) {
  const num = Number(val) || 0;
  const parts = num.toFixed(2).split(".");
  let intPart = parts[0];
  const decPart = parts[1];
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$${intPart},${decPart}`;
}

export default function MontosTab() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { filters, setFilters, applyFilters } = useFilters({
    departamento: "Todos", localidad: "Todos", barrio: "Todos",
    estado: "Todos", escribano: "", dni: ""
  });

  const rawData = Array.isArray(data) ? data : [];
  const filtered = useMemo(() => applyFilters(rawData), [rawData, filters, applyFilters]);

  // Agrupar por Departamento > Localidad
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(item => {
      const dept = item.Departamento || "Sin Departamento";
      const loc = item.Localidad || "Sin Localidad";
      if (!g[dept]) g[dept] = {};
      if (!g[dept][loc]) g[dept][loc] = [];
      g[dept][loc].push(item);
    });
    return g;
  }, [filtered]);

  function sumMontos(items, estado) {
    return items
      .filter(i => (i.Estado || "") === estado)
      .reduce((acc, curr) => acc + parseMonto(curr.MontoEjecutado ?? curr.Monto), 0);
  }
  function sumBenef(items, estado) {
    return items.filter(i => (i.Estado || "") === estado).length;
  }

  // Totales
  const totals = useMemo(() => {
    let t = { entregada: { benef: 0, monto: 0 }, finalizada: { benef: 0, monto: 0 }, totalBenef: 0, totalMonto: 0 };
    Object.values(grouped).forEach(locs =>
      Object.values(locs).forEach(items => {
        t.entregada.benef += sumBenef(items, "Entregada");
        t.entregada.monto += sumMontos(items, "Entregada");
        t.finalizada.benef += sumBenef(items, "Finalizada sin Entregar");
        t.finalizada.monto += sumMontos(items, "Finalizada sin Entregar");
      })
    );
    t.totalBenef = t.entregada.benef + t.finalizada.benef;
    t.totalMonto = t.entregada.monto + t.finalizada.monto;
    return t;
  }, [grouped]);

  return (
    <>
      <SelectFilters data={rawData} filters={filters} setFilters={setFilters} />

      {loading && (
        <div className="flex justify-center py-16">
          <div className="spinner"></div>
        </div>
      )}
      {error && <div className="alert alert-error my-4"><p>{error}</p></div>}

      {!loading && !error && (
        <>
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Benef. Entregada</div>
              <div className="text-3xl font-black text-emerald-600 tracking-tight mt-1">{totals.entregada.benef.toLocaleString()}</div>
              <div className="text-[10px] font-semibold text-gray-400 mt-1">{formatMoney(totals.entregada.monto)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Benef. Finalizada s/Entregar</div>
              <div className="text-3xl font-black text-blue-600 tracking-tight mt-1">{totals.finalizada.benef.toLocaleString()}</div>
              <div className="text-[10px] font-semibold text-gray-400 mt-1">{formatMoney(totals.finalizada.monto)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Beneficiarios</div>
              <div className="text-3xl font-black text-slate-800 tracking-tight mt-1">{totals.totalBenef.toLocaleString()}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Montos</div>
              <div className="text-3xl font-black text-slate-800 tracking-tight mt-1">{formatMoney(totals.totalMonto)}</div>
            </div>
          </div>

          <div className="table-wrap">
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Departamento</th>
                    <th>Localidad</th>
                    <th className="text-right">Benef. Entregada</th>
                    <th className="text-right">Monto Entregada</th>
                    <th className="text-right">Benef. Finalizada</th>
                    <th className="text-right">Monto Finalizada</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                        No hay registros que coincidan con los filtros
                      </td>
                    </tr>
                  )}
                  {Object.entries(grouped).map(([depto, locs]) =>
                    Object.entries(locs).map(([loc]) => {
                      const items = locs[loc];
                      return (
                        <tr key={depto + "|" + loc}>
                          <td>{depto}</td>
                          <td>{loc}</td>
                          <td className="text-right font-semibold">{sumBenef(items, "Entregada").toLocaleString()}</td>
                          <td className="text-right font-mono text-sm">{formatMoney(sumMontos(items, "Entregada"))}</td>
                          <td className="text-right font-semibold">{sumBenef(items, "Finalizada sin Entregar").toLocaleString()}</td>
                          <td className="text-right font-mono text-sm">{formatMoney(sumMontos(items, "Finalizada sin Entregar"))}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <td colSpan={2}>Total general</td>
                    <td className="text-right">{totals.entregada.benef.toLocaleString()}</td>
                    <td className="text-right font-mono">{formatMoney(totals.entregada.monto)}</td>
                    <td className="text-right">{totals.finalizada.benef.toLocaleString()}</td>
                    <td className="text-right font-mono">{formatMoney(totals.finalizada.monto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
