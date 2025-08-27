import React, { useMemo } from "react";
import "./styles.css";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import SelectFilters from "./components/SelectFilters";

function parseMonto(m) {
  if (m == null) return 0;
  if (typeof m === "number") return m;
  let s = String(m).trim();
  // eliminar símbolos y espacios, aceptar coma como separador decimal
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
    departamento: "Todos",
    localidad: "Todos",
    barrio: "Todos",
    estado: "Todos",
    escribano: "",
    dni: ""
  });

  const filtered = useMemo(() => applyFilters(data), [data, filters, applyFilters]);

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

  let totalBenefEntregada = 0;
  let totalMontoEntregada = 0;
  let totalBenefFinalizada = 0;
  let totalMontoFinalizada = 0;

  Object.values(grouped).forEach(locs =>
    Object.values(locs).forEach(items => {
      totalBenefEntregada += sumBenef(items, "Entregada");
      totalMontoEntregada += sumMontos(items, "Entregada");
      totalBenefFinalizada += sumBenef(items, "Finalizada sin Entregar");
      totalMontoFinalizada += sumMontos(items, "Finalizada sin Entregar");
    })
  );

  return (
    <>
      <SelectFilters data={data} filters={filters} setFilters={setFilters} />

      {loading && <p>Cargando datos...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: "auto", maxHeight: "70vh", position: "relative" }}>
          <table className="stock-table">
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Localidad</th>
                <th>Beneficiarios Entregada</th>
                <th>Monto Entregada</th>
                <th>Beneficiarios Finalizada sin Entregar</th>
                <th>Monto Finalizada sin Entregar</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([depto, locs]) =>
                Object.entries(locs).map(([loc]) => {
                  const items = locs[loc];
                  return (
                    <tr key={depto + "|" + loc}>
                      <td>{depto}</td>
                      <td>{loc}</td>
                      <td>{sumBenef(items, "Entregada")}</td>
                      <td>{formatMoney(sumMontos(items, "Entregada"))}</td>
                      <td>{sumBenef(items, "Finalizada sin Entregar")}</td>
                      <td>{formatMoney(sumMontos(items, "Finalizada sin Entregar"))}</td>
                    </tr>
                  );
                })
              )}
              <tr style={{ fontWeight: "bold", background: "#e1eafc" }}>
                <td colSpan={2}>Suma total</td>
                <td>{totalBenefEntregada}</td>
                <td>{formatMoney(totalMontoEntregada)}</td>
                <td>{totalBenefFinalizada}</td>
                <td>{formatMoney(totalMontoFinalizada)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
