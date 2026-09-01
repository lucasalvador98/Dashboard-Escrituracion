import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "../App";

// React 18 requires this flag for act() when not using @testing-library/react.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Keep mounted tabs in their loading state so the test only exercises the shell.
jest.mock("axios", () => ({
  get: jest.fn(() => new Promise(() => {})),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
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

function renderApp(initialEntry = "/dashboard") {
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

function click(el) {
  act(() => {
    // cancelable: true is required so react-router's Link preventDefault() works
    // in jsdom (otherwise jsdom tries to "follow the hyperlink" and logs an error).
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function mobileDrawer() {
  return document.body.querySelector('[data-testid="app-sidebar-mobile"]');
}

// The temporary Drawer uses transitionDuration={0}, so a short real-timer wait
// lets its exit teardown complete deterministically (no fake timers needed).
async function flushTimers(ms = 50) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
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
});

describe("P2 shell (drawer + bottom nav)", () => {
  it("renders the desktop sidebar and footer with testids", () => {
    renderApp("/escrituracion");
    expect(container.querySelector('[data-testid="app-sidebar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="app-footer"]')).not.toBeNull();
  });

  it("renders the mobile bottom nav with the 4 destinations", () => {
    renderApp("/dashboard");
    const nav = container.querySelector('[data-testid="app-bottom-nav"]');
    expect(nav).not.toBeNull();
    const links = Array.from(nav.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard",
      "/escrituracion",
      "/stock",
      "/escribanos",
    ]);
    expect(links[0].getAttribute("aria-current")).toBe("page");
  });

  it("opens the temporary drawer from the hamburger, navigates and closes on selection (SH-5)", async () => {
    renderApp("/dashboard");
    expect(mobileDrawer()).toBeNull();

    click(container.querySelector('button[aria-label="Abrir menú de navegación"]'));
    await flushTimers();
    expect(mobileDrawer()).not.toBeNull();

    click(mobileDrawer().querySelector('a[href="/stock"]'));
    await flushTimers();
    expect(mobileDrawer()).toBeNull();
    expect(container.querySelector('[data-testid="location"]').dataset.path).toBe("/stock");
  });
});
