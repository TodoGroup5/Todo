import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import router from "./endpoints";
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

app.use(cors({
  origin: isProductionEnvironment() ? 'https://ec2-16-28-30-48.af-south-1.compute.amazonaws.com' : 'localhost:3000',
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
  credentials: true,
  allowedHeaders: []
}));

const limiter = createRateLimiter({
  windowInMilliseconds: 60_000,
  maximumAllowedRequests: 60,
});
app.use(limiter.middleware());

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
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
