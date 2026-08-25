import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "../App";

// React 18 requires this flag for act() when not using @testing-library/react.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Keep mounted tabs in their loading state: no resolved data, no error update,
// so the test only exercises the router/layout layer.
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

describe("router shell", () => {
  it("redirects unknown URLs to /dashboard", () => {
    renderApp("/totally-unknown");
    expect(container.querySelector('[data-testid="location"]').dataset.path).toBe("/dashboard");
  });

  it("redirects the root URL to /dashboard", () => {
    renderApp("/");
    expect(container.querySelector('[data-testid="location"]').dataset.path).toBe("/dashboard");
  });

  it("renders the shared layout with an active nav link on a deep link", () => {
    renderApp("/escrituracion");
    expect(container.querySelector("aside.app-sidebar")).not.toBeNull();
    expect(container.querySelector("footer.app-footer")).not.toBeNull();
    const link = container.querySelector('a[href="/escrituracion"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("preserves dashboard query params when mounting the dashboard route", () => {
    renderApp("/dashboard?tab=demorados&depto=Capital");
    const loc = container.querySelector('[data-testid="location"]');
    expect(loc.dataset.path).toBe("/dashboard");
    expect(loc.dataset.search).toBe("?tab=demorados&depto=Capital");
  });
});
