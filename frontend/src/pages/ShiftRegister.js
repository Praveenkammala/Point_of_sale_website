import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaClock, FaCashRegister } from 'react-icons/fa';

function ShiftRegister() {
    const [shifts, setShifts] = useState([]);
    const [openCash, setOpenCash] = useState('');
    const [closeCash, setCloseCash] = useState('');
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    const fetchShifts = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/shifts", { headers: { Authorization: `Bearer ${token}` }});
            setShifts(res.data);
        } catch (err) { console.log("Failed to fetch shifts (Admin Only)"); }
    };

    useEffect(() => {
        if (role === 'admin') fetchShifts();
    }, [role]);

    const clockIn = async () => {
        try {
            await axios.post("http://localhost:5000/api/timeclocks/in", {}, { headers: { Authorization: `Bearer ${token}` }});
            alert("✅ Secure Clock-In Recorded");
        } catch (err) { alert("Clock-In Failed"); }
    };

    const clockOut = async () => {
        try {
            await axios.post("http://localhost:5000/api/timeclocks/out", {}, { headers: { Authorization: `Bearer ${token}` }});
            alert("🛑 Secure Clock-Out Recorded");
        } catch (err) { alert("Clock-Out Failed"); }
    };

    const openShift = async () => {
        try {
            await axios.post("http://localhost:5000/api/shifts/open", { starting_cash: openCash || 0 }, { headers: { Authorization: `Bearer ${token}` }});
            alert("🟢 Shift Opened with ₹" + (openCash || 0));
            setOpenCash('');
            fetchShifts();
        } catch (err) { alert("Shift Open Failed"); }
    };

    const closeShift = async () => {
        try {
            await axios.post("http://localhost:5000/api/shifts/close", { ending_cash: closeCash || 0 }, { headers: { Authorization: `Bearer ${token}` }});
            alert("🔴 Shift Closed with ₹" + (closeCash || 0));
            setCloseCash('');
            fetchShifts();
        } catch (err) { alert("Shift Close Failed"); }
    };

    return (
        <div className="main" style={{ maxWidth: '1000px' }}>
            <h2 style={{color: '#2c3e50', marginBottom: '2rem'}}>HR & Payroll Terminal</h2>
            
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <h3 style={{marginBottom: '15px'}}><FaClock /> Time Clock</h3>
                    <p style={{color: '#7f8c8d', marginBottom: '20px'}}>Log your physical operational hours.</p>
                    <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={clockIn} style={{flex:1, padding: '15px', background: '#2ecc71', color: 'white', border:'none', borderRadius: '5px', fontWeight:'bold', cursor:'pointer', fontSize:'16px'}}>Clock IN (Stamp)</button>
                        <button onClick={clockOut} style={{flex:1, padding: '15px', background: '#e74c3c', color: 'white', border:'none', borderRadius: '5px', fontWeight:'bold', cursor:'pointer', fontSize:'16px'}}>Clock OUT (Exit)</button>
                    </div>
                </div>

                <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <h3 style={{marginBottom: '15px'}}><FaCashRegister /> Till Shift Drawer</h3>
                    <p style={{color: '#7f8c8d', marginBottom: '20px'}}>Manage physical vault float metrics.</p>
                    <div style={{display:'flex', gap:'10px', marginBottom: '10px'}}>
                        <input type="number" placeholder="Opening Cash Float (₹)" value={openCash} onChange={e=>setOpenCash(e.target.value)} style={{flex:2, padding: '10px', border:'1px solid #ccc', borderRadius:'3px'}}/>
                        <button onClick={openShift} style={{flex:1, padding: '10px', background: '#3498db', color: 'white', border:'none', borderRadius: '3px', fontWeight:'bold', cursor:'pointer'}}>Open Till</button>
                    </div>
                    <div style={{display:'flex', gap:'10px'}}>
                        <input type="number" placeholder="Closing Cash Float (₹)" value={closeCash} onChange={e=>setCloseCash(e.target.value)} style={{flex:2, padding: '10px', border:'1px solid #ccc', borderRadius:'3px'}}/>
                        <button onClick={closeShift} style={{flex:1, padding: '10px', background: '#f39c12', color: 'white', border:'none', borderRadius: '3px', fontWeight:'bold', cursor:'pointer'}}>Close Till</button>
                    </div>
                </div>
            </div>

            {role === 'admin' && shifts.length > 0 && (
                <div style={{ marginTop: '30px', background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <h3 style={{padding: '20px', margin: 0, borderBottom: '1px solid #eee', background: '#34495e', color: 'white'}}>Admin Verification: Drawer Logs</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Employee</th>
                            <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Status</th>
                            <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Shift Started</th>
                            <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Shift Ended</th>
                            <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Open Float</th>
                            <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Close Float</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shifts.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '15px', fontWeight: 'bold' }}>{s.username}</td>
                            <td style={{ padding: '15px' }}><span style={{background: s.status==='open' ? '#e74c3c':'#2ecc71', color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '12px'}}>{s.status.toUpperCase()}</span></td>
                            <td style={{ padding: '15px', color:'#7f8c8d' }}>{new Date(s.start_time).toLocaleString()}</td>
                            <td style={{ padding: '15px', color:'#7f8c8d' }}>{s.end_time ? new Date(s.end_time).toLocaleString() : 'Working'}</td>
                            <td style={{ padding: '15px', fontWeight: 'bold' }}>₹{s.starting_cash}</td>
                            <td style={{ padding: '15px', fontWeight: 'bold' }}>{s.ending_cash ? `₹${s.ending_cash}` : '-'}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ShiftRegister;
