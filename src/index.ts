import "dotenv/config";
import express from "express";
import router from "./endpoints.js";
import cors from "cors";
import path from 'path';
import { attachCsrfToken, verifyCsrfToken } from "./lib/csrf";
import { isProductionEnvironment } from "./lib/deployment.js";
import { fileURLToPath } from 'url';
import cookieParser from "cookie-parser";

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
app.use(cookieParser());
app.use(express.json());
app.use("/api", router);

// Path to client build directory
const distPath = path.join(dirname, '../client/dist');  // or '../client/build' if that's your folder

// Serve static React files
app.use(express.static(distPath));

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
