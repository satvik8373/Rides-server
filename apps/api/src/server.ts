import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();
const PORT = process.env.PORT || env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`AhmedabadCar API listening on port ${PORT}`);
});

