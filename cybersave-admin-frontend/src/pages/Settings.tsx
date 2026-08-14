import React from 'react';

export default function Settings() {
  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Settings</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Portal Settings</h1>
          <p>Configure your account settings, notification parameters, security controls, and workflow preferences.</p>
        </div>
      </div>

      <div style={{display: 'flex', gap: 24}}>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 24}}>
          
          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 8}}>Profile Settings</h3>
            <p style={{fontSize: 13, color: '#6b7280', marginBottom: 24}}>Manage your public profile identity and administrative metadata.</p>
            
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24}}>
              <img src="https://i.pravatar.cc/150?img=11" alt="Profile" style={{width: 64, height: 64, borderRadius: '50%'}} />
              <div>
                <div style={{display: 'flex', gap: 8, marginBottom: 4}}>
                  <button className="action-btn" style={{padding: '6px 12px'}}>Change Photo</button>
                  <button className="date-picker-btn" style={{padding: '6px 12px'}}>Remove</button>
                </div>
                <div style={{fontSize: 11, color: '#6b7280'}}>JPG, GIF or PNG. Max size of 800K</div>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Full Name</label>
                <input type="text" defaultValue="Rajesh Kumar" style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Email Address</label>
                <input type="text" defaultValue="rajesh.kumar@cybersave.gov.in" style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Phone Number</label>
                <input type="text" defaultValue="+91 98765 43210" style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Role / Designation</label>
                <input type="text" defaultValue="Super Admin" style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
              </div>
            </div>
            
            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
              <button className="action-btn">Save Profile Changes</button>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 8}}>Security Credentials</h3>
            <p style={{fontSize: 13, color: '#6b7280', marginBottom: 24}}>Update your security password and manage active multifactor authentication protocols.</p>
            
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Current Password</label>
              <input type="password" defaultValue="password" style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24}}>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>New Password</label>
                <input type="password" placeholder="At least 8 characters" style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Confirm New Password</label>
                <input type="password" placeholder="Confirm your new password" style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div>
                <h4 style={{fontSize: 14, fontWeight: 700}}>Two-Factor Authentication (2FA)</h4>
                <p style={{fontSize: 12, color: '#6b7280'}}>Secure your administrative console with mandatory authentication checks.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#10b981', position: 'relative'}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
              <button className="action-btn">Update Password</button>
            </div>
          </div>
        </div>

        <div style={{width: 400, display: 'flex', flexDirection: 'column', gap: 24}}>
          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 8}}>Notification Preferences</h3>
            <p style={{fontSize: 13, color: '#6b7280', marginBottom: 24}}>Choose how and when you receive system and document-level alert signals.</p>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div style={{paddingRight: 16}}>
                <h4 style={{fontSize: 13, fontWeight: 700}}>Email Notifications</h4>
                <p style={{fontSize: 11, color: '#6b7280'}}>Receive daily status logs and summary digests in your email inbox.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#10b981', position: 'relative', flexShrink: 0}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div style={{paddingRight: 16}}>
                <h4 style={{fontSize: 13, fontWeight: 700}}>Push Notifications</h4>
                <p style={{fontSize: 11, color: '#6b7280'}}>Allow browser instant popups for critical document verifications.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#e5e7eb', position: 'relative', flexShrink: 0}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 2}}></div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div style={{paddingRight: 16}}>
                <h4 style={{fontSize: 13, fontWeight: 700}}>Document Upload Alerts</h4>
                <p style={{fontSize: 11, color: '#6b7280'}}>Get notified instantly when standard operators submit upload batches.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#10b981', position: 'relative', flexShrink: 0}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div style={{paddingRight: 16}}>
                <h4 style={{fontSize: 13, fontWeight: 700}}>Expiry Reminders</h4>
                <p style={{fontSize: 11, color: '#6b7280'}}>Receive notice sequences 30 days before document validity expires.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#10b981', position: 'relative', flexShrink: 0}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{paddingRight: 16}}>
                <h4 style={{fontSize: 13, fontWeight: 700}}>System Updates</h4>
                <p style={{fontSize: 11, color: '#6b7280'}}>Stay informed about platform performance updates and regular system maintenance.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#e5e7eb', position: 'relative', flexShrink: 0}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 2}}></div>
              </div>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 8}}>Localization & Theme</h3>
            <p style={{fontSize: 13, color: '#6b7280', marginBottom: 24}}>Customize the default language, regional standard timeline, and color display theme.</p>

            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Default Language</label>
              <select style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}}>
                <option>English (United States) - EN</option>
              </select>
            </div>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Regional Timezone</label>
              <select style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}}>
                <option>(GMT+05:30) India Standard Time - IST</option>
              </select>
            </div>
            <div>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Active Color Theme</label>
              <select style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}}>
                <option>Follow System Default Theme</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
