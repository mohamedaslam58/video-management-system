import React, { useState } from 'react';
import { SearchApi } from '../api/resources';

export default function Search() {
  const [kind, setKind] = useState<'events' | 'recordings'>('events');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { kind };
      if (from) params.from = new Date(from).toISOString();
      if (to) params.to = new Date(to).toISOString();
      if (kind === 'events' && eventType) params.eventType = eventType;
      if (kind === 'events' && severity) params.severity = severity;
      const data = await SearchApi.search(params);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="font-display text-xl font-semibold text-slate-100 mb-5">Search</h1>

      <div className="bg-base-900 border border-base-700 rounded p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Search</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
            className="bg-base-800 border border-base-600 rounded px-3 py-2 text-sm text-slate-100"
          >
            <option value="events">Events</option>
            <option value="recordings">Recordings</option>
          </select>
        </div>
        {kind === 'events' && (
          <>
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Event type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="bg-base-800 border border-base-600 rounded px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Any</option>
                <option value="motion">Motion</option>
                <option value="tamper">Tamper</option>
                <option value="camera_offline">Camera offline</option>
                <option value="camera_online">Camera online</option>
                <option value="disk_full">Disk full</option>
                <option value="manual_bookmark">Manual bookmark</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="bg-base-800 border border-base-600 rounded px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Any</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </>
        )}
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">From</label>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-base-800 border border-base-600 rounded px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">To</label>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-base-800 border border-base-600 rounded px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="bg-signal-amber text-base-950 font-semibold text-sm rounded px-4 py-2 hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      <div className="bg-base-900 border border-base-700 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-base-800 text-slate-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Time</th>
              <th className="text-left px-4 py-2.5">Camera</th>
              <th className="text-left px-4 py-2.5">
                {kind === 'events' ? 'Type / Severity' : 'Segment'}
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-t border-base-700">
                <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">
                  {new Date(r.occurredAt || r.startTime).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">
                  {(r.cameraId || '').slice(0, 8) || '—'}
                </td>
                <td className="px-4 py-2.5 text-slate-200 capitalize">
                  {kind === 'events'
                    ? `${r.type?.replace(/_/g, ' ')} · ${r.severity}`
                    : `${r.trigger} recording`}
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  Run a search to see results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
