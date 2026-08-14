import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Grid, UserSquare2, 
  ArrowLeftRight, Bell, HelpCircle, BarChart3, ShieldCheck, 
  Settings, Search, Sun, PanelLeftClose
} from 'lucide-react';

export default function Layout() {
  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Users size={20} />, label: 'User Management', path: '/users' },
    { icon: <FileText size={20} />, label: 'Applications', path: '/applications' },
    { icon: <Grid size={20} />, label: 'Services', path: '/services' },
    { icon: <UserSquare2 size={20} />, label: 'Operators', path: '/operators' },
    { icon: <ArrowLeftRight size={20} />, label: 'Transactions', path: '/transactions' },
    { icon: <Bell size={20} />, label: 'Notifications', path: '/notifications' },
    { icon: <HelpCircle size={20} />, label: 'Support Tickets', path: '/support' },
    { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/analytics' },
    { icon: <ShieldCheck size={20} />, label: 'Audit Logs', path: '/audit' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="brand">
          <span style={{color: '#2563eb'}}>Cyber</span><span style={{color: '#111827'}}>save</span>
        </div>
        
        {navItems.map((item, index) => (
          <NavLink key={index} to={item.path} className={({isActive}) => isActive ? "nav-item active" : "nav-item"} end={item.path === '/'}>
            {item.icon} {item.label}
          </NavLink>
        ))}

        <div className="sidebar-spacer"></div>
        <div className="collapse-menu">
          <PanelLeftClose size={20} /> Collapse Menu
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <div className="search-bar">
            <Search size={18} color="#6b7280" />
            <input type="text" placeholder="Search..." />
          </div>
          <div className="header-right">
            <div style={{fontSize: '14px', fontWeight: 500, color: '#6b7280'}}>EN</div>
            <Sun size={20} color="#6b7280" />
            <div style={{position: 'relative'}}>
              <Bell size={20} color="#6b7280" />
              <div style={{position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', fontSize: '10px', borderRadius: '50%', width: 14, height: 14, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>12</div>
            </div>
            <button className="action-btn">Quick Actions</button>
            <div className="profile-widget">
              <img src="https://i.pravatar.cc/150?img=11" alt="Profile" />
              <div className="profile-info">
                <span className="profile-name">Rajesh Kumar</span>
                <span className="profile-role">Super Admin</span>
              </div>
            </div>
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
