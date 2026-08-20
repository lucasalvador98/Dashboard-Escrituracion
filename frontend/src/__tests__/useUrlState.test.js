import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import useUrlState from "../hooks/useUrlState";

// React 18 requires this flag for act() when not using @testing-library/react.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Probe component: exposes the hook state and controls so tests exercise the
// REAL router URL (no hook mock) — reads/writes go through useSearchParams.
function Probe({ config }) {
  const url = useUrlState(config);
  const location = useLocation();
  return (
    <div>
      <div data-testid="state" data-state={JSON.stringify(url.state)} />
      <div data-testid="search">{location.search}</div>
      <div data-testid="key">{location.key}</div>
      <button data-testid="set-estado" onClick={() => url.set({ estado: "En Trámite" })}>set estado</button>
      <button data-testid="clear-depto" onClick={() => url.set({ departamento: "Todos" })}>clear depto</button>
      <button data-testid="set-dni" onClick={() => url.set({ dni: "123" })}>set dni</button>
      <button data-testid="reset" onClick={() => url.reset()}>reset</button>
    </div>
  );
}

let root;
let container;

function renderProbe(config, initialEntry) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Probe config={config} />
      </MemoryRouter>
    );
  });
}

const searchOf = () => container.querySelector('[data-testid="search"]').textContent;
const keyOf = () => container.querySelector('[data-testid="key"]').textContent;
const stateOf = () => JSON.parse(container.querySelector('[data-testid="state"]').dataset.state);
const click = (id) => act(() => container.querySelector(`[data-testid="${id}"]`).click());

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
});

// Dashboard: legacy bare param names via paramMap (D4).
const DASHBOARD_CONFIG = {
  scope: "dashboard",
  paramMap: { departamento: "depto", desde: "desde", hasta: "hasta", tab: "tab" },
  defaults: {
    departamento: "Todos", escribano: "Todos", estado: "Todos",
    desde: "", hasta: "", tab: "resumen",
  },
};

// Escrituracion: scoped <scope>_<key> params, shared root escribano/estado,
// free-text dni replaces in place (D11 rationale).
const ESC_CONFIG = {
  scope: "esc",
  defaults: {
    departamento: "Todos", localidad: "Todos", barrio: "Todos",
    estado: "Todos", escribano: "", dni: "",
    page: 1, sort: "", sortOrder: "asc",
  },
  scopedKeys: ["page", "sort", "sortOrder", "departamento", "localidad", "barrio", "dni"],
  replaceKeys: ["dni"],
  coerce: { page: Number },
};

describe("useUrlState", () => {
  it("reads legacy dashboard paramMap names from the URL", () => {
    renderProbe(DASHBOARD_CONFIG, "/dashboard?depto=Capital&estado=En Trámite&tab=demorados");
    const s = stateOf();
    expect(s.departamento).toBe("Capital");
    expect(s.estado).toBe("En Trámite");
    expect(s.tab).toBe("demorados");
    expect(s.escribano).toBe("Todos"); // absent param keeps its default
    expect(s.desde).toBe("");
    expect(s.hasta).toBe("");
  });

  it("reads scoped keys under the <scope>_ prefix and coerces page to a number", () => {
    renderProbe(ESC_CONFIG, "/escrituracion?esc_page=2&esc_sort=diferencia_aceptacion_firma&esc_departamento=Colón");
    const s = stateOf();
    expect(s.page).toBe(2);
    expect(s.sort).toBe("diferencia_aceptacion_firma");
    expect(s.departamento).toBe("Colón");
    expect(s.localidad).toBe("Todos"); // default when absent
  });

  it("reads shared root escribano/estado keys (cross-tab sync)", () => {
    renderProbe(ESC_CONFIG, "/escrituracion?escribano=Juan&estado=En Trámite");
    const s = stateOf();
    expect(s.escribano).toBe("Juan");
    expect(s.estado).toBe("En Trámite");
  });

  it("set merges with existing params instead of replacing (D5)", () => {
    renderProbe(DASHBOARD_CONFIG, "/dashboard?depto=Capital");
    const keyBefore = keyOf();
    click("set-estado");
    const search = searchOf();
    expect(new URLSearchParams(search).get("depto")).toBe("Capital"); // sibling preserved
    expect(new URLSearchParams(search).get("estado")).toBe("En Trámite");
    expect(keyOf()).not.toBe(keyBefore); // discrete change pushes a history entry
  });

  it("set omits default values so the URL stays clean (D4)", () => {
    renderProbe(DASHBOARD_CONFIG, "/dashboard?depto=Capital&estado=En Trámite");
    click("clear-depto");
    const search = searchOf();
    expect(new URLSearchParams(search).get("depto")).toBeNull();
    expect(new URLSearchParams(search).get("estado")).toBe("En Trámite");
    expect(stateOf().departamento).toBe("Todos");
  });

  it("keystroke-scale keys (dni) replace in place instead of spamming history", () => {
    renderProbe(ESC_CONFIG, "/escrituracion");
    const keyBefore = keyOf();
    click("set-dni");
    expect(new URLSearchParams(searchOf()).get("esc_dni")).toBe("123");
    expect(keyOf()).toBe(keyBefore); // replace: same location key, no new entry
    click("set-estado");
    expect(keyOf()).not.toBe(keyBefore); // discrete change still pushes
  });

  it("reset removes all owned params and restores defaults", () => {
    renderProbe(DASHBOARD_CONFIG, "/dashboard?depto=Capital&estado=En Trámite");
    click("reset");
    expect(new URLSearchParams(searchOf()).toString()).toBe("");
    const s = stateOf();
    expect(s.departamento).toBe("Todos");
    expect(s.tab).toBe("resumen");
  });
});