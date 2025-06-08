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

// Path to client build directory
const distPath = path.join(__dirname, '../client/dist');  // or '../client/build' if that's your folder

// Serve static React files
app.use(express.static(distPath));

// For any other routes, so React Router can handle routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
