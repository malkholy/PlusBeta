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
        [QuerySQL] NVARCHAR(MAX) NULL,
        [CreatedBy] NVARCHAR(100) NULL,
        [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_QueryMaster_PagesAndGroups FOREIGN KEY ([PageGroupID]) REFERENCES [PLS].[PagesAndGroups]([PageGroupID])
    );

    CREATE NONCLUSTERED INDEX IX_QueryMaster_PageGroupID ON [PLS].[QueryMaster] (PageGroupID);
END
ELSE
BEGIN
    -- Add QuerySQL column if it doesn't exist (migration path)
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PLS.QueryMaster') AND name = 'QuerySQL')
    BEGIN
        ALTER TABLE [PLS].[QueryMaster] ADD [QuerySQL] NVARCHAR(MAX) NULL;
    END
END
GO

-- Insert page queries and operations with SQL Scripts
-- 1. Purchase Order Header Page Queries
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_header' AND [Operation] = 'GetPurchaseOrders')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('purchasing_po_header', N'Get Purchase Orders', N'[PLS].[APIPlusOperation]', 'GetPurchaseOrders', N'Retrieve purchase order header list', 
            N'SELECT PurchaseOrderNumber, EnteredDate, VendorNumber, TotalAmount, OrderState, VendorName FROM QGetPurchaseOrders WHERE EnteredDate BETWEEN @FromDate AND @ToDate ORDER BY PurchaseOrderNumber DESC;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT PurchaseOrderNumber, EnteredDate, VendorNumber, TotalAmount, OrderState, VendorName FROM QGetPurchaseOrders WHERE EnteredDate BETWEEN @FromDate AND @ToDate ORDER BY PurchaseOrderNumber DESC;'
    WHERE [PageGroupID] = 'purchasing_po_header' AND [Operation] = 'GetPurchaseOrders';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_header' AND [Operation] = 'GetPurchaseOrderLines')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('purchasing_po_header', N'Get Purchase Order Lines', N'[PLS].[APIPlusOperation]', 'GetPurchaseOrderLines', N'Retrieve purchase order line item details', 
            N'SELECT Line, PurchasedCode AS ItemCode, QuantityOrdered AS OrderedQuantity, Price AS UnitPrice, LineAmount AS TotalAmount FROM QGetPurchaseOrderLines WHERE OrderNumber = @PONumber ORDER BY Line;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT Line, PurchasedCode AS ItemCode, QuantityOrdered AS OrderedQuantity, Price AS UnitPrice, LineAmount AS TotalAmount FROM QGetPurchaseOrderLines WHERE OrderNumber = @PONumber ORDER BY Line;'
    WHERE [PageGroupID] = 'purchasing_po_header' AND [Operation] = 'GetPurchaseOrderLines';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_header' AND [Operation] = 'GetVendors')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('purchasing_po_header', N'Get Vendors', N'[PLS].[APIPlusOperation]', 'GetVendors', N'Retrieve vendor master details', 
            N'SELECT VendorNumber, VendorName FROM QGetVendors ORDER BY VendorName;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT VendorNumber, VendorName FROM QGetVendors ORDER BY VendorName;'
    WHERE [PageGroupID] = 'purchasing_po_header' AND [Operation] = 'GetVendors';
END


-- 2. Purchase Order Line Page Queries
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_line' AND [Operation] = 'GetPurchaseOrderLinesAll')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('purchasing_po_line', N'Get All Purchase Order Lines', N'[PLS].[APIPlusOperation]', 'GetPurchaseOrderLinesAll', N'Retrieve complete catalog of purchase order lines', 
            N'SELECT OrderNumber AS PurchaseOrderNumber, Line AS LineNumber, PurchasedCode AS ItemCode, QuantityOrdered AS OrderedQuantity, Price AS UnitPrice, LineAmount AS TotalAmount FROM QGetPurchaseOrderLinesAll WHERE OrderCreatedDate BETWEEN @FromDate AND @ToDate ORDER BY OrderNumber DESC, Line;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT OrderNumber AS PurchaseOrderNumber, Line AS LineNumber, PurchasedCode AS ItemCode, QuantityOrdered AS OrderedQuantity, Price AS UnitPrice, LineAmount AS TotalAmount FROM QGetPurchaseOrderLinesAll WHERE OrderCreatedDate BETWEEN @FromDate AND @ToDate ORDER BY OrderNumber DESC, Line;'
    WHERE [PageGroupID] = 'purchasing_po_line' AND [Operation] = 'GetPurchaseOrderLinesAll';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_line' AND [Operation] = 'GetVendors')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('purchasing_po_line', N'Get Vendors', N'[PLS].[APIPlusOperation]', 'GetVendors', N'Retrieve vendor master details', 
            N'SELECT VendorNumber, VendorName FROM QGetVendors ORDER BY VendorName;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT VendorNumber, VendorName FROM QGetVendors ORDER BY VendorName;'
    WHERE [PageGroupID] = 'purchasing_po_line' AND [Operation] = 'GetVendors';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'purchasing_po_line' AND [Operation] = 'GetItems')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('purchasing_po_line', N'Get Items', N'[PLS].[APIPlusOperation]', 'GetItems', N'Retrieve items list from master', 
            N'SELECT ItemCode, ItemDescription FROM QGetItems ORDER BY ItemCode;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ItemCode, ItemDescription FROM QGetItems ORDER BY ItemCode;'
    WHERE [PageGroupID] = 'purchasing_po_line' AND [Operation] = 'GetItems';
END


-- 3. Safety Stock Item Master Page Queries
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetSaftyStockItems')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Safety Stock Items', N'[PLS].[APIPlusOperation]', 'GetSaftyStockItems', N'Retrieve active items monitored for safety stock', 
            N'SELECT ID, ItemCode, SaftyStock, LeadTime, ServiceLevelFactor, ItemType FROM QGetSaftyStockItems ORDER BY ItemCode;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ID, ItemCode, SaftyStock, LeadTime, ServiceLevelFactor, ItemType FROM QGetSaftyStockItems ORDER BY ItemCode;'
    WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetSaftyStockItems';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemBalance')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Balance', N'[PLS].[APIPlusOperation]', 'GetItemBalance', N'Retrieve on-hand warehouse inventory balance', 
            N'SELECT ItemCode, ItemBalance AS OnHandBalance FROM QGetItemBalance WHERE ItemCode = @ItemCode;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ItemCode, ItemBalance AS OnHandBalance FROM QGetItemBalance WHERE ItemCode = @ItemCode;'
    WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemBalance';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemConsumption')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Consumption', N'[PLS].[APIPlusOperation]', 'GetItemConsumption', N'Retrieve item consumption usage history logs', 
            N'SELECT ItemCode, TotalQuantity AS ConsumptionQty, CAST(CAST(Yer AS VARCHAR(4)) + ''-'' + CAST(Mnth AS VARCHAR(2)) + ''-01'' AS DATE) AS ConsumptionDate FROM QGetItemConsumption WHERE ItemCode = @ItemCode ORDER BY ConsumptionDate DESC;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ItemCode, TotalQuantity AS ConsumptionQty, CAST(CAST(Yer AS VARCHAR(4)) + ''-'' + CAST(Mnth AS VARCHAR(2)) + ''-01'' AS DATE) AS ConsumptionDate FROM QGetItemConsumption WHERE ItemCode = @ItemCode ORDER BY ConsumptionDate DESC;'
    WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemConsumption';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemOpenPOs')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Open POs', N'[PLS].[APIPlusOperation]', 'GetItemOpenPOs', N'Retrieve outstanding open purchase orders for an item', 
            N'SELECT OrderNumber AS PurchaseOrderNumber, QuantityOrdered AS OrderedQuantity, QuantityReceived AS RecievedQuantity FROM QGetItemOpenPOs WHERE ItemCode = @ItemCode AND QuantityReceived < QuantityOrdered;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT OrderNumber AS PurchaseOrderNumber, QuantityOrdered AS OrderedQuantity, QuantityReceived AS RecievedQuantity FROM QGetItemOpenPOs WHERE ItemCode = @ItemCode AND QuantityReceived < QuantityOrdered;'
    WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemOpenPOs';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemLeadTime')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Lead Time', N'[PLS].[APIPlusOperation]', 'GetItemLeadTime', N'Retrieve delivery lead times from supplier logs', 
            N'SELECT ItemCode, LeadTime AS SupplierLeadTime FROM QGetItemLeadTime WHERE ItemCode = @ItemCode;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ItemCode, LeadTime AS SupplierLeadTime FROM QGetItemLeadTime WHERE ItemCode = @ItemCode;'
    WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemLeadTime';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemStatusHistory')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Status History', N'[PLS].[APIPlusOperation]', 'GetItemStatusHistory', N'Retrieve status transition logs for an item', 
            N'SELECT LogID, ItemCode, OldStatus, NewStatus, LogDate FROM QGetItemStatusHistory WHERE ItemCode = @ItemCode ORDER BY LogDate DESC;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT LogID, ItemCode, OldStatus, NewStatus, LogDate FROM QGetItemStatusHistory WHERE ItemCode = @ItemCode ORDER BY LogDate DESC;'
    WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemStatusHistory';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemReceipts')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Get Item Receipts', N'[PLS].[APIPlusOperation]', 'GetItemReceipts', N'Retrieve stock receipt history logs for an item', 
            N'SELECT ItemCode, QuantityReceived AS ReceiptQuantity, ReceivingDate AS ReceiptDate FROM QGetItemReceipts WHERE ItemCode = @ItemCode ORDER BY ReceiptDate DESC;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ItemCode, QuantityReceived AS ReceiptQuantity, ReceivingDate AS ReceiptDate FROM QGetItemReceipts WHERE ItemCode = @ItemCode ORDER BY ReceiptDate DESC;'
    WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'GetItemReceipts';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'SaveSaftyStockItem')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('safety_stock_item_master', N'Save Safety Stock Item', N'[PLS].[APIPlusOperation]', 'SaveSaftyStockItem', N'Insert or update safety stock settings for an item', 
            N'MERGE PUR.SaftyStockItemMaster AS t USING (SELECT @ItemID AS ID) AS s ON t.ID = s.ID WHEN MATCHED THEN UPDATE SET SaftyStock = @SaftyStock, LeadTime = @LeadTime WHEN NOT MATCHED THEN INSERT (ItemCode, SaftyStock, LeadTime) VALUES (@ItemCode, @SaftyStock, @LeadTime);', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'MERGE PUR.SaftyStockItemMaster AS t USING (SELECT @ItemID AS ID) AS s ON t.ID = s.ID WHEN MATCHED THEN UPDATE SET SaftyStock = @SaftyStock, LeadTime = @LeadTime WHEN NOT MATCHED THEN INSERT (ItemCode, SaftyStock, LeadTime) VALUES (@ItemCode, @SaftyStock, @LeadTime);'
    WHERE [PageGroupID] = 'safety_stock_item_master' AND [Operation] = 'SaveSaftyStockItem';
END


-- 4. User Page Permissions Page Queries
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'GetSystemUsers')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('user_permissions', N'Get System Users', N'[PLS].[APIPlusOperation]', 'GetSystemUsers', N'Retrieve system users along with group names', 
            N'SELECT a.Username, a.Name, a.IsAdmin, b.GroupName FROM ERPManagement.[System].[UserMaster] a LEFT OUTER JOIN ERPManagement.[System].GroupMaster b ON a.GroupID = b.GroupID ORDER BY a.Username;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT a.Username, a.Name, a.IsAdmin, b.GroupName FROM ERPManagement.[System].[UserMaster] a LEFT OUTER JOIN ERPManagement.[System].GroupMaster b ON a.GroupID = b.GroupID ORDER BY a.Username;'
    WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'GetSystemUsers';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'GetPagesAndGroups')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('user_permissions', N'Get Pages and Groups', N'[PLS].[APIPlusOperation]', 'GetPagesAndGroups', N'Retrieve application pages and group metadata list', 
            N'SELECT PageGroupID, Label, Icon, Description, IsGroup, ParentID, SortOrder FROM [PLS].[PagesAndGroups] ORDER BY SortOrder;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT PageGroupID, Label, Icon, Description, IsGroup, ParentID, SortOrder FROM [PLS].[PagesAndGroups] ORDER BY SortOrder;'
    WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'GetPagesAndGroups';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'GetUserPagePermissions')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('user_permissions', N'Get User Page Permissions', N'[PLS].[APIPlusOperation]', 'GetUserPagePermissions', N'Retrieve permission mapping records list', 
            N'SELECT p.PermissionID, p.Username, p.PageGroupID, pg.Label AS PageLabel, p.CanView FROM [PLS].[UserPagePermissions] p INNER JOIN [PLS].[PagesAndGroups] pg ON p.PageGroupID = pg.PageGroupID ORDER BY p.Username;', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT p.PermissionID, p.Username, p.PageGroupID, pg.Label AS PageLabel, p.CanView FROM [PLS].[UserPagePermissions] p INNER JOIN [PLS].[PagesAndGroups] pg ON p.PageGroupID = pg.PageGroupID ORDER BY p.Username;'
    WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'GetUserPagePermissions';
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'SaveUserPagePermission')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([PageGroupID], [QueryName], [SPName], [Operation], [Description], [QuerySQL], [CreatedBy])
    VALUES ('user_permissions', N'Save User Page Permission', N'[PLS].[APIPlusOperation]', 'SaveUserPagePermission', N'Insert or update user page permission mapping', 
            N'IF EXISTS (SELECT 1 FROM [PLS].[UserPagePermissions] WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID) UPDATE [PLS].[UserPagePermissions] SET CanView = @PermCanView WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID ELSE INSERT INTO [PLS].[UserPagePermissions] (Username, PageGroupID, CanView) VALUES (@PermUser, @PermPageGroupID, @PermCanView);', 'System');
END
ELSE
BEGIN
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'IF EXISTS (SELECT 1 FROM [PLS].[UserPagePermissions] WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID) UPDATE [PLS].[UserPagePermissions] SET CanView = @PermCanView WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID ELSE INSERT INTO [PLS].[UserPagePermissions] (Username, PageGroupID, CanView) VALUES (@PermUser, @PermPageGroupID, @PermCanView);'
    WHERE [PageGroupID] = 'user_permissions' AND [Operation] = 'SaveUserPagePermission';
END
GO
