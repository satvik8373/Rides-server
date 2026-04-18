import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`AhmedabadCar API listening on ${env.APP_BASE_URL} (port ${env.PORT})`);
});

