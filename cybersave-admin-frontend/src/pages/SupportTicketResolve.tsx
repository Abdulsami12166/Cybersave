import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

export default function SupportTicketResolve() {
  const { id } = useParams();
  const { socket, connected } = useSocket();
  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_ticket_detail', { id });
      socket.on('response_ticket_detail', (data) => setTicket(data));
    }
    return () => {
      if (socket) socket.off('response_ticket_detail');
    };
  }, [socket, connected, id]);

  if (!ticket) return <div style={{padding: 24}}>Loading Ticket Resolution...</div>;

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 24}}>
        <Link to="/" style={{color: 'inherit', textDecoration: 'none'}}>Dashboard</Link> &rarr; <Link to="/support" style={{color: 'inherit', textDecoration: 'none'}}>Support Tickets</Link> &rarr; Ticket #{id} &rarr; <span style={{color: '#2563eb'}}>Resolution</span>
      </div>

      <div style={{marginBottom: 24}}>
        <h1 style={{fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12}}>
          Resolve Ticket #{id}
          <span style={{background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>Open</span>
        </h1>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24}}>
        <div className="table-card" style={{padding: 32}}>
          <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Resolution Specifications</h3>

          <div style={{marginBottom: 24}}>
            <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Resolution Summary</label>
            <textarea 
              rows={4}
              defaultValue="Google OAuth endpoint redirect URI mismatch identified and corrected. Client credentials updated in Google Cloud Console. Temporary direct portal redirect provided during investigation."
              style={{width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'none', fontSize: 14}}
            />
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24}}>
            <div>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Resolution Category</label>
              <select style={{width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontSize: 14}}>
                <option>Configuration Fix</option>
              </select>
            </div>
            <div>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Root Cause</label>
              <select style={{width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontSize: 14}}>
                <option>Third-Party Service Misconfiguration</option>
              </select>
            </div>
            <div>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Time to Resolution</label>
              <input type="text" defaultValue="2 days, 4 hours" style={{width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontSize: 14}} />
            </div>
            <div>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Internal Tags</label>
              <div style={{display: 'flex', gap: 8}}>
                <span style={{background: '#f3f4f6', color: '#4b5563', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500}}>OAuth ⊗</span>
                <span style={{background: '#f3f4f6', color: '#4b5563', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500}}>Google SSO ⊗</span>
                <span style={{background: '#f3f4f6', color: '#4b5563', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500}}>502-error ⊗</span>
              </div>
            </div>
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 24, borderTop: '1px solid #e5e7eb'}}>
            <div>
              <div style={{fontWeight: 700, fontSize: 14}}>Notify Reporter ({ticket.reporter.name}) via Email</div>
              <div style={{fontSize: 12, color: '#6b7280'}}>Send a summary and resolution notes immediately upon confirmation.</div>
            </div>
            <div style={{width: 44, height: 24, borderRadius: 12, background: '#2563eb', position: 'relative'}}>
              <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
            </div>
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48}}>
            <div>
              <div style={{fontWeight: 700, fontSize: 14}}>Customer Satisfaction Survey</div>
              <div style={{fontSize: 12, color: '#6b7280'}}>Embed a CSAT rating block as the footer of the resolution email.</div>
            </div>
            <div style={{width: 44, height: 24, borderRadius: 12, background: '#2563eb', position: 'relative'}}>
              <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
            </div>
          </div>

          <div style={{display: 'flex', gap: 16}}>
            <button className="action-btn">Confirm Resolution</button>
            <button className="date-picker-btn">Save as Draft</button>
            <button className="date-picker-btn" style={{border: 'none'}}>Cancel</button>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Ticket Summary</h3>
            
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Ticket ID</span>
              <span style={{fontWeight: 600}}>{ticket.id}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Priority</span>
              <span style={{color: '#ef4444', fontWeight: 600}}>High</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Category</span>
              <span style={{fontWeight: 600}}>{ticket.category}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Reporter</span>
              <div style={{display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 13}}>
                <img src={`https://i.pravatar.cc/150?u=${ticket.reporter.id}`} alt="User" style={{width: 20, height: 20, borderRadius: '50%'}} /> {ticket.reporter.name}
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Assigned To</span>
              <div style={{display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 13}}>
                <img src={`https://i.pravatar.cc/150?u=${ticket.assignedTo.id}`} alt="User" style={{width: 20, height: 20, borderRadius: '50%'}} /> {ticket.assignedTo.name}
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Created</span>
              <span style={{fontWeight: 600}}>10/01/2024</span>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <h3 style={{fontSize: 14, fontWeight: 700}}>Notification Preview</h3>
              <span style={{color: '#2563eb', fontSize: 10, fontWeight: 700, textTransform: 'uppercase'}}>Email Mockup</span>
            </div>
            
            <div style={{background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb'}}>
              <div style={{fontSize: 11, color: '#6b7280', marginBottom: 12}}>
                <strong>Subject:</strong> Resolved: Login Authentication Issue (#TK-0045)
              </div>
              <div style={{fontSize: 14, fontWeight: 700, marginBottom: 8}}>Hello John Smith,</div>
              <div style={{fontSize: 12, color: '#4b5563', marginBottom: 12, lineHeight: '1.5'}}>
                Our technical support team has marked your issue as <span style={{color: '#2563eb', fontWeight: 600}}>Resolved</span>.
              </div>
              <div style={{background: '#eff6ff', padding: 12, borderRadius: 8, borderLeft: '4px solid #2563eb', marginBottom: 24}}>
                <div style={{fontSize: 11, fontWeight: 700, color: '#111827', marginBottom: 4}}>Resolution Summary:</div>
                <div style={{fontSize: 12, color: '#4b5563', lineHeight: '1.5'}}>
                  Google OAuth endpoint redirect URI mismatch identified and corrected. Client credentials updated in Google Cloud Console.
                </div>
              </div>
              <div style={{textAlign: 'center', fontSize: 12, color: '#4b5563'}}>
                <div style={{marginBottom: 8}}>How would you rate our support?</div>
                <div style={{color: '#f59e0b', fontSize: 16}}>☆ ☆ ☆ ☆ ☆</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
