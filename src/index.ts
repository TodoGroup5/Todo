import express from 'express';
import router from './endpoints.js';

import { attachCsrfToken, verifyCsrfToken } from "./lib/csrf";

//---------- Setup ----------//
const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json())
app.use(attachCsrfToken());
app.use(verifyCsrfToken());

app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});