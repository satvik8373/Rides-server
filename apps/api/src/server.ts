import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();
const PORT = parseInt(process.env.PORT || String(env.PORT) || "4000", 10);

app.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`AhmedabadCar API listening on port ${PORT}`);
});

