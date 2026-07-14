import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function CodeSerials(props) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add Serial Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [addFormData, setAddFormData] = useState({
    CardType: '',
    FromSerial: '',
    ToSerial: '',
    DeliverdDate: new Date().toISOString().split('T')[0],
    Note: ''
  });

  const [cardTypes, setCardTypes] = useState([]);

  useEffect(() => {
    loadData();
    loadCardTypes();
  }, []);

  async function loadCardTypes() {
    try {
      const res = await apiCall('Get Card Types', null, {}, 'express_codes');
      if (res.State === 0) {
        setCardTypes(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load card types:', e.message);
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Serials', null, {}, 'express_codes');
      if (res.State === 0 || res.List0) {
        const list = res.List0 || [];
        setRows(list);

        if (list.length > 0) {
          // Generate columns dynamically from the first record's keys
          const keys = Object.keys(list[0]);
          const cols = keys.map(k => {
            const label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
            return {
              key: k,
              label: label.charAt(0).toUpperCase() + label.slice(1),
              render: (val, row, search, highlight) => {
                if (val === true || String(val).toLowerCase() === 'true') {
                  return (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--green)',
                      background: 'var(--green-soft)',
                      padding: '3px 8px',
                      borderRadius: 6
                    }}>
                      Yes
                    </span>
                  );
                }
                if (val === false || String(val).toLowerCase() === 'false') {
                  return (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--muted)',
                      background: 'var(--soft)',
                      padding: '3px 8px',
                      borderRadius: 6
                    }}>
                      No
                    </span>
                  );
                }
                if (k.toLowerCase() === 'serialstate') {
                  const stateVal = Number(val);
                  let label = 'Unknown';
                  let color = 'var(--muted)';
                  let bg = 'var(--soft)';
                  if (stateVal === 0) {
                    label = 'New';
                    color = 'var(--blue)';
                    bg = 'var(--blue-soft)';
                  } else if (stateVal === 1) {
                    label = 'Requested';
                    color = 'var(--orange)';
                    bg = 'var(--orange-soft)';
                  } else if (stateVal === 2) {
                    label = 'Processing';
                    color = 'var(--amber)';
                    bg = 'var(--amber-soft)';
                  } else if (stateVal === 3) {
                    label = 'Generated';
                    color = 'var(--green)';
                    bg = 'var(--green-soft)';
                  } else if (stateVal === 4) {
                    label = 'Moved';
                    color = '#6366f1';
                    bg = '#e0e7ff';
                  }
                  return (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color,
                      background: bg,
                      padding: '3px 8px',
                      borderRadius: 6
                    }}>
                      {label}
                    </span>
                  );
                }
                if (k.toLowerCase().includes('serial') && val !== null && val !== '' && !isNaN(val)) {
                  return highlight(Number(val).toLocaleString('en-US'), search);
                }
                if (k.toLowerCase().includes('date') && val) {
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    }
                  } catch (e) {}
                }
                return highlight(String(val ?? '-'), search);
              }
            };
          });
          // Move SerialState to the first position
          const stateColIndex = cols.findIndex(c => c.key.toLowerCase() === 'serialstate');
          if (stateColIndex > -1) {
            const [stateCol] = cols.splice(stateColIndex, 1);
            cols.unshift(stateCol);
          }

          setColumns(cols);
        }
      } else {
        setError(res.Message || 'Failed to retrieve code serials.');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setLoading(false);
  }

  async function handleRequestSerial(id) {
    if (!window.confirm('Are you sure you want to request this serial? This will advance its state to Requested.')) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Request Serial', { ID: id }, {}, 'express_codes');
      if (res.State === 0) {
        loadData();
      } else {
        setError(res.Message || 'Failed to request serial.');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setLoading(false);
  }

  async function handleMoveSerial(id) {
    if (!window.confirm('Are you sure you want to move this serial? This will advance its state to Moved.')) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Move Serial', { ID: id }, {}, 'express_codes');
      if (res.State === 0) {
        loadData();
      } else {
        setError(res.Message || 'Failed to move serial.');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setLoading(false);
  }

  async function handleCreateSerial(e) {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');
    try {
      const payload = {
        CardType: addFormData.CardType,
        FromSerial: Number(addFormData.FromSerial),
        ToSerial: Number(addFormData.ToSerial),
        DeliverdDate: addFormData.DeliverdDate ? new Date(addFormData.DeliverdDate).toISOString() : null,
        Note: addFormData.Note
      };

      const res = await apiCall('New Serial', payload, {}, 'express_codes');
      if (res.State === 0) {
        setShowAddModal(false);
        // Reset Form
        setAddFormData({
          CardType: '',
          FromSerial: '',
          ToSerial: '',
          DeliverdDate: new Date().toISOString().split('T')[0],
          Note: ''
        });
        loadData();
      } else {
        setModalError(res.Message || 'Failed to create card serial.');
      }
    } catch (err) {
      setModalError('Connection error: ' + err.message);
    }
    setSubmitting(false);
  }

  // Derived KPI Metrics
  const metrics = (() => {
    const total = rows.length;
    const requested = rows.filter(r => Number(r.SerialState) === 1).length;
    const processing = rows.filter(r => Number(r.SerialState) === 2).length;
    const generated = rows.filter(r => Number(r.SerialState) === 3).length;
    const moved = rows.filter(r => Number(r.SerialState) === 4).length;
    return {
      total,
      requested,
      processing,
      generated,
      moved
    };
  })();

  const serialDiff = (() => {
    const from = Number(addFormData.FromSerial);
    const to = Number(addFormData.ToSerial);
    if (!isNaN(from) && !isNaN(to) && to >= from && addFormData.FromSerial !== '' && addFormData.ToSerial !== '') {
      return (to - from + 1).toLocaleString('en-US');
    }
    return null;
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && (
        <div style={{ marginBottom: 20, background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)', padding: 12, borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Serials</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>
            {metrics.total.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Requested</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)', marginTop: 6 }}>
            {metrics.requested.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Processing</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--amber)', marginTop: 6 }}>
            {metrics.processing.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Generated</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', marginTop: 6 }}>
            {metrics.generated.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Moved</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1', marginTop: 6 }}>
            {metrics.moved.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Code Serials Registry"
          subtitle="Express cards serial numbers and usage logs"
          columns={columns}
          rows={rows}
          loading={loading}
          hideHeader={false}
          hideSearch={false}
          hideRefresh={false}
          onRefresh={loadData}
          onAdd={() => setShowAddModal(true)}
          extraRowActions={[
            {
              label: '⚡ Request Serial',
              show: (row) => row.SerialState === 0,
              onClick: (row) => handleRequestSerial(row.ID)
            },
            {
              label: '🚚 Move Serial',
              show: (row) => row.SerialState === 3,
              onClick: (row) => handleMoveSerial(row.ID)
            }
          ]}
        />
      </div>

      {/* Add Serial Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            width: 'min(480px, calc(100vw - 28px))',
            background: 'var(--surface)',
            borderRadius: 22,
            boxShadow: 'var(--shadow)',
            padding: 24,
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Create New Serial</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)', outline: 'none' }}
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div style={{ marginBottom: 16, background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)', padding: 10, borderRadius: 8, fontSize: 12.5 }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSerial}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Card Type
                </label>
                <select 
                  value={addFormData.CardType}
                  onChange={e => setAddFormData({ ...addFormData, CardType: e.target.value })}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--text)',
                    background: 'var(--bg)',
                    outline: 'none'
                  }}
                  required
                >
                  <option value="">Select Card Type</option>
                  {cardTypes.map(c => (
                    <option key={c.CardType} value={c.CardType}>
                      {c.Description ? `${c.CardType} - ${c.Description}` : c.CardType}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    From Serial
                  </label>
                  <input 
                    type="number"
                    value={addFormData.FromSerial}
                    onChange={e => setAddFormData({ ...addFormData, FromSerial: e.target.value })}
                    placeholder="e.g. 1"
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      border: '1.5px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 13,
                      color: 'var(--text)',
                      background: 'var(--bg)',
                      outline: 'none'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    To Serial
                  </label>
                  <input 
                    type="number"
                    value={addFormData.ToSerial}
                    onChange={e => setAddFormData({ ...addFormData, ToSerial: e.target.value })}
                    placeholder="e.g. 1000000"
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      border: '1.5px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 13,
                      color: 'var(--text)',
                      background: 'var(--bg)',
                      outline: 'none'
                    }}
                    required
                  />
                </div>
              </div>

              {serialDiff !== null && (
                <div style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  background: 'var(--primary-soft)',
                  color: 'var(--primary-dark)',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid rgba(249,115,22,0.15)'
                }}>
                  <span>Total Code Count:</span>
                  <span style={{ fontSize: 15, fontWeight: 900 }}>{serialDiff} cards</span>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Delivered Date
                </label>
                <input 
                  type="date"
                  value={addFormData.DeliverdDate}
                  onChange={e => setAddFormData({ ...addFormData, DeliverdDate: e.target.value })}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--text)',
                    background: 'var(--bg)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Note
                </label>
                <textarea 
                  value={addFormData.Note}
                  onChange={e => setAddFormData({ ...addFormData, Note: e.target.value })}
                  placeholder="Optional notes..."
                  style={{
                    width: '100%',
                    height: 60,
                    padding: '8px 12px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--text)',
                    background: 'var(--bg)',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={{
                    height: 38,
                    padding: '0 18px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{
                    height: 38,
                    padding: '0 20px',
                    border: 0,
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: '#fff',
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: 13,
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Serial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
