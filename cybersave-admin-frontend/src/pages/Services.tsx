import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Grid, CheckCircle, Clock, FileText } from 'lucide-react';
import { StatCard } from '../components/Dashboard';

export default function Services() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_services_data');
      socket.on('response_services_data', (resData) => {
        setData(resData);
        setLoading(false);
      });
    }
    return () => {
      if (socket) socket.off('response_services_data');
    };
  }, [socket, connected]);

  if (loading) return <div>Loading services...</div>;

  const { stats, services } = data || {};

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Services</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Government Services Directory</h1>
          <p>Configure and deploy workflows, processing rules, and document requirements for citizen portals.</p>
        </div>
        <div style={{display: 'flex'}}>
          <button className="action-btn">Add New Service</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
        <StatCard 
          icon={<Grid color="#2563eb" />} iconBg="#eff6ff"
          title="TOTAL SERVICES" value={(stats?.totalServices || 0).toLocaleString()} 
          trend="Across 8 departments" trendType="neutral" 
        />
        <StatCard 
          icon={<CheckCircle color="#10b981" />} iconBg="#d1fae5"
          title="ACTIVE SERVICES" value={(stats?.activeServices || 0).toLocaleString()} 
          trend="Operational online" trendType="neutral" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="UNDER MAINTENANCE" value={(stats?.underMaintenance || 0).toLocaleString()} 
          trend="Temporary system hold" trendType="neutral" 
        />
        <StatCard 
          icon={<Grid color="#2563eb" />} iconBg="#eff6ff"
          title="TOTAL REQUESTS YTD" value={(stats?.totalRequests || 0).toLocaleString()} 
          trend="SLA compliance rate 98.4%" trendType="neutral" 
        />
      </div>

      <div className="table-card" style={{marginTop: 24, padding: '24px 32px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center'}}>
          <div style={{display: 'flex', gap: 16}}>
            <div className="search-bar" style={{width: 250, padding: '8px 12px', background: '#f9fafb'}}>
              <input type="text" placeholder="Filter categories..." style={{background: 'transparent'}}/>
            </div>
            <button className="date-picker-btn" style={{background: '#f3f4f6', border: 'none', fontWeight: 600}}>All Services Mode</button>
          </div>
          <div style={{color: '#6b7280', fontSize: 13}}>6 Main Categories Configured</div>
        </div>

        {/* Category Accordion */}
        {(services || []).map((category: any, i: number) => (
          <div key={i} style={{border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 16, overflow: 'hidden'}}>
            <div style={{padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: i === 0 ? '#eff6ff' : 'white'}}>
              <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
                <div style={{width: 40, height: 40, borderRadius: 8, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb', color: '#2563eb'}}>
                  <Grid size={20} />
                </div>
                <div>
                  <h3 style={{fontSize: 16, fontWeight: 700, color: '#111827'}}>{category.category}</h3>
                  <p style={{fontSize: 13, color: '#6b7280'}}>{category.department}</p>
                </div>
              </div>
              <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
                <span style={{color: '#2563eb', fontSize: 13, fontWeight: 500}}>{category.subServices.length} Sub-services</span>
                <span className="badge completed" style={{background: '#d1fae5', color: '#10b981'}}>Active</span>
                <span style={{color: '#6b7280'}}>^</span>
              </div>
            </div>

            {/* Sub-services table */}
            {i === 0 && (
              <table style={{width: '100%'}}>
                <thead style={{background: '#f9fafb'}}>
                  <tr>
                    <th style={{padding: '12px 24px', color: '#6b7280'}}>SUB-SERVICE NAME</th>
                    <th style={{color: '#6b7280'}}>CATEGORY</th>
                    <th style={{color: '#6b7280'}}>SLA</th>
                    <th style={{color: '#6b7280'}}>GOVT FEE</th>
                    <th style={{color: '#6b7280'}}>STATUS</th>
                    <th style={{textAlign: 'right', paddingRight: 24, color: '#6b7280'}}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {category.subServices.map((sub: any, j: number) => (
                    <tr key={j}>
                      <td style={{padding: '16px 24px', fontWeight: 600}}>{sub.name}</td>
                      <td><span style={{background: '#f3f4f6', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500}}>{sub.category}</span></td>
                      <td style={{color: '#6b7280'}}>{sub.sla}</td>
                      <td style={{fontWeight: 700}}>₹{sub.fee}</td>
                      <td>
                        <span className={`badge ${sub.status === 'Active' ? 'completed' : 'rejected'}`}>{sub.status}</span>
                      </td>
                      <td style={{textAlign: 'right', paddingRight: 24}}>
                        <button className="date-picker-btn" style={{padding: '4px 12px', marginRight: 8}}>Edit</button>
                        <button className="action-btn" style={{padding: '4px 12px'}}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
        
        {/* Mocking other categories to match UI */}
        <div style={{border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 16, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            <div style={{width: 40, height: 40, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b'}}><FileText size={20} /></div>
            <div>
              <h3 style={{fontSize: 16, fontWeight: 700, color: '#111827'}}>PAN Card Services</h3>
              <p style={{fontSize: 13, color: '#6b7280'}}>Income Tax Department</p>
            </div>
          </div>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            <span style={{color: '#6b7280', fontSize: 13, fontWeight: 500}}>3 Sub-services</span>
            <span className="badge completed">Active</span>
            <span style={{color: '#6b7280'}}>v</span>
          </div>
        </div>

        <div style={{border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 16, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            <div style={{width: 40, height: 40, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb'}}><Grid size={20} /></div>
            <div>
              <h3 style={{fontSize: 16, fontWeight: 700, color: '#111827'}}>Passport Services</h3>
              <p style={{fontSize: 13, color: '#6b7280'}}>Ministry of External Affairs</p>
            </div>
          </div>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            <span style={{color: '#6b7280', fontSize: 13, fontWeight: 500}}>4 Sub-services</span>
            <span className="badge completed">Active</span>
            <span style={{color: '#6b7280'}}>v</span>
          </div>
        </div>
        
        <div style={{padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16}}>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing 1-5 active categories with {stats?.totalServices} services</div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <button className="date-picker-btn">Previous</button>
            <button className="action-btn" style={{padding: '4px 12px'}}>1</button>
            <button className="date-picker-btn">2</button>
            <button className="date-picker-btn">Next</button>
          </div>
        </div>
      </div>
    </>
  );
}
