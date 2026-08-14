import React, { useEffect, useState } from 'react';
import { Bell, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { StatCard } from '../components/Dashboard';

export default function Notifications() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_notifications');
      socket.on('response_notifications', (resData) => setData(resData));
    }
    return () => {
      if (socket) socket.off('response_notifications');
    };
  }, [socket, connected]);

  if (!data) return <div>Connecting to live notifications...</div>;

  const { stats, notifications } = data;

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Notifications</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Notification Center</h1>
          <p>Monitor system activity, security alerts, driver updates, and real-time operations.</p>
        </div>
        <div style={{display: 'flex'}}>
          <button className="date-picker-btn">Preferences Settings</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
        <StatCard 
          icon={<Bell color="#6b7280" />} iconBg="#f3f4f6"
          title="ALL NOTIFICATIONS" value={(stats?.totalHistory || 0).toLocaleString()} 
          trend="Total history" trendType="neutral" 
        />
        <StatCard 
          icon={<AlertCircle color="#ef4444" />} iconBg="#fee2e2"
          title="UNREAD ALERTS" value={(stats?.unreadAlerts || 0).toLocaleString()} 
          trend="Action required" trendType="neutral" 
        />
        <StatCard 
          icon={<CheckCircle color="#10b981" />} iconBg="#d1fae5"
          title="SUCCESS LOGS" value={(stats?.successLogs || 0).toLocaleString()} 
          trend="System verified" trendType="neutral" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="PENDING CHECKS" value={(stats?.pendingChecks || 0).toLocaleString()} 
          trend="Awaiting system sync" trendType="neutral" 
        />
      </div>

      <div className="table-card" style={{marginTop: 24, padding: 24, background: 'transparent', boxShadow: 'none'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24, padding: '16px 24px', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb'}}>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            <div className="search-bar" style={{width: 250, padding: '4px 8px', border: 'none', borderRight: '1px solid #e5e7eb', borderRadius: 0}}>
              <input type="text" placeholder="Filter alerts or category..." />
            </div>
            <div style={{fontSize: 13, fontWeight: 500}}>Category: <select style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent'}}><option>All Categories</option></select></div>
            <div style={{fontSize: 13, fontWeight: 500}}>Priority: <select style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent'}}><option>All Priorities</option></select></div>
          </div>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing 1-8 of {stats?.totalHistory}</div>
        </div>

        {(notifications || []).map((notif: any, i: number) => {
          let Icon = Info;
          let color = '#2563eb';
          let bg = '#eff6ff';
          if (notif.type === 'SECURITY') { Icon = AlertCircle; color = '#ef4444'; bg = '#fee2e2'; }
          if (notif.type === 'WARNING') { Icon = AlertTriangle; color = '#f59e0b'; bg = '#fef3c7'; }
          if (notif.type === 'SUCCESS') { Icon = CheckCircle; color = '#10b981'; bg = '#d1fae5'; }

          return (
            <div key={i} style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 24}}>
              <div style={{width: 8, height: 8, borderRadius: '50%', background: notif.status === 'PENDING' ? '#2563eb' : 'transparent'}}></div>
              <div style={{width: 40, height: 40, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color}}>
                <Icon size={20} />
              </div>
              <div style={{flex: 1}}>
                <div style={{fontSize: 11, color: '#6b7280', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4}}>NTF-2024-{81-i} • <span style={{color}}>{notif.type}</span></div>
                <h4 style={{fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4}}>{notif.title}</h4>
                <p style={{fontSize: 13, color: '#6b7280'}}>{notif.message}</p>
              </div>
              <div style={{color: '#6b7280', fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap'}}>
                {notif.time}
              </div>
              <div style={{display: 'flex', gap: 8}}>
                <button className="date-picker-btn" style={{padding: '6px 16px'}}>View</button>
                <button className="date-picker-btn" style={{padding: '6px 12px'}}>✓</button>
              </div>
            </div>
          );
        })}
        
        <div style={{padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb'}}>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing 8 active alerts</div>
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

// Fallback
const Clock = ({color}:any) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
