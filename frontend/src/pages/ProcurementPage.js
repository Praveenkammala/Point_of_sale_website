import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProcurementPage() {
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [branchForm, setBranchForm] = useState({ name: '', location: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', email: '' });
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const fetchData = async () => {
    try {
      const bRes = await axios.get("http://localhost:5000/api/branches", { headers: { Authorization: `Bearer ${token}` }});
      const sRes = await axios.get("http://localhost:5000/api/suppliers", { headers: { Authorization: `Bearer ${token}` }});
      setBranches(bRes.data);
      setSuppliers(sRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const addBranch = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/branches", branchForm, { headers: { Authorization: `Bearer ${token}` }});
      setBranchForm({ name: '', location: '' });
      fetchData();
    } catch (err) { alert("Error adding branch"); }
  };

  const deleteBranch = async (id) => {
    if(!window.confirm("Delete Branch?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/branches/${id}`, { headers: { Authorization: `Bearer ${token}` }});
      fetchData();
    } catch (err) { alert("Error deleting branch"); }
  };

  const addSupplier = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/suppliers", supplierForm, { headers: { Authorization: `Bearer ${token}` }});
      setSupplierForm({ name: '', contact: '', email: '' });
      fetchData();
    } catch (err) { alert("Error adding supplier"); }
  };

  const deleteSupplier = async (id) => {
    if(!window.confirm("Delete Supplier?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/suppliers/${id}`, { headers: { Authorization: `Bearer ${token}` }});
      fetchData();
    } catch (err) { alert("Error deleting supplier"); }
  };

  if (role !== 'admin') return <h2 style={{textAlign:'center', padding:'3rem', color:'#e74c3c'}}>Admin Access Required</h2>;

  return (
    <div className="main" style={{ maxWidth: '1200px' }}>
      <h2 style={{color: '#2c3e50', marginBottom: '2rem'}}>Procurement & Location Management</h2>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        
        {/* BRANCHES MODULE */}
        <div style={{ flex: 1, minWidth: '400px', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3>Branch Logistics</h3>
          <form onSubmit={addBranch} style={{ display: 'flex', gap: '10px', marginTop: '15px', marginBottom: '20px' }}>
            <input placeholder="Branch Name" required value={branchForm.name} onChange={e => setBranchForm({...branchForm, name: e.target.value})} style={{padding: '10px', flex: 1, border: '1px solid #ccc', borderRadius:'5px'}}/>
            <input placeholder="Location Area" required value={branchForm.location} onChange={e => setBranchForm({...branchForm, location: e.target.value})} style={{padding: '10px', flex: 1, border: '1px solid #ccc', borderRadius:'5px'}}/>
            <button type="submit" style={{padding: '10px 15px', background: '#3498db', color: 'white', border:'none', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold'}}>Deploy</button>
          </form>

          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
              <tr style={{ background: '#34495e', color: 'white' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Branch ID</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>BR-{b.id}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{b.name}</td>
                  <td style={{ padding: '10px', color: '#7f8c8d' }}>{b.location}</td>
                  <td style={{ padding: '10px' }}><button onClick={() => deleteBranch(b.id)} style={{background: '#e74c3c', color: '#fff', border:'none', padding:'5px 10px', borderRadius:'3px', cursor:'pointer'}}>Shutdown</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUPPLIERS MODULE */}
        <div style={{ flex: 1, minWidth: '400px', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3>Wholesale Suppliers</h3>
          <form onSubmit={addSupplier} style={{ display: 'flex', gap: '10px', marginTop: '15px', marginBottom: '20px' }}>
            <input placeholder="Supplier Name" required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} style={{padding: '10px', width: '30%', border: '1px solid #ccc', borderRadius:'5px'}}/>
            <input placeholder="Contact #" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} style={{padding: '10px', width: '30%', border: '1px solid #ccc', borderRadius:'5px'}}/>
            <input placeholder="Email" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} style={{padding: '10px', width: '30%', border: '1px solid #ccc', borderRadius:'5px'}}/>
            <button type="submit" style={{padding: '10px 15px', background: '#2ecc71', color: 'white', border:'none', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold'}}>Add</button>
          </form>

          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
              <tr style={{ background: '#34495e', color: 'white' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Contact</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{s.name}</td>
                  <td style={{ padding: '10px', color: '#7f8c8d' }}>{s.contact}</td>
                  <td style={{ padding: '10px', color: '#7f8c8d' }}>{s.email}</td>
                  <td style={{ padding: '10px' }}><button onClick={() => deleteSupplier(s.id)} style={{background: '#e74c3c', color: '#fff', border:'none', padding:'5px 10px', borderRadius:'3px', cursor:'pointer'}}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
export default ProcurementPage;
