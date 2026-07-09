import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

export default function TrackingHistory() {
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [error, setError] = useState('');
  
  // Filter states
  const [trackNumber, setTrackNumber] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected row for details panel
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    loadVendors();
    loadData();
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

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const payload = {
        TrackNumber: trackNumber.trim() || null,
        VendorNumber: selectedVendor || null,
        FromDate: fromDate || null,
        ToDate: toDate || null
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
    const totalValue = rows.reduce((sum, r) => sum + (r.TotalAmount || 0), 0);
    
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
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
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
            ETA From Date
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
            ETA To Date
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
          onClick={loadData}
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
        {/* Main Grid table */}
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {error && (
            <div style={{ margin: 16, background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)', padding: 12, borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)' }}>Track Number</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)' }}>Vendor Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)' }}>Forwarder</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)' }}>ETA</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)' }}>Total Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)' }}>Shipment State</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)' }}>Tracking State</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                      Loading tracking history...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                      No tracking historical data found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const isSel = selectedRow?.LHID === row.LHID;
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedRow(row)}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: isSel ? 'var(--orange-soft)' : 'transparent',
                          transition: 'all 0.15s'
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>
                          {row.TrackNumber} {row.IsLocked && '🔒'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{row.VendorName || row.VendorNumber}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{row.ForwarderName || '-'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{formatDate(row.ETA)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>
                          {row.TotalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{row.Currency}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'var(--blue-soft)',
                            color: 'var(--blue)',
                            fontWeight: 600
                          }}>
                            {row.ShipmentStateDescription || 'Unknown'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'var(--soft)',
                            color: 'var(--muted)',
                            fontWeight: 600
                          }}>
                            {row.StateDescription || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {row.IsLocked ? (
                            <span style={{ color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>✓ Locked</span>
                          ) : (
                            <span style={{ color: 'var(--orange)', fontSize: 11, fontWeight: 700 }}>• Active</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Details Panel */}
        {selectedRow && (
          <div style={{
            width: 420,
            flexShrink: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>Tracking Details</h3>
                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>LHID: {selectedRow.LHID}</span>
              </div>
              <button 
                onClick={() => setSelectedRow(null)}
                style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Shipment Identifiers */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Identifiers</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>Track Number</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{selectedRow.TrackNumber}</div>
                  </div>
                  <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>PI Number</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{selectedRow.PINumber || '-'}</div>
                  </div>
                  <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>ACI Number</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{selectedRow.ACINumber || '-'}</div>
                  </div>
                  <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>BL Number</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{selectedRow.BLNumber || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Logistic States */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Courier & Customs Dates</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg)', padding: 12, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>Sent to Bank:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatDate(selectedRow.SentToBankDate)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>Released from Bank:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatDate(selectedRow.ReleasedFromBankDate)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>Office Courier Arrival:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatDate(selectedRow.OfficeCourierArrivalDate)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>Factory Arrival:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatDate(selectedRow.FactoryArrivalDate)}</span>
                  </div>
                </div>
              </div>

              {/* Item details */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Line Item & Code details</div>
                <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>Converted Item Code</div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--orange)', fontFamily: 'monospace', marginTop: 2 }}>{selectedRow.ItemCode || '-'}</div>
                  </div>
                  
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>Item Description</div>
                    <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2 }}>{selectedRow.ItemDescription || '-'}</div>
                  </div>

                  {selectedRow.ItemExtraDescription && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>Extra Description</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2 }}>{selectedRow.ItemExtraDescription}</div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                    <div>
                      <span style={{ fontSize: 9.5, color: 'var(--muted)' }}>Quantity</span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 1 }}>{selectedRow.LineQuantity} {selectedRow.LogisticLineUnitOfMeasure}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 9.5, color: 'var(--muted)' }}>Unit Price</span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 1 }}>{selectedRow.Price?.toLocaleString()} {selectedRow.LineCurrency}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra Logistic details */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Logistical Notes</div>
                <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
                  {selectedRow.LogisitcNote || '(no logistic notes configured)'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
