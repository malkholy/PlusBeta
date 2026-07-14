import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function CodeSerials(props) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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
                if (val === true || val === 1 || String(val).toLowerCase() === 'true') {
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
                if (val === false || val === 0 || String(val).toLowerCase() === 'false') {
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

  // Derived KPI Metrics
  const metrics = (() => {
    const total = rows.length;
    // Find active/used counts if columns are present
    const usedCol = Object.keys(rows[0] || {}).find(k => k.toLowerCase() === 'isused' || k.toLowerCase() === 'used' || k.toLowerCase() === 'status');
    let usedCount = 0;
    if (usedCol) {
      usedCount = rows.filter(r => {
        const v = r[usedCol];
        return v === true || v === 1 || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'used';
      }).length;
    }
    return {
      total,
      used: usedCount,
      active: total - usedCount,
      hasStatus: !!usedCol
    };
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 20,
        marginBottom: 20
      }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Serials</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>
            {metrics.total.toLocaleString()}
          </div>
        </div>

        {metrics.hasStatus && (
          <>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Active Serials</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', marginTop: 6 }}>
                {metrics.active.toLocaleString()}
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Used Serials</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)', marginTop: 6 }}>
                {metrics.used.toLocaleString()}
              </div>
            </div>
          </>
        )}
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
        />
      </div>
    </div>
  );
}
