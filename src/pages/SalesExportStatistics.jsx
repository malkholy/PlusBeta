import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SalesExportStatistics(props) {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter States
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // Empty string means "All Months"

  // Fetch Lookups once on mount
  useEffect(() => {
    loadLookups();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    loadData();
  }, [selectedCustomer, selectedItem, selectedMonth]);

  async function loadLookups() {
    try {
      const res = await apiCall('GetSalesExportStatistics', {}, {}, 'logistics');
      if (res.State === 0) {
        setCustomers(res.List0 || []);
        setItems(res.List1 || []);
      }
    } catch (e) {
      console.error('Failed to load filter lookups:', e);
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const payload = {
        CustomerNo: selectedCustomer || null,
        ItemCode: selectedItem || null,
        Month: selectedMonth ? Number(selectedMonth) : null
      };
      const res = await apiCall('GetSalesExportStatistics', payload, {}, 'logistics');
      if (res.State === 0) {
        setRecords(res.List2 || []);
      } else {
        setError(res.Message || 'Failed to load statistics.');
      }
    } catch (e) {
      setError('Connection failure: ' + e.message);
    }
    setLoading(false);
  }

  // Calculate YoY Totals for Cards
  const totals = (() => {
    let qty2025 = 0;
    let qty2026 = 0;
    let wt2025 = 0;
    let wt2026 = 0;

    records.forEach(r => {
      if (r.Year === 2025) {
        qty2025 += Number(r.TotalQuantity || 0);
        wt2025 += Number(r.TotalWeight || 0);
      } else if (r.Year === 2026) {
        qty2026 += Number(r.TotalQuantity || 0);
        wt2026 += Number(r.TotalWeight || 0);
      }
    });

    return { qty2025, qty2026, wt2025, wt2026 };
  })();

  // Aggregate monthly data for grid
  const monthlyData = (() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      monthNum: i + 1,
      name: MONTH_NAMES[i],
      qty2025: 0,
      qty2026: 0,
      wt2025: 0,
      wt2026: 0
    }));

    records.forEach(r => {
      const mIdx = r.Month - 1;
      if (mIdx >= 0 && mIdx < 12) {
        if (r.Year === 2025) {
          months[mIdx].qty2025 += Number(r.TotalQuantity || 0);
          months[mIdx].wt2025 += Number(r.TotalWeight || 0);
        } else if (r.Year === 2026) {
          months[mIdx].qty2026 += Number(r.TotalQuantity || 0);
          months[mIdx].wt2026 += Number(r.TotalWeight || 0);
        }
      }
    });

    return selectedMonth 
      ? months.filter(m => m.monthNum === Number(selectedMonth))
      : months;
  })();

  // Aggregate item breakdown
  const itemBreakdown = (() => {
    const itemsMap = {};
    records.forEach(r => {
      if (!itemsMap[r.ItemCode]) {
        itemsMap[r.ItemCode] = {
          code: r.ItemCode,
          desc: r.ItemExtraDescription || 'Unknown Item',
          qty2025: 0,
          qty2026: 0,
          wt2025: 0,
          wt2026: 0
        };
      }
      if (r.Year === 2025) {
        itemsMap[r.ItemCode].qty2025 += Number(r.TotalQuantity || 0);
        itemsMap[r.ItemCode].wt2025 += Number(r.TotalWeight || 0);
      } else if (r.Year === 2026) {
        itemsMap[r.ItemCode].qty2026 += Number(r.TotalQuantity || 0);
        itemsMap[r.ItemCode].wt2026 += Number(r.TotalWeight || 0);
      }
    });

    return Object.values(itemsMap).sort((a, b) => b.qty2026 - a.qty2026);
  })();

  function growth(prev, curr) {
    if (!prev || Number(prev) === 0) return null;
    return ((Number(curr) - Number(prev)) / Number(prev)) * 100;
  }

  function renderGrowthBadge(prev, curr) {
    const pct = growth(prev, curr);
    if (pct === null) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>;
    const isUp = pct >= 0;
    return (
      <span style={{ 
        color: isUp ? 'var(--green)' : 'var(--red)', 
        fontWeight: 700, 
        fontSize: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3
      }}>
        {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{pct.toFixed(1)}%
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Title Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>📊 Sales Export Statistics</h2>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
          Compare monthly exported quantities and weights YoY for the years 2025 and 2026.
        </p>
      </div>

      {/* Filters Panel */}
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
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Customer (Export 6%)
          </label>
          <select
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
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
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c.CustomerNo} value={c.CustomerNo}>
                {c.CustomerExtraName} ({c.CustomerNo})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 220px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Item Description
          </label>
          <select
            value={selectedItem}
            onChange={e => setSelectedItem(e.target.value)}
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
            <option value="">All Items</option>
            {items.map(it => (
              <option key={it.ItemCode} value={it.ItemCode}>
                {it.ItemCode} - {it.ItemExtraDescription}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '0 1 180px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Month Filter
          </label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
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
            <option value="">All Months</option>
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <button 
          onClick={loadData}
          disabled={loading}
          style={{
            height: 38,
            padding: '0 20px',
            background: 'var(--soft)',
            border: '1.5px solid var(--border)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text)',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          {loading ? 'Refreshing...' : '🔄 Reset Filters'}
        </button>
      </div>

      {error && <div className="err-page" style={{ marginBottom: 20 }}>⚠ {error}</div>}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Export Qty (2026)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {totals.qty2026.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>vs {totals.qty2025.toLocaleString('en-US', { maximumFractionDigits: 0 })} (2025)</span>
          </div>
          <div style={{ marginTop: 6 }}>{renderGrowthBadge(totals.qty2025, totals.qty2026)}</div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Export Weight (2026)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange)', marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {totals.wt2026.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>vs {totals.wt2025.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg</span>
          </div>
          <div style={{ marginTop: 6 }}>{renderGrowthBadge(totals.wt2025, totals.wt2026)}</div>
        </div>
      </div>

      {/* Grid Dashboard Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, minHeight: 0, flex: 1 }}>
        {/* Month YoY Comparison Grid */}
        <div style={{ 
          background: 'var(--surface)', 
          border: '1px solid var(--border)', 
          borderRadius: 14, 
          padding: 20, 
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>📅 Monthly YoY Statistics</h3>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Month</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>2025 Qty</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>2026 Qty</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Qty Growth</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>2025 Weight</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>2026 Weight</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Wt Growth</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: m.qty2026 > 0 ? 'transparent' : 'var(--soft)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{m.name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{m.qty2025.toLocaleString('en-US')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{m.qty2026.toLocaleString('en-US')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(m.qty2025, m.qty2026)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{m.wt2025.toLocaleString('en-US')} kg</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{m.wt2026.toLocaleString('en-US')} kg</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(m.wt2025, m.wt2026)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Item Export Breakdown */}
        <div style={{ 
          background: 'var(--surface)', 
          border: '1px solid var(--border)', 
          borderRadius: 14, 
          padding: 20, 
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>📦 Exported Items Breakdown</h3>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {itemBreakdown.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--muted)', textAlign: 'center' }}>No items match the selected filter.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Item</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>2026 Qty</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Growth</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>2026 Wt</th>
                  </tr>
                </thead>
                <tbody>
                  {itemBreakdown.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{item.code}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }} title={item.desc}>{item.desc}</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{item.qty2026.toLocaleString('en-US')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(item.qty2025, item.qty2026)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{item.wt2026.toLocaleString('en-US')} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
