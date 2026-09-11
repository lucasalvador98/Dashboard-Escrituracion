import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import ExpedienteDetail from "../ExpedienteDetail";
import { ThemeModeProvider } from "../theme/ThemeContext";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// `mock` prefix is required by babel-plugin-jest-hoist for out-of-scope refs.
// Ana: 5 intervals with values spanning the semaphore rule
// (green / green / red / green / yellow).
const mockRows = [
  {
    Beneficiarios: "Ana López",
    DNI: "30123456",
    "Escribano Designado": "Perez",
    Estado: "En Trámite",
    "Fecha de Ingreso Colegio de Escribanos": "01/03/2024",
    "Fecha de Sorteo": "15/03/2024",
    "Fecha de Aceptacion": "20/03/2024",
    "Fecha de Firma": "25/04/2024",
    "Fecha de Ingreso al Registro": "30/04/2024",
    "Fecha de envío PT digital": "20/05/2024",
    diferencia_ingreso_sorteo: 10,
    diferencia_sorteo_aceptacion: 3,
    diferencia_aceptacion_firma: 30,
    diferencia_firma_ingreso: 3,
    diferencia_ingreso_testimonio: 20,
  },
];

let mockLoader = { data: mockRows, loading: false, error: null };

jest.mock("../hooks/useDataLoader", () => () => mockLoader);

let root;
let container;

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location" data-path={location.pathname} />;
}

function renderPage(initialEntry = "/expediente/30123456", { dark = false } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const tree = (
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <Routes>
        <Route path="/expediente/:id" element={<ExpedienteDetail />} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>
  );
  act(() => {
    root.render(dark ? <ThemeModeProvider>{tree}</ThemeModeProvider> : tree);
  });
}

function path() {
  return container.querySelector('[data-testid="location"]').dataset.path;
}

function linkByText(text) {
  return Array.from(container.querySelectorAll("a")).find(
    (a) => a.textContent.trim() === text
  );
}

function click(node) {
  act(() => {
    node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  mockLoader = { data: mockRows, loading: false, error: null };
  window.localStorage.clear();
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  document.body.innerHTML = "";
});

describe("ExpedienteDetail (MUI, UI-7)", () => {
  it("renders the expediente resolved by the DNI route param (INV-3)", () => {
    renderPage("/expediente/30123456");
    expect(container.querySelector("h1").textContent).toBe("Ana López");
    expect(container.textContent).toContain("DNI 30123456");
    expect(container.textContent).toContain("En Trámite");
    expect(container.textContent).toContain("Perez");
    expect(container.textContent).toContain("Expediente");
  });

  it("renders the timeline section and one card per interval with the semaphore labels", () => {
    renderPage();
    expect(container.textContent).toContain("Cronología");
    expect(container.textContent).toContain("Detalle de Plazos");

    ["Ingreso Colegio", "Sorteo", "Aceptación", "Firma", "Ingreso Registro", "Testimonio"].forEach(
      (label) => expect(container.textContent).toContain(label)
    );

    [
      "Ingreso Colegio → Sorteo",
      "Sorteo → Aceptación",
      "Aceptación → Firma",
      "Firma → Ingreso Diario",
      "Ingreso Diario → Testimonio",
    ].forEach((label) => expect(container.textContent).toContain(label));

    expect(container.querySelectorAll(".MuiCard-root").length).toBe(5);
    expect(container.textContent).toContain("esperado 10d");
    expect(container.textContent).toContain("Dentro del plazo");
    expect(container.textContent).toContain("Demora");
    expect(container.textContent).toContain("Alerta");
  });

  it("navigates back to the dashboard from the breadcrumb", () => {
    renderPage();
    click(linkByText("Dashboard"));
    expect(path()).toBe("/dashboard");
  });

  it("renders the not-found state and navigates back to the dashboard", () => {
    renderPage("/expediente/99999999");
    expect(container.textContent).toContain("Expediente no encontrado");
    expect(container.textContent).toContain("99999999");
    click(linkByText("Volver al dashboard"));
    expect(path()).toBe("/dashboard");
  });

  it("renders the loading state", () => {
    mockLoader = { data: [], loading: true, error: null };
    renderPage();
    expect(container.textContent).toContain("Cargando expediente…");
  });

  it("renders the error state with a back link", () => {
    mockLoader = { data: [], loading: false, error: "No se puede conectar con el servidor." };
    renderPage();
    expect(container.textContent).toContain("No se puede conectar con el servidor.");
    click(linkByText("Volver al dashboard"));
    expect(path()).toBe("/dashboard");
  });

  it("renders legibly under the dark theme", () => {
    window.localStorage.setItem("app-theme-mode", "dark");
    renderPage("/expediente/30123456", { dark: true });
    expect(container.textContent).toContain("Ana López");
    // 2 header chips (estado + escribano) + 5 interval badges.
    expect(container.querySelectorAll(".MuiChip-root").length).toBe(7);
  });
});
