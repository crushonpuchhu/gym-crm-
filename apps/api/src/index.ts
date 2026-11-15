import { createApp } from "./app";
import { env } from "./config/env";

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
});

const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`salesflow api listening on ${env.PORT} (${env.NODE_ENV})`);
});
