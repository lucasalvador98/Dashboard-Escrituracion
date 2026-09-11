import React, { act } from "react";
import { createRoot } from "react-dom/client";
import SlidePanel from "../components/SlidePanel";
import StatusCards from "../components/StatusCards";
import SelectFilters from "../components/SelectFilters";

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

function mouseDown(node) {
  act(() => {
    node.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  });
}

function keyDown(node, key) {
  act(() => {
    node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
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

describe("SlidePanel (MUI Drawer, UI-2)", () => {
  const renderPanel = (props = {}) =>
    renderDirect(
      <SlidePanel isOpen={false} onClose={() => {}} title="Detalle" {...props}>
        <div>contenido del panel</div>
      </SlidePanel>
    );

  it("renders the title and children when open", () => {
    renderPanel({ isOpen: true });
    expect(container.textContent).toContain("Detalle");
    expect(container.textContent).toContain("contenido del panel");
    // Title keeps its heading role (INV-3).
    expect(container.querySelector("h3").textContent).toBe("Detalle");
  });

  it("is not mounted while closed (temporary drawer)", () => {
    renderPanel({ isOpen: false });
    expect(container.textContent).not.toContain("Detalle");
    expect(container.querySelector(".MuiDrawer-paper")).toBeNull();
  });

  it("dismisses on ESC from inside the drawer", () => {
    const onClose = jest.fn();
    renderPanel({ isOpen: true, onClose });
    const paper = container.querySelector(".MuiDrawer-paper");
    expect(paper).not.toBeNull();
    keyDown(paper, "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses on backdrop click", () => {
    const onClose = jest.fn();
    renderPanel({ isOpen: true, onClose });
    const backdrop = container.querySelector(".MuiBackdrop-root");
    expect(backdrop).not.toBeNull();
    click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses via the close button (same aria-label)", () => {
    const onClose = jest.fn();
    renderPanel({ isOpen: true, onClose });
    const closeButton = container.querySelector('button[aria-label="Close panel"]');
    expect(closeButton).not.toBeNull();
    click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("StatusCards (MUI Card, UI-1)", () => {
  const baseProps = {
    counts: { "En Trámite": 2, Entregada: 1 },
    totalCount: 3,
    selectedEstado: null,
    setSelectedEstado: jest.fn(),
    setFilters: jest.fn(),
    setPage: jest.fn(),
    ipvCount: 0,
  };

  const cards = () => Array.from(container.querySelectorAll(".MuiCard-root"));
  const cardFor = text => cards().find(c => c.textContent.includes(text));

  it("renders counts, percentages and the IPV card", () => {
    renderDirect(<StatusCards {...baseProps} ipvCount={4} />);

    const enTramite = cardFor("En Trámite");
    expect(enTramite).not.toBeUndefined();
    expect(enTramite.textContent).toContain("2");
    expect(enTramite.textContent).toContain("67% del total");

    const entregada = cardFor("Entregada");
    expect(entregada.textContent).toContain("33% del total");

    const ipv = container.querySelector('[title="IPV: Caso en Dirección de Viviendas"]');
    expect(ipv).not.toBeNull();
    expect(ipv.textContent).toContain("IPV");
    expect(ipv.textContent).toContain("4");
    expect(ipv.textContent).toContain("ipv");
  });

  it("omits the IPV card when ipvCount is 0", () => {
    renderDirect(<StatusCards {...baseProps} ipvCount={0} />);
    expect(container.querySelector('[title="IPV: Caso en Dirección de Viviendas"]')).toBeNull();
  });

  it("toggles the estado filter off when the selected card is clicked", () => {
    const props = { ...baseProps, selectedEstado: "En Trámite" };
    renderDirect(<StatusCards {...props} />);

    const card = cardFor("En Trámite");
    // CardActionArea is a native button → Enter/Space activation + focus ring.
    const button = card.querySelector("button");
    expect(button).not.toBeNull();
    expect(button.getAttribute("aria-pressed")).toBe("true");

    click(button);

    const stateUpdater = props.setSelectedEstado.mock.calls[0][0];
    expect(stateUpdater("En Trámite")).toBeNull();
    const filtersUpdater = props.setFilters.mock.calls[0][0];
    expect(filtersUpdater({ estado: "En Trámite" })).toEqual({ estado: "Todos" });
    expect(props.setPage).toHaveBeenCalledWith(1);
  });

  it("toggles the estado filter on from an inactive card", () => {
    const props = { ...baseProps, selectedEstado: null };
    renderDirect(<StatusCards {...props} />);

    const card = cardFor("Entregada");
    expect(card.querySelector("button").getAttribute("aria-pressed")).toBe("false");
    click(card.querySelector("button"));

    const stateUpdater = props.setSelectedEstado.mock.calls[0][0];
    expect(stateUpdater(null)).toBe("Entregada");
    const filtersUpdater = props.setFilters.mock.calls[0][0];
    expect(filtersUpdater({ estado: "Todos" })).toEqual({ estado: "Entregada" });
    expect(props.setPage).toHaveBeenCalledWith(1);
  });
});

describe("SelectFilters (MUI TextField select, UI-3)", () => {
  const data = [
    { Departamento: "Capital", Localidad: "Centro", Barrio: "Gral. Paz", Estado: "En Trámite", "Escribano Designado": "Perez", diferencia_aceptacion_firma: 25 },
    { Departamento: "Capital", Localidad: "Centro", Barrio: "Gral. Paz", Estado: "Entregada", "Escribano Designado": "Perez", diferencia_aceptacion_firma: 10 },
    { Departamento: "Interior", Localidad: "Rural", Barrio: "El Abasto", Estado: "En Trámite", "Escribano Designado": "Garcia", diferencia_aceptacion_firma: 30 },
  ];
  const baseFilters = {
    departamento: "Todos",
    localidad: "Todos",
    barrio: "Todos",
    estado: "Todos",
    escribano: "",
    dni: "",
  };

  function renderFilters(props = {}) {
    renderDirect(
      <SelectFilters data={data} filters={baseFilters} setFilters={jest.fn()} resetFilters={jest.fn()} {...props} />
    );
  }

  // Selects render in DOM order: Departamento, Localidad, Barrio, Estado,
  // Escribano (DNI is a text field, not a combobox).
  const combobox = index => container.querySelectorAll('[role="combobox"]')[index];
  const openSelect = index => mouseDown(combobox(index));
  const optionTexts = () =>
    Array.from(document.body.querySelectorAll('[role="option"]')).map(o => o.textContent.trim());
  const pickOption = text => {
    const option = Array.from(document.body.querySelectorAll('[role="option"]')).find(
      o => o.textContent.trim() === text
    );
    expect(option).not.toBeUndefined();
    click(option);
  };

  it("renders every filter control and a disabled reset", () => {
    renderFilters();
    ["Departamento", "Localidad", "Barrio", "Estado", "Escribano", "DNI"].forEach(label =>
      expect(container.textContent).toContain(label)
    );
    expect(container.querySelector('input[placeholder="Buscar por DNI..."]')).not.toBeNull();
    expect(container.querySelectorAll('[role="combobox"]').length).toBe(5);

    const reset = container.querySelector('button[title="Restablecer todos los filtros"]');
    expect(reset.textContent).toContain("Limpiar filtros");
    expect(reset.disabled).toBe(true);
  });

  it("offers the full Departamento option list", () => {
    renderFilters();
    openSelect(0);
    expect(optionTexts()).toEqual(["Todos", "Capital", "Interior"]);
  });

  it("resets Localidad and Barrio when Departamento changes", () => {
    const setFilters = jest.fn();
    renderFilters({ setFilters });
    openSelect(0);
    pickOption("Interior");
    expect(setFilters).toHaveBeenCalledWith({ departamento: "Interior", localidad: "Todos", barrio: "Todos" });
  });

  it("resets Barrio when Localidad changes", () => {
    const setFilters = jest.fn();
    renderFilters({ setFilters, filters: { ...baseFilters, departamento: "Capital" } });
    openSelect(1);
    pickOption("Centro");
    expect(setFilters).toHaveBeenCalledWith({ localidad: "Centro", barrio: "Todos" });
  });

  it("narrows Localidad options by the selected Departamento", () => {
    renderFilters({ filters: { ...baseFilters, departamento: "Capital" } });
    openSelect(1);
    expect(optionTexts()).toEqual(["Todos", "Centro"]);
  });

  it("shows demora counts in the Escribano options and resets to empty on Todos", () => {
    const setFilters = jest.fn();
    renderFilters({ setFilters, filters: { ...baseFilters, escribano: "Perez" } });
    openSelect(4);
    expect(optionTexts()).toContain("Perez (1 demora)");
    expect(optionTexts()).toContain("Garcia (1 demora)");
    pickOption("Todos");
    expect(setFilters).toHaveBeenCalledWith({ escribano: "" });
  });

  it("updates the DNI text filter", () => {
    const setFilters = jest.fn();
    renderFilters({ setFilters });
    const input = container.querySelector('input[placeholder="Buscar por DNI..."]');
    setInputValue(input, "30123456");
    expect(setFilters).toHaveBeenCalledWith({ dni: "30123456" });
  });

  it("enables and triggers Limpiar filtros when a filter is active", () => {
    const resetFilters = jest.fn();
    renderFilters({ resetFilters, filters: { ...baseFilters, dni: "30" } });
    const reset = container.querySelector('button[title="Restablecer todos los filtros"]');
    expect(reset.disabled).toBe(false);
    click(reset);
    expect(resetFilters).toHaveBeenCalledTimes(1);
  });
});