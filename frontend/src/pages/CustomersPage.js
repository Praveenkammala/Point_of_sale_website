import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUserPlus, FaTrash } from 'react-icons/fa';

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const fetchCustomers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/customers", { headers: { Authorization: `Bearer ${token}` } });
      setCustomers(res.data);
    } catch (err) { console.error("Failed to fetch customers"); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const addCustomer = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/customers", form, { headers: { Authorization: `Bearer ${token}` } });
      setForm({ name: '', phone: '', email: '' });
      fetchCustomers();
    } catch (err) { alert("Error adding customer (Phone may already exist)"); }
  };

  const deleteCustomer = async (id) => {
    if(!window.confirm("Delete this customer record?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchCustomers();
    } catch (err) { alert("Error deleting customer"); }
  };

  return (
    <div className="main" style={{ maxWidth: '1200px' }}>
      <h2 style={{color: '#2c3e50', marginBottom: '10px'}}>CRM & Loyalty Network</h2>
      <p style={{marginBottom: '2rem', color: '#7f8c8d'}}>Track Lifetime Value (LTV) and reward returning customers.</p>

      <div style={{ background: 'white', padding: '25px', borderRadius: '10px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <h3 style={{marginTop: 0, marginBottom: '15px'}}><FaUserPlus /> Manual Customer Entry</h3>
        <form onSubmit={addCustomer} style={{ display: 'flex', gap: '15px' }}>
          <input placeholder="Customer Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{padding: '12px', flex: 1, border: '1px solid #ddd', borderRadius:'5px'}}/>
          <input placeholder="Phone / Mobile" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{padding: '12px', flex: 1, border: '1px solid #ddd', borderRadius:'5px'}}/>
          <input placeholder="Email (Optional)" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{padding: '12px', flex: 1, border: '1px solid #ddd', borderRadius:'5px'}}/>
          <button type="submit" style={{padding: '12px 25px', background: '#3498db', color: 'white', border:'none', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold'}}>Register</button>
        </form>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#34495e', color: 'white' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}># ID</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Phone</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Loyalty Points</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Lifetime Value (LTV)</th>
              {role === 'admin' && <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ padding: '15px', color: '#7f8c8d' }}>C-{c.id}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{c.name}</td>
                <td style={{ padding: '15px' }}>{c.phone}</td>
                <td style={{ padding: '15px' }}>
                    <span style={{background: '#f1c40f', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight:'bold'}}>{c.loyalty_points} ⭐</span>
                </td>
                <td style={{ padding: '15px', color: '#27ae60', fontWeight: 'bold', fontSize: '1.1rem' }}>₹ {c.total_spent.toFixed(2)}</td>
                {role === 'admin' && (
                  <td style={{ padding: '15px' }}>
                    <button onClick={() => deleteCustomer(c.id)} style={{background: 'transparent', color: '#e74c3c', border:'none', cursor:'pointer'}}><FaTrash size={18}/></button>
                  </td>
                )}
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan="6" style={{padding:'20px', textAlign:'center', color:'#7f8c8d'}}>No customers logged yet. Complete a checkout with a phone number!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomersPage;
