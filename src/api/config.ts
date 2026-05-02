const browserOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || `${browserOrigin}/api`;

export const WS_BASE_URL =
  process.env.REACT_APP_WS_BASE_URL ||
  (API_BASE_URL.startsWith("http")
    ? API_BASE_URL.replace(/^http/i, "ws").replace(/\/api$/, "")
    : `${browserOrigin.replace(/^http/i, "ws")}`);
