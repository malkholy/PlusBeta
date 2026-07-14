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
      },
      {
        id: 'safety_stock_item_master',
        label: 'Safety Stock Item Master',
        icon: '🛡️',
        desc: 'Manage and monitor safety stock levels for item masters',
      }
    ]
  },
  {
    id: 'logistics_group',
    label: 'Logistics',
    icon: '📦',
    isGroup: true,
    children: [
      {
        id: 'logistics_tracking_history',
        label: 'Tracking History',
        icon: '📜',
        desc: 'Track shipment history and logistical states'
      },
      {
        id: 'logistics_item_inquiry',
        label: 'Item Logistics Inquiry',
        icon: '🏷️',
        desc: 'Track item locations and status across all shipments'
      }
    ]
  },
  {
    id: 'sales_report_group',
    label: 'Sales Report',
    icon: '📊',
    isGroup: true,
    children: [
      {
        id: 'sales_export_statistics',
        label: 'Sales Export Statistics',
        icon: '📊',
        desc: 'Customer invoice YoY sales export statistics'
      }
    ]
  },
  {
    id: 'express_group',
    label: 'Express',
    icon: '⚡',
    isGroup: true,
    children: [
      {
        id: 'express_code_serials',
        label: 'Code Serials',
        icon: '🔑',
        desc: 'Express cards serial numbers and usage logs'
      }
    ]
  },
  {
    id: 'recruitment_group',
    label: 'Recruitment',
    icon: '👥',
    isGroup: true,
    children: [
      {
        id: 'recruitment_requests',
        label: 'Hiring Requests',
        icon: '📋',
        desc: 'Manage personnel requisitions and approvals'
      },
      {
        id: 'recruitment_candidates',
        label: 'Candidates Pool',
        icon: '🔍',
        desc: 'Screen applicants, log CVs, and record interview feedback'
      },
      {
        id: 'recruitment_offers',
        label: 'Job Offers',
        icon: '💼',
        desc: 'Draft contracts and track employee onboarding handoff'
      }
    ]
  }
];

export default NAV;

