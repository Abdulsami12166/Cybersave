import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock, ArrowLeftRight } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { StatCard } from '../components/Dashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Analytics() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_analytics');
      socket.on('response_analytics', (resData) => setData(resData));
    }
    return () => {
      if (socket) socket.off('response_analytics');
    };
  }, [socket, connected]);

  if (!data) return <div>Connecting to live analytics...</div>;

  const { stats, trends, categories, statusDistribution, recentLogs } = data;

  const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const pieData = [
    { name: 'Verified', value: statusDistribution?.verified || 0 },
    { name: 'Pending', value: statusDistribution?.pending || 0 },
    { name: 'Expired', value: statusDistribution?.expired || 0 },
  ];

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Analytics</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Platform Analytics & Performance</h1>
          <p>Observe real-time system uploads, file verifications, category metrics, and team operations.</p>
        </div>
        <div style={{display: 'flex'}}>
          <button className="date-picker-btn">Export Report</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
        <StatCard 
          icon={<FileText color="#2563eb" />} iconBg="#eff6ff"
          title="TOTAL DOCUMENTS UPLOADED" value={(stats?.totalUploads || 0).toLocaleString()} 
          trend="+12% Across 6 categories" trendType="up" 
        />
        <StatCard 
          icon={<CheckCircle color="#10b981" />} iconBg="#d1fae5"
          title="VERIFIED" value={(stats?.verified || 0).toLocaleString()} 
          trend="+4.2% Secured & validated" trendType="up" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="PENDING REVIEW" value={(stats?.pendingReview || 0).toLocaleString()} 
          trend="-1.5% In manual queue" trendType="down" 
        />
        <StatCard 
          icon={<ArrowLeftRight color="#ef4444" />} iconBg="#fee2e2"
          title="EXPIRED DOCUMENTS" value={(stats?.expired || 0).toLocaleString()} 
          trend="Requires re-upload" trendType="neutral" 
        />
      </div>

      <div className="chart-card" style={{marginTop: 24}}>
        <div className="card-header" style={{marginBottom: 32}}>
          <div className="card-title">
            <h3 style={{fontSize: 16}}>Document Activity Trends</h3>
            <p>Daily uploads and verifications cycle over time</p>
          </div>
          <div style={{display: 'flex', gap: 16, fontSize: 12, fontWeight: 500}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}><div style={{width: 8, height: 8, borderRadius: '50%', background: '#2563eb'}}></div> Uploads</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}><div style={{width: 8, height: 8, borderRadius: '50%', background: '#10b981'}}></div> Verifications</div>
          </div>
        </div>
        <div style={{height: 250, width: '100%'}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
              <YAxis hide />
              <RechartsTooltip />
              <Line type="monotone" dataKey="uploads" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb'}} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="verifications" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24}}>
        <div className="chart-card">
          <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 24}}>Category Breakdown</h3>
          {(categories || []).map((c: any, i: number) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
              <div style={{width: 100, fontSize: 13, color: '#6b7280'}}>{c.name}</div>
              <div style={{flex: 1, height: 8, background: '#eff6ff', borderRadius: 4, margin: '0 16px', overflow: 'hidden'}}>
                <div style={{height: '100%', width: `${Math.min(100, (c.count / 80) * 100)}%`, background: '#2563eb', borderRadius: 4}}></div>
              </div>
              <div style={{fontWeight: 700, fontSize: 14}}>{c.count}</div>
            </div>
          ))}
        </div>

        <div className="chart-card">
          <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 24}}>Status Distribution</h3>
          <div style={{display: 'flex', justifyContent: 'center', position: 'relative', height: 200}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center'}}>
              <div style={{fontSize: 24, fontWeight: 700}}>{stats?.totalUploads}</div>
              <div style={{fontSize: 12, color: '#6b7280'}}>Total</div>
            </div>
          </div>
          <div style={{display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, fontSize: 12}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}><div style={{width: 8, height: 8, borderRadius: '50%', background: '#10b981'}}></div> Verified</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}><div style={{width: 8, height: 8, borderRadius: '50%', background: '#f59e0b'}}></div> Pending</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}><div style={{width: 8, height: 8, borderRadius: '50%', background: '#ef4444'}}></div> Expired</div>
          </div>
        </div>
      </div>

      <div className="table-card" style={{marginTop: 24, padding: 24}}>
        <div className="card-header" style={{marginBottom: 24}}>
          <div className="card-title">
            <h3 style={{fontSize: 16}}>Recent Activity Log</h3>
          </div>
          <button className="date-picker-btn">View Audit Trail</button>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{textTransform: 'uppercase'}}>Document ID</th>
              <th style={{textTransform: 'uppercase'}}>Name</th>
              <th style={{textTransform: 'uppercase'}}>Category</th>
              <th style={{textTransform: 'uppercase'}}>User</th>
              <th style={{textTransform: 'uppercase'}}>Uploaded</th>
              <th style={{textTransform: 'uppercase'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(recentLogs || []).map((log: any, i: number) => (
              <tr key={i}>
                <td style={{color: '#6b7280'}}>{log.id}</td>
                <td style={{fontWeight: 700}}>{log.name}</td>
                <td style={{color: '#6b7280'}}>{log.category}</td>
                <td style={{color: '#6b7280'}}>{log.user}</td>
                <td style={{color: '#6b7280'}}>{log.uploaded}</td>
                <td>
                  <span className={`badge ${log.status.toLowerCase().replace(' ', '')}`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
