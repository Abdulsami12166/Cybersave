import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Paperclip } from 'lucide-react';

export default function SupportTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [ticket, setTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_ticket_thread', { id });
      socket.on('response_ticket_thread', (data) => setTicket(data));
    }
    return () => {
      if (socket) socket.off('response_ticket_thread');
    };
  }, [socket, connected, id]);

  const sendReply = () => {
    if (!replyText.trim()) return;
    socket?.emit('send_ticket_reply', { id, text: replyText });
    setReplyText('');
  };

  if (!ticket) return <div style={{padding: 24}}>Loading Ticket...</div>;

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 24}}>
        <Link to="/" style={{color: 'inherit', textDecoration: 'none'}}>Dashboard</Link> &rarr; <Link to="/support" style={{color: 'inherit', textDecoration: 'none'}}>Support Tickets</Link> &rarr; <span style={{color: '#2563eb'}}>Ticket #{id}</span>
      </div>

      <div style={{marginBottom: 24}}>
        <h1 style={{fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12}}>
          {ticket.title} 
          <span style={{background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>Open</span>
        </h1>
        <p style={{color: '#6b7280', fontSize: 14}}>{ticket.description}</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Conversation Thread</h3>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24}}>
              {(ticket.messages || []).map((msg: any, i: number) => (
                <div key={i} style={{background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12}}>
                    <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                      <img src={`https://i.pravatar.cc/150?u=${msg.senderId}`} alt="User" style={{width: 32, height: 32, borderRadius: '50%'}} />
                      <div>
                        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                          <span style={{fontWeight: 700, fontSize: 14}}>{msg.senderName}</span>
                          {msg.role === 'AGENT' && <span style={{background: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600}}>Agent</span>}
                        </div>
                        <div style={{fontSize: 11, color: '#6b7280'}}>{msg.role === 'AGENT' ? 'Support Agent' : 'Customer / Reporter'}</div>
                      </div>
                    </div>
                    <div style={{fontSize: 11, color: '#9ca3af'}}>{msg.time}</div>
                  </div>
                  <div style={{fontSize: 13, color: '#374151', lineHeight: '1.5'}}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div style={{background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16}}>
              <h4 style={{fontSize: 13, fontWeight: 700, marginBottom: 12}}>Write a Response</h4>
              <textarea 
                rows={4} 
                value={replyText} onChange={e => setReplyText(e.target.value)}
                placeholder="Type your response to John Smith here..."
                style={{width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'none', marginBottom: 12}}
              />
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <button style={{background: 'none', border: 'none', display: 'flex', gap: 8, alignItems: 'center', color: '#6b7280', fontSize: 13, cursor: 'pointer'}}>
                  <Paperclip size={16} /> Attach file or logs
                </button>
                <div style={{display: 'flex', gap: 12}}>
                  <button className="date-picker-btn">Save Draft</button>
                  <button className="action-btn" onClick={sendReply}>Send Reply</button>
                </div>
              </div>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <h3 style={{fontSize: 16, fontWeight: 700}}>Internal Team Notes & Activity</h3>
              <span style={{color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer'}}>+ Add Private Note</span>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
              {(ticket.notes || []).map((note: any, i: number) => (
                <div key={i} style={{background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 16}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                    <div style={{fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8}}>
                      <span style={{color: '#f59e0b'}}>❑</span> {note.title} <span style={{color: '#9ca3af', fontWeight: 500, fontSize: 11}}>by {note.author}</span>
                    </div>
                    <div style={{fontSize: 11, color: '#9ca3af'}}>{note.time}</div>
                  </div>
                  <div style={{fontSize: 12, color: '#4b5563', lineHeight: '1.5'}}>
                    {note.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Ticket Details</h3>
            
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Ticket ID</span>
              <span style={{fontWeight: 600}}>{ticket.id}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Category</span>
              <span style={{fontWeight: 600}}>{ticket.category}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Priority</span>
              <span style={{background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>{ticket.priority}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Created On</span>
              <span style={{fontWeight: 600}}>{ticket.createdOn}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Last Updated</span>
              <span style={{fontWeight: 600}}>{ticket.lastUpdated}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center'}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Assigned To</span>
              <div style={{display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 13}}>
                <img src={`https://i.pravatar.cc/150?u=${ticket.assignedTo.id}`} alt="User" style={{width: 20, height: 20, borderRadius: '50%'}} /> {ticket.assignedTo.name}
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center'}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Reporter</span>
              <div style={{display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 13}}>
                <img src={`https://i.pravatar.cc/150?u=${ticket.reporter.id}`} alt="User" style={{width: 20, height: 20, borderRadius: '50%'}} /> {ticket.reporter.name}
              </div>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <button className="date-picker-btn" style={{color: '#ef4444', borderColor: '#fee2e2', width: '100%', justifyContent: 'center'}}>Escalate Ticket</button>
              <button className="date-picker-btn" style={{color: '#10b981', borderColor: '#d1fae5', width: '100%', justifyContent: 'center'}} onClick={() => navigate(`/support/${id}/resolve`)}>Mark as Resolved</button>
              <button className="date-picker-btn" style={{width: '100%', justifyContent: 'center'}}>Reassign Ticket</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
