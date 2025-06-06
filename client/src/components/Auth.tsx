import React, { useState } from 'react';
import axios from 'axios';

// TODO: Check this - most likely doesn't work :PPPPPP

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    try {
      const response = await axios.post<{ token: string }>('http://localhost:3001/login', {
        email,
        password
      });
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
    } catch (error) {
      alert('Login failed');
      console.error(error);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log(response.data);
      alert(`Hello ${response.data.user?.email}`);
    } catch (error) {
      alert('Not authorized');
      console.error(error);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
      <button onClick={fetchProfile}>Fetch Profile</button>
    </div>
  );
};

export default App;