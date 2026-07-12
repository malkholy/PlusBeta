import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getMonthBeginString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
};

export default function TrackingHistory(props) {
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [error, setError] = useState('');
  
  // Filter states
  const [trackNumber, setTrackNumber] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [fromDate, setFromDate] = useState(getMonthBeginString());
  const [toDate, setToDate] = useState(getTodayString());

  const columns = [
    {
      key: 'TrackNumber',
      label: 'Track Number',
      render: (val, row) => (
        <span style={{ fontWeight: 700 }}>
          {val} {row.IsLocked ? '🔒' : ''}
        </span>
      )
    },
    {
      key: 'VendorName',
      label: 'Vendor Name',
      render: (val, row) => val || row.VendorNumber || '-'
    },
    {
      key: 'ForwarderName',
      label: 'Forwarder Name'
    },
    {
      key: 'ETA',
      label: 'ETA',
      render: (val) => formatDate(val)
    },
    {
      key: 'TotalAmount',
      label: 'Total Amount',
      render: (val, row) => (
        <div style={{ fontWeight: 700 }}>
          {Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{row.Currency}</span>
        </div>
      )
    },
    {
      key: 'ShipmentStateDescription',
      label: 'Shipment State',
      render: (val) => (
        <span style={{
          fontSize: 11,
          padding: '2.5px 8px',
          borderRadius: 6,
          background: 'var(--blue-soft)',
          color: 'var(--blue)',
          fontWeight: 600
        }}>
          {val || 'Unknown'}
        </span>
      )
    },
    {
      key: 'StateDescription',
      label: 'Tracking State',
      render: (val) => (
        <span style={{
          fontSize: 11,
          padding: '2.5px 8px',
          borderRadius: 6,
          background: 'var(--soft)',
          color: 'var(--muted)',
          fontWeight: 600
        }}>
          {val || 'N/A'}
        </span>
      )
    },
    {
      key: 'IsLocked',
      label: 'Status',
      render: (val) => (
        val ? (
          <span style={{ color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>✓ Locked</span>
        ) : (
          <span style={{ color: 'var(--orange)', fontSize: 11, fontWeight: 700 }}>• Active</span>
        )
      )
    }
  ];

  useEffect(() => {
    loadVendors();
    // Use helper dates directly on first load to prevent race condition on initial render closure
    loadData(getMonthBeginString(), getTodayString());
  }, []);

  async function loadVendors() {
    setLoadingVendors(true);
    try {
      const res = await apiCall('GetVendors', null, {}, 'purchasing');
      if (res.State === 0) {
        setVendors(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load vendors lookup:', e);
    }
    setLoadingVendors(false);
  }

  async function loadData(overrideFromDate, overrideToDate) {
    setLoading(true);
    setError('');
    try {
      const payload = {
        TrackNumber: trackNumber.trim() || null,
        VendorNumber: selectedVendor || null,
        FromDate: overrideFromDate !== undefined ? overrideFromDate : (fromDate || null),
        ToDate: overrideToDate !== undefined ? overrideToDate : (toDate || null)
      };

      const res = await apiCall('GetTrackingHistory', payload, {}, 'logistics');
      if (res.State === 0) {
        setRows(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to retrieve tracking history.');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setLoading(false);
  }

  // Calculate Metrics
  const metrics = (() => {
    const total = rows.length;
    const locked = rows.filter(r => r.IsLocked).length;
    const uniqueTrackNumbers = new Set(rows.map(r => r.TrackNumber)).size;
    
    // Total cost sum
    const totalValue = rows.reduce((sum, r) => sum + Number(r.TotalAmount || 0), 0);
    
    return {
      total,
      locked,
      uniqueTrackNumbers,
      totalValue
    };
  })();

  function formatDate(dStr) {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return dStr;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Title bar */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Logistics Tracking History</h2>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
          Monitor shipping states, custom clearances, bank courier releases, and tracking metrics.
        </p>
      </div>

      {/* Filter panel */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 20,
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Tracking Number
          </label>
          <input 
            type="text"
            placeholder="e.g. TRK12930..."
            value={trackNumber}
            onChange={e => setTrackNumber(e.target.value)}
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

        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Vendor
          </label>
          <select
            value={selectedVendor}
            onChange={e => setSelectedVendor(e.target.value)}
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
          >
            <option value="">All Vendors</option>
            {vendors.map(v => (
              <option key={v.VendorNumber} value={v.VendorNumber}>
                {v.VendorName} ({v.VendorNumber})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '0 1 150px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Created From
          </label>
          <input 
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
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

        <div style={{ flex: '0 1 150px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Created To
          </label>
          <input 
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
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
          onClick={() => loadData()}
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
          {loading ? 'Searching...' : 'Search Filters'}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Records</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>{metrics.total}</div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Unique Shipments</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>{metrics.uniqueTrackNumbers}</div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Locked Shipments</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', marginTop: 6 }}>🔒 {metrics.locked}</div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Accumulated Cost</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)', marginTop: 6 }}>
            {metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div style={{ display: 'flex', flex: 1, gap: 20, minHeight: 0 }}>
        <DataGrid
          title="Tracking History List"
          subtitle="View and manage logistics tracking headers"
          columns={columns}
          rows={rows}
          loading={loading}
          onRowClick={(row) => {
            sessionStorage.setItem('selectedTrackNumber', row.TrackNumber);
            if (props.openPage) props.openPage('logistics_track_details');
          }}
          hideHeader={true}
          hideSearch={true}
          hideRefresh={true}
        />
      </div>
    </div>
  );
}
