import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, CheckCircle, Edit3, Trash2, Edit2 } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function ServiceWizard() {
  const { socket } = useSocket();
  const [activeStep, setActiveStep] = useState(3);
  const [serviceData, setServiceData] = useState<any>({
    name: 'Address Update',
    category: 'Identity Services',
    description: 'Verify and update residential address records.',
    shortDescription: 'Quick verification and processing of address update.',
    serviceType: 'Citizen-to-G',
    departmentRole: 'ID Processing & Verification (ID-V)',
    keywords: 'Aadhaar, Address, KYC',
    subServices: [
      { name: 'Address Update', code: 'CS-ADDR-UPD', status: 'Active' },
      { name: 'Name Correction', code: 'CS-NAME-CORR', status: 'Active' }
    ],
    formElements: [
      { label: 'Full Name', type: 'Text Input', required: true },
      { label: 'Date of Birth', type: 'Date Picker', required: true },
      { label: 'New Address', type: 'Text Area', required: true },
      { label: 'Mobile', type: 'Number Input', required: true }
    ],
    documents: [
      { type: 'Proof of Address', formats: 'PDF, JPG, PNG', size: '5 MB', req: 'Required' },
      { type: 'Aadhaar Card Copy', formats: 'PDF', size: '2 MB', req: 'Required' },
      { type: 'Self Declaration Form', formats: 'PDF', size: '1 MB', req: 'Optional' }
    ],
    pricing: {
      fee: 150,
      gst: true,
      total: 177,
      charges: [
        { name: 'Late Submission Fee', amount: '₹50', condition: 'After due date' },
        { name: 'Express Processing', amount: '₹300', condition: 'Optional upgrade' },
        { name: 'Re-submission Fee', amount: '₹75', condition: 'Document rejection' }
      ]
    }
  });

  const steps = [
    { id: 1, name: 'Main Service' },
    { id: 2, name: 'Sub Service' },
    { id: 3, name: 'Overview' },
    { id: 4, name: 'Form Builder' },
    { id: 5, name: 'Documents' },
    { id: 6, name: 'Pricing' },
    { id: 7, name: 'Publish' }
  ];

  const handleSaveConfig = () => {
    socket?.emit('save_service_config', serviceData);
    alert('Service Configuration Saved to Database!');
  };

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 24}}>
        <Link to="/" style={{color: 'inherit', textDecoration: 'none'}}>Dashboard</Link> &rarr; <Link to="/services" style={{color: 'inherit', textDecoration: 'none'}}>Services</Link> &rarr; Address Update &rarr; <span style={{color: '#2563eb'}}>{steps[activeStep-1].name}</span>
      </div>

      <div style={{marginBottom: 24}}>
        <h1 style={{fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, marginBottom: 4}}>
          {activeStep === 3 && 'Service Overview & Information'}
          {activeStep === 4 && 'Interface Form Builder'}
          {activeStep === 5 && 'Required Documents Configuration'}
          {activeStep === 6 && 'Service Pricing Configuration'}
        </h1>
        <p style={{color: '#6b7280'}}>
          {activeStep === 3 && 'Structure internal routing subscriptions and front-end meta-data.'}
          {activeStep === 4 && 'Assemble data acquisition steps via drag & drop form components.'}
          {activeStep === 5 && 'Identify physical file attachments applicants must upload.'}
          {activeStep === 6 && 'Configure base fee, regional taxes, and additional processing charges for the service.'}
        </p>
      </div>

      <div style={{display: 'flex', gap: 32, borderBottom: '1px solid #e5e7eb', marginBottom: 32}}>
        {steps.map((step) => {
          let isCompleted = step.id < activeStep;
          let isActive = step.id === activeStep;
          return (
            <div 
              key={step.id} onClick={() => setActiveStep(step.id)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                color: isActive ? '#2563eb' : (isCompleted ? '#10b981' : '#9ca3af'), 
                fontWeight: isActive ? 700 : 600, fontSize: 13, 
                borderBottom: isActive ? '2px solid #2563eb' : 'none',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              {isCompleted ? <CheckCircle size={16} /> : <span>{step.id}</span>} 
              <span>{step.name}</span>
            </div>
          )
        })}
      </div>

      {activeStep === 3 && (
        <div className="table-card" style={{padding: 32}}>
          <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 32}}>Service Content & Details</h3>
          
          <div style={{marginBottom: 24}}>
            <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Display Name <span style={{color: '#ef4444'}}>*</span></label>
            <input type="text" value={serviceData.name} onChange={e=>setServiceData({...serviceData, name: e.target.value})} style={{width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none'}} />
          </div>

          <div style={{marginBottom: 24}}>
            <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Short Description <span style={{color: '#ef4444'}}>*</span></label>
            <input type="text" value={serviceData.shortDescription} onChange={e=>setServiceData({...serviceData, shortDescription: e.target.value})} style={{width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none'}} />
          </div>

          <div style={{marginBottom: 24}}>
            <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Detailed Description (Rich Text Field)</label>
            <div style={{border: '1px solid #e5e7eb', borderRadius: 8}}>
              <div style={{padding: '8px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 16}}>
                <b>B</b> <i>I</i> <u>U</u> <span>Link</span> <span>List</span>
              </div>
              <textarea rows={4} value={serviceData.description} onChange={e=>setServiceData({...serviceData, description: e.target.value})} style={{width: '100%', padding: '12px 16px', border: 'none', outline: 'none', resize: 'none'}} />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24}}>
            <div>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Service Type <span style={{color: '#ef4444'}}>*</span></label>
              <select value={serviceData.serviceType} onChange={e=>setServiceData({...serviceData, serviceType: e.target.value})} style={{width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none'}}>
                <option>Citizen-to-G</option>
              </select>
            </div>
            <div>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Estimated Turnaround Time (TAT) <span style={{color: '#ef4444'}}>*</span></label>
              <input type="text" defaultValue="5-7 working days" style={{width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none'}} />
            </div>
          </div>

          <div style={{marginBottom: 24}}>
            <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Department Role</label>
            <select value={serviceData.departmentRole} onChange={e=>setServiceData({...serviceData, departmentRole: e.target.value})} style={{width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none'}}>
              <option>ID Processing & Verification (ID-V)</option>
            </select>
          </div>

          <div style={{marginBottom: 24}}>
            <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Assigned Team / Operators</label>
            <div style={{display: 'flex', gap: 8}}>
              <span style={{background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: 16, fontSize: 12}}>Verify Unit North ⊗</span>
              <span style={{background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: 16, fontSize: 12}}>Priya Sharma ⊗</span>
            </div>
          </div>

          <div style={{marginBottom: 48}}>
            <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Search Keywords Tags</label>
            <div style={{display: 'flex', gap: 8}}>
              <span style={{background: '#f3f4f6', color: '#4b5563', padding: '4px 12px', borderRadius: 16, fontSize: 12}}>Aadhaar ⊗</span>
              <span style={{background: '#f3f4f6', color: '#4b5563', padding: '4px 12px', borderRadius: 16, fontSize: 12}}>Address ⊗</span>
              <span style={{background: '#f3f4f6', color: '#4b5563', padding: '4px 12px', borderRadius: 16, fontSize: 12}}>KYC ⊗</span>
            </div>
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid #e5e7eb'}}>
            <div style={{color: '#9ca3af', fontSize: 13}}>Step 3 of 9: Establish public metadata.</div>
            <div style={{display: 'flex', gap: 16}}>
              <button className="date-picker-btn">Save as Draft</button>
              <button className="action-btn" onClick={() => setActiveStep(4)}>Save & Continue</button>
            </div>
          </div>
        </div>
      )}

      {activeStep === 4 && (
        <div style={{display: 'grid', gridTemplateColumns: '250px 1fr 300px', gap: 24}}>
          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 14, fontWeight: 700, marginBottom: 16}}>Available Elements</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              {['Text Input', 'Number Input', 'Email Address', 'Password', 'Date Picker', 'Dropdown Select', 'File Upload', 'Checkbox Options', 'Radio Buttons'].map((el, i) => (
                <div key={i} style={{padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'move', background: '#f9fafb', color: '#4b5563'}}>
                  ≡ {el}
                </div>
              ))}
            </div>
          </div>
          
          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 14, fontWeight: 700, marginBottom: 16}}>Form Master Layout Structure</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: 16, minHeight: 400}}>
              {serviceData.formElements.map((el: any, i: number) => (
                <div key={i} style={{padding: '16px', border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                    <span style={{color: '#9ca3af'}}>≡</span>
                    <div>
                      <div style={{fontWeight: 600, fontSize: 14}}>{el.label} {el.required && <span style={{color: '#ef4444'}}>*</span>}</div>
                      <div style={{fontSize: 11, color: '#9ca3af'}}>{el.type}</div>
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: 16}}>
                    <Edit2 size={16} color="#2563eb" cursor="pointer" />
                    <Trash2 size={16} color="#ef4444" cursor="pointer" />
                  </div>
                </div>
              ))}
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid #e5e7eb'}}>
              <div style={{color: '#9ca3af', fontSize: 13}}>Step 4 of 9: Establish input form.</div>
              <div style={{display: 'flex', gap: 16}}>
                <button className="date-picker-btn">Save as Draft</button>
                <button className="action-btn" onClick={() => setActiveStep(5)}>Save & Continue</button>
              </div>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 14, fontWeight: 700, marginBottom: 24}}>Properties Panel</h3>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Field Display Label</label>
              <input type="text" defaultValue="Full Name" style={{width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none'}} />
            </div>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Helper / Placeholder</label>
              <input type="text" defaultValue="e.g. John Doe" style={{width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none'}} />
            </div>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Validation Options</label>
              <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8}}>
                <input type="checkbox" defaultChecked /> Required Field (Mandatory)
              </label>
              <select style={{width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none'}}>
                <option>Exact Match (Regex)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeStep === 5 && (
        <div className="table-card" style={{padding: 32}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700}}>Document Requirements & Limits</h3>
            <button className="action-btn">+ Add Required Document</button>
          </div>
          
          <table style={{width: '100%', fontSize: 13, textAlign: 'left', borderCollapse: 'collapse', marginBottom: 48}}>
            <thead>
              <tr>
                <th style={{paddingBottom: 16, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600}}>Document Type</th>
                <th style={{paddingBottom: 16, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600}}>Allowed Formats</th>
                <th style={{paddingBottom: 16, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600}}>Max Size</th>
                <th style={{paddingBottom: 16, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600}}>Mandatory</th>
                <th style={{paddingBottom: 16, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {serviceData.documents.map((doc: any, i: number) => (
                <tr key={i} style={{borderTop: '1px solid #e5e7eb'}}>
                  <td style={{padding: '16px 0', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center'}}>
                    <span style={{color: '#9ca3af'}}>📄</span> {doc.type}
                  </td>
                  <td style={{padding: '16px 0', color: '#6b7280'}}>{doc.formats}</td>
                  <td style={{padding: '16px 0', color: '#6b7280'}}>{doc.size}</td>
                  <td style={{padding: '16px 0'}}>
                    <span style={{background: doc.req === 'Required' ? '#fee2e2' : '#f3f4f6', color: doc.req === 'Required' ? '#ef4444' : '#6b7280', padding: '4px 12px', borderRadius: 12, fontWeight: 700, fontSize: 11}}>{doc.req}</span>
                  </td>
                  <td style={{padding: '16px 0', textAlign: 'right'}}>
                    <Edit2 size={16} color="#2563eb" cursor="pointer" style={{marginRight: 16}} />
                    <Trash2 size={16} color="#ef4444" cursor="pointer" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{color: '#9ca3af', fontSize: 13}}>Step 5 of 9: Establish applicant document file checklist.</div>
            <div style={{display: 'flex', gap: 16}}>
              <button className="date-picker-btn">Save as Draft</button>
              <button className="action-btn" onClick={() => setActiveStep(6)}>Save & Continue</button>
            </div>
          </div>
        </div>
      )}

      {activeStep === 6 && (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
            <div className="table-card" style={{padding: 24}}>
              <h3 style={{fontSize: 14, fontWeight: 700, marginBottom: 24}}>Base Pricing</h3>
              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Service Fee (₹)</label>
                <div style={{position: 'relative'}}>
                  <span style={{position: 'absolute', left: 12, top: 12, color: '#6b7280'}}>₹</span>
                  <input type="number" value={serviceData.pricing.fee} onChange={(e) => setServiceData({...serviceData, pricing: {...serviceData.pricing, fee: Number(e.target.value)}})} style={{width: '100%', padding: '12px 16px 12px 32px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none'}} />
                </div>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e5e7eb'}}>
                <div>
                  <div style={{fontWeight: 700, fontSize: 13, marginBottom: 4}}>Apply Taxes (GST 18%)</div>
                  <div style={{fontSize: 11, color: '#6b7280'}}>Standard tax charge computed dynamically</div>
                </div>
                <div style={{width: 36, height: 20, borderRadius: 12, background: '#2563eb', position: 'relative'}}>
                  <div style={{width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
                </div>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', padding: '12px 16px', borderRadius: 8}}>
                <span style={{fontWeight: 700, fontSize: 14}}>Total Citizen Price</span>
                <span style={{fontWeight: 700, fontSize: 18, color: '#2563eb'}}>₹{Math.round(serviceData.pricing.fee * 1.18)}</span>
              </div>
            </div>

            <div className="table-card" style={{padding: 24}}>
              <h3 style={{fontSize: 14, fontWeight: 700, marginBottom: 24}}>Payment Settings</h3>
              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Accepted Payment Methods</label>
                <div style={{display: 'flex', gap: 16, flexWrap: 'wrap'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2563eb', fontWeight: 600}}><input type="checkbox" defaultChecked /> Online Payment</label>
                  <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2563eb', fontWeight: 600}}><input type="checkbox" defaultChecked /> UPI</label>
                  <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280'}}><input type="checkbox" /> Demand Draft</label>
                  <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280'}}><input type="checkbox" /> Cash at Counter</label>
                </div>
              </div>
              <div>
                <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Refund & Cancellation Policy</label>
                <select style={{width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none', fontSize: 13}}>
                  <option>Non-refundable after processing starts</option>
                </select>
              </div>
            </div>
            
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <button className="date-picker-btn" onClick={() => setActiveStep(5)}>Back</button>
              <button className="date-picker-btn">Save as Draft</button>
              <button className="action-btn" onClick={() => setActiveStep(7)}>Save & Continue</button>
            </div>
          </div>

          <div className="table-card" style={{padding: 24, alignSelf: 'flex-start'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <h3 style={{fontSize: 14, fontWeight: 700}}>Additional Charges Table</h3>
              <span style={{color: '#2563eb', fontSize: 12, fontWeight: 700, cursor: 'pointer'}}>+ Add Charge</span>
            </div>
            
            <table style={{width: '100%', fontSize: 12, textAlign: 'left', borderCollapse: 'collapse'}}>
              <thead>
                <tr>
                  <th style={{paddingBottom: 16, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600}}>Name</th>
                  <th style={{paddingBottom: 16, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600}}>Amount</th>
                  <th style={{paddingBottom: 16, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600}}>Condition</th>
                  <th style={{paddingBottom: 16, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, textAlign: 'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {serviceData.pricing.charges.map((c: any, i: number) => (
                  <tr key={i} style={{borderTop: '1px solid #e5e7eb'}}>
                    <td style={{padding: '16px 0', fontWeight: 600}}>{c.name}</td>
                    <td style={{padding: '16px 0', fontWeight: 700}}>{c.amount}</td>
                    <td style={{padding: '16px 0', color: '#6b7280'}}>{c.condition}</td>
                    <td style={{padding: '16px 0', textAlign: 'right'}}>
                      <Edit2 size={14} color="#2563eb" cursor="pointer" style={{marginRight: 12}} />
                      <Trash2 size={14} color="#ef4444" cursor="pointer" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeStep === 7 && (
        <div style={{border: '1px solid #3b82f6', borderRadius: 8, padding: 32, background: '#f8fafc', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
          <h2 style={{fontSize: 20, fontWeight: 700, marginBottom: 8}}>Publish Service</h2>
          <p style={{color: '#6b7280', marginBottom: 24, fontSize: 13}}>Validate final system checks, set release parameters, and push the service to citizen portal.</p>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24}}>
            <div className="table-card" style={{padding: 24, background: 'white'}}>
              <h3 style={{fontSize: 14, fontWeight: 700, marginBottom: 16}}>Pre-Publish Readiness Checklist</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                <div style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13}}>
                  <CheckCircle size={16} color="#10b981" /> Main Service definition registered
                </div>
                <div style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13}}>
                  <CheckCircle size={16} color="#10b981" /> Sub Service configuration finalized
                </div>
                <div style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13}}>
                  <CheckCircle size={16} color="#10b981" /> Overview information complete
                </div>
                <div style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13}}>
                  <CheckCircle size={16} color="#10b981" /> Citizen Form Schema validated ({serviceData.formElements.length} inputs)
                </div>
                <div style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13}}>
                  <CheckCircle size={16} color="#10b981" /> Attachment requirements assigned ({serviceData.documents.length} files)
                </div>
                <div style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13}}>
                  <CheckCircle size={16} color="#10b981" /> Base pricing & tax configurations complete (₹{Math.round(serviceData.pricing.fee * 1.18)})
                </div>
                <div style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13}}>
                  <CheckCircle size={16} color="#10b981" /> Approval routing workflow compiled (5 nodes)
                </div>
              </div>
            </div>

            <div className="table-card" style={{padding: 24, background: 'white'}}>
              <h3 style={{fontSize: 14, fontWeight: 700, marginBottom: 16}}>Publishing Options</h3>
              
              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Portal Visibility</label>
                <select style={{width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none', fontSize: 13}}>
                  <option>All Citizens (Public Access)</option>
                </select>
              </div>

              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Effective Date</label>
                <div style={{position: 'relative'}}>
                  <input type="text" defaultValue="Immediately upon publishing" style={{width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none', fontSize: 13}} />
                  <span style={{position: 'absolute', right: 12, top: 10}}>📅</span>
                </div>
              </div>

              <div style={{marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start'}}>
                <div style={{width: 20, height: 20, borderRadius: 4, background: '#2563eb', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 12, marginTop: 2}}>✓</div>
                <div>
                  <div style={{fontWeight: 700, fontSize: 13}}>Notify Citizens & Staff</div>
                  <div style={{fontSize: 12, color: '#6b7280'}}>Dispatches automatic SMS/Email updates about the new service.</div>
                </div>
              </div>

              <div>
                <label style={{display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8}}>Target Environment</label>
                <div style={{display: 'flex', gap: 24}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13}}>
                    <input type="radio" name="env" defaultChecked style={{accentColor: '#2563eb'}} /> Production (Live Portal)
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280'}}>
                    <input type="radio" name="env" /> Staging Sandbox
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div style={{background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '16px 24px', display: 'flex', gap: 12, marginBottom: 24}}>
            <span style={{color: '#d97706'}}>⚠️</span>
            <div style={{fontSize: 13, color: '#4b5563'}}>
              <strong style={{color: '#111827'}}>Warning:</strong> Publishing this service makes it visible and accessible to over 10M+ citizens instantly on the main portal. Ensure all SLA constraints and verification authorities are properly notified.
            </div>
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid #e5e7eb'}}>
            <span style={{color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline'}} onClick={() => setActiveStep(6)}>Back to Preview</span>
            <div style={{display: 'flex', gap: 16}}>
              <button className="date-picker-btn">Schedule for Later</button>
              <button className="action-btn" onClick={handleSaveConfig}>Publish Service</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
