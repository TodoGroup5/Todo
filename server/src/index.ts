import express from 'express';
import 'dotenv/config';
import { registerAuthRoutes } from './routes/auth-routes';
import { registerTodoRoutes } from './routes/todo-routes';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Hello from Express');
});

// register REST routes
registerAuthRoutes(app)
registerTodoRoutes(app)

app.listen(port, (err) => {
    if (err) {
        console.error(`Failed to start server: ${err}`);
    } else {
        console.info(`Server is running on port ${port}`);
    }
});