import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { UserCheck, ShieldCheck, Clock, UserX } from 'lucide-react';
import { StatCard } from '../components/Dashboard';

export default function Operators() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [managingOp, setManagingOp] = useState<any>(null);
  const [opPermissions, setOpPermissions] = useState<string[]>([]);
  
  const FEATURES = ['DASHBOARD', 'APPLICATIONS', 'OPERATORS', 'SETTINGS', 'USERS', 'REPORTS'];

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_operators_data');
      socket.on('response_operators_data', (resData) => {
        setData(resData);
        setLoading(false);
      });
      socket.on('update_operator_access_success', () => {
        setManagingOp(null);
      });
    }
    return () => {
      if (socket) {
        socket.off('response_operators_data');
        socket.off('update_operator_access_success');
        socket.off('add_new_operator_success');
      }
    };
  }, [socket, connected]);

  const handleAddOperator = () => {
    // Ponytail: minimal working input without complex form libraries
    const name = window.prompt("Enter new operator's full name:");
    if (!name) return;
    const email = window.prompt("Enter new operator's email address:");
    if (!email) return;
    
    if (socket) {
      socket.emit('add_new_operator', { name, email });
    }
  };

  const handleSaveAccess = () => {
    if (socket && managingOp) {
      socket.emit('update_operator_access', { id: managingOp.id, permissions: opPermissions });
    }
  };

  const togglePermission = (feat: string) => {
    if (opPermissions.includes(feat)) {
      setOpPermissions(opPermissions.filter(p => p !== feat));
    } else {
      setOpPermissions([...opPermissions, feat]);
    }
  };

  if (loading) return <div>Loading operators...</div>;

  const { stats, operators } = data || {};

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Operators</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Operator Management Center</h1>
          <p>Manage, monitor and track all platform operators and their access levels.</p>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button className="date-picker-btn">Export Report</button>
          <button className="action-btn" onClick={handleAddOperator}>+ Add New Operator</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
        <StatCard 
          icon={<ShieldCheck color="#2563eb" />} iconBg="#eff6ff"
          title="TOTAL OPERATORS" value={(stats?.totalOps || 0).toLocaleString()} 
          trend="Active across portal" trendType="neutral" 
        />
        <StatCard 
          icon={<UserCheck color="#10b981" />} iconBg="#d1fae5"
          title="ACTIVE" value={(stats?.active || 0).toLocaleString()} 
          trend="Secured & validated" trendType="neutral" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="PENDING APPROVAL" value={(stats?.pending || 0).toLocaleString()} 
          trend="Awaiting validation" trendType="neutral" 
        />
        <StatCard 
          icon={<UserX color="#ef4444" />} iconBg="#fee2e2"
          title="SUSPENDED" value={(stats?.suspended || 0).toLocaleString()} 
          trend="Access revoked" trendType="neutral" 
        />
      </div>

      <div className="table-card" style={{marginTop: 24, background: 'transparent', boxShadow: 'none', padding: 0}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
          <div className="search-bar" style={{width: 300, padding: '8px 12px'}}>
            <input type="text" placeholder="Filter operators..." />
          </div>
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <div style={{fontSize: 13, fontWeight: 500}}>Department: <select style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent'}}><option>All Departments</option></select></div>
            <div style={{fontSize: 13, fontWeight: 500}}>Status: <select style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent'}}><option>All Statuses</option></select></div>
            <div style={{fontSize: 13, color: '#6b7280', marginLeft: 16}}>Showing 1-9 of {stats?.totalOps}</div>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24}}>
          {(operators || []).map((op: any, i: number) => (
            <div key={i} style={{background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24}}>
                <div style={{display: 'flex', gap: 12}}>
                  <img src={`https://i.pravatar.cc/150?img=${i+10}`} alt={op.name} style={{width: 48, height: 48, borderRadius: '50%', objectFit: 'cover'}} />
                  <div>
                    <h3 style={{fontSize: 16, fontWeight: 700, color: '#111827'}}>{op.name}</h3>
                    <p style={{fontSize: 13, color: '#6b7280'}}>{op.role}</p>
                  </div>
                </div>
                <span className={`badge ${op.status === 'Active' ? 'completed' : op.status === 'Pending' ? 'pending' : 'rejected'}`}>{op.status}</span>
              </div>
              
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12}}>
                <span style={{color: '#6b7280'}}>Department</span>
                <span style={{fontWeight: 600}}>{op.department}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12}}>
                <span style={{color: '#6b7280'}}>Joined Date</span>
                <span style={{fontWeight: 600}}>{op.joinedDate}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 24}}>
                <span style={{color: '#6b7280'}}>Last Active</span>
                <span style={{fontWeight: 600}}>{op.lastActive}</span>
              </div>

              <div style={{display: 'flex', gap: 12, marginTop: 'auto'}}>
                <button className="date-picker-btn" style={{flex: 1, justifyContent: 'center'}}>View Profile</button>
                <button 
                  className="action-btn" 
                  style={{flex: 1, justifyContent: 'center'}}
                  onClick={() => { setManagingOp(op); setOpPermissions(op.permissions || []); }}
                >
                  Manage Access
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Ponytail: Simple inline modal for managing access */}
        {managingOp && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
            <div style={{background: 'white', padding: 32, borderRadius: 12, width: 400}}>
              <h3 style={{marginBottom: 8, fontSize: 18}}>Manage Access</h3>
              <p style={{marginBottom: 24, fontSize: 14, color: '#6b7280'}}>Editing permissions for {managingOp.name}</p>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24}}>
                {FEATURES.map(feat => (
                  <label key={feat} style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 14}}>
                    <input 
                      type="checkbox" 
                      checked={opPermissions.includes(feat)} 
                      onChange={() => togglePermission(feat)}
                      style={{width: 16, height: 16}}
                    />
                    {feat}
                  </label>
                ))}
              </div>

              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
                <button className="date-picker-btn" onClick={() => setManagingOp(null)}>Cancel</button>
                <button className="action-btn" onClick={handleSaveAccess}>Save Access</button>
              </div>
            </div>
          </div>
        )}

        <div style={{padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing {operators?.length} active operators</div>
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
