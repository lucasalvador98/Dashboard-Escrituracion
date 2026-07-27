/**
 * Tests de funciones clave del dashboard.
 * Correr con: npm test
 */

// --- parseMonto (copy from MontosTab) ---
function parseMonto(m) {
  if (m == null) return 0;
  if (typeof m === "number") return m;
  let s = String(m).trim();
  s = s.replace(/[^\d,.-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    s = s.replace(/,/g, "");
  } else {
    s = s.replace(/[,.]/g, "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

describe("parseMonto", () => {
  test("null/undefined devuelve 0", () => {
    expect(parseMonto(null)).toBe(0);
    expect(parseMonto(undefined)).toBe(0);
  });

  test("número directo se pasa igual", () => {
    expect(parseMonto(1500.5)).toBe(1500.5);
    expect(parseMonto(0)).toBe(0);
  });

  test("formato argentino con punto miles y coma decimal", () => {
    expect(parseMonto("$1.500,50")).toBe(1500.50);
    expect(parseMonto("10.000,00")).toBe(10000);
  });

  test("formato US con punto decimal", () => {
    expect(parseMonto("1,500.50")).toBe(1500.50);
    expect(parseMonto("1500.50")).toBe(1500.50);
  });

  test("formato sin separadores", () => {
    expect(parseMonto("1500")).toBe(1500);
    expect(parseMonto("0")).toBe(0);
  });

  test("string vacío o basura devuelve 0", () => {
    expect(parseMonto("")).toBe(0);
    expect(parseMonto("N/A")).toBe(0);
    expect(parseMonto("texto")).toBe(0);
  });
});

// --- diffClass (copy from Escrituracion) ---
function diffClass(val, esperado) {
  if (val === "N/A" || val === "" || val == null) return "gray";
  const n = Number(val);
  if (isNaN(n)) return "gray";
  const amarillo = Math.ceil(esperado * 1.3);
  if (n <= esperado) return "green";
  if (n <= amarillo) return "yellow";
  return "red";
}

describe("diffClass (semáforo)", () => {
  test("valores inválidos son gray", () => {
    expect(diffClass("N/A", 10)).toBe("gray");
    expect(diffClass(null, 10)).toBe("gray");
    expect(diffClass("", 10)).toBe("gray");
  });

  test("dentro del plazo es green", () => {
    expect(diffClass(5, 10)).toBe("green");
    expect(diffClass(10, 10)).toBe("green");
    expect(diffClass(0, 10)).toBe("green");
  });

  test("hasta 30% sobre plazo es yellow", () => {
    // esperado=10 → amarillo hasta ceil(13)=13
    expect(diffClass(11, 10)).toBe("yellow");
    expect(diffClass(13, 10)).toBe("yellow");
  });

  test("más de 30% sobre plazo es red", () => {
    expect(diffClass(14, 10)).toBe("red");
    expect(diffClass(20, 10)).toBe("red");
  });
});

// --- Sort comparator helpers (copy from Escrituracion) ---
const INTERVAL_KEYS = [
  "diferencia_ingreso_sorteo",
  "diferencia_sorteo_aceptacion",
  "diferencia_aceptacion_firma",
  "diferencia_firma_ingreso",
  "diferencia_ingreso_testimonio",
];

const DATE_COLS = new Set([
  "Fecha Ingreso Colegio de Escribanos",
  "Fecha de Sorteo",
  "Fecha de Aceptacion",
  "Fecha de Firma",
  "Fecha de Ingreso al Registro",
  "Fecha de envío PT digital",
]);

function sortItems(items, sortCol, sortOrder = "asc") {
  const arr = [...items];
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
}

describe("Sort logic", () => {
  const sample = [
    { Barrio: "Centro", Beneficiarios: "Ana López", DNI: "30123456", Estado: "En Trámite", "diferencia_ingreso_sorteo": 5, "Fecha de Firma": "2024-06-15" },
    { Barrio: "Alberdi", Beneficiarios: "Carlos Pérez", DNI: "28123456", Estado: "Finalizada sin Entregar", "diferencia_ingreso_sorteo": 12, "Fecha de Firma": "2024-05-20" },
    { Barrio: "Villa Allende", Beneficiarios: "María García", DNI: "25123456", Estado: "En Trámite", "diferencia_ingreso_sorteo": "N/A", "Fecha de Firma": "2024-07-01" },
    { Barrio: null, Beneficiarios: "Juan Rodríguez", DNI: "27123456", Estado: "Entregada", "diferencia_ingreso_sorteo": 3, "Fecha de Firma": null },
  ];

  test("sort por string (Barrio) ascendente", () => {
    const sorted = sortItems(sample, "Barrio");
    expect(sorted[0].Barrio).toBe("Alberdi");
    expect(sorted[1].Barrio).toBe("Centro");
    expect(sorted[2].Barrio).toBe("Villa Allende");
    expect(sorted[3].Barrio).toBeNull(); // null al final
  });

  test("sort por string descendente", () => {
    const sorted = sortItems(sample, "Barrio", "desc");
    expect(sorted[0].Barrio).toBe("Villa Allende");
    expect(sorted[1].Barrio).toBe("Centro");
    expect(sorted[2].Barrio).toBe("Alberdi");
    expect(sorted[3].Barrio).toBeNull(); // null al final
  });

  test("sort por columna de diferencia numérica", () => {
    const sorted = sortItems(sample, "diferencia_ingreso_sorteo");
    // 3, 5, 12, N/A (Infinity)
    expect(sorted[0]["diferencia_ingreso_sorteo"]).toBe(3);
    expect(sorted[1]["diferencia_ingreso_sorteo"]).toBe(5);
    expect(sorted[3]["diferencia_ingreso_sorteo"]).toBe("N/A");
  });

  test("sort por fecha", () => {
    const sorted = sortItems(sample, "Fecha de Firma");
    expect(sorted[0]["Fecha de Firma"]).toBe("2024-05-20");
    expect(sorted[1]["Fecha de Firma"]).toBe("2024-06-15");
    // null al final
    expect(sorted[3]["Fecha de Firma"]).toBeNull();
  });

  test("sort por columna que tiene '/' no rompe por fecha falsa", () => {
    const items = [
      { "Escribano Designado": "Perez/Garcia" },
      { "Escribano Designado": "Martinez" },
    ];
    // No debería explotar al ordenar
    const sorted = sortItems(items, "Escribano Designado");
    expect(sorted.length).toBe(2);
    expect(sorted[0]["Escribano Designado"]).toBe("Martinez");
    expect(sorted[1]["Escribano Designado"]).toBe("Perez/Garcia");
  });

  test("sort sin columna devuelve el mismo orden", () => {
    const sorted = sortItems(sample, "");
    expect(sorted).toEqual(sample);
  });
});
