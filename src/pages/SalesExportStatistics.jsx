import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../shared/api.js';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];
const QUARTERS = [
  { value: 1, label: 'Q1 (Jan-Mar)' }, { value: 2, label: 'Q2 (Apr-Jun)' },
  { value: 3, label: 'Q3 (Jul-Sep)' }, { value: 4, label: 'Q4 (Oct-Dec)' },
];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);
  const label = selected.length === 0 ? placeholder
    : selected.length === 1 ? options.find(o => o.value === selected[0])?.label
    : `${selected.length} selected`;
  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={() => setOpen(o => !o)} style={{
        height:30, padding:'0 10px', fontSize:12, border:'0.5px solid var(--border)',
        borderRadius:'var(--radius-xs)', background:'var(--surface)', color:'var(--text)',
        cursor:'pointer', display:'flex', alignItems:'center', gap:6, minWidth:120, fontFamily:'var(--font)'
      }}>
        <span style={{flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{label}</span>
        {selected.length > 1 && <span style={{background:'var(--orange)', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:999}}>{selected.length}</span>}
        <span style={{fontSize:10}}>▾</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:34, right:0, background:'var(--surface)',
          border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
          zIndex:100, minWidth:160, boxShadow:'var(--shadow-lg)', maxHeight:240, overflowY:'auto'
        }}>
          {options.map(o => (
            <div key={o.value} onClick={() => {
              const next = selected.includes(o.value) ? selected.filter(v => v !== o.value) : [...selected, o.value];
              onChange(next.length ? next : [o.value]);
            }} style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 12px', fontSize:12,
              cursor:'pointer', color: selected.includes(o.value)?'var(--orange)':'var(--text)',
              fontWeight: selected.includes(o.value)?600:400,
              background: selected.includes(o.value)?'var(--orange-soft)':'transparent'
            }}>
              <input type="checkbox" checked={selected.includes(o.value)} readOnly style={{accentColor:'var(--orange)', width:13, height:13}} />
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchableCustomerSelect({ value, onChange, options, placeholder = "Select Customer" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const selectedOption = options.find(opt => opt.CustomerNo === value);
  const triggerLabel = selectedOption 
    ? `${selectedOption.CustomerExtraName} (${selectedOption.CustomerNo})` 
    : placeholder;

  const filteredOptions = options.filter(opt => 
    String(opt.CustomerExtraName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(opt.CustomerNo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".searchable-customer-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="searchable-customer-container" style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
        }}
        style={{
          height: 38,
          padding: '0 12px',
          border: '1.5px solid var(--border)',
          borderRadius: 8,
          background: 'var(--bg)',
          color: 'var(--text)',
          fontSize: 13,
          fontFamily: 'var(--font)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'all 0.15s'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: value ? 600 : 500 }}>{triggerLabel}</span>
        <span style={{ fontSize: 9, color: 'var(--orange)', marginLeft: 6 }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 42,
          left: 0,
          right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          zIndex: 1000,
          maxHeight: 260,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>🔍</span>
            <input 
              type="text"
              placeholder="Search by customer name or code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
              style={{
                height: 30,
                width: '100%',
                padding: '0 8px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
                fontSize: 12,
                fontFamily: 'var(--font)'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 220 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12.5, textAlign: 'center' }}>No customers found</div>
            ) : (
              <>
                {value && (
                  <div 
                    onClick={() => {
                      onChange('');
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--orange)',
                      fontWeight: 600,
                      background: 'rgba(249,115,22,0.04)'
                    }}
                  >
                    ✕ Clear Selection
                  </div>
                )}
                {filteredOptions.map((opt, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      onChange(opt.CustomerNo);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      background: value === opt.CustomerNo ? 'var(--orange-soft)' : 'transparent',
                      color: value === opt.CustomerNo ? 'var(--orange2)' : 'var(--text)',
                      fontWeight: value === opt.CustomerNo ? 700 : 500,
                      borderBottom: '1px solid rgba(0,0,0,0.02)',
                      transition: 'background .12s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--soft)'}
                    onMouseLeave={e => e.currentTarget.style.background = value === opt.CustomerNo ? 'var(--orange-soft)' : 'transparent'}
                  >
                    <div style={{ fontWeight: 600 }}>{opt.CustomerExtraName}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>Code: {opt.CustomerNo}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchableItemSelect({ value, onChange, options, placeholder = "Select Item" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const selectedOption = options.find(opt => opt.ItemCode === value);
  const triggerLabel = selectedOption 
    ? `${selectedOption.ItemExtraDescription} (${selectedOption.ItemCode})` 
    : placeholder;

  const filteredOptions = options.filter(opt => 
    String(opt.ItemExtraDescription || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(opt.ItemCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".searchable-item-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="searchable-item-container" style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
        }}
        style={{
          height: 38,
          padding: '0 12px',
          border: '1.5px solid var(--border)',
          borderRadius: 8,
          background: 'var(--bg)',
          color: 'var(--text)',
          fontSize: 13,
          fontFamily: 'var(--font)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'all 0.15s'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: value ? 600 : 500 }}>{triggerLabel}</span>
        <span style={{ fontSize: 9, color: 'var(--orange)', marginLeft: 6 }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 42,
          left: 0,
          right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          zIndex: 1000,
          maxHeight: 260,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>🔍</span>
            <input 
              type="text"
              placeholder="Search by description or code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
              style={{
                height: 30,
                width: '100%',
                padding: '0 8px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
                fontSize: 12,
                fontFamily: 'var(--font)'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 220 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12.5, textAlign: 'center' }}>No items found</div>
            ) : (
              <>
                {value && (
                  <div 
                    onClick={() => {
                      onChange('');
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--orange)',
                      fontWeight: 600,
                      background: 'rgba(249,115,22,0.04)'
                    }}
                  >
                    ✕ Clear Selection
                  </div>
                )}
                {filteredOptions.map((opt, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      onChange(opt.ItemCode);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      background: value === opt.ItemCode ? 'var(--orange-soft)' : 'transparent',
                      color: value === opt.ItemCode ? 'var(--orange2)' : 'var(--text)',
                      fontWeight: value === opt.ItemCode ? 700 : 500,
                      borderBottom: '1px solid rgba(0,0,0,0.02)',
                      transition: 'background .12s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--soft)'}
                    onMouseLeave={e => e.currentTarget.style.background = value === opt.ItemCode ? 'var(--orange-soft)' : 'transparent'}
                  >
                    <div style={{ fontWeight: 600 }}>{opt.ItemExtraDescription}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>Code: {opt.ItemCode}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function exportItemsToExcel(data, prevYear, activeYear, fileName = 'SalesExport_ItemBreakdown.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Items Breakdown</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; }
        th { background-color: #f97316; color: #ffffff; font-weight: bold; border: 1px solid #ea580c; padding: 10px 12px; font-family: sans-serif; font-size: 11pt; }
        td { border: 1px solid #e5e7eb; padding: 8px 10px; font-family: sans-serif; font-size: 10pt; }
        .text { mso-number-format: "\\@"; text-align: left; }
        .number { mso-number-format: "#,##0"; text-align: right; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Item Code</th>
            <th>Item Description</th>
            <th>${prevYear} Qty</th>
            <th>${activeYear} Qty</th>
            <th>Qty Growth</th>
            <th>${prevYear} Weight (kg)</th>
            <th>${activeYear} Weight (kg)</th>
            <th>Weight Growth</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    const qtyGrowth = item.qtyPrev ? ((item.qtyActive - item.qtyPrev) / item.qtyPrev) : null;
    const wtGrowth = item.wtPrev ? ((item.wtActive - item.wtPrev) / item.wtPrev) : null;

    html += `
      <tr>
        <td class="text">${item.code || ''}</td>
        <td>${item.desc || ''}</td>
        <td class="number">${item.qtyPrev}</td>
        <td class="number">${item.qtyActive}</td>
        <td class="center">${qtyGrowth !== null ? (qtyGrowth * 100).toFixed(1) + '%' : '—'}</td>
        <td class="number">${item.wtPrev}</td>
        <td class="number">${item.wtActive}</td>
        <td class="center">${wtGrowth !== null ? (wtGrowth * 100).toFixed(1) + '%' : '—'}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportMonthsToExcel(data, prevYear, activeYear, fileName = 'SalesExport_MonthlyYoY.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Monthly YoY</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; }
        th { background-color: #f97316; color: #ffffff; font-weight: bold; border: 1px solid #ea580c; padding: 10px 12px; font-family: sans-serif; font-size: 11pt; }
        td { border: 1px solid #e5e7eb; padding: 8px 10px; font-family: sans-serif; font-size: 10pt; }
        .text { mso-number-format: "\\@"; text-align: left; }
        .number { mso-number-format: "#,##0"; text-align: right; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>${prevYear} Qty</th>
            <th>${activeYear} Qty</th>
            <th>Qty Growth</th>
            <th>${prevYear} Weight (kg)</th>
            <th>${activeYear} Weight (kg)</th>
            <th>Weight Growth</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    const qtyGrowth = item.qtyPrev ? ((item.qtyActive - item.qtyPrev) / item.qtyPrev) : null;
    const wtGrowth = item.wtPrev ? ((item.wtActive - item.wtPrev) / item.wtPrev) : null;

    html += `
      <tr>
        <td class="text">${item.name || ''}</td>
        <td class="number">${item.qtyPrev}</td>
        <td class="number">${item.qtyActive}</td>
        <td class="center">${qtyGrowth !== null ? (qtyGrowth * 100).toFixed(1) + '%' : '—'}</td>
        <td class="number">${item.wtPrev}</td>
        <td class="number">${item.wtActive}</td>
        <td class="center">${wtGrowth !== null ? (wtGrowth * 100).toFixed(1) + '%' : '—'}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function SalesExportStatistics(props) {
  const now = new Date();
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Primary Filters
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedItem, setSelectedItem] = useState('');

  // Period / Date Filters (replicated from Sales Details)
  const [period, setPeriod] = useState('monthly');
  const [months, setMonths] = useState([now.getMonth() + 1]);
  const [quarters, setQuarters] = useState([Math.ceil((now.getMonth() + 1) / 3)]);
  const [year, setYear] = useState(2026); // Default comparison is 2026 vs 2025
  const [enlargedPanel, setEnlargedPanel] = useState(null); // 'items' or 'months' or null

  // Fetch lookups once
  useEffect(() => {
    loadLookups();
  }, []);

  // Fetch raw data when primary filters change
  useEffect(() => {
    loadData();
  }, [selectedCustomer, selectedItem]);

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
        Month: null // Fetch all months to filter/compare YoY locally
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

  // Resolve active months list based on selected period
  const activeMonthsList = (() => {
    if (period === 'yearly') {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
    if (period === 'quarterly') {
      const list = [];
      quarters.forEach(q => {
        if (q === 1) list.push(1, 2, 3);
        else if (q === 2) list.push(4, 5, 6);
        else if (q === 3) list.push(7, 8, 9);
        else if (q === 4) list.push(10, 11, 12);
      });
      return [...new Set(list)];
    }
    return months;
  })();

  const activeYear = year;
  const prevYear = year - 1;

  // YoY calculations for KPI Cards
  const totals = (() => {
    let qtyPrev = 0;
    let qtyActive = 0;
    let wtPrev = 0;
    let wtActive = 0;

    records.forEach(r => {
      if (activeMonthsList.includes(r.Month)) {
        if (r.Year === prevYear) {
          qtyPrev += Number(r.TotalQuantity || 0);
          wtPrev += Number(r.TotalWeight || 0);
        } else if (r.Year === activeYear) {
          qtyActive += Number(r.TotalQuantity || 0);
          wtActive += Number(r.TotalWeight || 0);
        }
      }
    });

    return { qtyPrev, qtyActive, wtPrev, wtActive };
  })();

  // Aggregate monthly data for grid (restricted to active list)
  const monthlyData = (() => {
    const list = activeMonthsList.map(mNum => ({
      monthNum: mNum,
      name: MONTHS.find(m => m.value === mNum)?.label || '',
      qtyPrev: 0,
      qtyActive: 0,
      wtPrev: 0,
      wtActive: 0
    }));

    records.forEach(r => {
      if (activeMonthsList.includes(r.Month)) {
        const item = list.find(x => x.monthNum === r.Month);
        if (item) {
          if (r.Year === prevYear) {
            item.qtyPrev += Number(r.TotalQuantity || 0);
            item.wtPrev += Number(r.TotalWeight || 0);
          } else if (r.Year === activeYear) {
            item.qtyActive += Number(r.TotalQuantity || 0);
            item.wtActive += Number(r.TotalWeight || 0);
          }
        }
      }
    });

    return list.sort((a, b) => a.monthNum - b.monthNum);
  })();

  // Aggregate item breakdown (restricted to active list)
  const itemBreakdown = (() => {
    const itemsMap = {};
    records.forEach(r => {
      if (activeMonthsList.includes(r.Month)) {
        if (!itemsMap[r.ItemCode]) {
          itemsMap[r.ItemCode] = {
            code: r.ItemCode,
            desc: r.ItemExtraDescription || 'Unknown Item',
            qtyPrev: 0,
            qtyActive: 0,
            wtPrev: 0,
            wtActive: 0
          };
        }
        if (r.Year === prevYear) {
          itemsMap[r.ItemCode].qtyPrev += Number(r.TotalQuantity || 0);
          itemsMap[r.ItemCode].wtPrev += Number(r.TotalWeight || 0);
        } else if (r.Year === activeYear) {
          itemsMap[r.ItemCode].qtyActive += Number(r.TotalQuantity || 0);
          itemsMap[r.ItemCode].wtActive += Number(r.TotalWeight || 0);
        }
      }
    });

    return Object.values(itemsMap).sort((a, b) => b.qtyActive - a.qtyActive);
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

  function resetFilters() {
    setSelectedCustomer('');
    setSelectedItem('');
    setPeriod('monthly');
    setMonths([now.getMonth() + 1]);
    setQuarters([Math.ceil((now.getMonth() + 1) / 3)]);
    setYear(2026);
    loadData();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>📊 Sales Export Statistics</h2>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            Compare monthly exported quantities and weights YoY for the selected filters.
          </p>
        </div>
        <button 
          onClick={loadData} 
          disabled={loading}
          className="btn-primary" 
          style={{ height: 32, fontSize: 12 }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Date / Period Filters (Replicated from Sales Details) */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '12px 18px',
        marginBottom: 16,
        boxShadow: 'var(--shadow)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', border: '0.5px solid var(--border2)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
          {['monthly', 'quarterly', 'yearly'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '5px 14px', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
              background: period === p ? 'var(--orange)' : 'var(--surface)',
              color: period === p ? '#fff' : 'var(--muted)', fontWeight: period === p ? 600 : 400,
              textTransform: 'capitalize'
            }}>{p}</button>
          ))}
        </div>
        {period === 'monthly' && <MultiSelect options={MONTHS} selected={months} onChange={setMonths} placeholder="Select months" />}
        {period === 'quarterly' && <MultiSelect options={QUARTERS} selected={quarters} onChange={setQuarters} placeholder="Select quarters" />}
        
        <select 
          className="filter-select" 
          value={year} 
          onChange={e => setYear(Number(e.target.value))} 
          style={{ height: 30, fontSize: 12, padding: '0 8px', borderRadius: 'var(--radius-xs)', border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)' }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--soft)', padding: '4px 12px', borderRadius: 999 }}>
          📅 Comparison: {activeYear} vs {prevYear}
        </span>
      </div>

      {/* Primary Customer / Item Filters */}
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
          <SearchableCustomerSelect 
            value={selectedCustomer}
            onChange={setSelectedCustomer}
            options={customers}
            placeholder="All Customers"
          />
        </div>

        <div style={{ flex: '1 1 220px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Item Description
          </label>
          <SearchableItemSelect 
            value={selectedItem}
            onChange={setSelectedItem}
            options={items}
            placeholder="All Items"
          />
        </div>

        <button 
          onClick={resetFilters}
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
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Export Quantity ({activeYear})</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {totals.qtyActive.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>vs {totals.qtyPrev.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({prevYear})</span>
          </div>
          <div style={{ marginTop: 6 }}>{renderGrowthBadge(totals.qtyPrev, totals.qtyActive)}</div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Export Weight ({activeYear})</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange)', marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {totals.wtActive.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>vs {totals.wtPrev.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg</span>
          </div>
          <div style={{ marginTop: 6 }}>{renderGrowthBadge(totals.wtPrev, totals.wtActive)}</div>
        </div>
      </div>

      {/* Grid Dashboard Tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0, flex: 1 }}>
        {/* Item Export Breakdown */}
        <div style={{ 
          background: 'var(--surface)', 
          border: '1px solid var(--border)', 
          borderRadius: 14, 
          padding: 20, 
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 350
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>📦 Exported Items Breakdown</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={() => exportItemsToExcel(itemBreakdown, prevYear, activeYear)}
                style={{
                  background: 'var(--soft)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--orange)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)'
                }}
              >
                📥 Export Excel
              </button>
              <button 
                onClick={() => setEnlargedPanel('items')}
                style={{
                  background: 'var(--soft)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)'
                }}
              >
                ⛶ Enlarge
              </button>
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {itemBreakdown.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--muted)', textAlign: 'center' }}>No items match the selected filter.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Item</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{prevYear} Qty</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{activeYear} Qty</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Qty Growth</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{prevYear} Weight</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{activeYear} Weight</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Wt Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {itemBreakdown.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{item.code}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }} title={item.desc}>{item.desc}</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{item.qtyPrev.toLocaleString('en-US')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{item.qtyActive.toLocaleString('en-US')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(item.qtyPrev, item.qtyActive)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{item.wtPrev.toLocaleString('en-US')} kg</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{item.wtActive.toLocaleString('en-US')} kg</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(item.wtPrev, item.wtActive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Month YoY Comparison Grid */}
        <div style={{ 
          background: 'var(--surface)', 
          border: '1px solid var(--border)', 
          borderRadius: 14, 
          padding: 20, 
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 350
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>📅 Monthly YoY Statistics</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={() => exportMonthsToExcel(monthlyData, prevYear, activeYear)}
                style={{
                  background: 'var(--soft)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--orange)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)'
                }}
              >
                📥 Export Excel
              </button>
              <button 
                onClick={() => setEnlargedPanel('months')}
                style={{
                  background: 'var(--soft)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)'
                }}
              >
                ⛶ Enlarge
              </button>
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Month</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{prevYear} Qty</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{activeYear} Qty</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Qty Growth</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{prevYear} Weight</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{activeYear} Weight</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Wt Growth</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: m.qtyActive > 0 ? 'transparent' : 'var(--soft)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{m.name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{m.qtyPrev.toLocaleString('en-US')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{m.qtyActive.toLocaleString('en-US')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(m.qtyPrev, m.qtyActive)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{m.wtPrev.toLocaleString('en-US')} kg</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{m.wtActive.toLocaleString('en-US')} kg</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(m.wtPrev, m.wtActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Enlarged Pop-up Modal */}
      {enlargedPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(6px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }} onClick={() => setEnlargedPanel(null)}>
          <div style={{
            width: '95vw',
            maxWidth: '1400px',
            height: '85vh',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            padding: 24,
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                {enlargedPanel === 'items' ? '📦 Exported Items Breakdown (Enlarged)' : '📅 Monthly YoY Statistics (Enlarged)'}
              </h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => enlargedPanel === 'items' ? exportItemsToExcel(itemBreakdown, prevYear, activeYear) : exportMonthsToExcel(monthlyData, prevYear, activeYear)}
                  style={{
                    background: 'var(--soft)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--orange)',
                    fontFamily: 'var(--font)'
                  }}
                >
                  📥 Export Excel
                </button>
                <button 
                  onClick={() => setEnlargedPanel(null)} 
                  style={{
                    background: 'var(--soft)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontFamily: 'var(--font)'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {enlargedPanel === 'items' ? (
                itemBreakdown.length === 0 ? (
                  <div style={{ padding: 20, color: 'var(--muted)', textAlign: 'center' }}>No items match the selected filter.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Item</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{prevYear} Qty</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{activeYear} Qty</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Qty Growth</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{prevYear} Weight</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{activeYear} Weight</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Wt Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemBreakdown.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{item.code}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.desc}</div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{item.qtyPrev.toLocaleString('en-US')}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{item.qtyActive.toLocaleString('en-US')}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(item.qtyPrev, item.qtyActive)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{item.wtPrev.toLocaleString('en-US')} kg</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{item.wtActive.toLocaleString('en-US')} kg</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(item.wtPrev, item.wtActive)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)' }}>Month</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{prevYear} Qty</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{activeYear} Qty</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Qty Growth</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{prevYear} Weight</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{activeYear} Weight</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--muted)', textAlign: 'center' }}>Wt Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: m.qtyActive > 0 ? 'transparent' : 'var(--soft)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{m.name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{m.qtyPrev.toLocaleString('en-US')}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{m.qtyActive.toLocaleString('en-US')}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(m.qtyPrev, m.qtyActive)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{m.wtPrev.toLocaleString('en-US')} kg</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{m.wtActive.toLocaleString('en-US')} kg</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{renderGrowthBadge(m.wtPrev, m.wtActive)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
