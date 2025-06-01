import { authenticateToken } from "../middleware";
import { Express } from "express";

let tasks = [
    {username: 'Cindi', title:'1'},
    {username: 'Cindi', title:'2'},
    {username: 'Ben', title:'1'}
]

export function registerTodoRoutes(app: Express){
    app.get('/tasks', authenticateToken, (req, res) => {
        res.json(tasks.filter(task => task.username === req.user.name))
    })
}
