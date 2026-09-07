import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Live Monitoring', icon: '◉', roles: ['admin', 'operator', 'viewer'] },
  { to: '/playback', label: 'Playback', icon: '▶', roles: ['admin', 'operator', 'viewer'] },
  { to: '/events', label: 'Events', icon: '▲', roles: ['admin', 'operator', 'viewer'] },
  { to: '/search', label: 'Search', icon: '⌕', roles: ['admin', 'operator', 'viewer'] },
  { to: '/cameras', label: 'Cameras', icon: '▦', roles: ['admin'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-56 shrink-0 bg-base-900 border-r border-base-700 flex flex-col">
      <div className="px-5 py-5 border-b border-base-700">
        <div className="font-display text-lg font-bold tracking-wide text-slate-100">
          SENTRY<span className="text-signal-amber">VMS</span>
        </div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-0.5">
          Control Room
        </div>
      </div>

      <nav className="flex-1 py-4">
        {navItems
          .filter((item) => item.roles.includes(user?.role || 'viewer'))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors border-l-2 ${
                  isActive
                    ? 'border-signal-amber text-slate-50 bg-base-800'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-base-800/60'
                }`
              }
            >
              <span className="w-4 text-center text-signal-amber">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="px-5 py-4 border-t border-base-700">
        <div className="text-sm text-slate-300">{user?.fullName}</div>
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">
          {user?.role}
        </div>
        <button
          onClick={logout}
          className="text-xs text-slate-400 hover:text-signal-red transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
