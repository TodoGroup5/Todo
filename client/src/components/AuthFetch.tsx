import React, { useState } from 'react';


// TODO: Check this - most likely doesn't work 😵‍💫

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    try {
      const res = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data: { token: string } = await res.json();
      setToken(data.token);
      localStorage.setItem('token', data.token);
    } catch (error) {
      alert('Login failed');
      console.error(error);
    }
  };

  const fetchProfile = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) throw new Error('No token found');

      const res = await fetch('https://ec2-16-28-30-48.af-south-1.compute.amazonaws.com/profile', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${storedToken}`
        }
      });

      if (!res.ok) {
        throw new Error('Unauthorized');
      }

      const data = await res.json();
      console.log(data);
      alert(`Hello ${data.user?.email}`);
    } catch (error) {
      alert('Not authorized');
      console.error(error);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <input
        placeholder="Email"
        onChange={e => setEmail(e.target.value)}
        value={email}
      />
      <input
        placeholder="Password"
        type="password"
        onChange={e => setPassword(e.target.value)}
        value={password}
      />
      <button onClick={login}>Login</button>
      <button onClick={fetchProfile}>Fetch Profile</button>
    </div>
  );
};

export default App;
