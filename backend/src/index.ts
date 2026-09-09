import { createApp } from "./app.js";
import { env } from "./lib/env.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Okovision backend listening on port ${env.PORT}`);
});
