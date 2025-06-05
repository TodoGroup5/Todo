import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
}

const UserPanel: React.FC = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: ''
  });
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  useEffect(() => {
    fetchUserTodos();
  }, []);

  const fetchUserTodos = async () => {
    try {
      const response = await fetch('/api/user/todos');
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      // Mock data for demo
      setTodos([
        {
          id: '1',
          title: 'Complete React tutorial',
          description: 'Finish the advanced React hooks tutorial',
          status: 'in-progress',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          title: 'Review code changes',
          description: 'Review pull request #123',
          status: 'pending',
          createdAt: '2024-01-16'
        },
        {
          id: '3',
          title: 'Write unit tests',
          description: 'Add unit tests for authentication service',
          status: 'completed',
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
      const response = await fetch('/api/user/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTodo,
          status: 'pending',
          createdAt: new Date().toISOString().split('T')[0]
        })
      });

      const todo = await response.json();
      setTodos([...todos, todo]);
    } catch (error) {
      const mockTodo: Todo = {
        id: Date.now().toString(),
        ...newTodo,
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setTodos([...todos, mockTodo]);
    }

    setNewTodo({ title: '', description: '' });
  };

  const handleUpdateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo) return;

    try {
      await fetch(`/api/user/todos/${editingTodo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTodo)
      });

      setTodos(todos.map(todo =>
        todo.id === editingTodo.id ? editingTodo : todo
      ));
    } catch (error) {
      setTodos(todos.map(todo =>
        todo.id === editingTodo.id ? editingTodo : todo
      ));
    }

    setEditingTodo(null);
  };

  const handleStatusChange = async (todoId: string, newStatus: Todo['status']) => {
    try {
      await fetch(`/api/user/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      setTodos(todos.map(todo =>
        todo.id === todoId ? { ...todo, status: newStatus } : todo
      ));
    } catch (error) {
      setTodos(todos.map(todo =>
        todo.id === todoId ? { ...todo, status: newStatus } : todo
      ));
    }
  };

  if (loading) return <div>Loading your todos...</div>;

  return (
    <div className="user-panel">
      <h2>My TODOs</h2>
      
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
          <button type="submit" className="btn-primary">Create TODO</button>
        </form>
      </div>

      {editingTodo && (
        <div className="panel-section">
          <h3>Edit TODO</h3>
          <form onSubmit={handleUpdateTodo} className="todo-form">
            <input
              type="text"
              value={editingTodo.title}
              onChange={(e) => setEditingTodo({...editingTodo, title: e.target.value})}
              required
            />
            <textarea
              value={editingTodo.description}
              onChange={(e) => setEditingTodo({...editingTodo, description: e.target.value})}
              rows={3}
            />
            <div className="form-actions">
              <button type="submit" className="btn-primary">Update TODO</button>
              <button 
                type="button" 
                onClick={() => setEditingTodo(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel-section">
        <h3>Your TODOs</h3>
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
                <span>Created: {todo.createdAt}</span>
                <button 
                  onClick={() => setEditingTodo(todo)}
                  className="btn-link"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserPanel;