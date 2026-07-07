USE ERPMega
GO

-- Create PLS schema if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'PLS')
BEGIN
    EXEC('CREATE SCHEMA PLS')
END
GO

-- Create [PLS].[QueryMaster] Table
IF OBJECT_ID('PLS.QueryMaster', 'U') IS NULL
BEGIN
    CREATE TABLE [PLS].[QueryMaster] (
        [QueryID] INT IDENTITY(1,1) PRIMARY KEY,
        [PageGroupID] VARCHAR(50) NOT NULL,
        [QueryName] NVARCHAR(150) NOT NULL,
        [SPName] NVARCHAR(250) NOT NULL,
        [Operation] VARCHAR(100) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [CreatedBy] NVARCHAR(100) NULL,
        [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_QueryMaster_PagesAndGroups FOREIGN KEY ([PageGroupID]) REFERENCES [PLS].[PagesAndGroups]([PageGroupID])
    );

    CREATE NONCLUSTERED INDEX IX_QueryMaster_PageGroupID ON [PLS].[QueryMaster] (PageGroupID);
END
GO

-- Insert page queries and operations
-- 1. Purchase Order Header Page Queries
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_header' AND [Operation] = 'GetPurchaseOrders')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('purchasing_po_header', N'Get Purchase Orders', N'[PLS].[APIPlusOperation]', 'GetPurchaseOrders', N'Retrieve purchase order header list', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_header' AND [Operation] = 'GetPurchaseOrderLines')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('purchasing_po_header', N'Get Purchase Order Lines', N'[PLS].[APIPlusOperation]', 'GetPurchaseOrderLines', N'Retrieve purchase order line item details', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_header' AND [Operation] = 'GetVendors')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('purchasing_po_header', N'Get Vendors', N'[PLS].[APIPlusOperation]', 'GetVendors', N'Retrieve vendor master details', 'System');
END


-- 2. Purchase Order Line Page Queries
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_line' AND [Operation] = 'GetPurchaseOrderLinesAll')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('purchasing_po_line', N'Get All Purchase Order Lines', N'[PLS].[APIPlusOperation]', 'GetPurchaseOrderLinesAll', N'Retrieve complete catalog of purchase order lines', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_line' AND [Operation] = 'GetVendors')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('purchasing_po_line', N'Get Vendors', N'[PLS].[APIPlusOperation]', 'GetVendors', N'Retrieve vendor master details', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_line' AND [Operation] = 'GetItems')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('purchasing_po_line', N'Get Items', N'[PLS].[APIPlusOperation]', 'GetItems', N'Retrieve items list from master', 'System');
END


-- 3. Safety Stock Item Master Page Queries
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetSaftyStockItems')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Safety Stock Items', N'[PLS].[APIPlusOperation]', 'GetSaftyStockItems', N'Retrieve active items monitored for safety stock', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemBalance')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Balance', N'[PLS].[APIPlusOperation]', 'GetItemBalance', N'Retrieve on-hand warehouse inventory balance', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemConsumption')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Consumption', N'[PLS].[APIPlusOperation]', 'GetItemConsumption', N'Retrieve item consumption usage history logs', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemOpenPOs')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Open POs', N'[PLS].[APIPlusOperation]', 'GetItemOpenPOs', N'Retrieve outstanding open purchase orders for an item', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemLeadTime')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Lead Time', N'[PLS].[APIPlusOperation]', 'GetItemLeadTime', N'Retrieve delivery lead times from supplier logs', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemStatusHistory')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Status History', N'[PLS].[APIPlusOperation]', 'GetItemStatusHistory', N'Retrieve status transition logs for an item', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemReceipts')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Receipts', N'[PLS].[APIPlusOperation]', 'GetItemReceipts', N'Retrieve stock receipt history logs for an item', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'SaveSaftyStockItem')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Save Safety Stock Item', N'[PLS].[APIPlusOperation]', 'SaveSaftyStockItem', N'Insert or update safety stock settings for an item', 'System');
END


-- 4. User Page Permissions Page Queries
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'GetSystemUsers')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('user_permissions', N'Get System Users', N'[PLS].[APIPlusOperation]', 'GetSystemUsers', N'Retrieve system users along with group names', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'GetPagesAndGroups')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('user_permissions', N'Get Pages and Groups', N'[PLS].[APIPlusOperation]', 'GetPagesAndGroups', N'Retrieve application pages and group metadata list', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'GetUserPagePermissions')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('user_permissions', N'Get User Page Permissions', N'[PLS].[APIPlusOperation]', 'GetUserPagePermissions', N'Retrieve permission mapping records list', 'System');
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'SaveUserPagePermission')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [CreatedBy])
    VALUES ('user_permissions', N'Save User Page Permission', N'[PLS].[APIPlusOperation]', 'SaveUserPagePermission', N'Insert or update user page permission mapping', 'System');
END
GO
