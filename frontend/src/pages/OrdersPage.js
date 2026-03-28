import React, { useState, useEffect } from 'react';
import axios from 'axios';

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/orders", { 
          headers: { Authorization: `Bearer ${token}` } 
      });
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch orders");
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const exportCSV = () => {
    if (orders.length === 0) return;
    const header = "Order ID,Date,Customer Name,Phone,Total Revenue,Status\n";
    const csvContent = orders.map(o => `${o.id},"${new Date(o.created_at).toLocaleString()}","${o.customer_name || 'Walk-in'}","${o.customer_phone || ''}",${o.total},${o.refund_status}`).join("\n");
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + header + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Orders_Export.csv");
    document.body.appendChild(link);
    link.click();
  };

  const processRefund = async (id) => {
      if(!window.confirm("WARNING: Are you sure you want to refund this order? This will RESTORE the inventory quantities and void the sale. This action is PERMANENT.")) return;
      try {
          const res = await axios.post(`http://localhost:5000/api/orders/${id}/refund`, {}, { headers: { Authorization: `Bearer ${token}` }});
          alert("✅ " + res.data.message);
          fetchOrders();
      } catch (err) {
          alert("❌ Refund Failed: " + (err.response?.data?.error || err.message));
      }
  };

  const printThermalReceipt = (order) => {
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      printWindow.document.write(`
          <html>
            <head>
              <title>Receipt #${order.id}</title>
              <style>
                @media print { margin: 0; padding: 0; }
                body { width: 80mm; font-family: 'Courier New', Courier, monospace; font-size: 14px; margin: 0 auto; color: black; background: white; padding: 10px; }
                h2 { text-align: center; border-bottom: 1px dashed black; padding-bottom: 5px; margin-bottom: 10px; }
                .line { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .total { font-size: 18px; font-weight: bold; border-top: 1px dashed black; padding-top: 10px; margin-top: 10px; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; }
              </style>
            </head>
            <body>
               <h2>SMILE RETAIL POS</h2>
               <p>Order ID: #${order.id}<br/>Date: ${new Date(order.created_at).toLocaleString()}</p>
               <p>Customer: ${order.customer_name || 'Walk-in'}</p>
               <div style="border-bottom: 1px dashed black; margin-bottom:10px;"></div>
               <div class="total line">
                  <span>TOTAL PAID:</span>
                  <span>Rs. ${order.total.toFixed(2)}</span>
               </div>
               <div class="footer">
                  <p>Thank you for your business!</p>
                  <p>*** ${order.refund_status === 'refunded' ? 'REFUNDED / VOID' : 'ORIGINAL COPY'} ***</p>
               </div>
            </body>
          </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ color: '#2c3e50', margin: 0 }}>Order History & Transactions</h2>
        <button onClick={exportCSV} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>📥 Export CSV Ledger</button>
      </div>

      {orders.length === 0 ? <p style={{color: '#333'}}>No orders found in the database.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <thead>
            <tr style={{ background: '#34495e', color: 'white' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>Txn Hash ID</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Consumer Details</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Timestamp</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Extracted Value</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid #eee', opacity: o.refund_status === 'refunded' ? 0.6 : 1 }}>
                <td style={{ padding: '15px', fontWeight: 'bold', color: '#333' }}>#{o.id}</td>
                <td style={{ padding: '15px', color: '#333' }}>{o.customer_name || 'Walk-in'} <br/><span style={{fontSize:'12px', color:'#7f8c8d'}}>{o.customer_phone || ''}</span></td>
                <td style={{ padding: '15px', color: '#7f8c8d' }}>{new Date(o.created_at).toLocaleString()}</td>
                <td style={{ padding: '15px', color: '#27ae60', fontWeight: 'bold', fontSize: '1.1rem' }}>₹ {o.total.toFixed(2)}</td>
                <td style={{ padding: '15px' }}>
                    {o.refund_status === 'refunded' 
                        ? <span style={{background:'#e74c3c', color:'white', padding:'4px 8px', borderRadius:'12px', fontSize:'12px'}}>REFUNDED</span> 
                        : <span style={{background:'#2ecc71', color:'white', padding:'4px 8px', borderRadius:'12px', fontSize:'12px'}}>CAPTURED</span>}
                </td>
                <td style={{ padding: '15px', display:'flex', gap:'10px' }}>
                   <button onClick={() => printThermalReceipt(o)} style={{background: '#3498db', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>🖨️ Receipt</button>
                   {role === 'admin' && o.refund_status !== 'refunded' && (
                       <button onClick={() => processRefund(o.id)} style={{background: '#e74c3c', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>🔄 Void / Refund</button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
export default OrdersPage;
