// Vercel serverless entry: every request that is not a static file is routed here (see vercel.json).
// Database migrations run during the build (npm run vercel-build), not on cold starts.
import { app } from '../server/src/app.js';

export default app;
