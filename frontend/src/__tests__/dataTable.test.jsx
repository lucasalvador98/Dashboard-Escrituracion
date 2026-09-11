import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import DataTable from "../components/ui/DataTable";
import { AppRoutes } from "../App";

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
// CSV export harness (jsdom lacks URL.createObjectURL).
URL.createObjectURL = URL.createObjectURL || (() => "blob:mock");
URL.revokeObjectURL = URL.revokeObjectURL || (() => {});

jest.mock("axios", () => ({
  get: jest.fn(() => new Promise(() => {})),
}));

// `mock` prefix is required by babel-plugin-jest-hoist for out-of-scope refs.
const mockEscrituracionRows = [
  {
    Departamento: "Capital",
    Localidad: "Centro",
    Barrio: "Gral. Paz",
    Beneficiarios: "Ana López",
    DNI: "30123456",
    "Escribano Designado": "Perez",
    Estado: "En Trámite",
    "Fecha Ingreso Colegio de Escribanos": "2026-06-01",
    "Fecha de Sorteo": "2026-06-12",
  },
  {
    Departamento: "Capital",
    Localidad: "Centro",
    Barrio: "Gral. Paz",
    Beneficiarios: "Carlos Ruiz",
    DNI: "28123456",
    "Escribano Designado": "Garcia",
    Estado: "Entregada",
    "Fecha Ingreso Colegio de Escribanos": "2026-06-01",
    "Fecha de Sorteo": "2026-06-05",
  },
  {
    Departamento: "Interior",
    Localidad: "Rural",
    Barrio: "El Abasto",
    Beneficiarios: "María Sosa",
    DNI: "25123456",
    "Escribano Designado": "Perez",
    Estado: "Finalizada sin Entregar",
    "Fecha Ingreso Colegio de Escribanos": "2026-05-10",
    "Fecha de Sorteo": "2026-05-25",
  },
];

jest.mock("../hooks/useDataLoader", () => () => ({
  data: mockEscrituracionRows,
  loading: false,
  error: null,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

let root;
let container;

function LocationProbe() {
  const location = useLocation();
  return (
    <div
      data-testid="location"
      data-path={location.pathname}
      data-search={location.search}
    />
  );
}

function renderApp(initialEntry) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <LocationProbe />
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>
    );
  });
}

function renderDirect(node) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(node);
  });
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

describe("DataTable wrapper", () => {
  const columns = [
    { field: "departamento", headerName: "Departamento", width: 140 },
    { field: "beneficiarios", headerName: "Beneficiario", width: 240 },
  ];
  const rows = [
    { id: 1, departamento: "Capital", beneficiarios: "Ana López" },
    { id: 2, departamento: "Interior", beneficiarios: "Carlos Ruiz" },
  ];

  it("renders column headers and row cells", () => {
    renderDirect(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={row => row.id}
        paginationModel={{ page: 0, pageSize: 15 }}
        onPaginationModelChange={() => {}}
        sortModel={[]}
        onSortModelChange={() => {}}
      />
    );
    expect(container.textContent).toContain("Departamento");
    expect(container.textContent).toContain("Beneficiario");
    expect(container.textContent).toContain("Ana López");
    expect(container.textContent).toContain("Carlos Ruiz");
  });

  it("shows the empty-state overlay and triggers the action", () => {
    const onAction = jest.fn();
    renderDirect(
      <DataTable
        columns={columns}
        rows={[]}
        getRowId={row => row.id}
        paginationModel={{ page: 0, pageSize: 15 }}
        onPaginationModelChange={() => {}}
        sortModel={[]}
        onSortModelChange={() => {}}
        emptyState={{
          message: "No hay registros",
          hint: "Probá sacando algunos filtros o limpiando la búsqueda",
          actionLabel: "Limpiar todos los filtros",
          onAction,
        }}
      />
    );
    expect(container.textContent).toContain("No hay registros");
    const buttons = Array.from(container.querySelectorAll("button"));
    const clear = buttons.find(b => b.textContent.includes("Limpiar"));
    expect(clear).not.toBeUndefined();
    act(() => {
      clear.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe("Escrituracion grid (P3)", () => {
  beforeEach(() => {
    // D6: seed the same localStorage key/format the hook uses, showing the
    // semaphore column plus a couple of defaults.
    localStorage.setItem(
      "escrituracion_visibleCols",
      JSON.stringify(["Departamento", "Beneficiarios", "DNI", "Estado", "diferencia_ingreso_sorteo"])
    );
  });

  it("renders the DataGrid with rows and a semaphore chip", () => {
    renderApp("/escrituracion");
    expect(container.textContent).toContain("Ana López");
    expect(container.textContent).toContain("Carlos Ruiz");
    // Semaphore chips render as "<n>d" badges (diferencia_ingreso_sorteo).
    const chips = Array.from(container.querySelectorAll(".MuiChip-root"));
    expect(chips.some(c => /^\d+d$/.test(c.textContent))).toBe(true);
  });

  it("clicking a semaphore cell opens the SlidePanel with the interval title", () => {
    renderApp("/escrituracion");
    const chip = Array.from(container.querySelectorAll(".MuiChip-root")).find(c => /^\d+d$/.test(c.textContent));
    expect(chip).not.toBeUndefined();
    act(() => {
      chip.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    // SlidePanel title = interval fullLabel.
    expect(container.textContent).toContain("Ingreso Colegio → Sorteo");
  });

  it("clicking an Estado pill filters by that estado (URL syncs)", () => {
    renderApp("/escrituracion");
    const pill = Array.from(container.querySelectorAll(".MuiChip-root")).find(c => c.textContent === "Entregada");
    expect(pill).not.toBeUndefined();
    act(() => {
      pill.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    const loc = container.querySelector('[data-testid="location"]');
    expect(loc.dataset.search).toContain("estado=Entregada");
  });

  it("CSV export still works via the Exportar button", () => {
    const downloads = [];
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function captureDownload() {
        downloads.push(this.download);
      });
    renderApp("/escrituracion");
    const exportBtn = Array.from(container.querySelectorAll("button")).find(b =>
      b.getAttribute("title") === "Exportar CSV"
    );
    expect(exportBtn).not.toBeUndefined();
    act(() => {
      exportBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(downloads[0]).toMatch(/^Escrituracion_\d{4}-\d{2}-\d{2}\.csv$/);
  });
});