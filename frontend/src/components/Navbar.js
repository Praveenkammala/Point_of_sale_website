import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Navbar({ setAuthToken }) {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(localStorage.getItem('activeBranch') || '1');

  useEffect(() => {
    if (token) {
        axios.get("http://localhost:5000/api/branches", { headers: { Authorization: `Bearer ${token}` }})
             .then(res => {
                 setBranches(res.data);
                 if (!localStorage.getItem('activeBranch') && res.data.length > 0) {
                     localStorage.setItem('activeBranch', res.data[0].id);
                     setActiveBranch(res.data[0].id);
                 }
             })
             .catch(console.error);
    }
  }, [token]);

  const handleBranchChange = (e) => {
    const val = e.target.value;
    setActiveBranch(val);
    localStorage.setItem('activeBranch', val);
    window.dispatchEvent(new Event('branchChanged'));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setAuthToken(null);
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
        <h2 style={{margin: 0}}>🛒 Smile POS</h2>
        <select value={activeBranch} onChange={handleBranchChange} style={{padding:'6px 10px', borderRadius:'5px', background:'#34495e', color:'white', border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer', fontWeight:'bold', outline:'none'}}>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
            ))}
        </select>
      </div>
      <div style={styles.links}>
        <Link style={styles.link} to="/">Storefront</Link>
        <Link style={styles.link} to="/orders">Orders</Link>
        <Link style={styles.link} to="/analytics">Analytics</Link>
        <Link style={styles.link} to="/customers">Customers (CRM)</Link>
        <Link style={styles.link} to="/shifts">HR & Shifts</Link>
        {role === 'admin' && <Link style={styles.link} to="/procurement">Procurement</Link>}
        {role === 'admin' && <Link style={styles.link} to="/employees">Employees</Link>}
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: { display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', background: '#2c3e50', color: 'white', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  links: { display: 'flex', gap: '20px', alignItems: 'center' },
  link: { color: 'white', textDecoration: 'none', fontWeight: 'bold' },
  logoutBtn: { background: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }
};

export default Navbar;
