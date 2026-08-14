import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Bell, Edit3, X, CheckCircle, FileText, Clock } from 'lucide-react';

export default function UserManagementDetail() {
  const { id } = useParams();
  const { socket, connected } = useSocket();
  const [user, setUser] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notifType, setNotifType] = useState('Push Notification');
  const [notifSubject, setNotifSubject] = useState('');
  const [notifBody, setNotifBody] = useState('');

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_user_detail', { id });
      socket.on('response_user_detail', (data) => setUser(data));
      socket.on('response_push_sent', (res) => {
        if (res.success) {
          alert('Notification sent successfully!');
          setModalOpen(false);
        } else {
          alert('Failed to send notification.');
        }
      });
    }
    return () => {
      if (socket) {
        socket.off('response_user_detail');
        socket.off('response_push_sent');
      }
    };
  }, [socket, connected, id]);

  const sendNotification = () => {
    if (socket) {
      socket.emit('send_push_notification', {
        userId: id,
        title: notifSubject,
        body: notifBody,
        type: notifType
      });
    }
  };

  if (!user) return <div style={{padding: 24}}>Loading User Data...</div>;

  return (
    <div style={{position: 'relative'}}>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 24}}>
        <Link to="/" style={{color: 'inherit', textDecoration: 'none'}}>Dashboard</Link> &rarr; <Link to="/users" style={{color: 'inherit', textDecoration: 'none'}}>Citizen Management</Link> &rarr; <span style={{color: '#2563eb'}}>{user.fullName}</span>
      </div>

      <div className="table-card" style={{padding: '24px 32px', marginBottom: 24}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <div style={{width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 20, fontWeight: 700}}>
              {user.fullName.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4}}>
                <h1 style={{fontSize: 24, fontWeight: 700, color: '#111827', margin: 0}}>{user.fullName}</h1>
                <span style={{background: '#d1fae5', color: '#10b981', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>Verified</span>
              </div>
              <div style={{fontSize: 13, color: '#6b7280'}}>
                CIT-00482 • Joined {user.joinedDate}
              </div>
            </div>
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <button className="date-picker-btn">Edit Profile</button>
            <button className="date-picker-btn" style={{color: '#ef4444', borderColor: '#fee2e2'}}>Block Citizen</button>
            <button className="action-btn" onClick={() => setModalOpen(true)}>Send Notification</button>
            <button className="date-picker-btn" style={{padding: '6px 12px'}}>...</button>
          </div>
        </div>

        <div style={{display: 'flex', gap: 32, borderBottom: '1px solid #e5e7eb'}}>
          <div style={{padding: '12px 0', borderBottom: '2px solid #2563eb', color: '#2563eb', fontWeight: 600, fontSize: 14}}>Overview</div>
          <div style={{padding: '12px 0', color: '#6b7280', fontSize: 14, fontWeight: 500}}>Services Used</div>
          <div style={{padding: '12px 0', color: '#6b7280', fontSize: 14, fontWeight: 500}}>Documents</div>
          <div style={{padding: '12px 0', color: '#6b7280', fontSize: 14, fontWeight: 500}}>Transactions</div>
          <div style={{padding: '12px 0', color: '#6b7280', fontSize: 14, fontWeight: 500}}>Activity Log</div>
          <div style={{padding: '12px 0', color: '#6b7280', fontSize: 14, fontWeight: 500}}>Notes</div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          
          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <h3 style={{fontSize: 16, fontWeight: 700}}>Personal Information</h3>
              <Edit3 size={16} color="#6b7280" />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Full Name</div>
                <div style={{fontWeight: 600}}>{user.fullName}</div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Father's Name</div>
                <div style={{fontWeight: 600}}>Ramesh Sharma</div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Date of Birth</div>
                <div style={{fontWeight: 600}}>14 August 1992 (Age: 33)</div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Gender</div>
                <div style={{fontWeight: 600}}>Female</div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Aadhaar Number</div>
                <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8}}>{user.aadhaar} <CheckCircle size={14} color="#10b981" /></div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>PAN</div>
                <div style={{fontWeight: 600}}>ABCP51234K</div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Mobile</div>
                <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8}}>{user.mobile} <CheckCircle size={14} color="#10b981" /></div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Email</div>
                <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8}}>priya.sharma@email.com <CheckCircle size={14} color="#10b981" /></div>
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Address</div>
                <div style={{fontWeight: 600}}>42, Hazratganj, Lucknow, Uttar Pradesh - 226001</div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>District</div>
                <div style={{fontWeight: 600}}>{user.district}</div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>State</div>
                <div style={{fontWeight: 600}}>Uttar Pradesh</div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Pin Code</div>
                <div style={{fontWeight: 600}}>226001</div>
              </div>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <h3 style={{fontSize: 16, fontWeight: 700}}>Recent Services</h3>
              <span style={{color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer'}}>View All</span>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
              {[
                {name: 'Aadhaar Address Update', date: '2 Aug 2026', amount: '₹50', status: 'Completed', color: '#10b981', bg: '#d1fae5'},
                {name: 'PAN Card Application', date: '28 Jul 2026', amount: '₹107', status: 'In Progress', color: '#2563eb', bg: '#eff6ff'},
                {name: 'Income Certificate', date: '20 Jul 2026', amount: '₹120', status: 'Completed', color: '#10b981', bg: '#d1fae5'},
                {name: 'Electricity Bill Payment', date: '15 Jul 2026', amount: '₹2,123', status: 'Completed', color: '#10b981', bg: '#d1fae5'},
                {name: 'Voter ID Registration', date: '10 Jul 2026', amount: '₹50', status: 'Pending', color: '#f59e0b', bg: '#fef3c7'}
              ].map((s, i) => (
                <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: i < 4 ? '1px solid #e5e7eb' : 'none'}}>
                  <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
                    <FileText color="#6b7280" size={20} />
                    <div>
                      <div style={{fontWeight: 600, fontSize: 14}}>{s.name}</div>
                      <div style={{fontSize: 12, color: '#6b7280'}}>{s.date}</div>
                    </div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                    <div style={{fontWeight: 700}}>{s.amount}</div>
                    <span style={{background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, width: 80, textAlign: 'center'}}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Quick Stats</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Total Services Used</span>
              <span style={{fontWeight: 700, color: '#2563eb'}}>5</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Total Amount Spent</span>
              <span style={{fontWeight: 700}}>₹2,450</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Last Active</span>
              <span style={{fontWeight: 700}}>2 hours ago</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Registered Centre</span>
              <span style={{fontWeight: 600, textAlign: 'right'}}>CSC Hazratganj, Lucknow</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Assigned Operator</span>
              <span style={{fontWeight: 600, textAlign: 'right'}}>Vikram Tiwari (VLE-0234)</span>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <h3 style={{fontSize: 16, fontWeight: 700}}>Uploaded Documents</h3>
              <span style={{color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer'}}>View All</span>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
              {[
                {n: 'Aadhaar Card (Front).pdf', d: '15 Mar 2024', status: 'Verified', color: '#10b981'},
                {n: 'PAN Card.pdf', d: '15 Mar 2024', status: 'Verified', color: '#10b981'},
                {n: 'Passport Photo.jpg', d: '15 Mar 2024', status: 'Verified', color: '#10b981'},
                {n: 'Address Proof.pdf', d: '28 Jul 2026', status: 'Pending Review', color: '#f59e0b'},
                {n: 'Income Proof.pdf', d: '20 Jul 2026', status: 'Verified', color: '#10b981'},
              ].map((doc, i) => (
                <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                    <FileText color="#9ca3af" size={16} />
                    <div>
                      <div style={{fontSize: 13, fontWeight: 600}}>{doc.n}</div>
                      <div style={{fontSize: 11, color: '#6b7280'}}>Uploaded {doc.d}</div>
                    </div>
                  </div>
                  <div style={{color: doc.color, fontSize: 11, fontWeight: 600}}>{doc.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Recent Activity</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: 24, position: 'relative'}}>
              <div style={{position: 'absolute', left: 4, top: 4, bottom: 4, width: 2, background: '#e5e7eb'}}></div>
              {[
                {t: 'Profile viewed by Operator VLE-0234', d: '2 hours ago', color: '#2563eb'},
                {t: 'Aadhaar update application completed', d: '2 Aug 2026', color: '#10b981'},
                {t: 'PAN card application submitted', d: '28 Jul 2026', color: '#2563eb'},
                {t: 'Payment of ₹107 received', d: '28 Jul 2026', color: '#10b981'},
                {t: 'Income certificate requested', d: '20 Jul 2026', color: '#f59e0b'},
                {t: 'Electricity bill ₹1,240 paid', d: '15 Jul 2026', color: '#10b981'}
              ].map((act, i) => (
                <div key={i} style={{display: 'flex', gap: 16, position: 'relative'}}>
                  <div style={{width: 10, height: 10, borderRadius: '50%', background: act.color, position: 'relative', top: 4}}></div>
                  <div>
                    <div style={{fontSize: 13, fontWeight: 600, color: '#111827'}}>{act.t}</div>
                    <div style={{fontSize: 11, color: '#6b7280', marginTop: 4}}>{act.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {modalOpen && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100}}>
          <div style={{background: 'white', borderRadius: 16, width: 500, padding: 32, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <h2 style={{fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12}}>
                <Bell color="#2563eb" /> Send Notification
              </h2>
              <button onClick={() => setModalOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer'}}><X color="#6b7280" /></button>
            </div>

            <div style={{background: '#f9fafb', padding: '12px 16px', borderRadius: 8, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center'}}>
              <div style={{width: 24, height: 24, borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 10, fontWeight: 700}}>PS</div>
              <div style={{fontSize: 14}}>Recipient: <strong>{user.fullName}</strong> (CIT-00482)</div>
            </div>

            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Notification Type</label>
              <select 
                style={{width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none'}}
                value={notifType} onChange={e => setNotifType(e.target.value)}
              >
                <option>Email Notification</option>
                <option>Push Notification</option>
                <option>SMS Alert</option>
              </select>
            </div>

            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Subject Line</label>
              <input 
                type="text" 
                value={notifSubject} onChange={e => setNotifSubject(e.target.value)}
                style={{width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #2563eb', outline: 'none'}} 
                placeholder="Important Update: Your document has been verified"
              />
            </div>

            <div style={{marginBottom: 24}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                <label style={{fontSize: 13, fontWeight: 600}}>Message Body</label>
                <span style={{fontSize: 12, color: '#6b7280'}}>{notifBody.length} / 1000 chars</span>
              </div>
              <textarea 
                rows={5}
                value={notifBody} onChange={e => setNotifBody(e.target.value)}
                style={{width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none', resize: 'none'}} 
                placeholder={`Dear ${user.fullName}, your submitted Income Certificate Renewal application has been successfully verified. You can now download it directly from your dashboard.`}
              />
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 12}}>
              <button className="date-picker-btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="action-btn" onClick={sendNotification}>Send Notification</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
