// Local / VPS entry point. On Vercel, api/index.js imports the app directly.
import { app } from './app.js';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { storageDriver } from './lib/storage.js';

await migrate();
app.listen(config.port, () => {
  console.log(`So Pure Skin API on http://localhost:${config.port} (storage: ${storageDriver})`);
});
