import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { FileText, Clock, Sun, ShieldCheck } from 'lucide-react';
import { StatCard } from '../components/Dashboard';

export default function Applications() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_applications_data');
      socket.on('response_applications_data', (resData) => {
        setData(resData);
        setLoading(false);
      });
    }
    return () => {
      if (socket) socket.off('response_applications_data');
    };
  }, [socket, connected]);

  if (loading) return <div>Loading applications...</div>;

  const { stats, applications } = data || {};

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Applications</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Applications</h1>
          <p>Process and track all citizen service applications</p>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button className="date-picker-btn">Export Report</button>
          <button className="action-btn">+ New Application</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(5, 1fr)'}}>
        <StatCard 
          icon={<FileText color="#6b7280" />} iconBg="#f3f4f6"
          title="TOTAL APPLICATIONS" value={(stats?.totalApps || 0).toLocaleString()} 
          trend="All-time received" trendType="neutral" 
        />
        <StatCard 
          icon={<Sun color="#2563eb" />} iconBg="#eff6ff"
          title="TODAY's RECEIVED" value={(stats?.todayApps || 0).toLocaleString()} 
          trend="+8.3% vs yesterday" trendType="up" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="PENDING REVIEW" value={(stats?.pending || 0).toLocaleString()} 
          trend="Awaiting VLE check" trendType="neutral" 
        />
        <StatCard 
          icon={<Sun color="#06b6d4" />} iconBg="#cffafe"
          title="IN PROCESSING" value={(stats?.processing || 0).toLocaleString()} 
          trend="Sent to department" trendType="neutral" 
        />
        <StatCard 
          icon={<ShieldCheck color="#10b981" />} iconBg="#d1fae5"
          title="COMPLETED TODAY" value={(stats?.completed || 0).toLocaleString()} 
          trend="68.6% completion rate" trendType="up" 
        />
      </div>

      <div className="table-card" style={{marginTop: 24, padding: 24}}>
        <h3 style={{marginBottom: 16}}>Live Application Pipeline</h3>
        <div style={{display: 'flex', gap: 32, marginBottom: 32}}>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, color: '#6b7280'}}>Submitted</div>
            <div style={{fontSize: 24, fontWeight: 700}}>{stats?.totalApps || 0} <span style={{fontSize: 12, color: '#6b7280', fontWeight: 500}}>Total Active</span></div>
            <div style={{height: 4, background: '#e5e7eb', marginTop: 8, borderRadius: 2}}></div>
          </div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, color: '#f59e0b', fontWeight: 600}}>Under Review</div>
            <div style={{fontSize: 24, fontWeight: 700}}>{stats?.pending || 0} <span style={{fontSize: 12, color: '#f59e0b', fontWeight: 500}}>Needs VLE</span></div>
            <div style={{height: 4, background: '#f59e0b', marginTop: 8, borderRadius: 2}}></div>
          </div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, color: '#2563eb', fontWeight: 600}}>Processing</div>
            <div style={{fontSize: 24, fontWeight: 700}}>{stats?.processing || 0} <span style={{fontSize: 12, color: '#2563eb', fontWeight: 500}}>At Dept</span></div>
            <div style={{height: 4, background: '#2563eb', marginTop: 8, borderRadius: 2}}></div>
          </div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, color: '#10b981', fontWeight: 600}}>Completed</div>
            <div style={{fontSize: 24, fontWeight: 700}}>{stats?.completed || 0} <span style={{fontSize: 12, color: '#10b981', fontWeight: 500}}>Ready / Archived</span></div>
            <div style={{height: 4, background: '#10b981', marginTop: 8, borderRadius: 2}}></div>
          </div>
        </div>

        <div style={{display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap'}}>
          {['All', 'Aadhaar', 'PAN Card', 'Certificates', 'Banking', 'Insurance', 'Utility', 'Other'].map(type => (
            <button key={type} onClick={() => setFilterType(type)} className={filterType === type ? "action-btn" : "date-picker-btn"} style={{padding: '6px 16px', borderRadius: 20, border: filterType === type ? 'none' : '1px solid #e5e7eb'}}>{type}</button>
          ))}
        </div>
        
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
          <div className="search-bar" style={{width: 300, padding: '6px 12px'}}>
            <input type="text" placeholder="Search table..." />
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="date-picker-btn" style={{padding: '6px 12px', outline: 'none'}}>
              <option value="All">Status: All</option>
              <option value="In Review">Status: In Review</option>
              <option value="Pending">Status: Pending</option>
              <option value="Processing">Status: Processing</option>
              <option value="Completed">Status: Completed</option>
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="date-picker-btn" style={{padding: '6px 12px', outline: 'none'}}>
              <option value="All">Priority: All</option>
              <option value="High">Priority: High</option>
              <option value="Medium">Priority: Medium</option>
              <option value="Low">Priority: Low</option>
            </select>
            <button className="date-picker-btn" style={{padding: '6px 12px'}}>Custom Date</button>
            <button className="date-picker-btn" style={{padding: '6px 12px'}}>Assigned: All</button>
          </div>
        </div>

        <table style={{marginBottom: 24}}>
          <thead>
            <tr>
              <th><input type="checkbox" /> APP ID</th>
              <th>CITIZEN</th>
              <th>SERVICE TYPE</th>
              <th>PRIORITY</th>
              <th>STATUS</th>
              <th>ASSIGNED</th>
              <th>SUBMITTED</th>
              <th>SLA</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {((applications || []) as any[]).filter(app => {
              if (filterType !== 'All' && !app.serviceType.includes(filterType)) return false;
              if (filterStatus !== 'All' && app.status !== filterStatus) return false;
              if (filterPriority !== 'All' && app.priority !== filterPriority) return false;
              return true;
            }).map((app: any, i: number) => (
              <tr key={i}>
                <td style={{fontWeight: 600, color: '#2563eb'}}><input type="checkbox" style={{marginRight: 8}}/> {app.id}</td>
                <td style={{fontWeight: 500}}>{app.citizen}</td>
                <td style={{color: '#6b7280'}}>{app.serviceType}</td>
                <td>
                  <span style={{display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 13}}>
                    <div style={{width: 8, height: 8, borderRadius: '50%', background: app.priority === 'High' ? '#ef4444' : app.priority === 'Medium' ? '#f59e0b' : '#6b7280'}}></div>
                    {app.priority}
                  </span>
                </td>
                <td>
                  <span className={`badge ${app.status.toLowerCase().replace(' ', '')}`}>
                    {app.status}
                  </span>
                </td>
                <td style={{color: '#6b7280'}}>{app.assigned}</td>
                <td style={{color: '#6b7280'}}>{app.submitted}</td>
                <td style={{fontWeight: 600, color: app.sla === 'Expired' ? '#ef4444' : '#10b981'}}>{app.sla}</td>
                <td style={{fontWeight: 600}}>₹{app.amount} <span style={{color: '#6b7280', cursor: 'pointer', float: 'right'}}>•••</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)'}}>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing 1-{(applications || []).length} of {stats?.todayApps || 0} applications today</div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <button className="date-picker-btn" style={{padding: '4px 8px', cursor: 'pointer'}}>&lt;</button>
            <button className="action-btn" style={{padding: '4px 12px', cursor: 'pointer'}}>1</button>
            <button className="date-picker-btn" style={{padding: '4px 8px', cursor: 'pointer'}}>&gt;</button>
            <span style={{fontSize: 13, color: '#6b7280', marginLeft: 16}}>Rows per page: </span>
            <button className="date-picker-btn" style={{padding: '4px 12px'}}>8</button>
          </div>
        </div>
      </div>
      
      {/* Ponytail: Removed the hardcoded '4 selected' bulk actions footer since bulk operations aren't requested yet */}
    </>
  );
}
