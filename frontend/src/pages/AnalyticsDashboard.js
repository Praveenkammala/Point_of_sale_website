import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function AnalyticsDashboard() {
  const [data, setData] = useState({ stats: {}, topProducts: [], chartData: [], customerSplit: [], recentOrders: [] });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get("http://localhost:5000/api/analytics", { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch analytics");
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{color: '#2c3e50', marginBottom: '2rem'}}>Sales Analytics</h2>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '2rem' }}>
        <div style={{ background: '#3498db', color: 'white', padding: '20px', borderRadius: '10px', flex: 1, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <h3>Total Revenue</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>₹ {data.stats?.totalRevenue ? data.stats.totalRevenue.toFixed(2) : 0}</p>
        </div>
        <div style={{ background: '#2ecc71', color: 'white', padding: '20px', borderRadius: '10px', flex: 1, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <h3>Total Orders</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{data.stats?.totalEvents || 0}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '400px', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{marginBottom: '20px', color: '#333'}}>Revenue Over Time (14 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.chartData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, minWidth: '400px', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{marginBottom: '20px', color: '#333'}}>Top 5 High-Volume Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="product_name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_sold" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
        <div style={{ flex: 1, minWidth: '400px', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{marginBottom: '20px', color: '#333'}}>Revenue by Customer</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.customerSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                {data.customerSplit && data.customerSplit.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, minWidth: '400px', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{marginBottom: '20px', color: '#333'}}>Recent Transactions</h3>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
             <thead>
                 <tr style={{background: '#f9f9f9', textAlign: 'left'}}>
                     <th style={{padding: '10px', borderBottom: '2px solid #ddd'}}>ID</th>
                     <th style={{padding: '10px', borderBottom: '2px solid #ddd'}}>Customer</th>
                     <th style={{padding: '10px', borderBottom: '2px solid #ddd'}}>Total</th>
                     <th style={{padding: '10px', borderBottom: '2px solid #ddd'}}>Time</th>
                 </tr>
             </thead>
             <tbody>
                 {data.recentOrders && data.recentOrders.map(o => (
                     <tr key={o.id}>
                         <td style={{padding: '10px', borderBottom: '1px solid #ddd'}}>#{o.id}</td>
                         <td style={{padding: '10px', borderBottom: '1px solid #ddd'}}>{o.customer_name || 'Walk-in'}</td>
                         <td style={{padding: '10px', borderBottom: '1px solid #ddd'}}>₹{o.total}</td>
                         <td style={{padding: '10px', borderBottom: '1px solid #ddd'}}>{new Date(o.created_at).toLocaleString()}</td>
                     </tr>
                 ))}
                 {(!data.recentOrders || data.recentOrders.length === 0) && <tr><td colSpan="4" style={{padding: '10px'}}>No recent orders.</td></tr>}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default AnalyticsDashboard;
