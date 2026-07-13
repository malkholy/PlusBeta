import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function ItemLogisticsInquiry(props) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [selectedItemRow, setSelectedItemRow] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    setSelectedItemRow(null);
    setIsDrawerOpen(false);
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

  // Close drawer on Escape key press
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    }
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

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
      const sortedShipments = [...g.Shipments].sort((a, b) => {
        if (!a.ETA) return 1;
        if (!b.ETA) return -1;
        return new Date(a.ETA) - new Date(b.ETA);
      });
      return {
        ItemCode: g.ItemCode,
        ItemDescription: g.ItemDescription,
        TotalQty: g.TotalQty,
        TotalTracks: g.Tracks.size,
        EarliestETA: sortedEtas[0] || null,
        UOM: g.UOM,
        Shipments: sortedShipments
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

      {/* Grid */}
      <div style={{ display: 'flex', flex: 1, gap: 20, minHeight: 0, width: '100%' }}>
        <DataGrid
          title="Item Logistics Records"
          subtitle="Overview of item shipments and statuses"
          columns={columns}
          rows={gridRows}
          loading={loading}
          onRowClick={(row) => {
            setSelectedItemRow(row);
            setIsDrawerOpen(true);
          }}
          hideHeader={false}
          hideSearch={false}
          hideRefresh={false}
          onRefresh={() => loadData()}
        />
      </div>

      {/* Slide-out Drawer */}
      {isDrawerOpen && selectedItemRow && (
        <>
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999
            }}
          />
          
          {/* Drawer Body */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '50vw',
              maxWidth: '90vw',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.25)',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'var(--font)'
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--soft)' }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                  Item Shipment Logistics
                </span>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Active tracks and details carrying this item
                </div>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>
            
            {/* Drawer Content */}
            <div style={{ padding: 24, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Item Details Info Block */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, background: 'var(--soft)', borderRadius: 12, padding: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>Item Code</label>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{selectedItemRow.ItemCode}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>Description</label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: '1.4' }}>{selectedItemRow.ItemDescription}</span>
                </div>
              </div>

              {/* Mini KPI Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12
              }}>
                <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Qty</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                    {selectedItemRow.TotalQty.toLocaleString()} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{selectedItemRow.UOM}</span>
                  </div>
                </div>

                <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Active Shipments</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--blue)', marginTop: 4 }}>
                    {selectedItemRow.TotalTracks}
                  </div>
                </div>

                <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Value</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>
                    {selectedItemRow.Shipments.reduce((sum, s) => sum + (Number(s.Quantity) * Number(s.Price || 0)), 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} <span style={{ fontSize: 9, color: 'var(--muted)' }}>{selectedItemRow.Shipments[0]?.Currency || ''}</span>
                  </div>
                </div>

                <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Earliest ETA</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--orange)', marginTop: 6 }}>
                    {formatDate(selectedItemRow.EarliestETA)}
                  </div>
                </div>
              </div>

              {/* Shipments List */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>Shipment Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {selectedItemRow.Shipments.map((s, idx) => (
                    <div key={idx} style={{
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      background: 'var(--surface)',
                      boxShadow: 'var(--shadow)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}>
                      {/* Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                        <span 
                          style={{ fontWeight: 800, color: 'var(--orange)', cursor: 'pointer', textDecoration: 'underline', fontSize: 14 }}
                          onClick={() => {
                            setIsDrawerOpen(false);
                            sessionStorage.setItem('selectedTrackNumber', s.TrackNumber);
                            if (props.openPage) props.openPage('logistics_track_details');
                          }}
                        >
                          Track #: {s.TrackNumber}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                          PO: {s.PurchaseOrderNumber || '-'}
                        </span>
                      </div>

                      {/* Grid details */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, fontSize: 12 }}>
                        <div>
                          <strong style={{ color: 'var(--muted)', display: 'block', fontSize: 10.5, textTransform: 'uppercase', marginBottom: 2 }}>Quantity</strong>
                          <span style={{ fontWeight: 700 }}>{Number(s.Quantity).toLocaleString()} {s.UOM}</span>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--muted)', display: 'block', fontSize: 10.5, textTransform: 'uppercase', marginBottom: 2 }}>Price</strong>
                          <span style={{ fontWeight: 700 }}>{Number(s.Price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {s.Currency}</span>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--muted)', display: 'block', fontSize: 10.5, textTransform: 'uppercase', marginBottom: 2 }}>ETA</strong>
                          <span style={{ fontWeight: 700 }}>{formatDate(s.ETA)}</span>
                        </div>
                      </div>

                      {/* Cargo details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 11.5, borderTop: '1px dotted var(--border)', paddingTop: 10 }}>
                        <div>
                          <strong style={{ color: 'var(--muted)', display: 'block', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Shipment Mode</strong>
                          <span style={{ fontWeight: 600 }}>{s.ShipmentMode || '-'}</span>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--muted)', display: 'block', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Shipment Size (Cargo)</strong>
                          <span style={{ fontWeight: 600 }}>{s.ShipmentSize || '-'}</span>
                        </div>
                      </div>

                      {/* Footer details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 11.5, borderTop: '1px dotted var(--border)', paddingTop: 10 }}>
                        <div>
                          <strong style={{ color: 'var(--muted)', display: 'block', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Vendor</strong>
                          <span style={{ fontWeight: 600 }}>{s.VendorName || s.VendorNumber || '-'}</span>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--muted)', display: 'block', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Clearing Agent</strong>
                          <span style={{ fontWeight: 600 }}>{s.ClearingAgentName || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
