import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function ItemLogisticsInquiry(props) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchItem, setSearchItem] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
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

  // Calculate Metrics
  const metrics = (() => {
    const totalQty = rows.reduce((sum, r) => sum + Number(r.Quantity || 0), 0);
    const uniqueTracks = new Set(rows.map(r => r.TrackNumber).filter(Boolean)).size;
    
    const etas = rows.map(r => r.ETA).filter(Boolean);
    const earliestEta = etas.length > 0 ? etas.sort((a, b) => new Date(a) - new Date(b))[0] : null;

    return {
      totalQty,
      uniqueTracks,
      earliestEta
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
      key: 'TrackNumber',
      label: 'Track Number',
      render: (val, row, search, highlight) => (
        <span 
          style={{ fontWeight: 800, color: 'var(--orange)', cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => {
            sessionStorage.setItem('selectedTrackNumber', val);
            if (props.openPage) props.openPage('logistics_track_details');
          }}
        >
          {highlight(val, search)}
        </span>
      )
    },
    {
      key: 'PurchaseOrderNumber',
      label: 'PO Number',
      render: (val, row, search, highlight) => highlight(val, search)
    },
    {
      key: 'Quantity',
      label: 'Quantity',
      render: (val, row) => (
        <div style={{ fontWeight: 700 }}>
          {Number(val || 0).toLocaleString()} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{row.UOM || ''}</span>
        </div>
      )
    },
    {
      key: 'StateDescription',
      label: 'Tracking State',
      render: (val, row, search, highlight) => (
        <span style={{
          fontSize: 11,
          padding: '2.5px 8px',
          borderRadius: 6,
          background: 'var(--soft)',
          color: 'var(--muted)',
          fontWeight: 600
        }}>
          {highlight(val || 'N/A', search)}
        </span>
      )
    },
    {
      key: 'ETA',
      label: 'ETA',
      render: (val) => formatDate(val)
    },
    {
      key: 'VendorName',
      label: 'Vendor Name',
      render: (val, row, search, highlight) => highlight(val || row.VendorNumber || '-', search)
    },
    {
      key: 'BLNumber',
      label: 'BL Number',
      render: (val, row, search, highlight) => highlight(val, search)
    },
    {
      key: 'ClearingAgentName',
      label: 'Clearing Agent',
      render: (val, row, search, highlight) => highlight(val, search)
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
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Shipments Carrying Item</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)', marginTop: 6 }}>
            {metrics.uniqueTracks}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Earliest Expected Arrival</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)', marginTop: 6 }}>
            {formatDate(metrics.earliestEta)}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', flex: 1, gap: 20, minHeight: 0, width: '100%' }}>
        <DataGrid
          title="Item Logistics Records"
          subtitle="Overview of item shipments and statuses"
          columns={columns}
          rows={rows}
          loading={loading}
          hideHeader={false}
          hideSearch={false}
          hideRefresh={false}
          onRefresh={() => loadData()}
        />
      </div>
    </div>
  );
}
