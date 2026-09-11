import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import DashboardTab from "../DashboardTab";
import { ThemeModeProvider } from "../theme/ThemeContext";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Regression guard for the 1367b2d timezone fix: date-filter boundaries must be
// compared as local calendar dates (parseDate), never as UTC instants
// (new Date(ISO)). Argentina is UTC-3, where the old comparison excluded the
// `hasta` boundary day. Setting TZ at runtime keeps the guard deterministic.
process.env.TZ = "America/Argentina/Buenos_Aires";

// jsdom lacks URL.createObjectURL (CSV export harness).
URL.createObjectURL = URL.createObjectURL || (() => "blob:mock");
URL.revokeObjectURL = URL.revokeObjectURL || (() => {});

// `mock` prefix is required by babel-plugin-jest-hoist for out-of-scope refs.
// Ana: En Trámite, Acep 2026-01-05 → Firma 2027-01-15 (> 20 business days) and a
// future firma (renders Próximas Firmas). Carlos: Entregada, Firma 2026-07-10
// (the `hasta` boundary date). María: En Trámite without Fecha de Aceptacion.
const mockRows = [
  {
    Departamento: "Capital",
    Estado: "En Trámite",
    Beneficiarios: "Ana López",
    DNI: "30123456",
    "Escribano Designado": "Perez",
    "Fecha de Aceptacion": "2026-01-05",
    "Fecha de Firma": "2027-01-15",
  },
  {
    Departamento: "Interior",
    Estado: "Entregada",
    Beneficiarios: "Carlos Ruiz",
    DNI: "28123456",
    "Escribano Designado": "Garcia",
    "Fecha de Firma": "2026-07-10",
  },
  {
    Departamento: "Capital",
    Estado: "En Trámite",
    Beneficiarios: "María Sosa",
    DNI: "25123456",
    "Escribano Designado": "Perez",
    "Fecha de Firma": "2026-08-01",
  },
];

jest.mock("../hooks/useDataLoader", () => () => ({
  data: mockRows,
  loading: false,
  error: null,
}));

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

function renderDashboard(initialEntry = "/dashboard", { dark = false } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const tree = (
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <DashboardTab />
    </MemoryRouter>
  );
  act(() => {
    root.render(dark ? <ThemeModeProvider>{tree}</ThemeModeProvider> : tree);
  });
}

function search() {
  return container.querySelector('[data-testid="location"]').dataset.search;
}

function click(node) {
  act(() => {
    node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

// React controlled inputs ignore a direct `.value =` assignment; go through the
// native value setter then dispatch the event React listens to.
function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function setSelectValue(select, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
  act(() => {
    setter.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function selectWithOption(optionText) {
  return Array.from(container.querySelectorAll("select")).find(s =>
    Array.from(s.options).some(o => o.textContent === optionText)
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

describe("DashboardTab resumen (P5a)", () => {
  it("renders KPI cards as MUI Cards that are real anchors (component={Link})", () => {
    renderDashboard();
    const kpiAnchors = Array.from(container.querySelectorAll("a.MuiCard-root"));
    expect(kpiAnchors.length).toBeGreaterThanOrEqual(4);
    kpiAnchors.forEach(a => {
      expect(a.getAttribute("href")).toContain("/dashboard");
    });
  });

  it("wires the departamento filter to useUrlState (departamento → depto param)", () => {
    renderDashboard();
    expect(container.textContent).toContain("3 de 3 registros");

    const depto = selectWithOption("Todos los departamentos");
    expect(depto).not.toBeUndefined();
    setSelectValue(depto, "Interior");

    expect(search()).toContain("depto=Interior");
    expect(container.textContent).toContain("1 de 3 registros");
  });

  it("treats the date-filter `hasta` boundary as a local calendar date (1367b2d regression)", () => {
    // Carlos' Fecha de Firma is exactly the `hasta` value. The pre-fix code
    // compared it against new Date(ISO) (UTC) and dropped it in UTC-3.
    renderDashboard("/dashboard?hasta=2026-07-10");
    expect(container.textContent).toContain("Total Escrituraciones");
    expect(container.textContent).toContain("1 de 3 registros");
  });

  it("disables Limpiar without filters and resets the URL state when clicked", () => {
    renderDashboard();
    const limpiar = Array.from(container.querySelectorAll("button")).find(
      b => b.textContent.trim() === "Limpiar ×"
    );
    expect(limpiar).not.toBeUndefined();
    expect(limpiar.disabled).toBe(true);

    const depto = selectWithOption("Todos los departamentos");
    setSelectValue(depto, "Interior");
    expect(search()).toContain("depto=Interior");
    expect(limpiar.disabled).toBe(false);

    click(limpiar);
    expect(search()).not.toContain("depto=");
    expect(container.textContent).toContain("3 de 3 registros");
  });

  it("keeps the estado breakdown rows as anchors that filter by estado", () => {
    renderDashboard();
    const entregada = container.querySelector('a[href*="estado=Entregada"]');
    expect(entregada).not.toBeNull();

    click(entregada);
    expect(search()).toContain("estado=Entregada");
  });

  it("exports the dashboard resumen CSV from the MUI Button", () => {
    const downloads = [];
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function captureDownload() {
        downloads.push(this.download);
      });
    renderDashboard();

    const exportBtn = Array.from(container.querySelectorAll("button")).find(
      b => b.getAttribute("title") === "Exportar KPIs, semáforo y demorados a CSV"
    );
    expect(exportBtn).not.toBeUndefined();
    click(exportBtn);

    expect(clickSpy).toHaveBeenCalled();
    expect(downloads[0]).toMatch(/^Dashboard_Resumen_\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("preserves the resumen headings and KPI labels (INV-3)", () => {
    renderDashboard();
    [
      "Ingresos por Mes",
      "Distribución por Estado",
      "Top Escribanos",
      "Tendencia de Demoras (Acep→Firma)",
      "Semáforo de Plazos",
      "Próximas Firmas",
      "Total Escrituraciones",
      "En Trámite",
      "Finalizadas",
      "Firmas este Mes",
      "Exportar resumen",
    ].forEach(text => {
      expect(container.textContent).toContain(text);
    });
  });

  it("keeps the demorados business-day computation untouched (1367b2d)", () => {
    // No mock row carries `diferencia_aceptacion_firma`; the counter can only be
    // non-zero if the demorados memo still computes business days client-side.
    renderDashboard();
    expect(container.textContent).toContain("Demorados (1)");
  });

  it("renders the migrated widgets in dark mode without breaking KPI anchors", () => {
    localStorage.setItem("app-theme-mode", "dark");
    renderDashboard("/dashboard", { dark: true });
    expect(container.querySelectorAll("a.MuiCard-root").length).toBeGreaterThanOrEqual(4);
    expect(container.textContent).toContain("Total Escrituraciones");
  });
});
