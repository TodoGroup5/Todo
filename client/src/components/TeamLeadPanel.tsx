import React, { useState, useEffect, useCallback } from 'react';
import { CrudService } from '../api/crudService.ts';

interface Todo {
  id: number;
  title: string;
  description: string;
  status: number;
  assigned_to: number;
  created_by: number;
  created_at: string;
  team_id: number;
  due_date?: string;
  updated_at: string;
}

interface TeamMember {
  id: number;
  user_id: number;
  team_id: number;
  user_name: string;
  user_email: string;
}

interface Status {
  id: number,
  name: string
}

const TeamLeadPanel: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    assignedTo: ''
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);

  const fetchTeamTodos = useCallback(async () => {
    const teamId: number = 1;
    try {
      const response = await CrudService.read<Todo[]>(`/team/${teamId}/todos`);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); return; }
      if (response.data == null) return;

      console.log("RESPONSE DATA:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      setTodos(response.data.data ?? []);
    }
    catch (err) { console.log("Failed to fetch todos", err); }
    finally { setLoading(false); }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    const teamId: number = 1;
    try {
      const response = await CrudService.read<TeamMember[]>(`/team/${teamId}/members`);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); return; }
      if (response.data == null) return;

      console.log("MEMBERS:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      setTeamMembers(response.data.data ?? []);
    } catch (err) {
      console.log("Failed to fetch team members", err);
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await CrudService.read<Status[]>(`/status`);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); return; }
      if (response.data == null) return;

      console.log("STATUSES:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }
      setStatuses(response.data.data ?? []);
    } catch (err) {
      console.log("Failed to fetch statuses", err);
    }
  }, [])

  useEffect(() => { 
    fetchTeamTodos(); 
    fetchTeamMembers(); 
    fetchStatuses();
  }, [fetchTeamTodos, fetchTeamMembers, fetchStatuses]);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;

    try {
      const todoData = {
        created_by: 1,
        team_id: 1, 
        title: newTodo.title,
        description: newTodo.description,
        status: 1,
        assigned_to: parseInt(newTodo.assignedTo),
        due_date: new Date()
      };

      const response = await CrudService.create('/todo/create', todoData);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); return; }
      if (response.data == null) return;

      console.log("CREATE RESPONSE:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      fetchTeamTodos();
      setNewTodo({ title: '', description: '', assignedTo: '' });
      
    } catch (err) { 
      console.log("Could not create todo", err); 
    }
  };

  const handleStatusChange = async (todoId: number, newStatus: string) => {
    try {
      const statusData = { status: getStatusId(newStatus) };
      
      const response = await CrudService.update('/todo', todoId, statusData);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); return; }
      if (response.data == null) return;

      console.log("UPDATE RESPONSE:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      setTodos(todos.map(todo =>
        todo.id === todoId ? { ...todo, status: getStatusId(newStatus) } : todo
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

  const getTeamMemberName = (userId: number): string => {
    const member = teamMembers.find(m => m.user_id === userId);
    return member ? member.user_name : `User ${userId}`;
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
              <option key={member.id} value={member.user_id}>{member.user_name}</option>
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
                  value={getStatusName(todo.status)}
                  onChange={(e) => handleStatusChange(todo.id, e.target.value)}
                  className={`status-select status-${getStatusName(todo.status)}`}
                >
                  {statuses.map(status => (
                    <option key={status.id} value={status.name}>{status.name}</option>
                  ))}
                </select>
              </div>
              <p className="todo-description">{todo.description}</p>
              <div className="todo-meta">
                <span>Assigned to: <strong>{getTeamMemberName(todo.assigned_to)}</strong></span>
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