import React, { useEffect, useState } from 'react';
import { Camera, CamerasApi, RecordingsApi } from '../api/resources';

interface Segment {
  id: string;
  startTime: string;
  endTime: string;
  trigger: string;
  url: string;
  thumbnailUrl: string | null;
}

export default function Playback() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    CamerasApi.list().then((cams) => {
      setCameras(cams);
      if (cams[0]) setCameraId(cams[0].id);
    });
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    setTo(now.toISOString().slice(0, 16));
    setFrom(hourAgo.toISOString().slice(0, 16));
  }, []);

  const search = async () => {
    if (!cameraId || !from || !to) return;
    setLoading(true);
    try {
      const results = await RecordingsApi.playback(
        cameraId,
        new Date(from).toISOString(),
        new Date(to).toISOString(),
      );
      setSegments(results);
      setActiveUrl(results[0]?.url || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="font-display text-xl font-semibold text-slate-100 mb-5">
        Playback
      </h1>

      <div className="bg-base-900 border border-base-700 rounded p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Camera</label>
          <select
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            className="bg-base-800 border border-base-600 rounded px-3 py-2 text-sm text-slate-100"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
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
          onClick={search}
          disabled={loading}
          className="bg-signal-amber text-base-950 font-semibold text-sm rounded px-4 py-2 hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Find recordings'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-base-900 border border-base-700 rounded overflow-hidden aspect-video flex items-center justify-center max-w-3xl">
          {activeUrl ? (
            <video src={activeUrl} controls className="w-full h-full object-contain bg-black" />
          ) : (
            <span className="text-sm text-slate-500">Select a segment to play back</span>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            Keyframe timeline {segments.length > 0 && `(${segments.length} segment${segments.length === 1 ? '' : 's'})`}
          </div>
          {segments.length === 0 ? (
            <div className="bg-base-900 border border-base-700 rounded p-4 text-sm text-slate-500">
              No segments found for this range yet.
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {segments.map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setActiveUrl(seg.url)}
                  className={`shrink-0 w-40 rounded overflow-hidden border transition ${
                    activeUrl === seg.url
                      ? 'border-signal-amber'
                      : 'border-base-700 hover:border-base-600'
                  }`}
                >
                  <div className="aspect-video bg-black flex items-center justify-center">
                    {seg.thumbnailUrl ? (
                      <img
                        src={seg.thumbnailUrl}
                        alt={`Keyframe at ${new Date(seg.startTime).toLocaleTimeString()}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-600">No preview</span>
                    )}
                  </div>
                  <div className="bg-base-800 px-2 py-1.5 text-left">
                    <div className="text-xs text-slate-200 font-mono">
                      {new Date(seg.startTime).toLocaleTimeString()}
                    </div>
                    <div className="text-[10px] text-slate-500 capitalize">{seg.trigger}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
