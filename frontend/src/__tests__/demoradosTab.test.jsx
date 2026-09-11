import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import DashboardTab from "../DashboardTab";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// DataGrid v6 needs ResizeObserver and scrollTo in jsdom (both absent in jsdom 16).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver || ResizeObserverMock;
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

// `mock` prefix is required by babel-plugin-jest-hoist for out-of-scope refs.
// Fixed past Acep→Firma spans: the demorados memo computes business days
// client-side (1367b2d). No row carries `diferencia_aceptacion_firma`, so a
// regression to the backend calendar-day field would zero every count.
const mockRows = [
  // Perez: 2 demorados (Acep→Firma spans far beyond the 20-business-day escrow).
  { Departamento: "Capital", Estado: "En Trámite", Beneficiarios: "Ana López", DNI: "30123456", "Escribano Designado": "Perez", Barrio: "Centro", Localidad: "Capital", "Fecha de Aceptacion": "2026-01-05", "Fecha de Firma": "2027-01-15" },
  { Departamento: "Capital", Estado: "En Trámite", Beneficiarios: "Juan Díaz", DNI: "31123456", "Escribano Designado": "Perez", Barrio: "Alberdi", Localidad: "Capital", "Fecha de Aceptacion": "2026-01-06", "Fecha de Firma": "2026-06-10" },
  // Lopez: 1 demorado.
  { Departamento: "Interior", Estado: "En Trámite", Beneficiarios: "Pedro Gómez", DNI: "27123456", "Escribano Designado": "Lopez", Barrio: "Villa Nueva", Localidad: "Sarmiento", "Fecha de Aceptacion": "2026-02-01", "Fecha de Firma": "2026-06-01" },
  // Not demorado: not En Trámite.
  { Departamento: "Interior", Estado: "Entregada", Beneficiarios: "Carlos Ruiz", DNI: "28123456", "Escribano Designado": "Garcia", "Fecha de Firma": "2026-07-10" },
];

jest.mock("../hooks/useDataLoader", () => () => ({
  data: mockRows,
  loading: false,
  error: null,
}));

let root;
let container;

function renderDashboard(initialEntry = "/dashboard") {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <DashboardTab />
      </MemoryRouter>
    );
  });
}

function click(node) {
  act(() => {
    node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function openDemorados() {
  const tab = Array.from(container.querySelectorAll("button")).find(b =>
    b.textContent.startsWith("Demorados (")
  );
  expect(tab).not.toBeUndefined();
  click(tab);
}

function rows() {
  return Array.from(container.querySelectorAll(".MuiDataGrid-row"));
}

function columnHeaders() {
  return Array.from(container.querySelectorAll('[role="columnheader"]')).map(h =>
    h.textContent.trim()
  );
}

function sidebarItem(label) {
  return Array.from(container.querySelectorAll('[role="button"]')).find(b =>
    b.textContent.startsWith(label)
  );
}

afterEach(() => {
  localStorage.clear();
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  jest.restoreAllMocks();
});

describe("DashboardTab demorados (P5b)", () => {
  it("renders the demorados cases as a DataGrid with the canonical columns", () => {
    renderDashboard();
    openDemorados();

    expect(container.querySelector(".MuiDataGrid-root")).not.toBeNull();
    expect(container.textContent).toContain("Casos Demorados");
    expect(container.textContent).toContain("3 de 3 casos");

    // D8: the Escribano column replaces the old group-header rows while no
    // escribano filter is active; the rest is the previous table's column set.
    expect(columnHeaders()).toEqual(expect.arrayContaining([
      "Escribano", "Beneficiario", "DNI", "Depto", "Barrio", "Días", "Demora", "Detalle",
    ]));

    // Same rendered values as the pre-refactor table (INV-3).
    expect(container.textContent).toContain("Ana López");
    expect(container.textContent).toContain("Juan Díaz");
    expect(container.textContent).toContain("Pedro Gómez");
    expect(container.textContent).not.toContain("Carlos Ruiz");

    // Business-day computation untouched (1367b2d): the counter can only be 3
    // if contarDiasHabiles still runs client-side against the fixed dates.
    expect(container.textContent).toContain("Demorados (3)");
  });

  it("filters by escribano from the sidebar and swaps the Escribano column (D8)", () => {
    renderDashboard();
    openDemorados();
    expect(columnHeaders()).toContain("Escribano");

    click(sidebarItem("Perez"));
    expect(container.textContent).toContain("2 de 3 casos");
    expect(columnHeaders()).not.toContain("Escribano");
    expect(container.textContent).toContain("Ana López");
    expect(container.textContent).not.toContain("Pedro Gómez");

    click(sidebarItem("Todos"));
    expect(container.textContent).toContain("3 de 3 casos");
    expect(columnHeaders()).toContain("Escribano");
  });

  it("opens the detail SlidePanel on row click (DemoradoDetailPanel preserved)", () => {
    renderDashboard();
    openDemorados();

    const anaRow = rows().find(r => r.textContent.includes("Ana López"));
    expect(anaRow).not.toBeUndefined();
    click(anaRow);

    expect(container.textContent).toContain("Detalle — Ana López");
    expect(container.textContent).toContain("Acep→Firma");
    expect(container.textContent).toContain("Plazo esperado: 20 días hábiles");
  });

  it("renders the Días severity badges as themed chips (INV-2)", () => {
    renderDashboard();
    openDemorados();

    const badges = Array.from(container.querySelectorAll(".MuiChip-root")).filter(c =>
      /^\d+d$/.test(c.textContent.trim())
    );
    expect(badges.length).toBe(3);
  });

  it("renders the DemoradoDetailPanel severity badge as a themed MUI Chip (P7b-migrate)", () => {
    renderDashboard();
    openDemorados();

    const anaRow = rows().find(r => r.textContent.includes("Ana López"));
    expect(anaRow).not.toBeUndefined();
    click(anaRow);

    // Text parity kept (INV-3) and the severity badge is now an MUI Chip
    // colored from the theme semaphore palette (dark-mode legible, INV-2).
    expect(container.textContent).toContain("Plazo esperado: 20 días hábiles");
    const critica = Array.from(container.querySelectorAll(".MuiChip-root")).find(
      c => c.textContent.trim() === "Crítica"
    );
    expect(critica).not.toBeUndefined();
  });
});