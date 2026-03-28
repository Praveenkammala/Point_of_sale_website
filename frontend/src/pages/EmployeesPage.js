import React, { useState, useEffect } from 'react';
import axios from 'axios';

function EmployeesPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'cashier', pin_code: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role') || 'cashier';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users", { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  const addUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await axios.post("http://localhost:5000/api/users", form, { headers: { Authorization: `Bearer ${token}` } });
      setForm({ username: '', password: '', role: 'cashier', pin_code: '' });
      fetchUsers();
    } catch (err) { 
        setErrorMsg(err.response?.data?.error || err.message);
    }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (err) { alert(err.response?.data?.error || "Error deleting user"); }
  };

  if (userRole !== 'admin') {
      return <div style={{padding:'4rem', textAlign:'center', color: '#e74c3c'}}><h2>Access Denied. Admins Only.</h2></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{color: '#2c3e50'}}>Employee Management</h2>
      <p style={{marginBottom: '2rem', color: '#7f8c8d'}}>Create logins for cashiers.</p>
      
      <div style={{ background: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h3 style={{marginBottom: '5px'}}>Create New Employee</h3>
        {errorMsg && <p style={{color: '#e74c3c', marginTop: 0, fontWeight: 'bold'}}>{errorMsg}</p>}
        <form onSubmit={addUser} style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
          <input placeholder="Username (Unique)" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} style={{padding: '10px', flex: 1, minWidth: '150px', border: '1px solid #ccc', borderRadius:'3px'}}/>
          <input placeholder="Password" required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{padding: '10px', flex: 1, minWidth: '150px', border: '1px solid #ccc', borderRadius:'3px'}}/>
          <input placeholder="Fast Switch PIN (Optional)" type="password" maxLength={4} value={form.pin_code} onChange={e => setForm({...form, pin_code: e.target.value})} style={{padding: '10px', flex: 1, minWidth: '150px', border: '1px solid #ccc', borderRadius:'3px'}}/>
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{padding: '10px', borderRadius:'3px', background: 'white', minWidth: '120px'}}>
            <option value="cashier">Cashier</option>
            <option value="manager">Store Manager</option>
            <option value="admin">Global Admin</option>
          </select>
          <button type="submit" style={{padding: '10px 20px', background: '#3498db', color: 'white', border:'none', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold', minWidth: '120px'}}>Add User</button>
        </form>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#34495e', color: 'white' }}>
            <th style={{ padding: '15px', textAlign: 'left' }}>Username</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Role</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '15px', fontWeight: 'bold' }}>{u.username}</td>
              <td style={{ padding: '15px', color: '#7f8c8d' }}>{u.role.toUpperCase()}</td>
              <td style={{ padding: '15px' }}>
                 <button onClick={() => deleteUser(u.id)} style={{background: '#e74c3c', color: 'white', border:'none', padding:'8px 15px', borderRadius:'3px', cursor:'pointer'}}>Drop Access</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default EmployeesPage;
