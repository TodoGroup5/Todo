import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import router from "./endpoints";
import { attachCsrfToken, verifyCsrfToken } from "./lib/csrf";
import { isProductionEnvironment } from "./lib/deployment";
import { createRateLimiter } from "./lib/rateLimiter";

let dirname;

if (!isProductionEnvironment()) {
  const __filename = fileURLToPath(import.meta.url);
  dirname = path.dirname(__filename);
} else {
  dirname = __dirname;
}

//---------- Setup ----------//
const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors());
// app.use(attachCsrfToken());
// app.use(verifyCsrfToken());

const limiter = createRateLimiter({
  windowInMilliseconds: 60_000,
  maximumAllowedRequests: 60,
});
app.use(limiter.middleware());

app.use(cookieParser());
app.use(express.json());
app.use("/api", router);

// Path to client build directory
const distPath = path.join(dirname, "../client/dist");

// Serve static React files
app.use(express.static(distPath));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(dirname, "../client/dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
