// Emergency error handler - must be first
process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ UNHANDLED REJECTION:", reason);
  process.exit(1);
});

console.log("🚀 Starting AhmedabadCar API...");
console.log("✓ Startup handlers registered");

import { env } from "./config/env.js";
import { createApp } from "./app.js";

console.log("✓ Environment loaded");
const app = createApp();
const PORT = parseInt(process.env.PORT || String(env.PORT) || "4000", 10);

console.log(`✓ App created, listening on port ${PORT}`);
app.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`✓ AhmedabadCar API listening on port ${PORT}`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

