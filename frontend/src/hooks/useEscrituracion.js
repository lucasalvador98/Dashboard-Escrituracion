import { useMemo, useState, useEffect, useCallback } from "react";

export const INTERVALS = [
  { key: "diferencia_ingreso_sorteo", label: "Ing→Sort", fullLabel: "Ingreso Colegio → Sorteo", fecha1: "Fecha Ingreso Colegio de Escribanos", fecha2: "Fecha de Sorteo", esperado: 10 },
  { key: "diferencia_sorteo_aceptacion", label: "Sort→Acep", fullLabel: "Sorteo → Aceptación", fecha1: "Fecha de Sorteo", fecha2: "Fecha de Aceptacion", esperado: 5 },
  { key: "diferencia_aceptacion_firma", label: "Acep→Firma", fullLabel: "Aceptación → Firma", fecha1: "Fecha de Aceptacion", fecha2: "Fecha de Firma", esperado: 20 },
  { key: "diferencia_firma_ingreso", label: "Firma→IngD", fullLabel: "Firma → Ingreso Diario", fecha1: "Fecha de Firma", fecha2: "Fecha de Ingreso al Registro", esperado: 5 },
  { key: "diferencia_ingreso_testimonio", label: "IngD→Test", fullLabel: "Ingreso Diario → Testimonio", fecha1: "Fecha de Ingreso al Registro", fecha2: "Fecha de envío PT digital", esperado: 15 },
];

export const INTERVAL_KEYS = INTERVALS.map(i => i.key);

export const TABLE_COLUMNS = [
  { key: "Departamento", label: "Departamento", alwaysOn: true },
  { key: "Localidad", label: "Localidad", alwaysOn: true },
  { key: "Barrio", label: "Barrio", alwaysOn: true },
  { key: "Mza. Plano", label: "Mza", alwaysOn: true },
  { key: "Lote Plano", label: "Lt", alwaysOn: true },
  { key: "Beneficiarios", label: "Beneficiario", alwaysOn: true },
  { key: "DNI", label: "DNI", alwaysOn: true },
  { key: "Escribano Designado", label: "Escribano", alwaysOn: false },
  { key: "Estado", label: "Estado", alwaysOn: true },
  ...INTERVALS.map(iv => ({ key: iv.key, label: iv.label, fullLabel: iv.fullLabel, alwaysOn: false })),
];

const INTERNAL_KEYS = new Set([...INTERVAL_KEYS, "id"]);

export const DATE_COLS = new Set([
  "Fecha Ingreso Colegio de Escribanos",
  "Fecha de Sorteo",
  "Fecha de Aceptacion",
  "Fecha de Firma",
  "Fecha de Ingreso al Registro",
  "Fecha de envío PT digital",
]);

const DEFAULT_ACTIVE_KEYS = new Set([
  ...TABLE_COLUMNS.filter(c => c.alwaysOn).map(c => c.key),
  ...DATE_COLS,
]);

const COLUMN_GROUPS = [
  { label: "Ubicación", keys: ["Departamento", "Localidad", "Barrio", "Mza. Plano", "Lote Plano"] },
  { label: "Partes", keys: ["Beneficiarios", "DNI", "Escribano Designado"] },
  { label: "Estado", keys: ["Estado"] },
  { label: "Plazos", keys: INTERVAL_KEYS },
];

export function labelize(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Dni/g, "DNI")
    .replace(/Mza\b/g, "Mza.")
    .replace(/Lote\b/g, "Lote")
    .replace(/Tel\b/g, "Tel.")
    .replace(/Cot\b/g, "Cot.")
    .replace(/Ing d/g, "Ing D");
}

function contarDiasHabiles(inicio, fin) {
  let count = 0;
  const current = new Date(inicio);
  current.setDate(current.getDate() + 1);
  while (current <= fin) {
    const d = current.getDay();
    if (d !== 0 && d !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function calcularDiferenciaDias(fecha1, fecha2) {
  if (!fecha1 || !fecha2 || fecha1 === "N/A" || fecha2 === "N/A") return "N/A";
  const parse = f => {
    if (!f) return NaN;
    if (f.includes("/")) return new Date(f.split("/").reverse().join("-"));
    return new Date(f);
  };
  const date1 = parse(fecha1);
  const date2 = parse(fecha2);
  if (isNaN(date1) || isNaN(date2)) return "N/A";
  return contarDiasHabiles(date1, date2);
}

function generarReporte(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(orig => {
    const item = { ...orig };
    INTERVALS.forEach(({ fecha1, fecha2, key }) => {
      item[key] = calcularDiferenciaDias(item[fecha1], item[fecha2]);
    });
    return item;
  });
}

export function diffClass(val, esperado, forceRedAbove) {
  if (val === "N/A" || val === "" || val == null) return "gray";
  const n = Number(val);
  if (isNaN(n)) return "gray";
  const redThreshold = forceRedAbove != null ? forceRedAbove : Math.ceil(esperado * 1.3);
  if (n <= esperado) return "green";
  if (n <= redThreshold) return "yellow";
  return "red";
}

const itemsPerPage = 15;

export default function useEscrituracion(rawData, filters, setFilters) {
  const [sortCol, setSortCol] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [intervalDetail, setIntervalDetail] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [showColToggle, setShowColToggle] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() => {
    const saved = localStorage.getItem("escrituracion_visibleCols");
    if (saved) return JSON.parse(saved);
    return TABLE_COLUMNS.filter(c => c.alwaysOn).map(c => c.key);
  });

  const allColumns = useMemo(() => {
    if (!rawData.length) return TABLE_COLUMNS;
    const dataKeys = new Set();
    rawData.forEach(item => Object.keys(item).forEach(k => dataKeys.add(k)));
    const coreKeys = new Set(TABLE_COLUMNS.map(c => c.key));
    const coreCols = TABLE_COLUMNS.map(c => c.key);
    const extraCols = [...dataKeys]
      .filter(k => !coreKeys.has(k) && !INTERNAL_KEYS.has(k))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const allKeys = [...coreCols, ...extraCols];
    return allKeys.map(key => {
      const existing = TABLE_COLUMNS.find(c => c.key === key);
      return existing || { key, label: labelize(key), alwaysOn: false };
    });
  }, [rawData]);

  const allGroups = useMemo(() => {
    const groupedKeys = new Set(COLUMN_GROUPS.flatMap(g => g.keys));
    const ungrouped = allColumns
      .filter(c => !groupedKeys.has(c.key) && !INTERNAL_KEYS.has(c.key))
      .map(c => c.key);
    if (ungrouped.length === 0) return COLUMN_GROUPS;
    return [...COLUMN_GROUPS, { label: "Otras", keys: ungrouped }];
  }, [allColumns]);

  useEffect(() => {
    const saved = localStorage.getItem("escrituracion_visibleCols");
    if (saved) return;
    const defaults = allColumns.filter(c => DEFAULT_ACTIVE_KEYS.has(c.key)).map(c => c.key);
    setVisibleCols(prev => {
      if (prev.length === TABLE_COLUMNS.filter(c => c.alwaysOn).length && defaults.length !== prev.length) {
        return defaults;
      }
      return prev;
    });
  }, [allColumns]);

  const processedData = useMemo(() => generarReporte(rawData), [rawData]);
  const filteredData = useMemo(() => applyFiltersToData(processedData, filters), [processedData, filters]);

  useEffect(() => {
    const estadoFromDropdown = filters.estado && filters.estado !== "Todos" ? filters.estado : null;
    if (estadoFromDropdown !== selectedEstado) setSelectedEstado(estadoFromDropdown);
  }, [filters.estado]);

  const estadoFiltered = useMemo(() => {
    if (!selectedEstado) return filteredData;
    return filteredData.filter(item => {
      const est = (item.Estado || item.estado || item.EstadoProceso || "").toString().trim();
      return est === selectedEstado;
    });
  }, [filteredData, selectedEstado]);

  const sortedData = useMemo(() => {
    const arr = [...estadoFiltered];
    if (!sortCol) return arr;
    arr.sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va == null || va === "") return 1;
      if (vb == null || vb === "") return -1;
      if (INTERVAL_KEYS.includes(sortCol)) {
        const na = va === "N/A" ? Infinity : Number(va);
        const nb = vb === "N/A" ? Infinity : Number(vb);
        if (isNaN(na) && isNaN(nb)) return 0;
        if (isNaN(na)) return 1;
        if (isNaN(nb)) return -1;
        return sortOrder === "asc" ? na - nb : nb - na;
      }
      if (DATE_COLS.has(sortCol)) {
        const da = new Date(va);
        const db = new Date(vb);
        if (isNaN(da) && isNaN(db)) return 0;
        if (isNaN(da)) return 1;
        if (isNaN(db)) return -1;
        return sortOrder === "asc" ? da - db : db - da;
      }
      if (typeof va === "number" && typeof vb === "number") {
        return sortOrder === "asc" ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [estadoFiltered, sortCol, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedData = sortedData.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const counts = useMemo(() => {
    const acc = {};
    processedData.forEach(item => {
      const est = (item.Estado || item.estado || item.EstadoProceso || "En Trámite").toString();
      acc[est] = (acc[est] || 0) + 1;
    });
    return acc;
  }, [processedData]);

  function handleSort(col) {
    if (sortCol === col) setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortOrder("asc"); }
    setPage(1);
  }

  function toggleColumn(colKey) {
    setVisibleCols(prev => {
      const next = prev.includes(colKey) ? prev.filter(k => k !== colKey) : [...prev, colKey];
      localStorage.setItem("escrituracion_visibleCols", JSON.stringify(next));
      return next;
    });
  }

  const filterByField = useCallback((field, value) => {
    if (!value || value === "N/A") return;
    if (field === "Escribano Designado") setFilters({ escribano: value });
    else if (field === "Estado") { setSelectedEstado(value); setFilters({ estado: value }); }
    else if (["Departamento", "Localidad", "Barrio"].includes(field)) setFilters({ [field.toLowerCase()]: value });
    setPage(1);
  }, [setFilters]);

  return {
    allColumns, allGroups, visibleCols, showColToggle, setShowColToggle,
    toggleColumn, sortCol, sortOrder, handleSort,
    paginatedData, sortedData, safePage, totalPages, setPage,
    processedData, counts, intervalDetail, setIntervalDetail,
    selectedEstado, setSelectedEstado, filterByField,
  };
}

function applyFiltersToData(data, filters) {
  if (!Array.isArray(data)) return [];
  return data.filter(item => {
    if (filters.departamento && filters.departamento !== "Todos" && item.Departamento !== filters.departamento) return false;
    if (filters.localidad && filters.localidad !== "Todos" && item.Localidad !== filters.localidad) return false;
    if (filters.barrio && filters.barrio !== "Todos" && item.Barrio !== filters.barrio) return false;
    if (filters.estado && filters.estado !== "Todos") {
      const est = (item.Estado || item.estado || item.EstadoProceso || "").toString().trim();
      if (est !== filters.estado) return false;
    }
    if (filters.escribano) {
      const esc = (item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "").toString().trim();
      if (!esc || !esc.toLowerCase().includes(filters.escribano.toLowerCase())) return false;
    }
    if (filters.dni) {
      const dni = (item.DNI || "").toString();
      if (!dni.includes(filters.dni)) return false;
    }
    return true;
  });
}
