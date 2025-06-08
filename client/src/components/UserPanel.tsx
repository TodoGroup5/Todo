import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CrudService } from '../api/crudService.ts';

interface Todo {
  id: number;
  title: string;
  description: string;
  status_id: number;
  status_name: string;
  assigned_to: number;
  created_by: number;
  created_at: string;
  team_id: number;
  due_date?: string;
  updated_at: string;
}

interface Status {
  id: number;
  name: string;
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
  const [statuses, setStatuses] = useState<Status[]>([]);

  const userId = user?.id || 1; // Get user ID from auth context

  const fetchUserTodos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await CrudService.read<Todo[]>(`/user/${userId}/todos`);
      console.log("USER TODOS RESPONSE:", response.data);
      
      if (response.error) { 
        throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); 
        return; 
      }
      if (response.data == null) return;

      if (response.data.status === 'failed') { 
        throw new Error("[DATA]: " + response.data.error); 
        return; 
      }

      setTodos(response.data.data ?? []);
    } catch (err) { 
      console.log("Failed to fetch user todos", err); 
    } finally { 
      setLoading(false); 
    }
  }, [userId]);

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await CrudService.read<Status[]>(`/status/all`);
      if (response.error) { 
        throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); 
        return; 
      }
      if (response.data == null) return;

      console.log("STATUSES:", response.data);

      if (response.data.status === 'failed') { 
        throw new Error("[DATA]: " + response.data.error); 
        return; 
      }
      
      setStatuses(response.data.data ?? []);
    } catch (err) {
      console.log("Failed to fetch statuses", err);
    }
  }, []);

  useEffect(() => {
    fetchUserTodos();
    fetchStatuses();
  }, [fetchUserTodos, fetchStatuses]);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;

    try {
      const todoData = {
        created_by: userId,
        title: newTodo.title,
        description: newTodo.description,
        status: 1, // Default to first status (usually "pending")
        assigned_to: userId, // User assigns to themselves
        due_date: new Date()
      };

      const response = await CrudService.create('/todo/create', todoData);
      if (response.error) { 
        throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); 
        return; 
      }
      if (response.data == null) return;

      console.log("CREATE TODO RESPONSE:", response.data);

      if (response.data.status === 'failed') { 
        throw new Error("[DATA]: " + response.data.error); 
        return; 
      }

      fetchUserTodos(); // Refresh the todos list
      setNewTodo({ title: '', description: '' });
      
    } catch (err) { 
      console.log("Could not create todo", err); 
    }
  };

  const handleUpdateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo) return;

    try {
      const updateData = {
        title: editingTodo.title,
        description: editingTodo.description
      };

      const response = await CrudService.update('/todo', editingTodo.id, updateData);
      if (response.error) { 
        throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); 
        return; 
      }
      if (response.data == null) return;

      console.log("UPDATE TODO RESPONSE:", response.data);

      if (response.data.status === 'failed') { 
        throw new Error("[DATA]: " + response.data.error); 
        return; 
      }

      setTodos(todos.map(todo =>
        todo.id === editingTodo.id ? { ...todo, ...updateData } : todo
      ));
    } catch (err) {
      console.log("Could not update todo", err);
    }

    setEditingTodo(null);
  };

  const handleStatusChange = async (todoId: number, newStatus: string) => {
    try {
      const statusData = { status: getStatusId(newStatus) };
      
      const response = await CrudService.update('/todo', todoId, statusData);
      if (response.error) { 
        throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); 
        return; 
      }
      if (response.data == null) return;

      console.log("UPDATE STATUS RESPONSE:", response.data);

      if (response.data.status === 'failed') { 
        throw new Error("[DATA]: " + response.data.error); 
        return; 
      }

      setTodos(todos.map(todo =>
        todo.id === todoId ? { ...todo, status_id: getStatusId(newStatus), status_name: newStatus } : todo
      ));
    } catch (err) {
      console.log("Could not update todo status", err);
    }
  };

  const getStatusName = (statusId: number): string => {
    const status = statuses.find(s => s.id === statusId);
    return status ? status.name : 'unknown';
  };

  const getStatusId = (statusName: string): number => {
    const status = statuses.find(s => s.name === statusName);
    return status ? status.id : 1;
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
          {todos.length === 0 ? (
            <p>No todos found. Create your first todo above!</p>
          ) : (
            todos.map(todo => (
              <div key={todo.id} className="todo-card">
                <div className="todo-header">
                  <h4>{todo.title}</h4>
                  <select
                    value={getStatusName(todo.status_id)}
                    onChange={(e) => handleStatusChange(todo.id, e.target.value)}
                    className={`status-select status-${todo.status_id}`}
                  >
                    {statuses.map(status => (
                      <option key={status.id} value={status.name}>{status.name}</option>
                    ))}
                  </select>
                </div>
                <p className="todo-description">{todo.description}</p>
                <div className="todo-meta">
                  <span>Created: {todo.created_at}</span>
                  <button 
                    onClick={() => setEditingTodo(todo)}
                    className="btn-link"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPanel;