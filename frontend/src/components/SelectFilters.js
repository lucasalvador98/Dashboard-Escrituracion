import React from "react";

/**
 * SelectFilters
 * Props:
 *  - data: array de registros (processedData)
 *  - filters: objeto de filtros { departamento, localidad, barrio, estado, escribano, dni }
 *  - setFilters: función para actualizar filtros (recibe parcial)
 *
 * Comportamiento: selects no editables, dependientes en cascada.
 */
export default function SelectFilters({ data = [], filters = {}, setFilters }) {
  const normalize = v => (v == null || v === "" ? "Todos" : v);

  const unique = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();

  const getEscribano = i => i["Escribano Designado"] ?? i.Escribano ?? i.escribano ?? "";

  const departamentos = ["Todos", ...unique(data.map(i => i.Departamento))];
  const localidadesAll = unique(data.map(i => i.Localidad));
  const barriosAll = unique(data.map(i => i.Barrio));
  const estados = ["Todos", ...unique(data.map(i => i.Estado))];
  const escribanosList = unique(data.map(i => getEscribano(i)));

  // Conteo de demoras por escribano (Acep→Firma > 20d)
  const demoraCount = {};
  data.forEach(i => {
    const val = i.diferencia_aceptacion_firma;
    if (val === "N/A" || val == null) return;
    if (Number(val) > 20) {
      const nombre = getEscribano(i);
      if (nombre) demoraCount[nombre] = (demoraCount[nombre] || 0) + 1;
    }
  });

  // Filtrado dependiente
  const localidades = filters.departamento && filters.departamento !== "Todos"
    ? ["Todos", ...unique(data.filter(x => x.Departamento === filters.departamento).map(x => x.Localidad))]
    : ["Todos", ...localidadesAll];

  const barrios = (filters.departamento && filters.departamento !== "Todos")
    ? (filters.localidad && filters.localidad !== "Todos"
      ? ["Todos", ...unique(data.filter(x => x.Departamento === filters.departamento && x.Localidad === filters.localidad).map(x => x.Barrio))]
      : ["Todos", ...unique(data.filter(x => x.Departamento === filters.departamento).map(x => x.Barrio))])
    : ["Todos", ...barriosAll];

  const isDefault = (val) => normalize(val) === "Todos";

  const escribanoValue = filters.escribano || "Todos";

  const baseSelectStyle = (val) => ({ color: isDefault(val) ? "#8b97a8" : undefined });

  return (
    <div className="filter-section">
      <div className="filter-group">
        <div className="filter-item">
          <label>Departamento</label>
          <select
            className="w-full"
            value={normalize(filters.departamento)}
            onChange={e => setFilters({ departamento: e.target.value, localidad: "Todos", barrio: "Todos" })}
          >
            {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label>Localidad</label>
          <select
            className="w-full"
            value={normalize(filters.localidad)}
            onChange={e => setFilters({ localidad: e.target.value, barrio: "Todos" })}
          >
            {localidades.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label>Barrio</label>
          <select
            className="w-full"
            value={normalize(filters.barrio)}
            onChange={e => setFilters({ barrio: e.target.value })}
          >
            {barrios.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label>Estado</label>
          <select
            className="w-full"
            value={normalize(filters.estado)}
            onChange={e => setFilters({ estado: e.target.value })}
          >
            {estados.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label>Escribano</label>
          <select
            className="w-full"
            value={escribanoValue}
            onChange={e => setFilters({ escribano: e.target.value === "Todos" ? "" : e.target.value })}
          >
            {["Todos", ...escribanosList].map(s => {
              const count = s === "Todos" ? 0 : (demoraCount[s] || 0);
              return (
                <option key={s} value={s}>
                  {count > 0 ? `${s} (${count} demora)` : s}
                </option>
              );
            })}
          </select>
        </div>

        <div className="filter-item">
          <label>DNI</label>
          <input
            className="w-full"
            type="text"
            value={filters.dni || ""}
            onChange={e => setFilters({ dni: e.target.value })}
            placeholder="Buscar por DNI..."
          />
        </div>
      </div>
    </div>
  );
}