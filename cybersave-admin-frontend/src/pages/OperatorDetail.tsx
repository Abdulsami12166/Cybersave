import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Grid, ShieldCheck, CheckCircle, Clock } from 'lucide-react';

export default function OperatorDetail() {
  const { id } = useParams();
  const { socket, connected } = useSocket();
  const [operator, setOperator] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_operator_detail', { id });
      socket.on('response_operator_detail', (data) => setOperator(data));
    }
    return () => {
      if (socket) socket.off('response_operator_detail');
    };
  }, [socket, connected, id]);

  if (!operator) return <div style={{padding: 24}}>Loading Operator Data...</div>;

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 24}}>
        <Link to="/" style={{color: 'inherit', textDecoration: 'none'}}>Dashboard</Link> &rarr; <Link to="/operators" style={{color: 'inherit', textDecoration: 'none'}}>Operators</Link> &rarr; <span style={{color: '#2563eb'}}>Operator Profile</span>
      </div>

      <div className="table-card" style={{padding: '24px 32px', marginBottom: 24}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <img src="https://i.pravatar.cc/150?img=11" alt="Op" style={{width: 64, height: 64, borderRadius: '50%'}} />
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4}}>
                <h1 style={{fontSize: 24, fontWeight: 700, color: '#111827', margin: 0}}>{operator.name}</h1>
                <span style={{background: '#d1fae5', color: '#10b981', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>Active</span>
              </div>
              <div style={{fontSize: 13, color: '#6b7280'}}>
                Senior Field Operator • <span style={{color: '#2563eb', fontWeight: 600}}>Operations</span>
              </div>
              <div style={{fontSize: 12, color: '#9ca3af', marginTop: 4}}>
                Employee ID: OPS-2024-884 • Joined: 12/01/2024
              </div>
            </div>
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <button className="action-btn">Edit Profile</button>
            <button className="date-picker-btn">Reset Password</button>
            <button className="date-picker-btn" style={{color: '#ef4444', borderColor: '#fee2e2'}}>Suspend Account</button>
          </div>
        </div>

        <div style={{display: 'flex', gap: 16, borderBottom: '1px solid #e5e7eb'}}>
          {['Overview', 'Activity Log', 'Permissions', 'Documents'].map(tab => (
            <div 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px', 
                cursor: 'pointer',
                borderRadius: '24px',
                background: activeTab === tab ? '#2563eb' : 'transparent',
                color: activeTab === tab ? 'white' : '#6b7280', 
                fontWeight: activeTab === tab ? 700 : 500, 
                fontSize: 13, 
                marginBottom: 12,
                border: activeTab === tab ? 'none' : '1px solid #e5e7eb'
              }}
            >
              {tab}
            </div>
          ))}
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24}}>
        {activeTab === 'Overview' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
            <div className="table-card" style={{padding: 24}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
                <h3 style={{fontSize: 16, fontWeight: 700}}>Personal Information</h3>
                <span style={{color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer'}}>Verify Identity</span>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4}}>Full Name</div>
                  <div style={{fontWeight: 600}}>{operator.name}</div>
                </div>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4}}>Date of Birth</div>
                  <div style={{fontWeight: 600}}>15/08/1988</div>
                </div>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4}}>Email Address</div>
                  <div style={{fontWeight: 600}}>{operator.name.toLowerCase().replace(' ', '.')}@cybersave.gov.in</div>
                </div>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4}}>Residential Address</div>
                  <div style={{fontWeight: 600}}>45, Sector 4, HSR Layout, Bengaluru, Karnataka - 560102</div>
                </div>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4}}>Phone Number</div>
                  <div style={{fontWeight: 600}}>+91 98765 43210</div>
                </div>
              </div>
            </div>

            <div className="table-card" style={{padding: 24}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
                <h3 style={{fontSize: 16, fontWeight: 700}}>Access & Security Settings</h3>
                <span style={{color: '#9ca3af', fontSize: 12}}>Security Policy V2.1</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e5e7eb'}}>
                <div>
                  <div style={{fontWeight: 700, fontSize: 14, marginBottom: 4}}>Two-Factor Authentication (2FA)</div>
                  <div style={{fontSize: 12, color: '#6b7280'}}>Requires a secure mobile authenticator code upon signing in.</div>
                </div>
                <div style={{width: 44, height: 24, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                  <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24}}>
                <div>
                  <div style={{fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4}}>Last Login Date/Time</div>
                  <div style={{fontWeight: 600, fontSize: 13}}>28/01/2026, 09:12 AM</div>
                </div>
                <div>
                  <div style={{fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4}}>Active Sessions</div>
                  <div style={{fontWeight: 600, fontSize: 13}}>2 open sessions (Bengaluru / Chrome)</div>
                </div>
                <div>
                  <div style={{fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4}}>IP Whitelisting</div>
                  <div style={{fontWeight: 600, fontSize: 13, color: '#10b981'}}>Enabled (Corporate Subnet)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Permissions' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
            <div className="table-card" style={{padding: 24}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e5e7eb'}}>
                <h3 style={{fontSize: 18, fontWeight: 700}}>Permissions & Security Level</h3>
                <span style={{background: '#2563eb', color: 'white', padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 700}}>Internal Tier-2</span>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32}}>
                <div>
                  <div style={{fontSize: 11, color: '#9ca3af', marginBottom: 4}}>Current Security Role</div>
                  <div style={{fontWeight: 700, fontSize: 16, color: '#2563eb'}}>Senior Field Operator</div>
                </div>
                <div>
                  <div style={{fontSize: 11, color: '#9ca3af', marginBottom: 4}}>Permissions Review Status</div>
                  <div style={{fontWeight: 700, fontSize: 16, color: '#10b981'}}>Verified & Audited</div>
                </div>
                <div>
                  <div style={{fontSize: 11, color: '#9ca3af', marginBottom: 4}}>Last Reviewed</div>
                  <div style={{fontWeight: 700, fontSize: 16, color: '#111827'}}>Jan 24, 2026</div>
                </div>
              </div>

              {/* Fleet Management */}
              <div style={{marginBottom: 24}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '12px 16px', borderRadius: 8, marginBottom: 16}}>
                  <h4 style={{fontSize: 14, fontWeight: 700, margin: 0}}>Fleet Management</h4>
                  <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                    <span style={{fontSize: 11, color: '#6b7280'}}>Category Enabled</span>
                    <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                      <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                    </div>
                  </div>
                </div>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4}}>Register & Manage Vehicles</div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Allows registering new fleet assets, assigning ID tags, and updating technical vehicle profiles.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4}}>Dispatch Operations Control</div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Enables dispatching drivers, assigning routes, and issuing immediate operational overrides.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#9ca3af'}}>Configure Telematics Rules</div>
                    <div style={{fontSize: 11, color: '#9ca3af'}}>Configure sensor thresholds, GPS ping intervals, and active speed limit geo-fencing policies.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#e5e7eb', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 2}}></div>
                  </div>
                </div>
              </div>

              {/* Documents & Compliance */}
              <div style={{marginBottom: 24}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '12px 16px', borderRadius: 8, marginBottom: 16}}>
                  <h4 style={{fontSize: 14, fontWeight: 700, margin: 0}}>Documents & Compliance</h4>
                  <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                    <span style={{fontSize: 11, color: '#6b7280'}}>Category Enabled</span>
                    <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                      <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                    </div>
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4}}>Verify Driver Credentials</div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Audit and approve submitted driver licenses, medical fitness forms, and commercial insurance policies.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                  </div>
                </div>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#9ca3af'}}>Issue Legal Compliance Overrides</div>
                    <div style={{fontSize: 11, color: '#9ca3af'}}>Allows manual bypass of regional regulatory holds in exceptional/emergency contexts.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#e5e7eb', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 2}}></div>
                  </div>
                </div>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#9ca3af'}}>Purge Expired Audit Files</div>
                    <div style={{fontSize: 11, color: '#9ca3af'}}>Permanently delete historical physical records in accordance with institutional data retention policies.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#e5e7eb', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 2}}></div>
                  </div>
                </div>
              </div>

              {/* Alerts & Notifications */}
              <div style={{marginBottom: 24}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '12px 16px', borderRadius: 8, marginBottom: 16}}>
                  <h4 style={{fontSize: 14, fontWeight: 700, margin: 0}}>Alerts & Notifications</h4>
                  <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                    <span style={{fontSize: 11, color: '#6b7280'}}>Category Enabled</span>
                    <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                      <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                    </div>
                  </div>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4}}>Broadcast Emergency Messages</div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Initiate system-wide high-priority flash notifications to all actively active fleet drivers.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                  </div>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4}}>Configure Slack/Webhooks Alerts</div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Route automated telemetry warning spikes directly to internal devops channels.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                  </div>
                </div>
              </div>

              {/* Reports & Analytics */}
              <div style={{marginBottom: 24}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '12px 16px', borderRadius: 8, marginBottom: 16}}>
                  <h4 style={{fontSize: 14, fontWeight: 700, margin: 0}}>Reports & Analytics</h4>
                  <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                    <span style={{fontSize: 11, color: '#6b7280'}}>Category Enabled</span>
                    <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                      <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                    </div>
                  </div>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4}}>Generate Monthly Compliance Audits</div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Compile comprehensive, cryptographically-signed security compliance dossiers.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                  </div>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4}}>Export Raw Telemetry Streams</div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Export unprocessed time-series GPS, speed, and fuel telemetry as JSON/CSV streams.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                  </div>
                </div>
              </div>

              {/* User Management */}
              <div style={{marginBottom: 24}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '12px 16px', borderRadius: 8, marginBottom: 16}}>
                  <h4 style={{fontSize: 14, fontWeight: 700, margin: 0, color: '#9ca3af'}}>User Management</h4>
                  <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                    <span style={{fontSize: 11, color: '#9ca3af'}}>Category Disabled</span>
                    <div style={{width: 36, height: 20, borderRadius: 12, background: '#e5e7eb', position: 'relative'}}>
                      <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 2}}></div>
                    </div>
                  </div>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#9ca3af'}}>Create Field Operator Accounts</div>
                    <div style={{fontSize: 11, color: '#9ca3af'}}>Allows provisioning profile shells for junior and contract field team members.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#e5e7eb', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 2}}></div>
                  </div>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#9ca3af'}}>Modify Operator Security Access</div>
                    <div style={{fontSize: 11, color: '#9ca3af'}}>Assign, edit, or strip explicit security permission flags from active operators.</div>
                  </div>
                  <div style={{width: 36, height: 20, borderRadius: 12, background: '#e5e7eb', position: 'relative'}}>
                    <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 2}}></div>
                  </div>
                </div>
              </div>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, padding: '16px 24px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a'}}>
                <div style={{fontSize: 13, color: '#d97706', fontWeight: 600}}>
                  <span style={{marginRight: 8}}>❑</span> Changes will require approval from Rajesh Kumar's supervisor
                </div>
                <div style={{display: 'flex', gap: 12}}>
                  <button className="date-picker-btn" style={{borderColor: '#d97706', color: '#d97706', background: 'white'}}>Discard Changes</button>
                  <button className="action-btn">Save Changes</button>
                </div>
              </div>

            </div>
          </div>
        )}


        {activeTab === 'Documents' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
            <div style={{display: 'flex', gap: 24, marginBottom: 8}}>
              <div style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 24px', flex: 1, textAlign: 'center'}}>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Total Documents</div>
                <div style={{fontSize: 24, fontWeight: 700}}>12</div>
              </div>
              <div style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 24px', flex: 1, textAlign: 'center'}}>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Verified & Valid</div>
                <div style={{fontSize: 24, fontWeight: 700, color: '#10b981'}}>10</div>
              </div>
              <div style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 24px', flex: 1, textAlign: 'center'}}>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Pending Review</div>
                <div style={{fontSize: 24, fontWeight: 700, color: '#2563eb'}}>1</div>
              </div>
              <div style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 24px', flex: 1, textAlign: 'center'}}>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Expired / Warnings</div>
                <div style={{fontSize: 24, fontWeight: 700, color: '#ef4444'}}>1</div>
              </div>
            </div>

            <div className="table-card" style={{padding: 32}}>
              <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Identity & Verification Documents</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16}}>
                {operator.documents ? operator.documents.map((doc: any, i: number) => (
                  <div key={i} style={{border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
                    <div style={{width: 64, height: 64, borderRadius: 12, background: doc.status === 'Verified' ? '#d1fae5' : '#fee2e2', color: doc.status === 'Verified' ? '#10b981' : '#ef4444', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16}}>
                      <span style={{fontWeight: 700, fontSize: 18}}>{doc.type}</span>
                    </div>
                    <div style={{fontSize: 13, fontWeight: 700, marginBottom: 4}}>{doc.fileName}</div>
                    <div style={{background: doc.status === 'Verified' ? '#d1fae5' : '#fee2e2', color: doc.status === 'Verified' ? '#10b981' : '#ef4444', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, marginBottom: 12}}>{doc.status || 'Verified'}</div>
                    <div style={{fontSize: 11, color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: 12, width: '100%'}}>
                      {doc.fileSize} MB • {doc.uploadedAt}
                    </div>
                  </div>
                )) : (
                  <div style={{fontSize: 13, color: '#6b7280'}}>No documents uploaded yet.</div>
                )}
              </div>

              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, padding: '16px 24px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fef3c7'}}>
                <div style={{fontSize: 13, color: '#d97706', fontWeight: 600}}>
                  <span style={{marginRight: 8}}>⚠️</span> This Profile requires an active Driving License to be dispatched.
                </div>
                <div style={{display: 'flex', gap: 12}}>
                  <button className="date-picker-btn" style={{borderColor: '#d97706', color: '#d97706', background: 'white'}}>Download All (ZIP)</button>
                  <button className="action-btn" style={{background: '#2563eb'}}>Request Document Update</button>
                </div>
              </div>
            </div>
          </div>
        )}


        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          
          {activeTab === 'Documents' && (
            <>
              <div className="table-card" style={{padding: 24}}>
                <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Upload New Document</h3>
                <div style={{border: '2px dashed #e5e7eb', borderRadius: 12, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', cursor: 'pointer'}}>
                  <div style={{width: 48, height: 48, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12, fontSize: 24}}>↑</div>
                  <div style={{color: '#2563eb', fontWeight: 700, marginBottom: 4}}>Drag & Drop files here</div>
                  <div style={{fontSize: 12, color: '#6b7280'}}>or click to browse</div>
                </div>
              </div>

              <div className="table-card" style={{padding: 24}}>
                <h3 style={{fontSize: 14, fontWeight: 700, marginBottom: 24}}>Compliance Action Required</h3>
                
                <div style={{paddingBottom: 16, borderBottom: '1px solid #e5e7eb', marginBottom: 16}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#ef4444'}}>Expired: Driving License</div>
                    <div style={{fontSize: 11, color: '#ef4444'}}>Action Required</div>
                  </div>
                  <div style={{fontSize: 12, color: '#6b7280'}}>Upload the renewed DL document to regain fleet dispatch access. Missing this requirement blocks fleet assignments.</div>
                </div>
                
                <div>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#f59e0b'}}>Missing: Medical Fitness</div>
                    <div style={{fontSize: 11, color: '#f59e0b'}}>Due in 5 days</div>
                  </div>
                  <div style={{fontSize: 12, color: '#6b7280'}}>Required by state regulations for commercial operations. Upload the validated hospital forms.</div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Permissions' && (
            <>
              <div className="table-card" style={{padding: 24}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
                  <h3 style={{fontSize: 16, fontWeight: 700}}>Security Scorecard</h3>
                  <Grid size={18} color="#2563eb" />
                </div>
                
                <div style={{marginBottom: 24}}>
                  <div style={{fontSize: 12, color: '#9ca3af', marginBottom: 4}}>Active Grants</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{fontSize: 24, fontWeight: 700}}>9 / 14 Allowed</div>
                    <span style={{background: '#d1fae5', color: '#10b981', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700}}>Secure Base</span>
                  </div>
                </div>
                
                <div style={{marginBottom: 24}}>
                  <div style={{fontSize: 12, color: '#9ca3af', marginBottom: 4}}>Access Level</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{fontSize: 24, fontWeight: 700}}>Standard Ops</div>
                    <span style={{background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700}}>Tier-2 Auth</span>
                  </div>
                </div>

                <div>
                  <div style={{fontSize: 12, color: '#9ca3af', marginBottom: 4}}>Elevated Bypass Flags</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{fontSize: 24, fontWeight: 700, color: '#ef4444'}}>0 Active</div>
                    <span style={{background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700}}>No Overrides</span>
                  </div>
                </div>
              </div>

              <div className="table-card" style={{padding: 24}}>
                <h3 style={{fontSize: 14, fontWeight: 700, marginBottom: 24}}>Recent Policy Changes</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                  <div style={{paddingBottom: 16, borderBottom: '1px solid #e5e7eb'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                      <div style={{fontSize: 12, fontWeight: 700}}>Enabled Webhook Alerts</div>
                      <div style={{fontSize: 11, color: '#9ca3af'}}>Jan 24</div>
                    </div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Granted by Rajesh Kumar (Self service profile sync)</div>
                  </div>
                  <div style={{paddingBottom: 16, borderBottom: '1px solid #e5e7eb'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                      <div style={{fontSize: 12, fontWeight: 700}}>Disabled Security Access Mod</div>
                      <div style={{fontSize: 11, color: '#9ca3af'}}>Jan 12</div>
                    </div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Revoked by System Policy (Audit requirement #443)</div>
                  </div>
                  <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                      <div style={{fontSize: 12, fontWeight: 700}}>Verified Document Audit auth</div>
                      <div style={{fontSize: 11, color: '#9ca3af'}}>Jan 12</div>
                    </div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Approved by Supervisor Rajesh Kumar</div>
                  </div>
                </div>
              </div>

              <div className="table-card" style={{padding: 24}}>
                <h3 style={{fontSize: 14, fontWeight: 700, marginBottom: 24}}>Authorization Chain</h3>
                
                <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24}}>
                  <img src="https://i.pravatar.cc/150?img=11" alt="Super" style={{width: 40, height: 40, borderRadius: '50%'}} />
                  <div>
                    <div style={{fontWeight: 700, fontSize: 14}}>Rajesh Kumar</div>
                    <div style={{fontSize: 12, color: '#6b7280'}}>Direct Supervisor (Super Admin)</div>
                  </div>
                </div>

                <div style={{display: 'flex', alignItems: 'center', gap: 12, color: '#374151', fontSize: 13, fontWeight: 500}}>
                  <ShieldCheck size={16} color="#6b7280" /> Permission level: <span style={{fontWeight: 700}}>Tier-2 Approval Authority</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Overview' && (
            <>
              <div className="table-card" style={{padding: 24}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
                  <h3 style={{fontSize: 16, fontWeight: 700}}>Performance Metrics</h3>
                  <Grid size={18} color="#2563eb" />
                </div>
                
                <div style={{marginBottom: 24}}>
                  <div style={{fontSize: 12, color: '#9ca3af', marginBottom: 4}}>Tasks Completed</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{fontSize: 24, fontWeight: 700}}>342</div>
                    <span style={{background: '#d1fae5', color: '#10b981', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700}}>↑ 12% MoM</span>
                  </div>
                </div>
                
                <div style={{marginBottom: 24}}>
                  <div style={{fontSize: 12, color: '#9ca3af', marginBottom: 4}}>Avg. Response Time</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{fontSize: 24, fontWeight: 700}}>2.4 hrs</div>
                    <span style={{background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700}}>Top 5%</span>
                  </div>
                </div>

                <div style={{marginBottom: 24}}>
                  <div style={{fontSize: 12, color: '#9ca3af', marginBottom: 4}}>Client Satisfaction Rating</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{fontSize: 18, color: '#111827'}}>★★★★☆</div>
                    <div style={{fontSize: 16, fontWeight: 700}}>4.8 / 5</div>
                  </div>
                </div>

                <div>
                  <div style={{fontSize: 12, color: '#9ca3af', marginBottom: 4}}>Documents Processed</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{fontSize: 24, fontWeight: 700}}>1,247</div>
                    <span style={{color: '#f59e0b', fontSize: 11, fontWeight: 700}}>99.2% Accuracy</span>
                  </div>
                </div>
              </div>

              <div className="table-card" style={{padding: 24}}>
                <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Reporting Structure</h3>
                
                <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24}}>
                  <img src="https://i.pravatar.cc/150?img=11" alt="Super" style={{width: 40, height: 40, borderRadius: '50%'}} />
                  <div>
                    <div style={{fontWeight: 700, fontSize: 14}}>Rajesh Kumar</div>
                    <div style={{fontSize: 12, color: '#6b7280'}}>Direct Supervisor (Super Admin)</div>
                  </div>
                </div>

                <div style={{display: 'flex', alignItems: 'center', gap: 12, color: '#374151', fontSize: 13, fontWeight: 500}}>
                  <Clock size={16} color="#6b7280" /> Primary Shift: <span style={{fontWeight: 700}}>Day Shift (09:00 - 18:00)</span>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
