import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

export default function TrackDetails(props) {
  const [trackNumber, setTrackNumber] = useState('');
  const [headerData, setHeaderData] = useState(null);
  const [lines, setLines] = useState([]);
  const [loadingHeader, setLoadingHeader] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('lines');
  
  // Payments state
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // References state
  const [references, setReferences] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(false);

  // Batches state
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Containers state
  const [containers, setContainers] = useState([]);
  const [loadingContainers, setLoadingContainers] = useState(false);

  useEffect(() => {
    const selectedTrack = sessionStorage.getItem('selectedTrackNumber');
    if (selectedTrack) {
      setTrackNumber(selectedTrack);
      loadTrackData(selectedTrack);
      sessionStorage.removeItem('selectedTrackNumber');
    }
  }, []);

  async function loadTrackData(trackNum) {
    if (!trackNum || !trackNum.trim()) return;
    const cleanTrackNum = trackNum.trim();
    setError('');
    setHeaderData(null);
    setLines([]);
    setPayments([]);
    setReferences([]);
    setBatches([]);
    setContainers([]);

    // 1. Fetch Header Details
    setLoadingHeader(true);
    try {
      const res = await apiCall('GetTrackingHistory', { TrackNumber: cleanTrackNum }, {}, 'logistics');
      if (res.State === 0 && res.List0 && res.List0.length > 0) {
        // Find exact match or first item
        const match = res.List0.find(r => r.TrackNumber === cleanTrackNum) || res.List0[0];
        setHeaderData(match);
      } else {
        setError('No tracking header record found for track number: ' + cleanTrackNum);
      }
    } catch (e) {
      setError('Header load failed: ' + e.message);
    }
    setLoadingHeader(false);

    // 2. Fetch Line Details
    setLoadingLines(true);
    try {
      const res = await apiCall('GetTrackingHistoryLines', { TrackNumber: cleanTrackNum }, {}, 'logistics');
      if (res.State === 0) {
        setLines(res.List0 || []);
      }
    } catch (e) {
      console.error('Lines load failed:', e);
    }
    setLoadingLines(false);

    // 3. Fetch Payments
    setLoadingPayments(true);
    try {
      const res = await apiCall('GetTrackingHistoryPayments', { TrackNumber: cleanTrackNum }, {}, 'logistics');
      if (res.State === 0) {
        setPayments(res.List0 || []);
      }
    } catch (e) {
      console.error('Payments load failed:', e);
    }
    setLoadingPayments(false);

    // 4. Fetch References
    setLoadingReferences(true);
    try {
      const res = await apiCall('GetTrackingHistoryReferences', { TrackNumber: cleanTrackNum }, {}, 'logistics');
      if (res.State === 0) {
        setReferences(res.List0 || []);
      }
    } catch (e) {
      console.error('References load failed:', e);
    }
    setLoadingReferences(false);

    // 5. Fetch Batches
    setLoadingBatches(true);
    try {
      const res = await apiCall('GetTrackingHistoryBatches', { TrackNumber: cleanTrackNum }, {}, 'logistics');
      if (res.State === 0) {
        setBatches(res.List0 || []);
      }
    } catch (e) {
      console.error('Batches load failed:', e);
    }
    setLoadingBatches(false);

    // 6. Fetch Containers
    setLoadingContainers(true);
    try {
      const res = await apiCall('GetTrackingHistoryContainers', { TrackNumber: cleanTrackNum }, {}, 'logistics');
      if (res.State === 0) {
        setContainers(res.List0 || []);
      }
    } catch (e) {
      console.error('Containers load failed:', e);
    }
    setLoadingContainers(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    loadTrackData(trackNumber);
  }

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
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Logistics Track Details</h2>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            View comprehensive line specifications and logistical stages for specific track numbers.
          </p>
        </div>
        {props.openPage && (
          <button
            onClick={() => props.openPage('logistics_tracking_history')}
            style={{
              height: 36,
              padding: '0 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              color: 'var(--text)',
              transition: 'all 0.15s'
            }}
          >
            ← Back to List
          </button>
        )}
      </div>

      {/* Input box */}
      <form onSubmit={handleSearch} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 20,
        boxShadow: 'var(--shadow)',
        display: 'flex',
        gap: 16,
        alignItems: 'center'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Track Number
          </label>
          <input 
            type="text"
            placeholder="Search or enter tracking number (e.g. TRK12903)..."
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
        <button 
          type="submit"
          disabled={loadingHeader || loadingLines}
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
            marginTop: 18,
            boxShadow: '0 4px 12px var(--orange-glow)'
          }}
        >
          {loadingHeader ? 'Searching...' : 'Search Track'}
        </button>
      </form>

      {error && (
        <div style={{ marginBottom: 20, background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)', padding: 12, borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {headerData && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Track Summary Bar */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 20,
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Vendor</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{headerData.VendorName || headerData.VendorNumber}</div>
            </div>
            <div>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Forwarder / Carrier</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{headerData.ForwarderName || '-'} / {headerData.CarrierName || '-'}</div>
            </div>
            <div>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Shipment State</span>
              <div style={{ marginTop: 2 }}>
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'var(--blue-soft)',
                  color: 'var(--blue)',
                  fontWeight: 600
                }}>
                  {headerData.ShipmentStateDescription || 'Unknown'}
                </span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Amount</span>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--orange)', marginTop: 2 }}>
                {headerData.TotalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: 11, color: 'var(--muted)' }}>{headerData.Currency}</span>
              </div>
            </div>
          </div>

          {/* Details Content Container */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}>
            {/* Tabs */}
            <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16 }}>
              <button 
                onClick={() => setActiveTab('lines')}
                style={{
                  padding: '14px 4px',
                  border: 'none',
                  background: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: activeTab === 'lines' ? 'var(--orange)' : 'var(--muted)',
                  borderBottom: activeTab === 'lines' ? '2.5px solid var(--orange)' : '2.5px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                📦 Lines ({lines.length})
              </button>
              <button 
                onClick={() => setActiveTab('details')}
                style={{
                  padding: '14px 4px',
                  border: 'none',
                  background: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: activeTab === 'details' ? 'var(--orange)' : 'var(--muted)',
                  borderBottom: activeTab === 'details' ? '2.5px solid var(--orange)' : '2.5px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                ⚙️ General Details
              </button>
              <button 
                onClick={() => setActiveTab('payments')}
                style={{
                  padding: '14px 4px',
                  border: 'none',
                  background: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: activeTab === 'payments' ? 'var(--orange)' : 'var(--muted)',
                  borderBottom: activeTab === 'payments' ? '2.5px solid var(--orange)' : '2.5px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                💳 Payments ({payments.length})
              </button>
              <button 
                onClick={() => setActiveTab('references')}
                style={{
                  padding: '14px 4px',
                  border: 'none',
                  background: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: activeTab === 'references' ? 'var(--orange)' : 'var(--muted)',
                  borderBottom: activeTab === 'references' ? '2.5px solid var(--orange)' : '2.5px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                📜 References ({references.length})
              </button>
              <button 
                onClick={() => setActiveTab('batches')}
                style={{
                  padding: '14px 4px',
                  border: 'none',
                  background: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: activeTab === 'batches' ? 'var(--orange)' : 'var(--muted)',
                  borderBottom: activeTab === 'batches' ? '2.5px solid var(--orange)' : '2.5px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                🏷️ Batch Numbers ({batches.length})
              </button>
              <button 
                onClick={() => setActiveTab('containers')}
                style={{
                  padding: '14px 4px',
                  border: 'none',
                  background: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: activeTab === 'containers' ? 'var(--orange)' : 'var(--muted)',
                  borderBottom: activeTab === 'containers' ? '2.5px solid var(--orange)' : '2.5px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                🚢 Containers ({containers.length})
              </button>
            </div>

            {/* Tab Body */}
            {activeTab === 'lines' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {loadingLines ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading line items...</div>
                ) : lines.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No line items found.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>#</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>PO #</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Item Code</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Description</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Qty</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>Price</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 600 }}>{line.LineNumber}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{line.PurchaseOrderNumber || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--orange)', fontFamily: 'monospace', fontWeight: 600 }}>{line.LogisticItemCode || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                              <div style={{ fontWeight: 600 }}>{line.ItemDescription || '-'}</div>
                              {line.ItemExtraDescription && (
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{line.ItemExtraDescription}</div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                              {line.LineQuantity} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{line.LogisticLineUnitOfMeasure}</span>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)', textAlign: 'right' }}>
                              {line.Price?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{line.Currency}</span>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)', textAlign: 'right', fontWeight: 700 }}>
                              {line.Amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{line.Currency}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 2-Column Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                  
                  {/* Identifiers */}
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Identifiers</div>
                    <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Track Number:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.TrackNumber}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>PI Number:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.PINumber || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>ACI Number:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.ACINumber || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>BL Number:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.BLNumber || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Courier & Customs Dates */}
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Courier & Customs Dates</div>
                    <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Sent to Bank:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{formatDate(headerData.SentToBankDate)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Released from Bank:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{formatDate(headerData.ReleasedFromBankDate)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Office Courier Arrival:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{formatDate(headerData.OfficeCourierArrivalDate)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Factory Arrival:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{formatDate(headerData.FactoryArrivalDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipment Cargo & Broker Details */}
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Cargo & Logistics</div>
                    <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Shipment Mode:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.ShipmentMode || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Shipment Size:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.ShipmentSize || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Destination:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.Destination || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Clearing Agent:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.ClearingAgentName || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Broker & Assignee */}
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Brokerage & Status</div>
                    <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Customs Broker Ref:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.CustomsBrokerRef || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Certificate No:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.CertificateNo || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Assign to User:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{headerData.AssignToUser || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>Request Shipping Date:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{formatDate(headerData.RequestShippingDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logistical Notes */}
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Logistical Notes</div>
                  <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                    {headerData.LogisitcNote || '(no logistical notes configured for this track)'}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {loadingPayments ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading payments...</div>
                ) : payments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No payments found for this track.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Payment ID</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Request Date</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Payment Date</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Value Date</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>State</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Bank Reference</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>User Reference</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((pay, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 600 }}>{pay.PaymentID || pay.LPID}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{formatDate(pay.RequestDate)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{formatDate(pay.PaymentDate)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{formatDate(pay.ValueDate)}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: pay.PaymentState === 3 ? 'var(--green-soft)' : 'var(--amber-soft)',
                                color: pay.PaymentState === 3 ? 'var(--green)' : 'var(--amber)',
                                fontWeight: 600
                              }}>
                                {pay.StateDescription || 'Pending'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{pay.PaymentBankReference || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{pay.UserReference || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--orange)', textAlign: 'right', fontWeight: 700 }}>
                              {pay.PaymentAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{headerData.Currency}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'references' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {loadingReferences ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading references...</div>
                ) : references.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No reference logs found for this track.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Reference ID</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Reference Name</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Reference Value</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Created By</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Created Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {references.map((ref, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 600 }}>{ref.ReferenceID || ref.LRID}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--orange)', fontWeight: 700 }}>{ref.ReferenceName || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 600, fontFamily: 'monospace' }}>{ref.ReferenceValue || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{ref.LogisticReferenceCreatedBy || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{formatDate(ref.LogisticReferenceCreatedDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'batches' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {loadingBatches ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading batches...</div>
                ) : batches.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No batch records found for this track.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Batch Number</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Item Code</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Description</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>Batch Qty</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Production Date</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Expiration Date</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>PO #</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Line #</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((bat, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', color: 'var(--orange)', fontWeight: 700, fontFamily: 'monospace' }}>{bat.BatchNumber || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 600 }}>{bat.LogisticLineItemCode || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{bat.ItemDescription || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)', textAlign: 'right', fontWeight: 700 }}>
                              {bat.BatchQuantity?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: 10, color: 'var(--muted)' }}>{bat.LogisticLineUnitOfMeasure}</span>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{formatDate(bat.ProductionDate)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{formatDate(bat.ExpirationDate)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{bat.PurchaseOrderNumber || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{bat.LogisticLineNumber || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'containers' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {loadingContainers ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading containers...</div>
                ) : containers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No container records found for this track.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Container Number</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Container Size</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Item Code</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Description</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>PO #</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>PO Line</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Notes</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Created By</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Created Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {containers.map((con, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', color: 'var(--orange)', fontWeight: 700, fontFamily: 'monospace' }}>{con.ContainerNumber || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 600 }}>{con.ContainerSize || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 600 }}>{con.ItemCode || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{con.ItemDescription || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{con.PO || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{con.POLine || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{con.ContainerNotes || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{con.ContainerCreatedBy || '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{formatDate(con.ContainerCreatedDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
