import "dotenv/config";
import express from "express";
import router from "./endpoints.js";
import cors from "cors";

//---------- Setup ----------//
const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());
app.use("/api", router);

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
