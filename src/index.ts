import "dotenv/config";
import express from "express";
import router from "./endpoints.js";
import cors from "cors";
import path from 'path';

//---------- Setup ----------//
const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());
app.use("/api", router);

// Serve static frontend files
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
