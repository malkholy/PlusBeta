import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function ItemLogisticsInquiry(props) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [selectedItemRow, setSelectedItemRow] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    setSelectedItemRow(null);
    try {
      const res = await apiCall('GetItemLogistics', { SearchItem: searchItem.trim() || null }, {}, 'logistics');
      if (res.State === 0) {
        setRows(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to retrieve item logistics records.');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setLoading(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    loadData();
  }

  function formatDate(dStr) {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dStr;
    }
  }

  // Aggregate rows by Item Code
  const gridRows = (() => {
    const grouped = {};
    rows.forEach(r => {
      const code = r.ItemCode || 'UNKNOWN';
      if (!grouped[code]) {
        grouped[code] = {
          ItemCode: code,
          ItemDescription: r.ItemDescription || '-',
          TotalQty: 0,
          Tracks: new Set(),
          Etas: [],
          Shipments: [],
          UOM: r.UOM || ''
        };
      }
      grouped[code].TotalQty += Number(r.Quantity || 0);
      if (r.TrackNumber) {
        grouped[code].Tracks.add(r.TrackNumber);
      }
      if (r.ETA) {
        grouped[code].Etas.push(r.ETA);
      }
      grouped[code].Shipments.push(r);
    });

    return Object.values(grouped).map(g => {
      const sortedEtas = g.Etas.filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
      return {
        ItemCode: g.ItemCode,
        ItemDescription: g.ItemDescription,
        TotalQty: g.TotalQty,
        TotalTracks: g.Tracks.size,
        EarliestETA: sortedEtas[0] || null,
        UOM: g.UOM,
        Shipments: g.Shipments
      };
    });
  })();

  // Calculate Metrics based on aggregated grid rows
  const metrics = (() => {
    const totalQty = gridRows.reduce((sum, r) => sum + r.TotalQty, 0);
    const uniqueItems = gridRows.length;
    const activeTracks = new Set(rows.map(r => r.TrackNumber).filter(Boolean)).size;

    return {
      totalQty,
      uniqueItems,
      activeTracks
    };
  })();

  const columns = [
    {
      key: 'ItemCode',
      label: 'Item Code',
      render: (val, row, search, highlight) => (
        <span style={{ fontWeight: 700 }}>
          {highlight(val, search)}
        </span>
      )
    },
    {
      key: 'ItemDescription',
      label: 'Item Description',
      render: (val, row, search, highlight) => highlight(val, search)
    },
    {
      key: 'TotalQty',
      label: 'Total Qty',
      render: (val, row) => (
        <div style={{ fontWeight: 700 }}>
          {Number(val || 0).toLocaleString()} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{row.UOM}</span>
        </div>
      )
    },
    {
      key: 'TotalTracks',
      label: 'Total Tracks',
      render: (val) => (
        <span style={{
          fontSize: 11,
          padding: '2.5px 8px',
          borderRadius: 6,
          background: 'var(--blue-soft)',
          color: 'var(--blue)',
          fontWeight: 700
        }}>
          {val} {val === 1 ? 'Track' : 'Tracks'}
        </span>
      )
    },
    {
      key: 'EarliestETA',
      label: 'Earliest ETA',
      render: (val) => formatDate(val)
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Search Panel */}
      <form onSubmit={handleSearch} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 20,
        boxShadow: 'var(--shadow)',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-end',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Search Item (Code or Description)
          </label>
          <input 
            type="text"
            placeholder="e.g. RAW0012, packing, etc..."
            value={searchItem}
            onChange={e => setSearchItem(e.target.value)}
            style={{
              width: '100%',
              height: 38,
              padding: '0 12px',
              border: '1.5px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text)',
              background: 'var(--bg)',
              outline: 'none'
            }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{
            height: 38,
            padding: '0 24px',
            background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px var(--orange-glow)'
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

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
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Quantity</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>
            {metrics.totalQty.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Unique Items</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)', marginTop: 6 }}>
            {metrics.uniqueItems.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Active Shipments</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)', marginTop: 6 }}>
            {metrics.activeTracks.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Grid and Details Panel */}
      <div style={{ display: 'flex', flex: 1, gap: 20, minHeight: 0, width: '100%' }}>
        <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
          <DataGrid
            title="Item Logistics Records"
            subtitle="Overview of item shipments and statuses"
            columns={columns}
            rows={gridRows}
            loading={loading}
            onRowClick={(row) => setSelectedItemRow(row)}
            hideHeader={false}
            hideSearch={false}
            hideRefresh={false}
            onRefresh={() => loadData()}
          />
        </div>

        {selectedItemRow && (
          <div style={{
            width: 380,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            padding: 18,
            minHeight: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Item Shipments</h3>
              <button 
                onClick={() => setSelectedItemRow(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: 'var(--muted)'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{selectedItemRow.ItemCode}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: '1.4' }}>{selectedItemRow.ItemDescription}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedItemRow.Shipments.map((s, idx) => (
                <div key={idx} style={{
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 12,
                  background: 'var(--bg)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span 
                      style={{ fontWeight: 800, color: 'var(--orange)', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}
                      onClick={() => {
                        sessionStorage.setItem('selectedTrackNumber', s.TrackNumber);
                        if (props.openPage) props.openPage('logistics_track_details');
                      }}
                    >
                      Track: {s.TrackNumber}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
                      {Number(s.Quantity).toLocaleString()} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{s.UOM}</span>
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text)', marginBottom: 5 }}>
                    <strong>PO:</strong> {s.PurchaseOrderNumber || '-'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text)', marginBottom: 5 }}>
                    <strong>ETA:</strong> {formatDate(s.ETA)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text)' }}>
                    <strong>State:</strong> <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--soft)', color: 'var(--muted)', fontWeight: 600, marginLeft: 4 }}>{s.StateDescription || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
