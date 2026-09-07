import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { EventsApi, VmsEvent } from '../api/resources';

const severityStyle: Record<string, string> = {
  info: 'bg-signal-blue/15 text-signal-blue',
  warning: 'bg-signal-amber/15 text-signal-amber',
  critical: 'bg-signal-red/15 text-signal-red',
};

export default function Events() {
  const [events, setEvents] = useState<VmsEvent[]>([]);

  useEffect(() => {
    EventsApi.list().then(setEvents);

    const token = localStorage.getItem('vms_access_token');
    const socket: Socket = io('/events', { path: '/socket.io', query: { token } });
    socket.on('event', (evt: VmsEvent) => {
      setEvents((prev) => [evt, ...prev].slice(0, 200));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const ack = async (id: string) => {
    await EventsApi.acknowledge(id);
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, acknowledged: true } : e)),
    );
  };

  return (
    <div className="p-6">
      <h1 className="font-display text-xl font-semibold text-slate-100 mb-5">
        Events
      </h1>

      <div className="bg-base-900 border border-base-700 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-base-800 text-slate-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Time</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-left px-4 py-2.5">Severity</th>
              <th className="text-left px-4 py-2.5">Camera</th>
              <th className="text-right px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt) => (
              <tr key={evt.id} className="border-t border-base-700">
                <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">
                  {new Date(evt.occurredAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-slate-200 capitalize">
                  {evt.type.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs rounded px-2 py-0.5 ${severityStyle[evt.severity]}`}>
                    {evt.severity}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">
                  {evt.cameraId?.slice(0, 8) || '—'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {evt.acknowledged ? (
                    <span className="text-xs text-slate-500">Acknowledged</span>
                  ) : (
                    <button
                      onClick={() => ack(evt.id)}
                      className="text-xs text-signal-amber hover:underline"
                    >
                      Acknowledge
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
