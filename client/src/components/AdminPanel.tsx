import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CrudService } from '../api/crudService.ts';

interface User {
	id: number;
	name: string;
	email: string;
	role_ids: number[];
	role_names: string[];
}

interface UserTeam {
  team_id: number;
  team_name: string;
  team_description: string;
  membership_id: number;
  role_ids: number[];
  role_names: string[];
}

interface Team {
  id: number;
  name: string;
  description: string;
}

interface Role {
	id: number;
	name: string;
}

interface TeamMember {
  membership_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role_ids: number[];
  role_names: string[];
}

const AdminPanel: React.FC = () => {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [updateLoading, setUpdateLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [globalRoles, setGlobalRoles] = useState<Role[]>([]);
    const [localRoles, setLocalRoles] = useState<Role[]>([]);
    const [editLoading, setEditLoading] = useState(false);
    const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
    
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [showAddToTeam, setShowAddToTeam] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', description: '' });
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [teamLoading, setTeamLoading] = useState(false);
       
    
	const fetchUsers = useCallback(async () => {
		try {
			const response = await CrudService.customRequest(
				'/user/all',
				'GET'
			);
			if (response.error)
				throw new Error(
					'[FETCH]: ' + response.error + '\n' + response.message
				);
			if (!response.data || response.data.status === 'failed') {
				throw new Error(
					'[DATA]: ' +
						(response.data && 'error' in response.data
							? response.data.error
							: 'Unknown error')
				);
			}

			console.log('FETCH USERS RESPONSE:', response.data);
			const usersData: User[] = Array.isArray(response.data?.data)
				? response.data.data
				: [];
			setUsers(usersData.slice(1));
		} catch (err) {
			console.log('Failed to fetch users', err);
		} finally {
			setLoading(false);
		}
	}, []);

    const fetchGlobalRoles = useCallback(async () => {
        try {
          const response = await CrudService.read<Role[]>('/global-role/all');
          if (response.error) throw new Error("[FETCH]: " + response.error + "\n" + response.message);
          if (!response.data || response.data.status === 'failed') {
            throw new Error("[DATA]: " + (response.data && 'error' in response.data ? response.data.error : 'Unknown error'));
          }
    
          setGlobalRoles(response.data.data as Role[] ?? []);
        } catch (err) {
          console.log("Failed to fetch global roles", err);
        }
      }, []);
    
      const fetchLocalRoles = useCallback(async () => {
        try {
          const response = await CrudService.read<Role[]>('/local-role/all');
          if (response.error) throw new Error("[FETCH]: " + response.error + "\n" + response.message);
          if (!response.data || response.data.status === 'failed') {
            throw new Error("[DATA]: " + (response.data && 'error' in response.data ? response.data.error : 'Unknown error'));
          }
    
          setLocalRoles(response.data.data as Role[] ?? []);
        } catch (err) {
          console.log("Failed to fetch local roles", err);
        }
      }, []);

    const fetchAllTeams = useCallback(async () => {
        try {
          const response = await CrudService.read<Team[]>('/team/all');
          if (response.error) throw new Error("[FETCH]: " + response.error + "\n" + response.message);
          if (!response.data || response.data.status === 'failed') {
            throw new Error("[DATA]: " + (response.data && 'error' in response.data ? response.data.error : 'Unknown error'));
          }
    
          setAllTeams(response.data.data as Team[] ?? []);
        } catch (err) {
          console.log("Failed to fetch teams", err);
        }
    }, []);

	useEffect(() => {
		fetchUsers();
        fetchGlobalRoles();
        fetchLocalRoles();
        fetchAllTeams();
	}, [fetchUsers, fetchGlobalRoles, fetchLocalRoles, fetchAllTeams]);

	const getUserPrimaryRole = (roleNames: string[]): string => {
		return roleNames?.length ? roleNames.join(', ') : 'No Role';
	};

    const fetchUserTeams = useCallback(async (userId: number) => {
        try {
          setEditLoading(true);
          const response = await CrudService.read<UserTeam[]>(`/user/${userId}/teams`);
          if (response.error) throw new Error("[FETCH]: " + response.error + "\n" + response.message);
          if (!response.data || response.data.status === 'failed') {
            throw new Error("[DATA]: " + (response.data && 'error' in response.data ? response.data.error : 'Unknown error'));
          }
    
          const teams = response.data.data as UserTeam[] ?? [];
          setUserTeams(teams);
    
        } catch (err) {
          console.log("Failed to fetch user teams", err);
        } finally {
          setEditLoading(false);
        }
    }, []);

	const handleEditUser = async (user: User) => {
		setEditingUser(user);
		await fetchUserTeams(user.id);
	};

    const handleDeleteUser = async (userId: number) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        setUpdateLoading(true);
        try {
          const response = await CrudService.delete(`/user/${userId}`, '');
          if (response.error || response.data?.status === 'failed') {
            throw new Error("[DELETE]: " + response.error);
          }
          fetchUsers();
        } catch (err) {
          console.log("Failed to delete user", err);
        } finally {
          setUpdateLoading(false);
        }
    };

    const handleUpdateUserGlobalRole = async (userId: number, newRoleId: number) => {
        if (newRoleId == null) return;
        
        setUpdateLoading(true);
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
        
            if (editingUser && editingUser.id === userId) {
                setEditingUser({
                    ...editingUser,
                    role_ids: [newRoleId],
                    role_names: globalRoles.filter(r => r.id === newRoleId).map(r => r.name)
                });
            }

            for (const roleId of user.role_ids || []) {
                if (roleId != null) {
                    try {
                        await CrudService.delete(`/user/${userId}/global-role/${roleId}/revoke`, '');
                    } catch (err) {
                        console.log(`Failed to revoke role ${roleId}`, err);
                    }
                }
            }
            
            try {
                await CrudService.create(`/user/${userId}/global-role/${newRoleId}/assign`, {});
            } catch (err) {
                console.log(`Failed to assign role ${newRoleId}`, err);
                if (editingUser && editingUser.id === userId) {
                    setEditingUser({
                        ...editingUser,
                        role_ids: user.role_ids,
                        role_names: user.role_names
                    });
                }
            }
    
            await fetchUsers();
            if (editingUser?.id === userId) {
                await fetchUserTeams(userId);
            }
        } catch (err) {
            console.log("Failed to update user global role", err);
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleUpdateTeamRole = async (membershipId: number, newRoleId: number) => {
        if (newRoleId == null) return;
        
        setEditLoading(true);
        try {
            console.log(`Updating team role for membership ${membershipId} to role ${newRoleId}`);
            
            const currentTeam = userTeams.find(team => team.membership_id === membershipId);
            if (!currentTeam) {
                console.log("Could not find current team membership");
                return;
            }

            setUserTeams(prevTeams => 
                prevTeams.map(team => 
                    team.membership_id === membershipId 
                        ? { 
                            ...team, 
                            role_ids: [newRoleId],
                            role_names: localRoles.filter(r => r.id === newRoleId).map(r => r.name)
                        }
                        : team
                )
            );

            for (const roleId of currentTeam.role_ids || []) {
                if (roleId != null) {
                    try {
                        console.log(`Revoking role ${roleId} from membership ${membershipId}`);
                        await CrudService.delete(`/team-membership/${membershipId}/local-role/${roleId}/revoke`, '');
                    } catch (err) {
                        console.log(`Failed to revoke role ${roleId}`, err);
                    }
                }
            }
            
            try {
                console.log(`Assigning role ${newRoleId} to membership ${membershipId}`);
                await CrudService.create(`/team-membership/${membershipId}/local-role/${newRoleId}/assign`, {});
            } catch (err) {
                console.log(`Failed to assign role ${newRoleId}`, err);
                setUserTeams(prevTeams => 
                    prevTeams.map(team => 
                        team.membership_id === membershipId 
                            ? { 
                                ...team, 
                                role_ids: currentTeam.role_ids,
                                role_names: currentTeam.role_names
                            }
                            : team
                    )
                );
                throw err;
            }
    
            // Refresh the user teams data from server
            if (editingUser) {
                await fetchUserTeams(editingUser.id);
            }
        } catch (err) {
            console.log("Failed to update team role", err);
        } finally {
            setEditLoading(false);
        }
    };

    const handleRemoveFromTeam = async (userId: number, teamId: number) => {
        if (!window.confirm('Are you sure you want to remove this user from the team?')) return;
        setEditLoading(true);
        try {
          const response = await CrudService.delete(`/team-membership/user/${userId}/team/${teamId}`, '');
    
          if (response.error || response.data?.status === 'failed') {
            throw new Error("[REMOVE]: " + response.error);
          }
    
          if (editingUser) {
            await fetchUserTeams(editingUser.id);
          }
        } catch (err) {
          console.log("Failed to remove user from team", err);
        } finally {
          setEditLoading(false);
        }
    };

    // New handlers for team creation and user assignment
    const handleCreateTeam = async () => {
        if (!newTeam.name.trim()) {
            alert('Team name is required');
            return;
        }

        setTeamLoading(true);
        try {
            const response = await CrudService.create('/team/create', {
                name: newTeam.name,
                description: newTeam.description || null
            });

            if (response.error || response.data?.status === 'failed') {
                throw new Error("[CREATE]: " + response.error);
            }

            // Reset form and refresh teams
            setNewTeam({ name: '', description: '' });
            setShowCreateTeam(false);
            await fetchAllTeams();
            
            console.log('Team created successfully');
        } catch (err) {
            console.log("Failed to create team", err);
            alert('Failed to create team. Please try again.');
        } finally {
            setTeamLoading(false);
        }
    };

    const handleAddUserToTeam = async () => {
        if (!selectedTeamId || !editingUser) {
            alert('Please select a team');
            return;
        }

        setEditLoading(true);
        try {
            const response = await CrudService.create('/team-membership/add', {
                user_id: editingUser.id,
                team_id: selectedTeamId
            });

            if (response.error || response.data?.status === 'failed') {
                throw new Error("[ADD]: " + response.error);
            }

            // Reset selection and refresh user teams
            setSelectedTeamId(null);
            setShowAddToTeam(false);
            await fetchUserTeams(editingUser.id);
            
            console.log('User added to team successfully');
        } catch (err) {
            console.log("Failed to add user to team", err);
            alert('Failed to add user to team. Please try again.');
        } finally {
            setEditLoading(false);
        }
    };

    const getAvailableTeams = (): Team[] => {
        if (!editingUser) return [];

        console.log("USER TEAMS", userTeams);
        console.log("ALL TEAMS", allTeams);
        
        const userTeamIds = userTeams.map(ut => ut.team_id);
        return allTeams.filter(team => !userTeamIds.includes(team.id));
    };

	return (
		<div className="dashboard-content">
			<div className="admin-panel">
				<h2>User & Role Management</h2>

                {/* Team Creation Section */}
                <div className="panel-section">
                    <div className="section-header">
                        <h3>Team Management</h3>
                        <button
                            onClick={() => setShowCreateTeam(!showCreateTeam)}
                            className="btn-primary"
                            disabled={teamLoading}
                        >
                            {showCreateTeam ? 'Cancel' : 'Create New Team'}
                        </button>
                    </div>

                    {showCreateTeam && (
                        <div className="create-team-form">
                            <div className="form-group">
                                <label>Team Name *</label>
                                <input
                                    type="text"
                                    value={newTeam.name}
                                    onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                                    placeholder="Enter team name"
                                    disabled={teamLoading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={newTeam.description}
                                    onChange={(e) => setNewTeam({...newTeam, description: e.target.value})}
                                    placeholder="Enter team description"
                                    disabled={teamLoading}
                                    rows={3}
                                />
                            </div>
                            <div className="form-actions">
                                <button
                                    onClick={handleCreateTeam}
                                    className="btn-primary"
                                    disabled={teamLoading}
                                >
                                    {teamLoading ? 'Creating...' : 'Create Team'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCreateTeam(false);
                                        setNewTeam({ name: '', description: '' });
                                    }}
                                    className="btn-secondary"
                                    disabled={teamLoading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

				<div className="panel-section">
					<h3>All Users</h3>
					<div className="users-table">
						<div className="table-header">
							<span>Name</span>
							<span>Email</span>
							<span>Global Roles</span>
							<span>Actions</span>
						</div>
						{users.map((user) => (
							<div key={user.id} className="table-row">
								<span>{user.name}</span>
								<span>{user.email}</span>
								<span className="role-badge">
									{getUserPrimaryRole(user.role_names || [])}
								</span>
								<div className="table-actions">
									<button
										onClick={() => handleEditUser(user)}
										className="btn-secondary"
										disabled={updateLoading}
									>
										Edit
									</button>
									<button
										onClick={() =>
											handleDeleteUser(user.id)
										}
										className="btn-danger"
										disabled={updateLoading}
									>
										Delete
									</button>
								</div>
							</div>
						))}
					</div>
				</div>

                {editingUser && (
                    <div className="panel-section">
                        <h3>Edit User: {editingUser.name}</h3>
                        
                        <div className="edit-section">
                            <h4>Global Roles</h4>
                            <div className="role-selection">
                                {globalRoles.map(role => (
                                <label key={role.id} className="radio-label">
                                    <input
                                    type="radio"
                                    name={`global-role-${editingUser.id}`}
                                    value={role.id}
                                    checked={editingUser.role_ids?.includes(role.id) || false}
                                    onChange={() => handleUpdateUserGlobalRole(editingUser.id, role.id)}
                                    disabled={updateLoading}
                                    />
                                    {role.name}
                                </label>
                                ))}
                            </div>
                        </div>

                        <div className="edit-section">
                            <div className="section-header">
                                <h4>Team Memberships</h4>
                                {getAvailableTeams().length > 0 && (
                                    <button
                                        onClick={() => setShowAddToTeam(!showAddToTeam)}
                                        className="btn-primary"
                                        disabled={editLoading}
                                    >
                                        {showAddToTeam ? 'Cancel' : 'Add to Team'}
                                    </button>
                                )}
                            </div>

                            {showAddToTeam && (
                                <div className="add-to-team-form">
                                    <div className="form-group">
                                        <label>Select Team</label>
                                        <select
                                            value={selectedTeamId || ''}
                                            onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : null)}
                                            disabled={editLoading}
                                        >
                                            <option value="">Choose a team...</option>
                                            {getAvailableTeams().map(team => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name} {team.description && `- ${team.description}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-actions">
                                        <button
                                            onClick={handleAddUserToTeam}
                                            className="btn-primary"
                                            disabled={editLoading || !selectedTeamId}
                                        >
                                            {editLoading ? 'Adding...' : 'Add to Team'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddToTeam(false);
                                                setSelectedTeamId(null);
                                            }}
                                            className="btn-secondary"
                                            disabled={editLoading}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {editLoading && !showAddToTeam ? (
                                <div>Loading team memberships...</div>
                            ) : (
                                <>
                                {userTeams.length === 0 ? (
                                    <div className="no-teams">
                                        <p>User is not a member of any teams.</p>
                                    </div>
                                ) : (
                                    <>
                                    {userTeams.map((userTeam) => (
                                        <div key={userTeam.membership_id} className="team-membership">
                                        <div className="team-info">
                                            <strong>{userTeam.team_name}</strong>
                                            <p>{userTeam.team_description}</p>
                                        </div>
                                        
                                        <div className="team-roles">
                                            <label>Roles in this team:</label>
                                            <div className="role-selection">
                                            {localRoles.map(role => (
                                                <label key={role.id} className="radio-label">
                                                <input
                                                    type="radio"
                                                    name={`team-role-${userTeam.membership_id}`}
                                                    value={role.id}
                                                    checked={userTeam.role_ids?.includes(role.id) || false}
                                                    onChange={() => {
                                                        console.log(`Changing role for membership ${userTeam.membership_id} to role ${role.id}`);
                                                        handleUpdateTeamRole(userTeam.membership_id, role.id);
                                                    }}
                                                    disabled={editLoading}
                                                />
                                                {role.name}
                                                </label>
                                            ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRemoveFromTeam(editingUser.id, userTeam.team_id)}
                                            className="btn-danger"
                                            disabled={editLoading}
                                        >
                                            Remove from Team
                                        </button>
                                        </div>
                                    ))}
                                    </>
                                )}
                                </>
                            )}
                        </div>
                    </div>
                )}
			</div>
		</div>
	);
};

export default AdminPanel;