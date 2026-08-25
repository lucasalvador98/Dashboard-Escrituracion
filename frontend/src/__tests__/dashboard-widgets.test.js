import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "../App";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("axios", () => ({
  get: jest.fn(() => new Promise(() => {})),
}));

const mockData = [
  { Departamento: "Capital", Estado: "En Trámite", Beneficiarios: "Ana López", DNI: "30123456", "Escribano Designado": "Perez", "Fecha de Firma": "2026-06-15" },
  { Departamento: "Capital", Estado: "Entregada", Beneficiarios: "Carlos Ruiz", DNI: "28123456", "Escribano Designado": "Garcia", "Fecha de Firma": "2026-06-10" },
  { Departamento: "Interior", Estado: "En Trámite", Beneficiarios: "María Sosa", DNI: "25123456", "Escribano Designado": "Perez", "Fecha de Firma": "2026-07-01" },
];

jest.mock("../hooks/useDataLoader", () => () => ({
  data: mockData,
  loading: false,
  error: null,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

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

let root;
let container;

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

function getLinks() {
  return Array.from(container.querySelectorAll('a[href*="/dashboard"]'));
}

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (container) { container.remove(); container = null; }
});

describe("dashboard widget deep-links", () => {
  it("renders KPI cards as links", () => {
    renderApp("/dashboard");
    const links = getLinks();
    expect(links.length).toBeGreaterThan(0);
  });

  it("KPI 'En Trámite' links with estado filter", () => {
    renderApp("/dashboard");
    const links = getLinks().filter(a => {
      const h = a.getAttribute("href") || "";
      return h.includes("estado=En");
    });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].getAttribute("href")).toContain("tab=resumen");
  });

  it("status card links include estado param", () => {
    renderApp("/dashboard");
    const allLinks = getLinks();
    const estadoLinks = allLinks.filter(a => {
      const h = a.getAttribute("href") || "";
      return h.includes("estado=");
    });
    expect(estadoLinks.length).toBeGreaterThan(0);
  });

  it("widget links preserve existing search params", () => {
    renderApp("/dashboard?departamento=Capital");
    const links = getLinks().filter(a => {
      const h = a.getAttribute("href") || "";
      return h.includes("estado=");
    });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute("href")).toContain("departamento=Capital");
  });
});
