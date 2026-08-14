import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock, ArrowLeftRight } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { StatCard } from '../components/Dashboard';

export default function AuditLogs() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_audit_logs');
      socket.on('response_audit_logs', (resData) => setData(resData));
    }
    return () => {
      if (socket) socket.off('response_audit_logs');
    };
  }, [socket, connected]);

  if (!data) return <div>Connecting to live audit logs...</div>;

  const { stats, logs } = data;

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Audit Log</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>System Audit Log</h1>
          <p>Real-time security auditing, event compliance tracking, and administrative change monitor.</p>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
        <StatCard 
          icon={<FileText color="#2563eb" />} iconBg="#eff6ff"
          title="TOTAL EVENTS" value={(stats?.totalEvents || 0).toLocaleString()} 
          trend="Across all system layers" trendType="neutral" 
        />
        <StatCard 
          icon={<CheckCircle color="#10b981" />} iconBg="#d1fae5"
          title="LOGIN ACTIVITIES" value={(stats?.loginActivities || 0).toLocaleString()} 
          trend="User portals & APIs" trendType="neutral" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="DOCUMENT ACTIONS" value={(stats?.documentActions || 0).toLocaleString()} 
          trend="Downloads, uploads & edits" trendType="neutral" 
        />
        <StatCard 
          icon={<ArrowLeftRight color="#ef4444" />} iconBg="#fee2e2"
          title="SYSTEM CHANGES" value={(stats?.systemChanges || 0).toLocaleString()} 
          trend="Config & access rules" trendType="neutral" 
        />
      </div>

      <div className="table-card" style={{marginTop: 24, padding: 24}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            <div className="search-bar" style={{width: 250, padding: '8px 12px', background: '#f9fafb'}}>
              <input type="text" placeholder="Search logs..." style={{background: 'transparent'}}/>
            </div>
            <div style={{fontSize: 13, fontWeight: 500}}>Category: <select style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent'}}><option>All Events</option></select></div>
            <div style={{fontSize: 13, fontWeight: 500}}>User: <select style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent'}}><option>All Users</option></select></div>
            <div style={{fontSize: 13, fontWeight: 500}}>Date Range: <select style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent'}}><option>Last 24 Hours</option></select></div>
          </div>
          <button className="action-btn">Export Audit Log</button>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{textTransform: 'uppercase'}}>Timestamp</th>
              <th style={{textTransform: 'uppercase'}}>User</th>
              <th style={{textTransform: 'uppercase'}}>Action</th>
              <th style={{textTransform: 'uppercase'}}>Resource</th>
              <th style={{textTransform: 'uppercase'}}>IP Address</th>
              <th style={{textTransform: 'uppercase'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).map((log: any, i: number) => {
              let statusClass = 'completed';
              if (log.status === 'Failed') statusClass = 'rejected';
              if (log.status === 'Warning') statusClass = 'pending';
              return (
                <tr key={i}>
                  <td style={{color: '#6b7280'}}>{log.timestamp}</td>
                  <td style={{fontWeight: 700}}>{log.user}</td>
                  <td style={{color: '#6b7280'}}>{log.action}</td>
                  <td style={{color: '#6b7280'}}>{log.resource}</td>
                  <td style={{color: '#6b7280'}}>{log.ipAddress}</td>
                  <td>
                    <span className={`badge ${statusClass}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        <div style={{paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', marginTop: 24}}>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing 1-8 of {stats?.totalEvents} logged events</div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <button className="date-picker-btn">Previous</button>
            <button className="action-btn" style={{padding: '4px 12px'}}>1</button>
            <button className="date-picker-btn">2</button>
            <button className="date-picker-btn">3</button>
            <button className="date-picker-btn">Next</button>
          </div>
        </div>
      </div>
    </>
  );
}
