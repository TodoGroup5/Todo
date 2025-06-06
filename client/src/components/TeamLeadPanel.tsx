import React, { useState, useEffect } from 'react';

interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: string;
  createdBy: string;
  createdAt: string;
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

  useEffect(() => {
    fetchTeamTodos();
  }, []);

  const fetchTeamTodos = async () => {
    try {
      const response = await fetch('/api/team/todos');
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      // Mock data for demo
      setTodos([
        {
          id: '1',
          title: 'Complete project proposal',
          description: 'Draft and submit the Q2 project proposal',
          status: 'in-progress',
          assignedTo: 'john_doe',
          createdBy: 'teamlead',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          title: 'Code review',
          description: 'Review the authentication module',
          status: 'pending',
          assignedTo: 'jane_smith',
          createdBy: 'teamlead',
          createdAt: '2024-01-16'
        },
        {
          id: '3',
          title: 'Update documentation',
          description: 'Update API documentation with new endpoints',
          status: 'completed',
          assignedTo: 'bob_wilson',
          createdBy: 'john_doe',
          createdAt: '2024-01-14'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      // Mock create for demo
      const mockTodo: Todo = {
        id: Date.now().toString(),
        ...newTodo,
        status: 'pending',
        createdBy: 'teamlead',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setTodos([...todos, mockTodo]);
    }

    setNewTodo({ title: '', description: '', assignedTo: '' });
  };

  const handleStatusChange = async (todoId: string, newStatus: Todo['status']) => {
    try {
      await fetch(`/api/team/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      setTodos(todos.map(todo =>
        todo.id === todoId ? { ...todo, status: newStatus } : todo
      ));
    } catch (error) {
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
                <span>Assigned to: <strong>{todo.assignedTo}</strong></span>
                <span>Created by: {todo.createdBy}</span>
                <span>Date: {todo.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamLeadPanel;