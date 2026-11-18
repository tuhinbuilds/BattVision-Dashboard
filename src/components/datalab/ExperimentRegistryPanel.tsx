import React, { useMemo, useState } from 'react';
import { Download, Plus, Search, X } from 'lucide-react';
import { BATTERY_PACK_SPEC } from '../../config/systemConfig';
import {
  ExperimentCategory,
  ExperimentSession,
} from '../../types/datalab';
import { DataSourceMode } from '../../types/telemetry';

interface ExperimentRegistryPanelProps {
  sessions: ExperimentSession[];
  dataSourceMode: DataSourceMode;
  onCreateSession: (session: ExperimentSession) => void;
  onUpdateSession: (updated: ExperimentSession) => void;
  onExportSession: (session: ExperimentSession) => void;
}

const CATEGORIES: ExperimentCategory[] = [
  'Initial characterisation',
  'Voltage monitoring',
  'Current monitoring',
  'Thermal monitoring',
  'Charge test',
  'Discharge test',
  'Capacity test',
  'Vibration monitoring',
  'General observation',
];

export const ExperimentRegistryPanel: React.FC<ExperimentRegistryPanelProps> = ({
  sessions,
  dataSourceMode,
  onCreateSession,
  onUpdateSession,
  onExportSession,
}) => {
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ExperimentCategory>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(sessions[0]?.id ?? null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  // Create form fields
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ExperimentCategory>('Voltage monitoring');
  const [newConditions, setNewConditions] = useState<string>('25 °C bench ambient · BV-PACK-8S4P');
  const [newDescription, setNewDescription] = useState<string>('');

  // Inline note & metadata edit state
  const [noteInput, setNoteInput] = useState<string>('');
  const [editingMeta, setEditingMeta] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editConditions, setEditConditions] = useState<string>('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (categoryFilter !== 'ALL' && s.category !== categoryFilter) return false;
      if (
        q &&
        !s.id.toLowerCase().includes(q) &&
        !s.title.toLowerCase().includes(q) &&
        !s.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [sessions, search, categoryFilter]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId]
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const nowIso = new Date().toISOString();
    const id = `EXP-${String(sessions.length + 1).padStart(3, '0')}`;
    const created: ExperimentSession = {
      id,
      title: newTitle.trim(),
      packId: BATTERY_PACK_SPEC.packId,
      startTimestamp: nowIso,
      endTimestamp: null,
      category: newCategory,
      description:
        newDescription.trim() ||
        'Local laboratory session record created in BattVision Data Laboratory.',
      testConditions: newConditions.trim() || 'Bench conditions not specified',
      dataSource: dataSourceMode === 'DEMO' ? 'DEMO' : 'UNAVAILABLE',
      sampleCount: 0,
      status: 'ACTIVE',
      notes: [
        dataSourceMode === 'DEMO'
          ? 'Created in DEMO mode (local volatile session - not a verified physical lab run).'
          : 'Created in HARDWARE mode (awaiting backend storage persistence).',
      ],
      simulated: dataSourceMode === 'DEMO',
    };
    onCreateSession(created);
    setSelectedId(created.id);
    setNewTitle('');
    setNewDescription('');
    setShowCreateForm(false);
  };

  const handleAddNote = () => {
    if (!selectedSession || !noteInput.trim()) return;
    onUpdateSession({
      ...selectedSession,
      notes: [...selectedSession.notes, `[${new Date().toTimeString().slice(0, 8)}] ${noteInput.trim()}`],
    });
    setNoteInput('');
  };

  const handleCloseExperiment = () => {
    if (!selectedSession || selectedSession.status === 'CLOSED') return;
    onUpdateSession({
      ...selectedSession,
      status: 'CLOSED',
      endTimestamp: new Date().toISOString(),
    });
  };

  const startEditing = () => {
    if (!selectedSession) return;
    setEditTitle(selectedSession.title);
    setEditConditions(selectedSession.testConditions);
    setEditingMeta(true);
  };

  const saveEdit = () => {
    if (!selectedSession || !editTitle.trim()) return;
    onUpdateSession({
      ...selectedSession,
      title: editTitle.trim(),
      testConditions: editConditions.trim(),
    });
    setEditingMeta(false);
  };

  return (
    <section className="bv-panel" aria-label="Experiment session registry">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className="status-led status-led--phosphor" />
          <h2 className="bv-panel-title">EXPERIMENT REGISTRY // Session Manager</h2>
          <span className="bv-badge bv-badge--muted">{sessions.length} SESSIONS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="bv-btn bv-btn--active"
            onClick={() => setShowCreateForm((v) => !v)}
          >
            <Plus size={12} />
            {showCreateForm ? 'Cancel New' : 'Create Experiment'}
          </button>
        </div>
      </div>

      {/* Create Experiment Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: '#191D1A',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '10px',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="micro-label" style={{ fontSize: '8.5px' }}>
              Experiment Title *
            </span>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. 0.5C Discharge Baseline Run"
              className="mono"
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-color)',
                padding: '6px 8px',
                fontSize: '11px',
                color: 'var(--text-primary)',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="micro-label" style={{ fontSize: '8.5px' }}>
              Category
            </span>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as ExperimentCategory)}
              className="mono"
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-color)',
                padding: '6px 8px',
                fontSize: '11px',
                color: 'var(--text-primary)',
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="micro-label" style={{ fontSize: '8.5px' }}>
              Test Conditions
            </span>
            <input
              type="text"
              value={newConditions}
              onChange={(e) => setNewConditions(e.target.value)}
              className="mono"
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-color)',
                padding: '6px 8px',
                fontSize: '11px',
                color: 'var(--text-primary)',
              }}
            />
          </label>

          <label style={{ gridColumn: '1 / 3', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="micro-label" style={{ fontSize: '8.5px' }}>
              Description
            </span>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Objective and instrumentation configuration..."
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-color)',
                padding: '6px 8px',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
              }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="submit" className="bv-btn bv-btn--active">
              Save Experiment Record
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter */}
      <div
        style={{
          padding: '9px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(19, 22, 20, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <select
          aria-label="Filter experiments by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | ExperimentCategory)}
          className="mono"
          style={{
            backgroundColor: 'var(--bg-recessed)',
            border: '1px solid var(--border-color)',
            padding: '5px 8px',
            fontSize: '10px',
            color: 'var(--text-primary)',
          }}
        >
          <option value="ALL">ALL CATEGORIES</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.toUpperCase()}
            </option>
          ))}
        </select>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-recessed)',
            border: '1px solid var(--border-color)',
            padding: '4px 8px',
          }}
        >
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search experiments..."
            aria-label="Search experiment sessions"
            className="mono"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '10.5px',
              width: '175px',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Split Table + Session Inspector */}
      <div
        className={`exp-split ${selectedSession ? 'exp-split--open' : ''}`}
        style={{
          display: 'grid',
          gridTemplateColumns: selectedSession ? 'minmax(0, 1fr) 360px' : 'minmax(0, 1fr)',
        }}
      >
        <style>{`
          @media (max-width: 1120px) {
            .exp-split--open {
              grid-template-columns: minmax(0, 1fr) !important;
            }
            .exp-inspector {
              border-left: none !important;
              border-top: 1px solid var(--border-color) !important;
            }
          }
        `}</style>

        <div style={{ overflowX: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="mono" style={{ padding: '32px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
              NO EXPERIMENT SESSIONS RECORDED - CREATE A NEW SESSION OR SWITCH TO DEMO MODE
            </div>
          ) : (
            <table className="bv-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title &amp; Category</th>
                  <th>Samples</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => {
                      setSelectedId(s.id);
                      setEditingMeta(false);
                    }}
                    style={{
                      cursor: 'pointer',
                      backgroundColor:
                        selectedId === s.id ? 'rgba(184, 214, 90, 0.08)' : undefined,
                    }}
                  >
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--warm-neutral)', whiteSpace: 'nowrap' }}>
                      {s.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{s.title}</div>
                      <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {s.category} · {s.packId}
                      </div>
                    </td>
                    <td className="mono">{s.sampleCount.toLocaleString()}</td>
                    <td>
                      <span className={`bv-badge ${s.simulated ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
                        {s.simulated ? 'DEMO' : s.dataSource}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`bv-badge ${
                          s.status === 'ACTIVE' ? 'bv-badge--phosphor' : 'bv-badge--muted'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Experiment Inspector Drawer */}
        {selectedSession && (
          <aside
            className="exp-inspector"
            style={{
              borderLeft: '1px solid var(--border-color)',
              backgroundColor: '#1B1F1C',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <div>
                <div className="micro-label" style={{ color: 'var(--phosphor-green)' }}>
                  EXPERIMENT INSPECTOR · {selectedSession.id}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '3px' }}>
                  {selectedSession.title}
                </div>
              </div>
              <button
                type="button"
                className="bv-btn"
                onClick={() => setSelectedId(null)}
                style={{ padding: '3px 5px' }}
                aria-label="Close experiment inspector"
              >
                <X size={13} />
              </button>
            </div>

            {editingMeta ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mono"
                  style={{
                    backgroundColor: 'var(--bg-recessed)',
                    border: '1px solid var(--border-color)',
                    padding: '6px 8px',
                    fontSize: '11px',
                  }}
                />
                <input
                  type="text"
                  value={editConditions}
                  onChange={(e) => setEditConditions(e.target.value)}
                  className="mono"
                  style={{
                    backgroundColor: 'var(--bg-recessed)',
                    border: '1px solid var(--border-color)',
                    padding: '6px 8px',
                    fontSize: '11px',
                  }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="bv-btn bv-btn--active" onClick={saveEdit}>
                    Save Changes
                  </button>
                  <button type="button" className="bv-btn" onClick={() => setEditingMeta(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mono" style={{ backgroundColor: 'var(--bg-recessed)', border: '1px solid var(--border-subtle)', padding: '9px', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>CATEGORY:</span> {selectedSession.category}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>START:</span> {selectedSession.startTimestamp.slice(0, 19).replace('T', ' ')}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>END:</span> {selectedSession.endTimestamp ? selectedSession.endTimestamp.slice(0, 19).replace('T', ' ') : 'ONGOING'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>CONDITIONS:</span> {selectedSession.testConditions}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>SAMPLES:</span> {selectedSession.sampleCount.toLocaleString()}</div>
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {selectedSession.description}
                </p>
              </>
            )}

            {/* Notes List + Add Note */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="micro-label">LAB NOTES ({selectedSession.notes.length})</span>
              <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedSession.notes.map((n, idx) => (
                  <div
                    key={idx}
                    className="mono"
                    style={{
                      fontSize: '10px',
                      color: 'var(--warm-neutral)',
                      backgroundColor: 'var(--bg-recessed)',
                      padding: '5px 7px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {n}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Append lab observation..."
                  className="mono"
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-recessed)',
                    border: '1px solid var(--border-color)',
                    padding: '5px 7px',
                    fontSize: '10.5px',
                  }}
                />
                <button type="button" className="bv-btn" onClick={handleAddNote}>
                  Add Note
                </button>
              </div>
            </div>

            {/* Session Actions */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              <button type="button" className="bv-btn" onClick={startEditing}>
                Edit Metadata
              </button>
              <button
                type="button"
                className="bv-btn bv-btn--amber"
                disabled={selectedSession.status === 'CLOSED'}
                onClick={handleCloseExperiment}
                style={{ opacity: selectedSession.status === 'CLOSED' ? 0.45 : 1 }}
              >
                Close Session
              </button>
              <button
                type="button"
                className="bv-btn bv-btn--active"
                onClick={() => onExportSession(selectedSession)}
              >
                <Download size={11} /> Export CSV
              </button>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
};
