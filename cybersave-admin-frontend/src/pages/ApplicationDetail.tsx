import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { FileText, CheckCircle, Clock, FileBadge, ArrowRight } from 'lucide-react';

export default function ApplicationDetail() {
  const { id } = useParams();
  const { socket, connected } = useSocket();
  const [app, setApp] = useState<any>(null);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_application_detail', { id });
      socket.on('response_application_detail', (data) => setApp(data));
    }
    return () => {
      if (socket) socket.off('response_application_detail');
    };
  }, [socket, connected, id]);

  if (!app) return <div style={{padding: 24}}>Loading Application Data...</div>;

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 24}}>
        <Link to="/" style={{color: 'inherit', textDecoration: 'none'}}>Dashboard</Link> &rarr; <Link to="/applications" style={{color: 'inherit', textDecoration: 'none'}}>Applications</Link> &rarr; <span style={{color: '#2563eb'}}>{app.id}</span>
      </div>

      <div className="table-card" style={{padding: '24px 32px', marginBottom: 24}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
              <h1 style={{fontSize: 24, fontWeight: 700, margin: 0, color: '#111827'}}>{app.id}</h1>
              <span style={{background: '#fef3c7', color: '#f59e0b', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>In Review</span>
              <span style={{background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>High Priority</span>
            </div>
            <div style={{display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: '#6b7280'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#111827'}}>
                <FileBadge size={16} color="#2563eb" /> {app.serviceName}
              </div>
              <div style={{color: '#ef4444', fontWeight: 600}}>| SLA: {app.sla} remaining</div>
            </div>
            <div style={{fontSize: 12, color: '#6b7280', marginTop: 12}}>
              Submitted: {app.submitted} • Assigned Operator: <span style={{color: '#2563eb', fontWeight: 500}}>{app.assignedTo}</span> • Centre: {app.centre}
            </div>
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <select className="date-picker-btn" style={{border: '1px solid #e5e7eb'}}>
              <option>Assign To</option>
            </select>
            <button className="date-picker-btn" style={{color: '#f59e0b', borderColor: '#fef3c7'}}>Escalate</button>
            <button className="date-picker-btn" style={{color: '#ef4444', borderColor: '#fee2e2'}}>Reject</button>
            <button className="action-btn" style={{background: '#10b981'}}>✓ Approve</button>
          </div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          
          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <h3 style={{fontSize: 16, fontWeight: 700}}>Applicant Details</h3>
              <span style={{color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer'}}>View Profile &rarr;</span>
            </div>
            <div style={{display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24}}>
              <img src="https://i.pravatar.cc/150?img=9" alt="User" style={{width: 48, height: 48, borderRadius: '50%'}} />
              <div>
                <div style={{fontWeight: 700}}>{app.applicant.name}</div>
                <div style={{fontSize: 12, color: '#6b7280'}}>Citizen ID: {app.applicant.id}</div>
              </div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Aadhaar Number</div>
                <div style={{fontWeight: 600}}>{app.applicant.aadhaar}</div>
              </div>
              <div>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Mobile Number</div>
                <div style={{fontWeight: 600}}>{app.applicant.mobile}</div>
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Current Registered Address</div>
                <div style={{fontWeight: 600}}>42, Hazratganj, Lucknow, UP - 226001</div>
              </div>
              <div style={{gridColumn: '1 / -1', background: '#eff6ff', padding: 16, borderRadius: 8, borderLeft: '4px solid #2563eb'}}>
                <div style={{fontSize: 12, color: '#2563eb', fontWeight: 700, marginBottom: 4}}>PROPOSED NEW ADDRESS (REQUESTED)</div>
                <div style={{fontWeight: 600}}>78, Civil Lines, Allahabad, UP - 211001</div>
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>Reason for Update</div>
                <div style={{fontWeight: 600}}>Relocated for employment</div>
              </div>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <h3 style={{fontSize: 16, fontWeight: 700}}>Supporting Documents</h3>
                <span style={{background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>3 files</span>
              </div>
              <span style={{color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer'}}>Verify All</span>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32}}>
              {[
                { n: 'Address Proof - Electricity Bill.pdf', s: '245 KB', status: 'Verified', color: '#10b981', bg: '#d1fae5' },
                { n: 'Aadhaar Card (Current).pdf', s: '180 KB', status: 'Verified', color: '#10b981', bg: '#d1fae5' },
                { n: 'Employment Letter.pdf', s: '312 KB', status: 'Pending', color: '#f59e0b', bg: '#fef3c7' }
              ].map((doc, i) => (
                <div key={i} style={{border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                    <div style={{background: '#eff6ff', padding: 8, borderRadius: 8, color: '#2563eb'}}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{fontWeight: 600, fontSize: 14}}>{doc.n}</div>
                      <div style={{fontSize: 11, color: '#6b7280'}}>{doc.s} • Uploaded 3 Aug 24</div>
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
                    <span style={{color: doc.color, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4}}>
                      {doc.status === 'Verified' && <CheckCircle size={14} />} {doc.status}
                    </span>
                    <span style={{color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer'}}>View</span>
                    <span style={{color: '#6b7280', fontSize: 13, fontWeight: 500, cursor: 'pointer'}}>Download</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <h3 style={{fontSize: 14, fontWeight: 700}}>Verification Checklist</h3>
              <span style={{color: '#6b7280', fontSize: 12}}>3 of 5 checks completed</span>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <label style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500}}>
                <input type="checkbox" defaultChecked style={{width: 16, height: 16, accentColor: '#2563eb'}} /> Identity verified against Aadhaar database
              </label>
              <label style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500}}>
                <input type="checkbox" defaultChecked style={{width: 16, height: 16, accentColor: '#2563eb'}} /> Current address matches official records
              </label>
              <label style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500}}>
                <input type="checkbox" defaultChecked style={{width: 16, height: 16, accentColor: '#2563eb'}} /> Address proof document is valid and recent (&lt; 3 months)
              </label>
              <label style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500}}>
                <input type="checkbox" style={{width: 16, height: 16, accentColor: '#2563eb'}} /> New address geo-verification completed
              </label>
              <label style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500}}>
                <input type="checkbox" style={{width: 16, height: 16, accentColor: '#2563eb'}} /> Operator physical verification done
              </label>
            </div>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <h3 style={{fontSize: 16, fontWeight: 700}}>Payment Information</h3>
              <span style={{background: '#d1fae5', color: '#10b981', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>Paid</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13, textTransform: 'uppercase', fontWeight: 600}}>FEE AMOUNT</span>
              <span style={{fontWeight: 700, fontSize: 16}}>₹50</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Payment Method</span>
              <span style={{fontWeight: 600}}>UPI (PhonePe)</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Transaction ID</span>
              <span style={{fontWeight: 600, color: '#2563eb'}}>TXN-8826-8471</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Paid On</span>
              <span style={{fontWeight: 600}}>3 Aug 2026, 09:12 AM</span>
            </div>
            <button className="date-picker-btn" style={{width: '100%', justifyContent: 'center'}}>Download Receipt</button>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Application Timeline</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: 24, position: 'relative'}}>
              <div style={{position: 'absolute', left: 4, top: 4, bottom: 4, width: 2, background: '#e5e7eb'}}></div>
              {[
                { t: 'Application Submitted', d: 'By Priya Sharma via portal • 3 Aug, 09:14 AM', color: '#10b981' },
                { t: 'Auto-Assigned to Vikram', d: 'VLE-0234 based on location • 3 Aug, 09:15 AM', color: '#2563eb' },
                { t: 'Document Check Started', d: 'Verification session initiated • 3 Aug, 09:30 AM', color: '#2563eb' },
                { t: '2 Documents Verified', d: 'Aadhaar & Bill approved • 3 Aug, 10:15 AM', color: '#10b981' },
                { t: 'Pending: Address Field Visit', d: 'Operator scheduling geo-check • Now', color: '#f59e0b' }
              ].map((step, i) => (
                <div key={i} style={{display: 'flex', gap: 16, position: 'relative'}}>
                  <div style={{width: 10, height: 10, borderRadius: '50%', background: step.color, position: 'relative', top: 4}}></div>
                  <div>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#111827'}}>{step.t}</div>
                    <div style={{fontSize: 11, color: '#6b7280', marginTop: 4}}>{step.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <h3 style={{fontSize: 14, fontWeight: 700}}>Internal Notes (2)</h3>
              <span style={{color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer'}}>View History</span>
            </div>
            
            <div style={{marginBottom: 16}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                <span style={{fontSize: 12, fontWeight: 700}}>Vikram Tiwari (Operator)</span>
                <span style={{fontSize: 11, color: '#6b7280'}}>3 Aug, 10:20 AM</span>
              </div>
              <p style={{fontSize: 12, color: '#4b5563'}}>Address proof verified. Employment letter needs HR stamp verification. Scheduling field visit for new address verification.</p>
            </div>
            <div style={{marginBottom: 24}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                <span style={{fontSize: 12, fontWeight: 700, color: '#6b7280'}}>System Bot</span>
                <span style={{fontSize: 11, color: '#6b7280'}}>3 Aug, 09:15 AM</span>
              </div>
              <p style={{fontSize: 12, color: '#4b5563'}}>Auto-assignment based on operator availability and center proximity algorithms.</p>
            </div>

            <div style={{position: 'relative'}}>
              <input type="text" placeholder="Write a note..." style={{width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontSize: 13}} />
              <button style={{position: 'absolute', right: 8, top: 8, background: '#2563eb', border: 'none', borderRadius: 6, color: 'white', width: 28, height: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'}}>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
