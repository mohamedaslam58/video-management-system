import React, { useEffect, useState } from 'react';
import { Camera, CamerasApi } from '../api/resources';

const emptyForm = {
  name: '',
  location: '',
  rtspUrl: '',
  rtspUsername: '',
  rtspPassword: '',
  recordingMode: 'continuous',
  retentionDays: 30,
};

export default function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => CamerasApi.list().then(setCameras);
  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await CamerasApi.create(form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEnabled = async (cam: Camera) => {
    await CamerasApi.update(cam.id, { enabled: !cam.enabled });
    load();
  };

  const remove = async (cam: Camera) => {
    if (!confirm(`Remove camera "${cam.name}"? This stops recording immediately.`)) return;
    await CamerasApi.remove(cam.id);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-semibold text-slate-100">
          Camera Management
        </h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-sm bg-signal-amber text-base-950 font-semibold rounded px-4 py-2 hover:brightness-110"
        >
          {showForm ? 'Cancel' : '+ Add camera'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="bg-base-900 border border-base-700 rounded p-5 mb-6 grid grid-cols-2 gap-4"
        >
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <Field
            label="RTSP URL"
            value={form.rtspUrl}
            onChange={(v) => setForm({ ...form, rtspUrl: v })}
            placeholder="rtsp://192.168.1.50:554/stream1"
            required
            span2
          />
          <Field label="RTSP username" value={form.rtspUsername} onChange={(v) => setForm({ ...form, rtspUsername: v })} />
          <Field label="RTSP password" type="password" value={form.rtspPassword} onChange={(v) => setForm({ ...form, rtspPassword: v })} />
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">
              Recording mode
            </label>
            <select
              value={form.recordingMode}
              onChange={(e) => setForm({ ...form, recordingMode: e.target.value })}
              className="w-full bg-base-800 border border-base-600 rounded px-3 py-2 text-sm text-slate-100"
            >
              <option value="continuous">Continuous</option>
              <option value="motion">Motion-triggered</option>
              <option value="scheduled">Scheduled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <Field
            label="Retention (days)"
            type="number"
            value={String(form.retentionDays)}
            onChange={(v) => setForm({ ...form, retentionDays: Number(v) })}
          />
          <div className="col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-signal-amber text-base-950 font-semibold text-sm rounded px-4 py-2 hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save camera'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-base-900 border border-base-700 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-base-800 text-slate-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Location</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Recording</th>
              <th className="text-left px-4 py-2.5">Enabled</th>
              <th className="text-right px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map((cam) => (
              <tr key={cam.id} className="border-t border-base-700">
                <td className="px-4 py-2.5 text-slate-200">{cam.name}</td>
                <td className="px-4 py-2.5 text-slate-400">{cam.location || '—'}</td>
                <td className="px-4 py-2.5 capitalize text-slate-400">{cam.status}</td>
                <td className="px-4 py-2.5 capitalize text-slate-400">{cam.recordingMode}</td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => toggleEnabled(cam)}
                    className={`text-xs rounded px-2 py-1 ${
                      cam.enabled
                        ? 'bg-signal-green/15 text-signal-green'
                        : 'bg-slate-600/20 text-slate-400'
                    }`}
                  >
                    {cam.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => remove(cam)}
                    className="text-xs text-signal-red hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {cameras.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No cameras yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  span2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-base-800 border border-base-600 rounded px-3 py-2 text-sm text-slate-100 focus:border-signal-amber outline-none"
      />
    </div>
  );
}
