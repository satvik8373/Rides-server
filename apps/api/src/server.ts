import { env } from "./config/env.js";
import { createApp } from "./app.js";

console.log("🚀 Starting AhmedabadCar API...");
console.log("✓ Server module loaded");

try {
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
} catch (error) {
  console.error("❌ FATAL ERROR during startup:", error);
  if (error instanceof Error) {
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  }
  process.exit(1);
}

