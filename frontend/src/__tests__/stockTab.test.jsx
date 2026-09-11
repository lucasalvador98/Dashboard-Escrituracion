import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import StockTab from "../StockTab";

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
const mockStockRows = [
  {
    Departamento: "Capital",
    Localidad: "Centro",
    Barrio: "Gral. Paz",
    Mza: "12",
    Lote: "4",
    Beneficiarios: "Ana López",
    DNI: "30123456",
    Telefono: "3815551234",
    Cotitular: "Luis López",
    "Escribano Designado": "Perez",
    Estado: "En Trámite",
  },
  {
    Departamento: "Interior",
    Localidad: "Rural",
    Barrio: "El Abasto",
    Mza: "3",
    Lote: "9",
    Beneficiarios: "Carlos Ruiz",
    DNI: "28123456",
    Telefono: "3815559999",
    Cotitular: "—",
    "Escribano Designado": "Garcia",
    Estado: "En Trámite",
  },
  {
    Departamento: "Capital",
    Localidad: "Centro",
    Barrio: "Centro",
    Mza: "7",
    Lote: "1",
    Beneficiarios: "María Sosa",
    DNI: "25123456",
    Telefono: "3815550000",
    Cotitular: "—",
    "Escribano Designado": "Perez",
    Estado: "Finalizada sin Entregar",
  },
  {
    Departamento: "Capital",
    Localidad: "Centro",
    Barrio: "Centro",
    Mza: "8",
    Lote: "2",
    Beneficiarios: "Pedro Díaz",
    DNI: "20123456",
    Telefono: "3815551111",
    Cotitular: "—",
    "Escribano Designado": "Garcia",
    Estado: "Entregada",
  },
];

jest.mock("../hooks/useDataLoader", () => () => ({
  data: mockStockRows,
  loading: false,
  error: null,
}));

let root;
let container;

function renderStock() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/stock"]}>
        <StockTab />
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

function findSpan(text) {
  return Array.from(container.querySelectorAll("span")).find(s => s.textContent === text);
}

function expandGroup(estado) {
  click(findSpan(estado));
}

function groupWrapper(estado) {
  return findSpan(estado).closest(".MuiAccordion-root");
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

describe("StockTab grid (P4a)", () => {
  it("renders one DataGrid per expanded accordion group with all declared columns", () => {
    renderStock();

    // Groups render from the Estado values; the count badge shows group size.
    expect(container.textContent).toContain("En Trámite");
    expect(container.textContent).toContain("Finalizada sin Entregar");
    expect(container.textContent).toContain("Entregada");

    expandGroup("En Trámite");

    // Declared column set (ACCORDION_COLUMNS) — including Departamento/Localidad,
    // which were previously declared but never rendered as cells.
    for (const label of ["N°", "Departamento", "Localidad", "Barrio", "Mza", "Lote", "Beneficiario", "DNI", "Teléfono", "Cotitular", "Escribano"]) {
      expect(container.textContent).toContain(label);
    }

    // Rows of the expanded group only.
    expect(container.textContent).toContain("Ana López");
    expect(container.textContent).toContain("Carlos Ruiz");
    expect(container.textContent).toContain("Capital");
    expect(container.textContent).toContain("Rural");
    // The other groups stay collapsed (their rows are not rendered).
    expect(container.textContent).not.toContain("María Sosa");
  });

  it("exposes the DataGrid toolbar with the built-in column selector", () => {
    renderStock();
    expandGroup("En Trámite");
    expect(container.querySelector('[aria-label="Seleccionar columnas"]')).not.toBeNull();
  });

  it("filters rows through the search TextField", () => {
    renderStock();
    expandGroup("En Trámite");

    const input = container.querySelector('input[placeholder^="Buscar beneficiario"]');
    expect(input).not.toBeNull();
    setInputValue(input, "Ana");

    expect(container.textContent).toContain("Ana López");
    expect(container.textContent).not.toContain("Carlos Ruiz");
  });

  it("shows the NoRowsOverlay empty state when the search matches nothing", () => {
    renderStock();
    expandGroup("En Trámite");

    const input = container.querySelector('input[placeholder^="Buscar beneficiario"]');
    setInputValue(input, "zzz-no-match");

    expect(container.textContent).toContain("Sin resultados");
  });

  it("renders the Planilla export only for mapped estados and keeps the backend formato", () => {
    const downloads = [];
    jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function captureDownload() {
        downloads.push(this.download);
      });

    renderStock();

    // En Trámite + Finalizada sin Entregar have a planilla; Entregada does not.
    const enTramiteButton = groupWrapper("En Trámite").querySelector("button");
    expect(enTramiteButton).not.toBeNull();
    expect(enTramiteButton.textContent).toContain("Planilla");

    const finalizadaButton = groupWrapper("Finalizada sin Entregar").querySelector("button");
    expect(finalizadaButton).not.toBeNull();
    expect(finalizadaButton.textContent).toContain("Planilla");

    expect(groupWrapper("Entregada").querySelector("button")).toBeNull();

    click(enTramiteButton);
    expect(downloads).toEqual(["Stock_en-tramite.xlsx"]);
  });

  it("renders the page shell as MUI Accordions with the MUI filter bar (P7b-migrate)", () => {
    renderStock();

    // One MUI Accordion per estado group, collapsed by default (bodies unmounted).
    const accordions = container.querySelectorAll(".MuiAccordion-root");
    expect(accordions.length).toBe(3);
    expect(container.textContent).not.toContain("Ana López");

    // Filter bar: MUI TextField native selects with the same labels/options.
    const depto = container.querySelector('select[aria-label="Departamento"]');
    const loc = container.querySelector('select[aria-label="Localidad"]');
    const barrio = container.querySelector('select[aria-label="Barrio"]');
    expect(depto).not.toBeNull();
    expect(loc).not.toBeNull();
    expect(barrio).not.toBeNull();
    expect(depto.textContent).toContain("Capital");
    expect(depto.textContent).toContain("Interior");

    // Limpiar filtros is a MUI Button, disabled at the default state.
    const limpiar = Array.from(container.querySelectorAll("button")).find(
      b => b.textContent.trim() === "Limpiar filtros"
    );
    expect(limpiar).not.toBeUndefined();
    expect(limpiar.classList.contains("MuiButton-root")).toBe(true);
    expect(limpiar.disabled).toBe(true);

    // The Planilla button is a MUI Button inside the summary.
    const planilla = groupWrapper("En Trámite").querySelector("button");
    expect(planilla.classList.contains("MuiButton-root")).toBe(true);
  });
});
