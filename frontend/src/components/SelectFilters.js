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

  const departamentos = ["Todos", ...unique(data.map(i => i.Departamento))];
  const localidadesAll = unique(data.map(i => i.Localidad));
  const barriosAll = unique(data.map(i => i.Barrio));
  const estados = ["Todos", ...unique(data.map(i => i.Estado))];
  const escribanosList = ["Todos", ...unique(data.map(i => i["Escribano Designado"]))];

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
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
      alignItems: "center",
      marginBottom: 12
    }}>
      <div>
        <label style={{fontSize:12}}>Departamento</label>
        <select
          className="filter-input"
          value={normalize(filters.departamento)}
          onChange={e => setFilters({ departamento: e.target.value, localidad: "Todos", barrio: "Todos" })}
          style={baseSelectStyle(filters.departamento)}
        >
          {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label style={{fontSize:12}}>Localidad</label>
        <select
          className="filter-input"
          value={normalize(filters.localidad)}
          onChange={e => setFilters({ localidad: e.target.value, barrio: "Todos" })}
          style={baseSelectStyle(filters.localidad)}
        >
          {localidades.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div>
        <label style={{fontSize:12}}>Barrio</label>
        <select
          className="filter-input"
          value={normalize(filters.barrio)}
          onChange={e => setFilters({ barrio: e.target.value })}
          style={baseSelectStyle(filters.barrio)}
        >
          {barrios.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div>
        <label style={{fontSize:12}}>Estado</label>
        <select
          className="filter-input"
          value={normalize(filters.estado)}
          onChange={e => setFilters({ estado: e.target.value })}
          style={baseSelectStyle(filters.estado)}
        >
          {estados.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label style={{fontSize:12}}>Escribano</label>
        <select
          className="filter-input"
          value={escribanoValue}
          onChange={e => setFilters({ escribano: e.target.value === "Todos" ? "" : e.target.value })}
          style={baseSelectStyle(filters.escribano)}
        >
          {escribanosList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label style={{fontSize:12}}>DNI</label>
        <input
          className="filter-input"
          type="text"
          value={filters.dni || ""}
          onChange={e => setFilters({ dni: e.target.value })}
          placeholder="DNI"
          style={{ color: (filters.dni ? undefined : "#8b97a8") }}
        />
      </div>
    </div>
  );
}