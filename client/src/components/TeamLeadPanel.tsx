import React, { useState, useEffect, useCallback } from 'react';
import { CrudService } from '../api/crudService.ts';

interface Todo {
  id: number;
  title: string;
  description: string;
  status: string;
  assigned_to: number;
  created_by: number;
  created_at: string;
}

const TeamLeadPanel: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    assignedTo: ''
  });
  const [teamMembers] = useState(['john_doe', 'jane_smith', 'bob_wilson']);

  const fetchTeamTodos = useCallback(async () => {
    const teamId: number = 1;
    try {
      const response = await CrudService.read<Todo[]>(`/team/${teamId}/todos`);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message); return; }
      if (response.data == null) return;

      console.log("RESPONSE DATA:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      setTodos(response.data.data ?? []);
    }
    catch (err) { console.log("Failed to fetch todos", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTeamTodos(); }, [fetchTeamTodos]);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;

    try {
      const response = await fetch('/api/team/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTodo,
          status: 'pending',
          createdBy: 'teamlead',
          createdAt: new Date().toISOString().split('T')[0]
        })
      });

      const todo = await response.json();
      setTodos([...todos, todo]);
    }
    catch (err) { console.log("Could not create todo", err); }

    setNewTodo({ title: '', description: '', assignedTo: '' });
  };

  const handleStatusChange = async (todoId: number, newStatus: Todo['status']) => {
    try {
      await fetch(`/api/team/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      setTodos(todos.map(todo =>
        todo.id === todoId ? { ...todo, status: newStatus } : todo
      ));
    } catch {
      // Mock update for demo
      setTodos(todos.map(todo =>
        todo.id === todoId ? { ...todo, status: newStatus } : todo
      ));
    }
  };

  if (loading) return <div>Loading team todos...</div>;

  return (
    <div className="team-lead-panel">
      <h2>Team TODO Management</h2>
      
      <div className="panel-section">
        <h3>Create New TODO</h3>
        <form onSubmit={handleCreateTodo} className="todo-form">
          <input
            type="text"
            placeholder="TODO Title"
            value={newTodo.title}
            onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
            required
          />
          <textarea
            placeholder="Description"
            value={newTodo.description}
            onChange={(e) => setNewTodo({...newTodo, description: e.target.value})}
            rows={3}
          />
          <select
            value={newTodo.assignedTo}
            onChange={(e) => setNewTodo({...newTodo, assignedTo: e.target.value})}
            required
          >
            <option value="">Select team member</option>
            {teamMembers.map(member => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Create TODO</button>
        </form>
      </div>

      <div className="panel-section">
        <h3>Team TODOs</h3>
        <div className="todos-grid">
          {todos.map(todo => (
            <div key={todo.id} className="todo-card">
              <div className="todo-header">
                <h4>{todo.title}</h4>
                <select
                  value={todo.status}
                  onChange={(e) => handleStatusChange(todo.id, e.target.value as Todo['status'])}
                  className={`status-select status-${todo.status}`}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <p className="todo-description">{todo.description}</p>
              <div className="todo-meta">
                <span>Assigned to: <strong>{todo.assigned_to}</strong></span>
                <span>Created by: {todo.created_by}</span>
                <span>Date: {todo.created_at}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamLeadPanel;