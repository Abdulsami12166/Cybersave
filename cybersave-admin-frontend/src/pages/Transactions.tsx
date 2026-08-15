import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { ArrowLeftRight, CreditCard, DollarSign } from 'lucide-react';
import { StatCard } from '../components/Dashboard';

export default function Transactions() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_transactions_data');
      socket.on('response_transactions_data', (resData) => {
        setData(resData);
        setLoading(false);
      });
    }
    return () => {
      if (socket) socket.off('response_transactions_data');
    };
  }, [socket, connected]);

  if (loading) return <div>Loading transactions...</div>;

  const { transactions, stats } = data || {};

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Transactions</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Financial Transactions</h1>
          <p>Monitor all service payments and application fees across the platform</p>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button className="date-picker-btn">Export CSV</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
        <StatCard 
          icon={<DollarSign color="#10b981" />} iconBg="#d1fae5"
          title="Total Processed" value={`₹${(stats?.totalAmount || 0).toLocaleString()}`} 
          trend="Platform lifetime" trendType="neutral" 
        />
        <StatCard 
          icon={<ArrowLeftRight color="#2563eb" />} iconBg="#eff6ff"
          title="Total Transactions" value={(stats?.totalCount || 0).toLocaleString()} 
          trend="Successful payments" trendType="neutral" 
        />
        <StatCard 
          icon={<CreditCard color="#f59e0b" />} iconBg="#fef3c7"
          title="Avg. Transaction" value={`₹${stats?.totalCount ? Math.round(stats.totalAmount / stats.totalCount) : 0}`} 
          trend="Per application" trendType="neutral" 
        />
      </div>

      <div className="table-card" style={{marginTop: 24, padding: 0}}>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border-color)'}}>
          <div style={{display: 'flex', gap: 16}}>
            <button className="date-picker-btn" style={{borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)'}}>All Transactions</button>
            <button className="date-picker-btn" style={{border: 'none'}}>Successful</button>
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <button className="date-picker-btn">Filter: All Time</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>TXN ID</th>
              <th>DATE & TIME</th>
              <th>CUSTOMER</th>
              <th>SERVICE</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {(transactions || []).map((txn: any, i: number) => (
              <tr key={i}>
                <td style={{fontWeight: 600, color: '#2563eb'}}>{txn.id}</td>
                <td style={{color: '#6b7280'}}>{new Date(txn.date).toLocaleString()}</td>
                <td style={{fontWeight: 500}}>{txn.customer}</td>
                <td style={{color: '#6b7280'}}>{txn.service}</td>
                <td style={{fontWeight: 600}}>₹{txn.amount}</td>
                <td>
                  <span className="badge completed">SUCCESS</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)'}}>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing {(transactions || []).length} transactions</div>
        </div>
      </div>
    </>
  );
}
