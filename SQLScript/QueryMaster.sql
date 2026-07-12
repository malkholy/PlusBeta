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
        [QueryName] NVARCHAR(150) NOT NULL,
        [SPName] NVARCHAR(250) NOT NULL,
        [Operation] VARCHAR(100) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [QuerySQL] NVARCHAR(MAX) NULL,
        [DatabaseName] VARCHAR(100) NULL,
        [SchemaName] VARCHAR(100) NULL,
        [TableOrViewName] VARCHAR(150) NULL,
        [QueryType] VARCHAR(50) NOT NULL DEFAULT 'Grid',
        [CreatedBy] NVARCHAR(100) NULL,
        [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE()
    );
END
ELSE
BEGIN
    -- Drop constraint and column if they exist (migration path)
    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_QueryMaster_PagesAndGroups' AND parent_object_id = OBJECT_ID('PLS.QueryMaster'))
    BEGIN
        ALTER TABLE [PLS].[QueryMaster] DROP CONSTRAINT FK_QueryMaster_PagesAndGroups;
    END

    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_QueryMaster_PageGroupID' AND object_id = OBJECT_ID('PLS.QueryMaster'))
    BEGIN
        DROP INDEX IX_QueryMaster_PageGroupID ON [PLS].[QueryMaster];
    END

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PLS.QueryMaster') AND name = 'PageGroupID')
    BEGIN
        -- Migrate PageGroupID mapping to junction table PageQueries before dropping the column using dynamic SQL to prevent parser errors
        IF OBJECT_ID('PLS.PageQueries', 'U') IS NOT NULL
        BEGIN
            EXEC('
                INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
                SELECT PageGroupID, QueryID 
                FROM [PLS].[QueryMaster]
                WHERE PageGroupID IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM [PLS].[PageQueries] pq 
                      WHERE pq.PageGroupID = [PLS].[QueryMaster].PageGroupID AND pq.QueryID = [PLS].[QueryMaster].QueryID
                  );
            ');
        END

        EXEC('ALTER TABLE [PLS].[QueryMaster] DROP COLUMN PageGroupID;');
    END
END
GO

-- Insert/Update unique page queries and link them in PageQueries
DECLARE @QID INT;

-- 1. PO Header Grid
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetPurchaseOrders')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Purchase Orders', N'[PLS].[APIPlusOperation]', 'GetPurchaseOrders', N'Retrieve purchase order header list', 
            N'SELECT PurchaseOrderNumber, EnteredDate, VendorNumber, TotalAmount, OrderState, VendorName FROM QGetPurchaseOrders WHERE EnteredDate BETWEEN @FromDate AND @ToDate ORDER BY PurchaseOrderNumber DESC;', 'ERPMega', 'dbo', 'QGetPurchaseOrders', 'Grid', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetPurchaseOrders';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT PurchaseOrderNumber, EnteredDate, VendorNumber, TotalAmount, OrderState, VendorName FROM QGetPurchaseOrders WHERE EnteredDate BETWEEN @FromDate AND @ToDate ORDER BY PurchaseOrderNumber DESC;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetPurchaseOrders',
        [QueryType] = 'Grid'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'purchasing_po_header' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('purchasing_po_header', @QID);

-- 2. PO Header lines detail
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetPurchaseOrderLines')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Purchase Order Lines', N'[PLS].[APIPlusOperation]', 'GetPurchaseOrderLines', N'Retrieve purchase order line item details', 
            N'SELECT Line, PurchasedCode AS ItemCode, QuantityOrdered AS OrderedQuantity, Price AS UnitPrice, LineAmount AS TotalAmount FROM QGetPurchaseOrderLines WHERE OrderNumber = @PONumber ORDER BY Line;', 'ERPMega', 'dbo', 'QGetPurchaseOrderLines', 'Detail', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetPurchaseOrderLines';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT Line, PurchasedCode AS ItemCode, QuantityOrdered AS OrderedQuantity, Price AS UnitPrice, LineAmount AS TotalAmount FROM QGetPurchaseOrderLines WHERE OrderNumber = @PONumber ORDER BY Line;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetPurchaseOrderLines',
        [QueryType] = 'Detail'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'purchasing_po_header' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('purchasing_po_header', @QID);

-- 3. Get Vendors (Shared by PO Header and PO Line pages)
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetVendors')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Vendors', N'[PLS].[APIPlusOperation]', 'GetVendors', N'Retrieve vendor master details', 
            N'SELECT VendorNumber, VendorName FROM QGetVendors ORDER BY VendorName;', 'ERPMega', 'dbo', 'QGetVendors', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetVendors';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT VendorNumber, VendorName FROM QGetVendors ORDER BY VendorName;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetVendors',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'purchasing_po_header' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('purchasing_po_header', @QID);
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'purchasing_po_line' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('purchasing_po_line', @QID);

-- 4. PO Line Grid
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetPurchaseOrderLinesAll')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get All Purchase Order Lines', N'[PLS].[APIPlusOperation]', 'GetPurchaseOrderLinesAll', N'Retrieve complete catalog of purchase order lines', 
            N'SELECT OrderNumber AS PurchaseOrderNumber, Line AS LineNumber, PurchasedCode AS ItemCode, QuantityOrdered AS OrderedQuantity, Price AS UnitPrice, LineAmount AS TotalAmount FROM QGetPurchaseOrderLinesAll WHERE OrderCreatedDate BETWEEN @FromDate AND @ToDate ORDER BY OrderNumber DESC, Line;', 'ERPMega', 'dbo', 'QGetPurchaseOrderLinesAll', 'Grid', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetPurchaseOrderLinesAll';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT OrderNumber AS PurchaseOrderNumber, Line AS LineNumber, PurchasedCode AS ItemCode, QuantityOrdered AS OrderedQuantity, Price AS UnitPrice, LineAmount AS TotalAmount FROM QGetPurchaseOrderLinesAll WHERE OrderCreatedDate BETWEEN @FromDate AND @ToDate ORDER BY OrderNumber DESC, Line;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetPurchaseOrderLinesAll',
        [QueryType] = 'Grid'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'purchasing_po_line' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('purchasing_po_line', @QID);

-- 5. PO Line items lookup
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItems')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Items', N'[PLS].[APIPlusOperation]', 'GetItems', N'Retrieve items list from master', 
            N'SELECT ItemCode, ItemDescription FROM QGetItems ORDER BY ItemCode;', 'ERPMega', 'dbo', 'QGetItems', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItems';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ItemCode, ItemDescription FROM QGetItems ORDER BY ItemCode;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetItems',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'purchasing_po_line' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('purchasing_po_line', @QID);

-- 6. Safety Stock Grid
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetSaftyStockItems')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Safety Stock Items', N'[PLS].[APIPlusOperation]', 'GetSaftyStockItems', N'Retrieve active items monitored for safety stock', 
            N'SELECT ID, ItemCode, SaftyStock, LeadTime, ServiceLevelFactor, ItemType FROM QGetSaftyStockItems ORDER BY ItemCode;', 'ERPMega', 'dbo', 'QGetSaftyStockItems', 'Grid', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetSaftyStockItems';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ID, ItemCode, SaftyStock, LeadTime, ServiceLevelFactor, ItemType FROM QGetSaftyStockItems ORDER BY ItemCode;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetSaftyStockItems',
        [QueryType] = 'Grid'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'safety_stock_item_master' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('safety_stock_item_master', @QID);

-- 7. Safety Stock Item Balance lookup
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemBalance')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Item Balance', N'[PLS].[APIPlusOperation]', 'GetItemBalance', N'Retrieve on-hand warehouse inventory balance', 
            N'SELECT ItemCode, ItemBalance AS OnHandBalance FROM QGetItemBalance WHERE ItemCode = @ItemCode;', 'ERPMega', 'dbo', 'QGetItemBalance', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemBalance';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ItemCode, ItemBalance AS OnHandBalance FROM QGetItemBalance WHERE ItemCode = @ItemCode;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetItemBalance',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'safety_stock_item_master' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('safety_stock_item_master', @QID);

-- 8. Safety Stock Item Consumption history
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemConsumption')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Item Consumption', N'[PLS].[APIPlusOperation]', 'GetItemConsumption', N'Retrieve item consumption usage history logs', 
            N'SELECT ItemCode, TotalQuantity AS ConsumptionQty, CAST(CAST(Yer AS VARCHAR(4)) + ''-'' + CAST(Mnth AS VARCHAR(2)) + ''-01'' AS DATE) AS ConsumptionDate FROM QGetItemConsumption WHERE ItemCode = @ItemCode ORDER BY ConsumptionDate DESC;', 'ERPMega', 'dbo', 'QGetItemConsumption', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemConsumption';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ItemCode, TotalQuantity AS ConsumptionQty, CAST(CAST(Yer AS VARCHAR(4)) + ''-'' + CAST(Mnth AS VARCHAR(2)) + ''-01'' AS DATE) AS ConsumptionDate FROM QGetItemConsumption WHERE ItemCode = @ItemCode ORDER BY ConsumptionDate DESC;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetItemConsumption',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'safety_stock_item_master' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('safety_stock_item_master', @QID);

-- 9. Safety Stock Open POs lookup
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemOpenPOs')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Item Open POs', N'[PLS].[APIPlusOperation]', 'GetItemOpenPOs', N'Retrieve outstanding open purchase orders for an item', 
            N'SELECT OrderNumber AS PurchaseOrderNumber, QuantityOrdered AS OrderedQuantity, QuantityReceived AS RecievedQuantity FROM QGetItemOpenPOs WHERE ItemCode = @ItemCode AND QuantityReceived < QuantityOrdered;', 'ERPMega', 'dbo', 'QGetItemOpenPOs', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemOpenPOs';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT OrderNumber AS PurchaseOrderNumber, QuantityOrdered AS OrderedQuantity, QuantityReceived AS RecievedQuantity FROM QGetItemOpenPOs WHERE ItemCode = @ItemCode AND QuantityReceived < QuantityOrdered;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetItemOpenPOs',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'safety_stock_item_master' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('safety_stock_item_master', @QID);

-- 10. Safety Stock Lead Time lookup
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemLeadTime')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Item Lead Time', N'[PLS].[APIPlusOperation]', 'GetItemLeadTime', N'Retrieve delivery lead times from supplier logs', 
            N'SELECT ItemCode, LeadTime AS SupplierLeadTime FROM QGetItemLeadTime WHERE ItemCode = @ItemCode;', 'ERPMega', 'dbo', 'QGetItemLeadTime', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemLeadTime';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ItemCode, LeadTime AS SupplierLeadTime FROM QGetItemLeadTime WHERE ItemCode = @ItemCode;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetItemLeadTime',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'safety_stock_item_master' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('safety_stock_item_master', @QID);

-- 11. Safety Stock Status History lookup
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemStatusHistory')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Item Status History', N'[PLS].[APIPlusOperation]', 'GetItemStatusHistory', N'Retrieve status transition logs for an item', 
            N'SELECT LogID, ItemCode, OldStatus, NewStatus, LogDate FROM QGetItemStatusHistory WHERE ItemCode = @ItemCode ORDER BY LogDate DESC;', 'ERPMega', 'dbo', 'QGetItemStatusHistory', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemStatusHistory';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT LogID, ItemCode, OldStatus, NewStatus, LogDate FROM QGetItemStatusHistory WHERE ItemCode = @ItemCode ORDER BY LogDate DESC;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetItemStatusHistory',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'safety_stock_item_master' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('safety_stock_item_master', @QID);

-- 12. Safety Stock Receipts history lookup
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemReceipts')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Item Receipts', N'[PLS].[APIPlusOperation]', 'GetItemReceipts', N'Retrieve stock receipt history logs for an item', 
            N'SELECT ItemCode, QuantityReceived AS ReceiptQuantity, ReceivingDate AS ReceiptDate FROM QGetItemReceipts WHERE ItemCode = @ItemCode ORDER BY ReceiptDate DESC;', 'ERPMega', 'dbo', 'QGetItemReceipts', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetItemReceipts';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ItemCode, QuantityReceived AS ReceiptQuantity, ReceivingDate AS ReceiptDate FROM QGetItemReceipts WHERE ItemCode = @ItemCode ORDER BY ReceiptDate DESC;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetItemReceipts',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'safety_stock_item_master' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('safety_stock_item_master', @QID);

-- 13. Safety Stock Save action
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'SaveSaftyStockItem')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Save Safety Stock Item', N'[PLS].[APIPlusOperation]', 'SaveSaftyStockItem', N'Insert or update safety stock settings for an item', 
            N'MERGE PUR.SaftyStockItemMaster AS t USING (SELECT @ItemID AS ID) AS s ON t.ID = s.ID WHEN MATCHED THEN UPDATE SET SaftyStock = @SaftyStock, LeadTime = @LeadTime WHEN NOT MATCHED THEN INSERT (ItemCode, SaftyStock, LeadTime) VALUES (@ItemCode, @SaftyStock, @LeadTime);', 'ERPMega', 'PUR', 'SaftyStockItemMaster', 'Action', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'SaveSaftyStockItem';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'MERGE PUR.SaftyStockItemMaster AS t USING (SELECT @ItemID AS ID) AS s ON t.ID = s.ID WHEN MATCHED THEN UPDATE SET SaftyStock = @SaftyStock, LeadTime = @LeadTime WHEN NOT MATCHED THEN INSERT (ItemCode, SaftyStock, LeadTime) VALUES (@ItemCode, @SaftyStock, @LeadTime);',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'PUR',
        [TableOrViewName] = 'SaftyStockItemMaster',
        [QueryType] = 'Action'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'safety_stock_item_master' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('safety_stock_item_master', @QID);

-- 14. Permissions Get System Users lookup
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetSystemUsers')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get System Users', N'[PLS].[APIPlusOperation]', 'GetSystemUsers', N'Retrieve system users along with group names', 
            N'SELECT a.Username, a.Name, a.IsAdmin, b.GroupName FROM ERPManagement.[System].[UserMaster] a LEFT OUTER JOIN ERPManagement.[System].GroupMaster b ON a.GroupID = b.GroupID ORDER BY a.Username;', 'ERPManagement', 'System', 'UserMaster', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetSystemUsers';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT a.Username, a.Name, a.IsAdmin, b.GroupName FROM ERPManagement.[System].[UserMaster] a LEFT OUTER JOIN ERPManagement.[System].GroupMaster b ON a.GroupID = b.GroupID ORDER BY a.Username;',
        [DatabaseName] = 'ERPManagement',
        [SchemaName] = 'System',
        [TableOrViewName] = 'UserMaster',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'user_permissions' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('user_permissions', @QID);

-- 15. Permissions Get Pages & Groups lookup
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetPagesAndGroups')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Pages and Groups', N'[PLS].[APIPlusOperation]', 'GetPagesAndGroups', N'Retrieve application pages and group metadata list', 
            N'SELECT PageGroupID, Label, Icon, Description, IsGroup, ParentID, SortOrder FROM [PLS].[PagesAndGroups] ORDER BY SortOrder;', 'ERPMega', 'PLS', 'PagesAndGroups', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetPagesAndGroups';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT PageGroupID, Label, Icon, Description, IsGroup, ParentID, SortOrder FROM [PLS].[PagesAndGroups] ORDER BY SortOrder;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'PLS',
        [TableOrViewName] = 'PagesAndGroups',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'user_permissions' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('user_permissions', @QID);

-- 16. Permissions Get User Page Permissions lookup
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetUserPagePermissions')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get User Page Permissions', N'[PLS].[APIPlusOperation]', 'GetUserPagePermissions', N'Retrieve permission mapping records list', 
            N'SELECT p.PermissionID, p.Username, p.PageGroupID, pg.Label AS PageLabel, p.CanView FROM [PLS].[UserPagePermissions] p INNER JOIN [PLS].[PagesAndGroups] pg ON p.PageGroupID = pg.PageGroupID ORDER BY p.Username;', 'ERPMega', 'PLS', 'UserPagePermissions', 'Lookup', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetUserPagePermissions';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT p.PermissionID, p.Username, p.PageGroupID, pg.Label AS PageLabel, p.CanView FROM [PLS].[UserPagePermissions] p INNER JOIN [PLS].[PagesAndGroups] pg ON p.PageGroupID = pg.PageGroupID ORDER BY p.Username;',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'PLS',
        [TableOrViewName] = 'UserPagePermissions',
        [QueryType] = 'Lookup'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'user_permissions' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('user_permissions', @QID);

-- 17. Permissions Save action
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'SaveUserPagePermission')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Save User Page Permission', N'[PLS].[APIPlusOperation]', 'SaveUserPagePermission', N'Insert or update user page permission mapping', 
            N'IF EXISTS (SELECT 1 FROM [PLS].[UserPagePermissions] WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID) UPDATE [PLS].[UserPagePermissions] SET CanView = @PermCanView WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID ELSE INSERT INTO [PLS].[UserPagePermissions] (Username, PageGroupID, CanView) VALUES (@PermUser, @PermPageGroupID, @PermCanView);', 'ERPMega', 'PLS', 'UserPagePermissions', 'Action', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'SaveUserPagePermission';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'IF EXISTS (SELECT 1 FROM [PLS].[UserPagePermissions] WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID) UPDATE [PLS].[UserPagePermissions] SET CanView = @PermCanView WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID ELSE INSERT INTO [PLS].[UserPagePermissions] (Username, PageGroupID, CanView) VALUES (@PermUser, @PermPageGroupID, @PermCanView);',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'PLS',
        [TableOrViewName] = 'UserPagePermissions',
        [QueryType] = 'Action'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'user_permissions' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('user_permissions', @QID);

-- 18. Logistics Get Tracking History
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetTrackingHistory')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Tracking History', N'[dbo].[APIPlusLogisticsOperation]', 'GetTrackingHistory', N'Retrieve detailed logistical tracking history records', 
            N'SELECT LHID, TrackNumber, TrackState, VendorNumber, BankNumber, ForwarderID, PINumber, ShipmentState, AccountingState, DocumentState, Currency, ETA, ETD, InvoiceNumber, Destination, LogisitcNote, AttachmentID, CustomsBrokerRef, RequestShippingDate, OfficeCourierArrivalDate, BankCourierArrivalDate, SentToBankDate, ReleasedFromBankDate, FactoryArrivalDate, PaymentTermID, IncoTermID, IsLocked, CarrierID, LogisticCreatedBy, LogisticCreatedDate, LogisticLastMaintBy, LogisticLastMaintDate, ClearingAgentID, ForwarderName, CarrierName, ClearingAgentName, PaymentTermDescription, IncoTermDescription, StateDescription, ShipmentStateDescription, DocumentStateDescription, AccountingStateDescription, VendorName, VendorExtraName, BankAccountName, ItemAmount, DiscountAmount, FreightAmount, InsuranceAmount, TotalAmount, ACINumber, BLNumber, BLType, ShipmentMode, ShipmentSize, AssignToUser, CertificateNo FROM QGetTrackingHistory ORDER BY LogisticCreatedDate DESC, TrackNumber DESC;', 'ERPMega', 'dbo', 'QGetTrackingHistory', 'Grid', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetTrackingHistory';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT LHID, TrackNumber, TrackState, VendorNumber, BankNumber, ForwarderID, PINumber, ShipmentState, AccountingState, DocumentState, Currency, ETA, ETD, InvoiceNumber, Destination, LogisitcNote, AttachmentID, CustomsBrokerRef, RequestShippingDate, OfficeCourierArrivalDate, BankCourierArrivalDate, SentToBankDate, ReleasedFromBankDate, FactoryArrivalDate, PaymentTermID, IncoTermID, IsLocked, CarrierID, LogisticCreatedBy, LogisticCreatedDate, LogisticLastMaintBy, LogisticLastMaintDate, ClearingAgentID, ForwarderName, CarrierName, ClearingAgentName, PaymentTermDescription, IncoTermDescription, StateDescription, ShipmentStateDescription, DocumentStateDescription, AccountingStateDescription, VendorName, VendorExtraName, BankAccountName, ItemAmount, DiscountAmount, FreightAmount, InsuranceAmount, TotalAmount, ACINumber, BLNumber, BLType, ShipmentMode, ShipmentSize, AssignToUser, CertificateNo FROM QGetTrackingHistory ORDER BY LogisticCreatedDate DESC, TrackNumber DESC;',
        [SPName] = N'[dbo].[APIPlusLogisticsOperation]',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetTrackingHistory',
        [QueryType] = 'Grid'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'logistics_tracking_history' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('logistics_tracking_history', @QID);

-- 19. Logistics Get Tracking History Lines
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetTrackingHistoryLines')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Tracking History Lines', N'[dbo].[APIPlusLogisticsOperation]', 'GetTrackingHistoryLines', N'Retrieve detailed lines of logistical tracking history records', 
            N'SELECT ll.*, im.ItemDescription, poh.RequestArrivalDate FROM LGI.LogisticLine ll Left outer join INV.ItemMaster im on im.ItemID=ll.ItemID LEFT OUTER JOIN PUR.PurchaseOrderHeader poh on poh.PurchaseOrderNumber=ll.PurchaseOrderNumber WHERE ll.TrackNumber = @TrackNumber ORDER BY LineNumber;', 'ERPMega', 'dbo', 'LogisticLine', 'Grid', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [Operation] = 'GetTrackingHistoryLines';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ll.*, im.ItemDescription, poh.RequestArrivalDate FROM LGI.LogisticLine ll Left outer join INV.ItemMaster im on im.ItemID=ll.ItemID LEFT OUTER JOIN PUR.PurchaseOrderHeader poh on poh.PurchaseOrderNumber=ll.PurchaseOrderNumber WHERE ll.TrackNumber = @TrackNumber ORDER BY LineNumber;',
        [SPName] = N'[dbo].[APIPlusLogisticsOperation]',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'LogisticLine',
        [QueryType] = 'Grid'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'logistics_tracking_history' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('logistics_tracking_history', @QID);

-- 20. Get Track Details Header
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Track Details Header')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Track Details Header', N'[dbo].[APIPlusLogisticsOperation]', 'GetTrackingHistory', N'Retrieve header detail record for a track', 
            N'SELECT LHID, TrackNumber, TrackState, VendorNumber, BankNumber, ForwarderID, PINumber, ShipmentState, AccountingState, DocumentState, Currency, ETA, ETD, InvoiceNumber, Destination, LogisitcNote, AttachmentID, CustomsBrokerRef, RequestShippingDate, OfficeCourierArrivalDate, BankCourierArrivalDate, SentToBankDate, ReleasedFromBankDate, FactoryArrivalDate, PaymentTermID, IncoTermID, IsLocked, CarrierID, LogisticCreatedBy, LogisticCreatedDate, LogisticLastMaintBy, LogisticLastMaintDate, ClearingAgentID, ForwarderName, CarrierName, ClearingAgentName, PaymentTermDescription, IncoTermDescription, StateDescription, ShipmentStateDescription, DocumentStateDescription, AccountingStateDescription, VendorName, VendorExtraName, BankAccountName, ItemAmount, DiscountAmount, FreightAmount, InsuranceAmount, TotalAmount, ACINumber, BLNumber, BLType, ShipmentMode, ShipmentSize, AssignToUser, CertificateNo FROM QGetTrackingHistory ORDER BY LogisticCreatedDate DESC, TrackNumber DESC;', 'ERPMega', 'dbo', 'QGetTrackingHistory', 'Grid', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Track Details Header';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT LHID, TrackNumber, TrackState, VendorNumber, BankNumber, ForwarderID, PINumber, ShipmentState, AccountingState, DocumentState, Currency, ETA, ETD, InvoiceNumber, Destination, LogisitcNote, AttachmentID, CustomsBrokerRef, RequestShippingDate, OfficeCourierArrivalDate, BankCourierArrivalDate, SentToBankDate, ReleasedFromBankDate, FactoryArrivalDate, PaymentTermID, IncoTermID, IsLocked, CarrierID, LogisticCreatedBy, LogisticCreatedDate, LogisticLastMaintBy, LogisticLastMaintDate, ClearingAgentID, ForwarderName, CarrierName, ClearingAgentName, PaymentTermDescription, IncoTermDescription, StateDescription, ShipmentStateDescription, DocumentStateDescription, AccountingStateDescription, VendorName, VendorExtraName, BankAccountName, ItemAmount, DiscountAmount, FreightAmount, InsuranceAmount, TotalAmount, ACINumber, BLNumber, BLType, ShipmentMode, ShipmentSize, AssignToUser, CertificateNo FROM QGetTrackingHistory ORDER BY LogisticCreatedDate DESC, TrackNumber DESC;',
        [SPName] = N'[dbo].[APIPlusLogisticsOperation]',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'QGetTrackingHistory',
        [QueryType] = 'Grid'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'logistics_track_details' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('logistics_track_details', @QID);


-- 21. Get Track Details Lines
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Track Details Lines')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Track Details Lines', N'[dbo].[APIPlusLogisticsOperation]', 'GetTrackingHistoryLines', N'Retrieve line items for a track', 
            N'SELECT ll.*, im.ItemDescription, poh.RequestArrivalDate FROM LGI.LogisticLine ll Left outer join INV.ItemMaster im on im.ItemID=ll.ItemID LEFT OUTER JOIN PUR.PurchaseOrderHeader poh on poh.PurchaseOrderNumber=ll.PurchaseOrderNumber WHERE ll.TrackNumber = @TrackNumber ORDER BY LineNumber;', 'ERPMega', 'dbo', 'LogisticLine', 'Grid', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Track Details Lines';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT ll.*, im.ItemDescription, poh.RequestArrivalDate FROM LGI.LogisticLine ll Left outer join INV.ItemMaster im on im.ItemID=ll.ItemID LEFT OUTER JOIN PUR.PurchaseOrderHeader poh on poh.PurchaseOrderNumber=ll.PurchaseOrderNumber WHERE ll.TrackNumber = @TrackNumber ORDER BY LineNumber;',
        [SPName] = N'[dbo].[APIPlusLogisticsOperation]',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'LogisticLine',
        [QueryType] = 'Grid'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'logistics_track_details' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('logistics_track_details', @QID);


-- 22. Get Track Details Payments
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Track Details Payments')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Track Details Payments', N'[dbo].[APIPlusLogisticsOperation]', 'GetTrackingHistoryPayments', N'Retrieve payments for a track', 
            N'SELECT lp.*, ps.StateDescription FROM LGI.LogisticPayment lp LEFT OUTER JOIN LGI.LogisticPaymentState ps on ps.StateID=lp.PaymentState WHERE lp.TrackNumber = @TrackNumber;', 'ERPMega', 'dbo', 'LogisticPayment', 'Grid', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Track Details Payments';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT lp.*, ps.StateDescription FROM LGI.LogisticPayment lp LEFT OUTER JOIN LGI.LogisticPaymentState ps on ps.StateID=lp.PaymentState WHERE lp.TrackNumber = @TrackNumber;',
        [SPName] = N'[dbo].[APIPlusLogisticsOperation]',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'LogisticPayment',
        [QueryType] = 'Grid'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'logistics_track_details' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('logistics_track_details', @QID);

-- 23. Get Track Details References
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Track Details References')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Track Details References', N'[dbo].[APIPlusLogisticsOperation]', 'GetTrackingHistoryReferences', N'Retrieve reference logs for a track', 
            N'SELECT lr.*, rm.ReferenceDataType, rm.ReferenceName FROM LGI.LogisticReference lr LEFT OUTER JOIN LGI.ReferenceMaster rm ON rm.ReferenceID=lr.ReferenceID WHERE lr.TrackNumber = @TrackNumber;', 'ERPMega', 'dbo', 'LogisticReference', 'Grid', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Track Details References';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT lr.*, rm.ReferenceDataType, rm.ReferenceName FROM LGI.LogisticReference lr LEFT OUTER JOIN LGI.ReferenceMaster rm ON rm.ReferenceID=lr.ReferenceID WHERE lr.TrackNumber = @TrackNumber;',
        [SPName] = N'[dbo].[APIPlusLogisticsOperation]',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'LogisticReference',
        [QueryType] = 'Grid'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'logistics_track_details' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('logistics_track_details', @QID);

-- 24. Get Track Details Batches
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Track Details Batches')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy])
    VALUES (N'Get Track Details Batches', N'[dbo].[APIPlusLogisticsOperation]', 'GetTrackingHistoryBatches', N'Retrieve batches for a track', 
            N'SELECT lb.*, im.ItemDescription FROM LGI.LogisticBatch lb LEFT OUTER JOIN INV.ItemMaster im ON lb.LogisticLineItemID = im.ItemID WHERE lb.TrackNumber = @TrackNumber;', 'ERPMega', 'dbo', 'LogisticBatch', 'Grid', 'System');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Track Details Batches';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT lb.*, im.ItemDescription FROM LGI.LogisticBatch lb LEFT OUTER JOIN INV.ItemMaster im ON lb.LogisticLineItemID = im.ItemID WHERE lb.TrackNumber = @TrackNumber;',
        [SPName] = N'[dbo].[APIPlusLogisticsOperation]',
        [DatabaseName] = 'ERPMega',
        [SchemaName] = 'dbo',
        [TableOrViewName] = 'LogisticBatch',
        [QueryType] = 'Grid'
    WHERE QueryID = @QID;
END
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'logistics_track_details' AND QueryID = @QID)
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('logistics_track_details', @QID);
GO

