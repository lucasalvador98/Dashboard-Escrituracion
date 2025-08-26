import { useCallback, useState } from "react";

export default function useFilters(initial = {}) {
  const [filters, setFilters] = useState(initial);

  const set = useCallback((partial) => {
    setFilters(prev => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => setFilters(initial), [initial]);

  const apply = useCallback((data) => {
    if (!Array.isArray(data)) return [];
    const f = filters;
    return data.filter(item => {
      if (f.departamento && f.departamento !== "Todos" && item.Departamento && !item.Departamento.toUpperCase().includes((f.departamento || "").trim().toUpperCase())) return false;
      if (f.localidad && f.localidad !== "Todos" && item.Localidad && !item.Localidad.toUpperCase().includes((f.localidad || "").trim().toUpperCase())) return false;
      if (f.barrio && f.barrio !== "Todos" && item.Barrio && !item.Barrio.toUpperCase().includes((f.barrio || "").trim().toUpperCase())) return false;
      if (f.estado && f.estado !== "Todos" && item.Estado && !item.Estado.toUpperCase().includes((f.estado || "").trim().toUpperCase())) return false;
      if (f.escribano && item["Escribano Designado"] && !item["Escribano Designado"].toUpperCase().includes((f.escribano || "").trim().toUpperCase())) return false;
      if (f.dni && (!item.DNI || !String(item.DNI).includes(f.dni))) return false;
      return true;
    });
  }, [filters]);

  const derivedOptions = useCallback((data) => {
    const opts = {
      departamentos: ["Todos"],
      localidades: ["Todos"],
      barrios: ["Todos"],
      estados: ["Todos"],
      escribanos: ["Todos"]
    };
    if (!Array.isArray(data)) return opts;
    const setify = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();
    opts.departamentos = ["Todos", ...setify(data.map(i => i.Departamento))];
    opts.localidades = ["Todos", ...setify(data.map(i => i.Localidad))];
    opts.barrios = ["Todos", ...setify(data.map(i => i.Barrio))];
    opts.estados = ["Todos", ...setify(data.map(i => i.Estado))];
    opts.escribanos = ["", ...setify(data.map(i => i["Escribano Designado"]))];
    return opts;
  }, []);

  return { filters, setFilters: set, resetFilters: reset, applyFilters: apply, derivedOptions };
}