import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrollIntoView — polyfill for component tests
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
