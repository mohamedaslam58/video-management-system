import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Camera, StreamingApi } from '../api/resources';

const statusColor: Record<string, string> = {
  online: 'bg-signal-green',
  offline: 'bg-signal-red',
  unknown: 'bg-slate-500',
};

export function CameraTile({ camera }: { camera: Camera }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: Hls | null = null;
    let cancelled = false;

    StreamingApi.live(camera.id)
      .then((data) => {
        if (cancelled) return;
        setLive(data.live);
        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
          hls = new Hls({ lowLatencyMode: true });
          hls.loadSource(data.hlsUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_evt, d) => {
            if (d.fatal) setError('Stream unavailable');
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = data.hlsUrl;
        } else {
          setError('HLS not supported in this browser');
        }
      })
      .catch(() => setError('Could not resolve live stream'));

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [camera.id]);

  return (
    <div className="relative bg-base-800 border border-base-700 rounded overflow-hidden group">
      <div className="aspect-video bg-black flex items-center justify-center">
        {error ? (
          <span className="text-xs text-slate-500">{error}</span>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2.5 py-1.5 bg-gradient-to-b from-black/70 to-transparent">
        <span className="text-xs font-medium text-slate-100 truncate">{camera.name}</span>
        <span
          className={`status-dot ${statusColor[camera.status] || statusColor.unknown}`}
          title={camera.status}
        />
      </div>
      {!error && !live && (
        <div className="absolute bottom-1.5 left-2.5 text-[10px] uppercase tracking-wide text-slate-400">
          Connecting…
        </div>
      )}
    </div>
  );
}
