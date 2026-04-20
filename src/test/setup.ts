import "@testing-library/jest-dom/vitest";

// jsdom 24 + Node 25 can ship a broken `localStorage` stub missing
// setItem/getItem/clear. Replace with a Map-backed polyfill for tests.
function createStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
  };
}

function installStorage(name: "localStorage" | "sessionStorage") {
  const existing = (globalThis as unknown as Record<string, Storage | undefined>)[name];
  if (existing && typeof existing.clear === "function") return;
  const store = createStorage();
  Object.defineProperty(globalThis, name, {
    value: store,
    writable: true,
    configurable: true,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, {
      value: store,
      writable: true,
      configurable: true,
    });
  }
}

installStorage("localStorage");
installStorage("sessionStorage");
