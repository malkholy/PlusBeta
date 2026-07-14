USE ERPMega
GO

-- Create PLS schema if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'PLS')
BEGIN
    EXEC('CREATE SCHEMA PLS')
END
GO

-- Create [PLS].[PagesAndGroups] Table
IF OBJECT_ID('PLS.PagesAndGroups', 'U') IS NULL
BEGIN
    CREATE TABLE [PLS].[PagesAndGroups] (
        [PageGroupID] VARCHAR(50) PRIMARY KEY,
        [Label] NVARCHAR(100) NOT NULL,
        [Icon] NVARCHAR(50) NULL,
        [Description] NVARCHAR(500) NULL,
        [IsGroup] BIT NOT NULL DEFAULT 0,
        [ParentID] VARCHAR(50) NULL FOREIGN KEY REFERENCES [PLS].[PagesAndGroups]([PageGroupID]),
        [SortOrder] INT NOT NULL DEFAULT 0
    );
END
GO

-- Insert current pages and groups from nav.js
-- 1. Purchasing Group (Nav Group)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'purchasing_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('purchasing_group', N'Purchasing', N'🛒', N'Purchasing department navigation group', 1, NULL, 10);
END

-- 2. Purchase Order Header (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'purchasing_po_header')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('purchasing_po_header', N'Purchase Order Header', N'📄', N'Track and monitor purchase order headers', 0, 'purchasing_group', 20);
END

-- 3. Purchase Order Line (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'purchasing_po_line')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('purchasing_po_line', N'Purchase Order Line', N'📋', N'Focus on purchase order line items and quantities', 0, 'purchasing_group', 30);
END

-- 4. Safety Stock Item Master (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'safety_stock_item_master')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('safety_stock_item_master', N'Safety Stock Item Master', N'🛡️', N'Manage and monitor safety stock levels for item masters', 0, 'purchasing_group', 40);
END

-- 5. Administration Group (Nav Group)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'admin_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('admin_group', N'Administration', N'⚙️', N'Administration navigation group', 1, NULL, 100);
END

-- 6. User Page Permissions (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'user_permissions')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('user_permissions', N'User Page Permissions', N'🔑', N'Manage page access permissions for application users', 0, 'admin_group', 110);
END

-- 7. Query Master Registry (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'query_master')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('query_master', N'Query Master Registry', N'⚙️', N'Manage registered database queries and page mappings', 0, 'admin_group', 120);
END

-- 8. Logistics (Nav Group)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'logistics_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('logistics_group', N'Logistics', N'📦', N'Logistics and tracking management', 1, NULL, 200);
END

-- 9. Tracking History (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'logistics_tracking_history')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('logistics_tracking_history', N'Tracking History', N'📜', N'Track shipment history and logistical states', 0, 'logistics_group', 210);
END

-- 10. Track Details (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'logistics_track_details')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('logistics_track_details', N'Track Details', N'🔍', N'Detailed view of shipment tracking lines and logistical status', 0, 'logistics_group', 220);
END

-- 11. Sales Report Group (Nav Group)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'sales_report_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('sales_report_group', N'Sales Report', N'📊', N'Sales Report navigation group', 1, NULL, 300);
END


-- 13. Sales Export Statistics (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'sales_export_statistics')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('sales_export_statistics', N'Sales Export Statistics', N'📊', N'Customer invoice YoY sales export statistics', 0, 'sales_report_group', 320);
END
GO

-- 14. Item Logistics Inquiry (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'logistics_item_inquiry')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('logistics_item_inquiry', N'Item Logistics Inquiry', N'🏷️', N'Track item locations and status across all shipments', 0, 'logistics_group', 210);
END
GO

-- 15. Express Group (Nav Group)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'express_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('express_group', N'Express', N'⚡', N'Express tracking navigation group', 1, NULL, 400);
END
GO

-- 16. Code Serials (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'express_code_serials')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('express_code_serials', N'Code Serials', N'🔑', N'Express cards serial numbers and usage logs', 0, 'express_group', 410);
END
GO

-- 17. Recruitment Group (Nav Group)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'recruitment_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('recruitment_group', N'Recruitment', '👥', N'Recruitment and hiring workflow group', 1, NULL, 500);
END
GO

-- 18. Hiring Requests (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'recruitment_requests')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('recruitment_requests', N'Hiring Requests', '📋', N'Manage personnel requisitions and approvals', 0, 'recruitment_group', 510);
END
GO

-- 19. Candidates Pool (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'recruitment_candidates')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('recruitment_candidates', N'Candidates Pool', '🔍', N'Screen applicants, log CVs, and record interview feedback', 0, 'recruitment_group', 520);
END
GO

-- 20. Job Offers (Page)
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'recruitment_offers')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('recruitment_offers', N'Job Offers', '💼', N'Draft contracts and track employee onboarding handoff', 0, 'recruitment_group', 530);
END
GO




