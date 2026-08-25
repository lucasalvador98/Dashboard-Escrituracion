/**
 * Tests de funciones clave del dashboard.
 * Correr con: npm test
 */

import {
  INTERVALS,
  parseDate,
  contarDiasHabiles,
  calcularDiferenciaDias,
  generarReporte,
  diffClass,
} from "../lib/deadlines";

// --- diffClass (shared semaphore, from deadlines lib) ---
describe("diffClass (shared semaphore)", () => {
  test("invalid values are gray", () => {
    expect(diffClass("N/A", 10)).toBe("gray");
    expect(diffClass(null, 10)).toBe("gray");
    expect(diffClass(undefined, 10)).toBe("gray");
    expect(diffClass("", 10)).toBe("gray");
    expect(diffClass("abc", 10)).toBe("gray");
  });

  test("within expected is green (inclusive)", () => {
    expect(diffClass(0, 10)).toBe("green");
    expect(diffClass(5, 10)).toBe("green");
    expect(diffClass(10, 10)).toBe("green");
  });

  test("up to 130% of expected (ceiled) is yellow", () => {
    // esperado=10 → amarillo hasta ceil(13)=13
    expect(diffClass(11, 10)).toBe("yellow");
    expect(diffClass(13, 10)).toBe("yellow");
    // esperado=20 → amarillo hasta ceil(26)=26 (Acep→Firma 21–26d es amarillo, no rojo)
    expect(diffClass(21, 20)).toBe("yellow");
    expect(diffClass(26, 20)).toBe("yellow");
  });

  test("beyond 130% is red", () => {
    expect(diffClass(14, 10)).toBe("red");
    expect(diffClass(27, 20)).toBe("red");
    expect(diffClass(8, 5)).toBe("red"); // ceil(6.5)=7
    expect(diffClass(21, 15)).toBe("red"); // ceil(19.5)=20
  });

  test("yellow boundary for expected=5 and expected=15", () => {
    expect(diffClass(6, 5)).toBe("yellow");
    expect(diffClass(7, 5)).toBe("yellow");
    expect(diffClass(16, 15)).toBe("yellow");
    expect(diffClass(20, 15)).toBe("yellow");
  });
});

// --- parseDate (deadlines lib) ---
describe("parseDate (deadlines lib)", () => {
  test("dd/mm/yyyy parses to local date", () => {
    const d = parseDate("15/06/2024");
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(5); // June
    expect(d.getDate()).toBe(15);
  });

  test("ISO yyyy-mm-dd parses to local date", () => {
    const d = parseDate("2024-06-15");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
  });

  test("invalid or missing input returns null", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate("N/A")).toBeNull();
    expect(parseDate("garbage")).toBeNull();
    expect(parseDate("31/02/2024")).toBeNull(); // invalid day of month
  });
});

// --- contarDiasHabiles (deadlines lib) ---
describe("contarDiasHabiles", () => {
  test("counts weekdays between dates, start-exclusive and end-inclusive", () => {
    // Mon 10 Jun 2024 → Fri 14 Jun 2024: Tue, Wed, Thu, Fri = 4
    expect(contarDiasHabiles(parseDate("10/06/2024"), parseDate("14/06/2024"))).toBe(4);
  });

  test("excludes weekends", () => {
    // Mon 10 Jun → Mon 17 Jun: Tue–Fri (4) + Mon 17 (1) = 5
    expect(contarDiasHabiles(parseDate("10/06/2024"), parseDate("17/06/2024"))).toBe(5);
  });

  test("same day returns 0", () => {
    expect(contarDiasHabiles(parseDate("10/06/2024"), parseDate("10/06/2024"))).toBe(0);
  });

  test("weekend start counts from the next weekday", () => {
    // Sat 15 Jun → Sun 23 Jun: Mon–Fri 17–21 = 5
    expect(contarDiasHabiles(parseDate("15/06/2024"), parseDate("23/06/2024"))).toBe(5);
  });

  test("end on a weekend still counts only weekdays", () => {
    // Mon 10 Jun → Sat 15 Jun: Tue–Fri = 4
    expect(contarDiasHabiles(parseDate("10/06/2024"), parseDate("15/06/2024"))).toBe(4);
  });

  test("accepts Date objects directly", () => {
    expect(contarDiasHabiles(new Date(2024, 5, 10), new Date(2024, 5, 14))).toBe(4);
  });
});

// --- calcularDiferenciaDias (deadlines lib) ---
describe("calcularDiferenciaDias", () => {
  test("returns business days for a valid dd/mm/yyyy pair", () => {
    expect(calcularDiferenciaDias("10/06/2024", "14/06/2024")).toBe(4);
  });

  test("accepts ISO dates", () => {
    expect(calcularDiferenciaDias("2024-06-10", "2024-06-14")).toBe(4);
  });

  test("returns N/A when a date is missing or invalid", () => {
    expect(calcularDiferenciaDias(null, "14/06/2024")).toBe("N/A");
    expect(calcularDiferenciaDias("10/06/2024", "N/A")).toBe("N/A");
    expect(calcularDiferenciaDias("basura", "14/06/2024")).toBe("N/A");
    expect(calcularDiferenciaDias("", "")).toBe("N/A");
  });
});

// --- INTERVALS (deadlines lib) ---
describe("INTERVALS (deadlines lib)", () => {
  test("defines the five shared intervals with exact expected business days", () => {
    expect(INTERVALS).toHaveLength(5);
    const byKey = Object.fromEntries(INTERVALS.map(iv => [iv.key, iv.esperado]));
    expect(byKey).toEqual({
      diferencia_ingreso_sorteo: 10,
      diferencia_sorteo_aceptacion: 5,
      diferencia_aceptacion_firma: 20,
      diferencia_firma_ingreso: 5,
      diferencia_ingreso_testimonio: 15,
    });
  });

  test("intervals reference the six milestone date columns exactly once", () => {
    const fields = INTERVALS.flatMap(iv => [iv.fecha1, iv.fecha2]);
    expect(new Set(fields)).toEqual(
      new Set([
        "Fecha Ingreso Colegio de Escribanos",
        "Fecha de Sorteo",
        "Fecha de Aceptacion",
        "Fecha de Firma",
        "Fecha de Ingreso al Registro",
        "Fecha de envío PT digital",
      ])
    );
  });
});

// --- generarReporte (deadlines lib) ---
describe("generarReporte", () => {
  test("enriches rows with difference_* business-day fields", () => {
    const rows = [
      {
        Beneficiarios: "Ana",
        "Fecha Ingreso Colegio de Escribanos": "10/06/2024",
        "Fecha de Sorteo": "14/06/2024",
      },
    ];
    const out = generarReporte(rows);
    expect(out[0].diferencia_ingreso_sorteo).toBe(4);
    expect(out[0].Beneficiarios).toBe("Ana");
  });

  test("missing dates yield N/A and original rows are not mutated", () => {
    const rows = [{ Beneficiarios: "Ana" }];
    const out = generarReporte(rows);
    expect(out[0].diferencia_ingreso_sorteo).toBe("N/A");
    expect(rows[0]).toEqual({ Beneficiarios: "Ana" });
  });

  test("non-array input returns an empty array", () => {
    expect(generarReporte(null)).toEqual([]);
    expect(generarReporte(undefined)).toEqual([]);
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
