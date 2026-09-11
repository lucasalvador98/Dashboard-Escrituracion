import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import EscribanosTab from "../EscribanosTab";

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
const mockEscribanoRows = [
  // Perez: En Trámite ×2, Entregada ×1, De Baja ×1 → total 4
  { "Escribano Designado": "Perez", Estado: "En Trámite", DNI: "30123456", Barrio: "Gral. Paz", Beneficiarios: "Ana López" },
  { "Escribano Designado": "Perez", Estado: "En Trámite", DNI: "30123457", Barrio: "Gral. Paz", Beneficiarios: "Beto Sosa" },
  { "Escribano Designado": "Perez", Estado: "Entregada", DNI: "30123458", Barrio: "Centro", Beneficiarios: "Caro Díaz" },
  { "Escribano Designado": "Perez", Estado: "De Baja", DNI: "30123459", Barrio: "Centro", Beneficiarios: "Dora Ruiz" },
  // Garcia: Entregada ×1 → total 1
  { "Escribano Designado": "Garcia", Estado: "Entregada", DNI: "28123456", Barrio: "El Abasto", Beneficiarios: "Eva Torres" },
  // "N/A" escribanos are excluded from the aggregation.
  { "Escribano Designado": "N/A", Estado: "Entregada", DNI: "99999999", Barrio: "Norte", Beneficiarios: "Fake Name" },
];

jest.mock("../hooks/useDataLoader", () => () => ({
  data: mockEscribanoRows,
  loading: false,
  error: null,
}));

let root;
let container;

function renderEscribanos() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/escribanos"]}>
        <EscribanosTab />
      </MemoryRouter>
    );
  });
}

// React controlled inputs ignore a direct `.value =` assignment; go through the
// native value setter then dispatch the input event React listens to.
function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function click(node) {
  act(() => {
    node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function rows() {
  return Array.from(container.querySelectorAll(".MuiDataGrid-row"));
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

describe("EscribanosTab grid (P4b)", () => {
  it("renders the DataGrid with Escribano, Total and one dynamic column per Estado", () => {
    renderEscribanos();

    for (const label of ["Escribano", "Total", "De Baja", "En Trámite", "Entregada"]) {
      expect(container.textContent).toContain(label);
    }

    // Both escribanos render; "N/A" is excluded from the aggregation.
    expect(container.textContent).toContain("Perez");
    expect(container.textContent).toContain("Garcia");
    expect(container.textContent).not.toContain("Fake Name");

    // Total column shows the aggregated counts (4 + 1).
    expect(container.textContent).toContain("4");
    expect(container.textContent).toContain("1");
  });

  it("sorts by total desc on load", () => {
    renderEscribanos();

    const first = rows()[0];
    expect(first).not.toBeUndefined();
    expect(first.textContent).toContain("Perez");
    expect(first.textContent).not.toContain("Garcia");
  });

  it("exposes the DataGrid toolbar with the built-in column selector", () => {
    renderEscribanos();
    expect(container.querySelector('[aria-label="Seleccionar columnas"]')).not.toBeNull();
  });

  it("maps estado badges to the preserved MUI colors", () => {
    renderEscribanos();

    // Perez has 2 En Trámite (info/blue), 1 Entregada (success/green) and
    // 1 De Baja (error/red) — the previous Tailwind badge semantics.
    const info = Array.from(container.querySelectorAll(".MuiChip-colorInfo")).find(c => c.textContent === "2");
    expect(info).not.toBeUndefined();
    expect(Array.from(container.querySelectorAll(".MuiChip-colorSuccess")).length).toBeGreaterThan(0);
    const error = Array.from(container.querySelectorAll(".MuiChip-colorError")).find(c => c.textContent === "1");
    expect(error).not.toBeUndefined();
  });

  it("filters rows through the search field", () => {
    renderEscribanos();

    const input = container.querySelector('input[placeholder^="Buscar escribano"]');
    expect(input).not.toBeNull();
    setInputValue(input, "Garcia");

    expect(rows().length).toBe(1);
    expect(rows()[0].textContent).toContain("Garcia");
    expect(rows()[0].textContent).not.toContain("Perez");
  });

  it("shows the NoRowsOverlay empty state when the search matches nothing", () => {
    renderEscribanos();

    const input = container.querySelector('input[placeholder^="Buscar escribano"]');
    setInputValue(input, "zzz-no-match");

    expect(container.textContent).toContain("Sin resultados");
  });

  it("opens the SlidePanel with the escribano detail records on row click", () => {
    renderEscribanos();

    click(rows()[0]); // Perez (total 4, sorted first)

    // Panel title = escribano name; content lists his 4 registros.
    expect(container.textContent).toContain("4 registros");
    expect(container.textContent).toContain("Ana López");
    expect(container.textContent).toContain("Dora Ruiz");
  });

  it("renders the detail panel with an MUI Table and estado chips (P7b-migrate)", () => {
    renderEscribanos();
    click(rows()[0]); // Perez (total 4, sorted first)

    // Registros render as an MUI Table: 1 header row + 4 body rows.
    expect(container.querySelector(".MuiTable-root")).not.toBeNull();
    expect(container.querySelectorAll(".MuiTableRow-root").length).toBe(5);

    // Estado badges are MUI Chips with the preserved color mapping
    // (De Baja → error, En Trámite → info).
    const deBaja = Array.from(container.querySelectorAll(".MuiChip-root")).find(
      c => c.textContent === "De Baja"
    );
    expect(deBaja).not.toBeUndefined();
    expect(deBaja.classList.contains("MuiChip-colorError")).toBe(true);

    const enTramite = Array.from(container.querySelectorAll(".MuiChip-root")).find(
      c => c.textContent === "En Trámite"
    );
    expect(enTramite).not.toBeUndefined();
    expect(enTramite.classList.contains("MuiChip-colorInfo")).toBe(true);
  });
});