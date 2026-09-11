import React, { act } from "react";
import { createRoot } from "react-dom/client";
import DateDetailPanel from "../components/DateDetailPanel";
import TimelineBar from "../components/TimelineBar";
import ErrorBoundary from "../components/ErrorBoundary";
import { ThemeModeProvider } from "../theme/ThemeContext";
import { INTERVALS } from "../lib/deadlines";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;

function renderDirect(node) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(node);
  });
}

function click(node) {
  act(() => {
    node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

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

// Aceptación → Firma (esperado 20).
const interval = INTERVALS[2];

const baseItem = {
  "Fecha de Aceptacion": "01/03/2024",
  "Fecha de Firma": "25/03/2024",
  diferencia_aceptacion_firma: 16,
  Beneficiarios: "Ana López",
  DNI: "30123456",
  Departamento: "Capital",
  Localidad: "Centro",
  Barrio: "Gral. Paz",
  Estado: "En Trámite",
};

describe("DateDetailPanel (MUI, UI-4)", () => {
  const renderPanel = (item = baseItem) =>
    renderDirect(<DateDetailPanel intervalDetail={{ interval, item }} />);

  it("renders the interval heading, badge and beneficiary (INV-3)", () => {
    renderPanel();
    expect(container.querySelector("h4").textContent).toBe("Aceptación → Firma");
    expect(container.textContent).toContain("✅ Dentro del plazo");
    expect(container.textContent).toContain("Ana López — DNI 30123456");
  });

  it("keeps the dates display and the difference result", () => {
    renderPanel();
    expect(container.textContent).toContain("Desde");
    expect(container.textContent).toContain("Hasta");
    expect(container.textContent).toContain("Fecha de Aceptacion");
    expect(container.textContent).toContain("01/03/2024");
    expect(container.textContent).toContain("Fecha de Firma");
    expect(container.textContent).toContain("25/03/2024");
    expect(container.textContent).toContain("16 días hábiles");
    expect(container.textContent).toContain("Plazo esperado:");
    expect(container.textContent).toContain("20 días");
  });

  it("keeps the timeline section and the metadata block", () => {
    renderPanel();
    expect(container.textContent).toContain("Progreso General");
    expect(container.textContent).toContain("Diferencia");
    expect(container.textContent).toContain("Capital");
    expect(container.textContent).toContain("Centro");
    expect(container.textContent).toContain("Gral. Paz");
    expect(container.textContent).toContain("Estado: En Trámite");
  });

  it("maps the semaphore rule to the badge label", () => {
    renderPanel({ ...baseItem, diferencia_aceptacion_firma: 30 });
    expect(container.textContent).toContain("🔴 Demora");

    renderPanel({ ...baseItem, diferencia_aceptacion_firma: "N/A" });
    expect(container.textContent).toContain("⚪ Sin datos");
    expect(container.textContent).toContain("Sin datos");
  });

  it("renders nothing without an interval detail", () => {
    renderDirect(<DateDetailPanel intervalDetail={null} />);
    expect(container.textContent).toBe("");
  });

  it("renders legibly under the dark theme", () => {
    window.localStorage.setItem("app-theme-mode", "dark");
    renderDirect(
      <ThemeModeProvider>
        <DateDetailPanel intervalDetail={{ interval, item: baseItem }} />
      </ThemeModeProvider>
    );
    expect(container.textContent).toContain("Aceptación → Firma");
    expect(container.querySelectorAll(".MuiChip-root").length).toBe(2);
    window.localStorage.clear();
  });
});

describe("TimelineBar (MUI, UI-5)", () => {
  const segments = () => Array.from(container.querySelectorAll("[title]"));

  it("renders the same six stages with their tooltips", () => {
    renderDirect(<TimelineBar item={baseItem} intervals={INTERVALS} />);
    ["Ingreso Colegio", "Sorteo", "Aceptación", "Firma", "Ingreso Registro", "Testimonio"].forEach(
      label => expect(container.textContent).toContain(label)
    );
    expect(segments().length).toBe(6);
    expect(segments()[0].getAttribute("title")).toBe("Ingreso Colegio: —");
    expect(segments()[2].getAttribute("title")).toBe("Aceptación: 01/03/2024");
    expect(segments()[3].getAttribute("title")).toBe("Firma: 25/03/2024");
  });

  it("marks stages without an interval as empty", () => {
    renderDirect(<TimelineBar item={baseItem} intervals={[]} />);
    expect(segments().length).toBe(6);
    expect(segments().every(s => s.getAttribute("title").endsWith(": —"))).toBe(true);
    expect(getComputedStyle(segments()[0]).opacity).toBe("0.3");
  });

  it("colors a filled segment with the semaphore palette and highlights the active interval", () => {
    renderDirect(
      <TimelineBar item={baseItem} intervals={INTERVALS} highlightedInterval={interval.key} />
    );
    // Stage index 2 colors with INTERVALS[2] (diferencia_aceptacion_firma = 16 → green).
    const filled = segments()[2];
    expect(getComputedStyle(filled).backgroundColor).toBe("rgb(4, 120, 87)"); // green text token
    expect(getComputedStyle(filled).boxShadow).not.toContain("2px");
    // Stage index 3 is highlighted by the preceding interval (Aceptación → Firma).
    expect(getComputedStyle(segments()[3]).boxShadow).toContain("2px");
    // Stage index 0 has an interval but no value → future state (not dimmed).
    expect(getComputedStyle(segments()[0]).opacity).toBe("1");
  });

  it("renders nothing without an item", () => {
    renderDirect(<TimelineBar item={null} intervals={INTERVALS} />);
    expect(container.textContent).toBe("");
  });
});

describe("ErrorBoundary (MUI Alert, UI-6)", () => {
  let consoleError;
  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleError.mockRestore();
  });

  function Boom() {
    throw new Error("boom message");
  }

  it("catches a render error and shows an error Alert with the recovery Button", () => {
    renderDirect(
      <ErrorBoundary name="Dashboard">
        <Boom />
      </ErrorBoundary>
    );
    expect(container.querySelector(".MuiAlert-root")).not.toBeNull();
    expect(container.querySelector(".MuiAlert-standardError")).not.toBeNull();
    expect(container.querySelector("h3").textContent).toBe("Error en Dashboard");
    expect(container.textContent).toContain("boom message");
    const retry = container.querySelector("button");
    expect(retry.textContent).toBe("Reintentar");
  });

  it("falls back to the default section name and message", () => {
    function BoomNoMessage() {
      throw new Error("");
    }
    renderDirect(
      <ErrorBoundary>
        <BoomNoMessage />
      </ErrorBoundary>
    );
    expect(container.textContent).toContain("Error en esta sección");
    expect(container.textContent).toContain("Ocurrió un error inesperado.");
  });

  it("recovers on Reintentar", () => {
    // React 18 may retry a failing render; keep throwing until the retry click
    // clears the flag, then the same children render successfully.
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error("primer intento");
      return <div>recuperado</div>;
    }
    renderDirect(
      <ErrorBoundary name="Stock">
        <Flaky />
      </ErrorBoundary>
    );
    expect(container.querySelector(".MuiAlert-root")).not.toBeNull();
    shouldThrow = false;
    click(container.querySelector("button"));
    expect(container.textContent).toContain("recuperado");
    expect(container.querySelector(".MuiAlert-root")).toBeNull();
  });
});
