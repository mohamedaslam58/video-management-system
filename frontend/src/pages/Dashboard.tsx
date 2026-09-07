import React, { useEffect, useState } from 'react';
import { Camera, CamerasApi } from '../api/resources';
import { CameraTile } from '../components/CameraTile';

export default function Dashboard() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CamerasApi.list()
      .then(setCameras)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl font-semibold text-slate-100">
            Live Monitoring
          </h1>
          <p className="text-sm text-slate-500">
            {cameras.length} camera{cameras.length === 1 ? '' : 's'} in view
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading cameras…</div>
      ) : cameras.length === 0 ? (
        <div className="text-slate-500 text-sm border border-dashed border-base-700 rounded p-8 text-center">
          No cameras registered yet. An admin can add cameras from the Cameras page.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {cameras.map((cam) => (
            <CameraTile key={cam.id} camera={cam} />
          ))}
        </div>
      )}
    </div>
  );
}
