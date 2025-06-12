import React, { useState, useEffect, useCallback } from 'react';
import { CrudService } from '../api/crudService.ts';
import AnalyticsBarChart from './AnalyticsBarChart';
import UserStorageService from '../api/userStorageService.ts';

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

interface TeamMember {
  membership_id: number;
  role_ids: number[];
  role_names: number[];
  user_email: string;
  user_id: number;
  user_name: string;
}

interface Status {
  id: number,
  name: string
}

interface Team {
  team_id: number;
  team_name: string;
  team_description: string;
  membership_id: number;
  role_ids: number[];
  role_names: string[];
}

const TeamLeadPanel: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    assignedTo: ''
  });
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  const userId = UserStorageService.getUserId();

  const isTeamLead = () => {
    if (!selectedTeam) return false;
    const leadRoles = ['Team Lead'];
    const role = selectedTeam.role_names[0];
    return role ? leadRoles.includes(role) : false;
  };

  const fetchUserTeams = useCallback(async () => {
    try {
      setTeamsLoading(true);
      const response = await CrudService.read<Team[]>(`/user/${userId}/teams`);
      console.log("TEAMS RESPONSE:", response.data);
      
      if (response.error) { 
        throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); 
      }
      if (response.data == null) return;

      if (response.data.status === 'failed') { 
        throw new Error("[DATA]: " + response.data.error); 
      }

      const teamsData = response.data.data ?? [];
      setTeams(teamsData);
      
      if (teamsData.length > 0 && !selectedTeam) {
        setSelectedTeam(teamsData[0]);
      }
    } catch (err) { 
      console.log("Failed to fetch teams", err); 
    } finally { 
      setTeamsLoading(false); 
    }
  }, [userId, selectedTeam]);

  const fetchTeamTodos = useCallback(async () => {
    if (!selectedTeam) return;
    
    try {
      setLoading(true);
      let endpoint;
      
      if (isTeamLead()) {
        endpoint = `/team/${selectedTeam.team_id}/todos`;
      } else {
        endpoint = `/user/${userId}/todos?team_id=${selectedTeam.team_id}`;
      }
      
      const response = await CrudService.read<Todo[]>(endpoint);
      console.log("TODOS RESPONSE:", response.data);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); return; }
      if (response.data == null) return;

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      let todosData = response.data.data ?? [];
      
      setTodos(todosData);
    }
    catch (err) { console.log("Failed to fetch todos", err); }
    finally { setLoading(false); }
  }, [selectedTeam, userId]);

  const fetchTeamMembers = useCallback(async () => {
    if (!selectedTeam || !isTeamLead()) return;
    
    try {
      const response = await CrudService.read<TeamMember[]>(`/team/${selectedTeam.team_id}/members`);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); return; }
      if (response.data == null) return;

      console.log("MEMBERS:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }

      setTeamMembers(response.data.data ?? []);
    } catch (err) {
      console.log("Failed to fetch team members", err);
    }
  }, [selectedTeam]);

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await CrudService.read<Status[]>(`/status/all`);
      if (response.error) { throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); return; }
      if (response.data == null) return;

      console.log("STATUSES:", response.data);

      if (response.data.status === 'failed') { throw new Error("[DATA]: " + response.data.error); return; }
      setStatuses(response.data.data ?? []);
    } catch (err) {
      console.log("Failed to fetch statuses", err);
    }
  }, []);

  useEffect(() => { 
    fetchUserTeams();
    fetchStatuses(); 
  }, [fetchUserTeams, fetchStatuses]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamTodos(); 
      if (isTeamLead()) {
        fetchTeamMembers(); 
      }
    }
  }, [selectedTeam, fetchTeamTodos, fetchTeamMembers]);

  const handleTeamSwitch = (team: Team) => {
    setSelectedTeam(team);
    setTodos([]);
    setTeamMembers([]);
    setEditingTodo(null);
    setNewTodo({ title: '', description: '', assignedTo: '' });
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.title.trim() || !selectedTeam) return;

    try {
      const todoData = {
        team_id: selectedTeam.team_id, 
        title: newTodo.title,
        description: newTodo.description,
        status: 1,
        assigned_to: isTeamLead() && newTodo.assignedTo ? parseInt(newTodo.assignedTo) : userId,
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

  const handleDeleteTodo = async (todoId: number) => {
    if (!window.confirm('Are you sure you want to delete this todo? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await CrudService.delete('/todo', todoId);
      if (response.error) { 
        throw new Error("[FETCH]: " + response.error + "\n" + response.message + (response.data ? "\n" + JSON.stringify(response.data) : "")); 
        return; 
      }
      if (response.data == null) return;

      console.log("DELETE TODO RESPONSE:", response.data);

      if (response.data.status === 'failed') { 
        throw new Error("[DATA]: " + response.data.error); 
        return; 
      }

      setTodos(todos.filter(todo => todo.id !== todoId));
      
      if (editingTodo && editingTodo.id === todoId) {
        setEditingTodo(null);
      }
    } catch (err) {
      console.log("Could not delete todo", err);
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

  const getTeamMemberName = (userId: number): string => {
    const member = teamMembers.find(m => m.user_id === userId);
    return member ? member.user_name : `User ${userId}`;
  };

  const canEditTodo = (todo: Todo): boolean => {
    return isTeamLead() || todo.assigned_to === userId || todo.created_by === userId;
  };

  const canDeleteTodo = (todo: Todo): boolean => {
    return isTeamLead();
  };

  if (teamsLoading) return <div>Loading teams...</div>;

  if (teams.length === 0) {
    return (
      <div className="team-lead-panel">
        <h2>Team TODO Management</h2>
        <div className="no-teams-message">
          <p>You are not a member of any teams yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-lead-panel">
      <h2>{isTeamLead() ? 'Team TODO Management' : 'My Team TODOs'}</h2>
      
      {/* Team Switcher */}
      <div className="panel-section">
        <div className="team-switcher-container">
          <div className="team-switcher">
            <label htmlFor="team-select">Select Team:</label>
            <select
              id="team-select"
              value={selectedTeam?.team_id || ''}
              onChange={(e) => {
                const teamId = parseInt(e.target.value);
                const team = teams.find(t => t.team_id === teamId);
                if (team) handleTeamSwitch(team);
              }}
              className="team-select"
            >
              <option value="">Choose a team...</option>
              {teams.map(team => (
                <option key={team.team_id} value={team.team_id}>
                  {team.team_name} ({team.role_names[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Current Team Info */}
          {selectedTeam && (
            <div className="current-team-info">
              <h3>{selectedTeam.team_name}</h3>
              <p>{selectedTeam.team_description}</p>
              <span className="role-badge">Your Role: {selectedTeam.role_names[0]}</span>
              {!isTeamLead() && (
                <div className="role-notice">
                  <small>You can only view and manage your own todos in this team.</small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedTeam && isTeamLead() && (
        <div className="panel-section">
          <AnalyticsBarChart todos={todos} statuses={statuses} />
        </div>
      )}

      {selectedTeam ? (
        <>
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
              {isTeamLead() && (
                <select
                  value={newTodo.assignedTo}
                  onChange={(e) => setNewTodo({...newTodo, assignedTo: e.target.value})}
                  required
                >
                  <option value="">Select team member</option>
                  {teamMembers.map(member => (
                    <option key={member.user_id} value={member.user_id}>{member.user_name}</option>
                  ))}
                </select>
              )}
              <button type="submit" className="btn-primary">Create TODO</button>
            </form>
          </div>

          {editingTodo && canEditTodo(editingTodo) && (
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
            <h3>{isTeamLead() ? 'Team TODOs' : 'Your TODOs in this Team'}</h3>
            {loading ? (
              <div>Loading todos...</div>
            ) : (
              <div className="todos-grid">
                {todos.length === 0 ? (
                  <p>No todos found for this team.</p>
                ) : (
                  todos.map(todo => (
                    <div key={todo.id} className="todo-card">
                      <div className="todo-header">
                        <h4>{todo.title}</h4>
                        <select
                          value={getStatusName(todo.status_id)}
                          onChange={(e) => handleStatusChange(todo.id, e.target.value)}
                          className={`status-select status-${todo.status_id}`}
                          disabled={!canEditTodo(todo)}
                        >
                          {statuses.map(status => (
                            <option key={status.id} value={status.name}>{status.name}</option>
                          ))}
                        </select>
                      </div>
                      <p className="todo-description">{todo.description}</p>
                      <div className="todo-meta">
                        {isTeamLead() && (
                          <span>Assigned to: <strong>{getTeamMemberName(todo.assigned_to)}</strong></span>
                        )}
                        <span>Created by: {todo.created_by}</span>
                        <span>Date: {todo.created_at}</span>
                        <div className="todo-actions">
                          {canEditTodo(todo) && (
                            <button 
                              onClick={() => setEditingTodo(todo)}
                              className="btn-link"
                            >
                              Edit
                            </button>
                          )}
                          {canDeleteTodo(todo) && (
                            <button 
                              onClick={() => handleDeleteTodo(todo.id)}
                              className="btn-link btn-danger"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="panel-section">
          <div className="no-team-selected">
            <p>Please select a team to view and manage todos.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeadPanel;