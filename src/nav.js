const NAV = [
  {
    id: 'purchasing_group',
    label: 'Purchasing',
    icon: '🛒',
    isGroup: true,
    children: [
      {
        id: 'purchasing_po_header',
        label: 'Purchase Order Header',
        icon: '📄',
        desc: 'Track and monitor purchase order headers',
      },
      {
        id: 'purchasing_po_line',
        label: 'Purchase Order Line',
        icon: '📋',
        desc: 'Focus on purchase order line items and quantities',
      }
    ]
  }
];

export default NAV;

