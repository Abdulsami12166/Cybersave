import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  ArrowLeftRight, Bell, HelpCircle, BarChart3, ShieldCheck, 
  TrendingUp, TrendingDown, Clock, MapPin, FileText
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

export default function Dashboard() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_dashboard_data');
      socket.on('response_dashboard_data', (resData) => {
        setData(resData);
        setLoading(false);
      });
    }
    return () => {
      if (socket) socket.off('response_dashboard_data');
    };
  }, [socket, connected]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%' }}>Loading...</div>;
  }

  const { stats, collections, serviceShare, operatorLogs, recentApps, charts } = data || {};

  return (
    <>
      <div className="dashboard-title-row">
          <div className="dashboard-title">
            <h1>Good Morning, Rajesh</h1>
            <p>Here's your operational overview for today</p>
          </div>
          <button className="date-picker-btn">
            <Calendar size={18} /> Monday, 3 August 2026
          </button>
        </div>

        <div className="stats-grid">
          <StatCard 
            icon={<TrendingUp color="#10b981" />} 
            iconBg="#d1fae5"
            title="Revenue Today" 
            value={`₹${(stats?.revenueToday || 0).toLocaleString('en-IN')}`} 
            trend="+12.5%" 
            trendType="up" 
          />
          <StatCard 
            icon={<FileText color="#2563eb" />} 
            iconBg="#eff6ff"
            title="Applications Today" 
            value={(stats?.appsToday || 0).toLocaleString('en-IN')}
            trend="Normal" 
            trendType="neutral" 
          />
          <StatCard 
            icon={<Clock color="#f59e0b" />} 
            iconBg="#fef3c7"
            title="Pending Applications" 
            value={(stats?.pendingApps || 0).toLocaleString('en-IN')}
            trend="High load" 
            trendType="neutral" 
          />
          <StatCard 
            icon={<ShieldCheck color="#10b981" />} 
            iconBg="#d1fae5"
            title="Completed Today" 
            value={(stats?.completedAppsToday || 0).toLocaleString('en-IN')}
            trend="94% rate" 
            trendType="up" 
          />
          <StatCard 
            icon={<TrendingDown color="#ef4444" />} 
            iconBg="#fee2e2"
            title="Rejected Today" 
            value={(stats?.rejectedAppsToday || 0).toLocaleString('en-IN')}
            trend="Manual review" 
            trendType="down" 
          />
          <StatCard 
            icon={<MapPin color="#3b82f6" />} 
            iconBg="#eff6ff"
            title="Active Centres" 
            value={(stats?.activeCentres || 0).toLocaleString('en-IN')}
            trend="Live now" 
            trendType="up" 
          />
        </div>

        <div className="charts-row">
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">
                <h3>Revenue Overview</h3>
                <p>7-day digital service transactions</p>
              </div>
              <div style={{fontSize: '12px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px'}}>7 Days</div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts?.revenueOverview || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">
                <h3>Application Trends</h3>
                <p>Daily status of citizen certificates & updates</p>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.applicationTrends || []} barSize={8}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                  <RechartsTooltip />
                  <Bar dataKey="completed" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="pending" fill="#f59e0b" radius={[4,4,0,0]} />
                  <Bar dataKey="rejected" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="secondary-row">
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title"><h3>Service Share</h3></div>
            </div>
            <div className="service-share-content">
              <div className="donut-chart">
                100%
              </div>
              <div className="share-legend">
                {(serviceShare || []).map((s: any, i: number) => (
                  <div className="legend-item" key={i}>
                    <div className="legend-label">
                      <div className="dot" style={{background: i===0 ? '#2563eb' : i===1 ? '#10b981' : i===2 ? '#f59e0b' : '#6b7280'}}></div>
                      {s.name}
                    </div>
                    <div>{s.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="card-header">
              <div className="card-title"><h3>Collections Summary</h3></div>
            </div>
            <p style={{fontSize: '13px', color: '#6b7280'}}>Total Collections Today</p>
            <div className="collections-value">₹{(collections?.totalCollections || 0).toLocaleString('en-IN')}</div>
            <div className="collection-bar-row">
              <span>Online Payments (66%)</span>
              <span style={{fontWeight: 600, color: '#111827'}}>₹{(collections?.onlinePayments || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="collection-bar-row">
              <span>Cash Collections (34%)</span>
              <span style={{fontWeight: 600, color: '#111827'}}>₹{(collections?.cashCollections || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="collection-bar">
              <div className="bar-online"></div>
              <div className="bar-cash"></div>
            </div>
          </div>

          <div className="chart-card">
            <div className="card-header">
              <div className="card-title"><h3>Operator Logs</h3></div>
            </div>
            <div>
              {(operatorLogs || []).map((log: any, i: number) => (
                <div className="log-item" key={i}>
                  <div className="log-icon"><ShieldCheck size={16} /></div>
                  <div className="log-content">
                    <h4>{log.title}</h4>
                    <p>{log.description}</p>
                  </div>
                  <div className="log-time">Now</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="card-header" style={{marginBottom: '16px'}}>
            <div className="card-title">
              <h3>Recent Service Applications</h3>
              <p>Real-time incoming government & financial services requests</p>
            </div>
            <a href="#" style={{color: '#2563eb', fontSize: '14px', textDecoration: 'none', fontWeight: 600}}>View All →</a>
          </div>
          <table>
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Citizen Name</th>
                <th>Service</th>
                <th>Status</th>
                <th>Fee Amount</th>
                <th>Date Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(recentApps || []).map((app: any, i: number) => (
                <tr key={i}>
                  <td style={{fontWeight: 600}}>{app.id}</td>
                  <td>{app.citizenName}</td>
                  <td style={{color: '#6b7280'}}>{app.service}</td>
                  <td>
                    <span className={`badge ${app.status.toLowerCase().replace(' ', '')}`}>
                      {app.status}
                    </span>
                  </td>
                  <td style={{fontWeight: 600}}>₹{app.feeAmount}</td>
                  <td style={{color: '#6b7280'}}>{new Date(app.dateSubmitted).toLocaleString()}</td>
                  <td style={{color: '#6b7280', cursor: 'pointer'}}>•••</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </>
  );
}

export function StatCard({icon, iconBg, title, value, trend, trendType}: any) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{background: iconBg}}>{icon}</div>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-trend trend-${trendType}`}>
        {trendType === 'up' && '↑ '}
        {trendType === 'down' && '↓ '}
        {trend}
      </div>
    </div>
  );
}
