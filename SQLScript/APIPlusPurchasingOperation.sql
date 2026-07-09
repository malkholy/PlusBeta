USE [ERPMega]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =========================================================================
-- Author:      Plus Beta Developer
-- Create date: 2026-07-08
-- Description: Purchase order header, line, and safety stock operations
-- =========================================================================
CREATE OR ALTER PROCEDURE [dbo].[APIPlusPurchasingOperation]
    @Operation VARCHAR(100),
    @LineData NVARCHAR(MAX) = '',
    @User           nvarchar(100) = '',
    @FireBaseToken  nvarchar(500) = '',
    @AppVersionWeb  nvarchar(50)  = '',
    @AppVersionAndroid nvarchar(50) = '',
    @AppVersionIos  nvarchar(50)  = '',
    @AppVersionDesktop nvarchar(50) = '',
    @PlatForm       nvarchar(50)  = '',
    @SqlStatement   nvarchar(max) = '',
    @State          int            output,
    @Message        nvarchar(500)  output
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_WARNINGS OFF;
    
    SET @State = 0;
    SET @Message = 'Success';

    -- Local variables for JSON extraction
    DECLARE @Period VARCHAR(20) = NULL;
    DECLARE @Months VARCHAR(100) = NULL;
    DECLARE @Quarter INT = NULL;
    DECLARE @Year INT = NULL;
    DECLARE @FromDate DATE = NULL;
    DECLARE @ToDate DATE = NULL;
    DECLARE @VendorNumber VARCHAR(50) = NULL;
    DECLARE @OrderNumber VARCHAR(100) = NULL;
    DECLARE @ItemCode VARCHAR(100) = NULL;

    -- Extract common fields from JSON @LineData if provided
    IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
    BEGIN
        SELECT 
            @Period  = JSON_VALUE(@LineData, '$.Period'),
            @Months  = JSON_VALUE(@LineData, '$.Months'),
            @Quarter = TRY_CAST(JSON_VALUE(@LineData, '$.Quarter') AS INT),
            @Year    = TRY_CAST(JSON_VALUE(@LineData, '$.Year') AS INT),
            @FromDate = TRY_CAST(JSON_VALUE(@LineData, '$.FromDate') AS DATE),
            @ToDate = TRY_CAST(JSON_VALUE(@LineData, '$.ToDate') AS DATE),
            @VendorNumber = JSON_VALUE(@LineData, '$.VendorNumber'),
            @OrderNumber = JSON_VALUE(@LineData, '$.OrderNumber'),
            @ItemCode = JSON_VALUE(@LineData, '$.ItemCode');
    END

    BEGIN TRY

        -- ---------------------------------------------------------------------
        -- Operation: Get Purchasing Metrics (Landing Dashboard view)
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetPurchasingData'
        BEGIN
            -- Success response list (returned as List0)
            SELECT 0 AS State, 'Success' AS Message;

            SELECT * FROM QGetPurchasingData;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Purchase Orders List
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetPurchaseOrders'
        BEGIN
            SELECT * FROM QGetPurchaseOrders
            WHERE (@FromDate IS NULL OR OrderCreatedDate >= @FromDate)
              AND (@ToDate IS NULL OR OrderCreatedDate <= @ToDate)
              AND (@VendorNumber IS NULL OR VendorNumber = @VendorNumber OR @VendorNumber = '');
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get All Purchase Order Lines (across all orders)
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetPurchaseOrderLinesAll'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT * FROM QGetPurchaseOrderLinesAll
            WHERE (@FromDate IS NULL OR OrderCreatedDate >= @FromDate)
              AND (@ToDate IS NULL OR OrderCreatedDate <= @ToDate)
              AND (@VendorNumber IS NULL OR Vendor = @VendorNumber OR @VendorNumber = '')
              AND (@ItemCode IS NULL OR @ItemCode = '' OR PurchasedCode = @ItemCode OR PurchasedID = @ItemCode)
            ORDER BY OrderCreatedDate DESC, OrderNumber DESC, Line ASC;

            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Purchase Order Lines (for details drawer)
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetPurchaseOrderLines'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT * FROM QGetPurchaseOrderLines WHERE OrderNumber = @OrderNumber ORDER BY Line ASC;

            -- Result set 1: PO Extra Amounts (List1)
            SELECT * FROM QGetPurchaseOrderExtraAmounts WHERE PurchaseOrderNo = @OrderNumber ORDER BY Line ASC;

            -- Result set 2: PO Release History (List2)
            SELECT * FROM QGetPurchaseOrderReleaseHistory WHERE po = @OrderNumber ORDER BY OperationDate DESC;

            -- Result set 3: PO Receiving History (List3)
            SELECT * FROM QGetPurchaseOrderReceivingHistory WHERE PurchaseOrderNumber = @OrderNumber ORDER BY ReceivingDate DESC, PurchaseOrderLine ASC;

            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Safety Stock Items
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetSaftyStockItems'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            -- Automatically log status transitions in real-time
            WITH CurrentStatusCTE AS (
                SELECT 
                    ItemID,
                    ItemCode,
                    TotalMonitored,
                    ReorderLimitPoint,
                    StatisticalTarget,
                    TotalOpenPO,
                    CASE 
                        WHEN (LeadTime <= 0 AND (ActiveLeadTime <= 0 OR MinHistLT = 0)) THEN 'Error'
                        WHEN StatisticalTarget <= 0 THEN 'Error'
                        WHEN TotalMonitored <= 0 THEN 'Out of Stock'
                        WHEN TotalMonitored < StatisticalTarget THEN 
                            CASE WHEN TotalOpenPO <= 0 THEN 'Critical' ELSE 'Safety Stock' END
                        WHEN TotalMonitored <= ReorderLimitPoint THEN 
                            CASE WHEN TotalOpenPO > 0 THEN 'On Order' ELSE 'Reorder Required' END
                        ELSE 'Healthy'
                    END AS CurrentStatus
                FROM QGetSaftyStockItems
            ),
            LatestLoggedCTE AS (
                SELECT ItemCode, NewStatus, LogDate,
                       ROW_NUMBER() OVER (PARTITION BY ItemCode ORDER BY LogDate DESC) AS rn
                FROM [PUR].[SaftyStockStatusHistory]
            )
            INSERT INTO [PUR].[SaftyStockStatusHistory] (
                ItemID, ItemCode, OldStatus, NewStatus, 
                MonitoredBalance, ReorderLimit, CalculatedSafetyStock, OpenPOQty
            )
            SELECT 
                c.ItemID,
                c.ItemCode,
                l.NewStatus AS OldStatus,
                c.CurrentStatus AS NewStatus,
                c.TotalMonitored,
                c.ReorderLimitPoint,
                c.StatisticalTarget,
                c.TotalOpenPO
            FROM CurrentStatusCTE c
            LEFT OUTER JOIN LatestLoggedCTE l ON c.ItemCode = l.ItemCode AND l.rn = 1
            WHERE l.NewStatus IS NULL 
               OR l.NewStatus <> c.CurrentStatus;

            SELECT * FROM QGetSaftyStockItems ORDER BY ItemCode;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Vendors List (for dropdown filters)
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetVendors'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT * FROM QGetVendors ORDER BY VendorName;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Items List (for dropdown filters)
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetItems'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT * FROM QGetItems ORDER BY ItemDescription;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Search Items
        -- ---------------------------------------------------------------------
        IF @Operation = 'SearchItems'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @SearchPattern VARCHAR(200) = '';
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @SearchPattern = JSON_VALUE(@LineData, '$.SearchPattern');
            END

            SET @SearchPattern = '%' + ISNULL(@SearchPattern, '') + '%';

            SELECT TOP 50 * FROM QSearchItems
            WHERE (ItemID LIKE @SearchPattern OR ItemDescription LIKE @SearchPattern)
            ORDER BY ItemID;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Save Safety Stock Item (Insert / Update)
        -- ---------------------------------------------------------------------
        IF @Operation = 'SaveSaftyStockItem'
        BEGIN
            DECLARE @ID INT = NULL;
            DECLARE @SaveItemID VARCHAR(50) = NULL;
            DECLARE @SaftyStock DECIMAL(18,5) = 0;
            DECLARE @LeadTime INT = 0;
            DECLARE @ServiceLevelFactor DECIMAL(18,5) = NULL;
            DECLARE @ItemType VARCHAR(50) = NULL;

            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT 
                    @ID = TRY_CAST(JSON_VALUE(@LineData, '$.ID') AS INT),
                    @SaveItemID = JSON_VALUE(@LineData, '$.ItemID'),
                    @SaftyStock = TRY_CAST(JSON_VALUE(@LineData, '$.SaftyStock') AS DECIMAL(18,5)),
                    @LeadTime = TRY_CAST(JSON_VALUE(@LineData, '$.LeadTime') AS INT),
                    @ServiceLevelFactor = TRY_CAST(JSON_VALUE(@LineData, '$.ServiceLevelFactor') AS DECIMAL(18,5)),
                    @ItemType = JSON_VALUE(@LineData, '$.ItemType');
            END

            IF @ItemCode IS NULL OR @ItemCode = ''
            BEGIN
                SET @State = 1;
                SET @Message = 'Item Code is required.';
                RETURN;
            END

            -- Try to find ItemID from inv.ItemMaster if not provided
            IF @SaveItemID IS NULL OR @SaveItemID = ''
            BEGIN
                SELECT TOP 1 @SaveItemID = ItemID 
                FROM INV.ItemMaster 
                WHERE ItemID = @ItemCode;
            END

            IF EXISTS (SELECT 1 FROM PUR.SaftyStockItemMaster WHERE ID = @ID)
            BEGIN
                UPDATE PUR.SaftyStockItemMaster
                SET 
                    ItemID = @SaveItemID,
                    ItemCode = @ItemCode,
                    SaftyStock = @SaftyStock,
                    LeadTime = @LeadTime,
                    ServiceLevelFactor = @ServiceLevelFactor,
                    LastMaintBy = @User,
                    LastMaintDate = GETDATE(),
                    ItemType = @ItemType
                WHERE ID = @ID;
            END
            ELSE
            BEGIN
                IF EXISTS (SELECT 1 FROM PUR.SaftyStockItemMaster WHERE ItemCode = @ItemCode)
                BEGIN
                    SET @State = 1;
                    SET @Message = 'Safety stock record for item code ' + @ItemCode + ' already exists.';
                    RETURN;
                END

                INSERT INTO PUR.SaftyStockItemMaster (
                    ItemID, ItemCode, SaftyStock, LeadTime, ServiceLevelFactor,
                    CreatedBy, CreatedDate, LastMaintBy, LastMaintDate, ItemType
                ) VALUES (
                    @SaveItemID, @ItemCode, @SaftyStock, @LeadTime, @ServiceLevelFactor,
                    @User, GETDATE(), @User, GETDATE(), @ItemType
                );
            END

            SET @State = 0;
            SET @Message = 'Safety stock item saved successfully.';
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Delete Safety Stock Item
        -- ---------------------------------------------------------------------
        IF @Operation = 'DeleteSaftyStockItem'
        BEGIN
            DECLARE @DelID INT = NULL;
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @DelID = TRY_CAST(JSON_VALUE(@LineData, '$.ID') AS INT);
            END

            IF EXISTS (SELECT 1 FROM PUR.SaftyStockItemMaster WHERE ID = @DelID)
            BEGIN
                DELETE FROM PUR.SaftyStockItemMaster WHERE ID = @DelID;
                SET @State = 0;
                SET @Message = 'Safety stock item deleted successfully.';
            END
            ELSE
            BEGIN
                SET @State = 1;
                SET @Message = 'Record not found.';
            END
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Item Status History Log
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetItemStatusHistory'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @HistoryItemCode VARCHAR(100) = NULL;
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @HistoryItemCode = JSON_VALUE(@LineData, '$.ItemCode');
            END
            IF @HistoryItemCode IS NULL OR @HistoryItemCode = ''
            BEGIN
                SET @HistoryItemCode = @ItemCode;
            END

            SELECT * FROM QGetItemStatusHistory WHERE ItemCode = @HistoryItemCode ORDER BY LogDate DESC;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Item Receipts
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetItemReceipts'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @ReceiptsItemCode VARCHAR(100) = NULL;
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @ReceiptsItemCode = JSON_VALUE(@LineData, '$.ItemCode');
            END
            IF @ReceiptsItemCode IS NULL OR @ReceiptsItemCode = ''
            BEGIN
                SET @ReceiptsItemCode = @ItemCode;
            END

            SELECT TOP (10) * FROM QGetItemReceipts
            WHERE ItemCode = @ReceiptsItemCode AND ReceivingState > 0
            ORDER BY ReceivingDate DESC;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Item Balance
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetItemBalance'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT * FROM QGetItemBalance WHERE ItemCode = @ItemCode ORDER BY WarehouseFacility, Warehouse;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Item Consumption
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetItemConsumption'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @MaxIndex INT;
            SET @MaxIndex = YEAR(GETDATE()) * 12 + MONTH(GETDATE());

            SELECT * FROM QGetItemConsumption
            WHERE ItemCode = @ItemCode AND (Yer * 12 + Mnth) >= (@MaxIndex - 12)
            ORDER BY Yer DESC, Mnth DESC, Facility, Warehouse;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Item Open POs
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetItemOpenPOs'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT * FROM QGetItemOpenPOs
            WHERE ItemCode = @ItemCode AND LineState IN (0, 1) AND OrderLineType = 'I' AND OrderType = 1
            ORDER BY OrderDate DESC, OrderNumber DESC;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Item Lead Time
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetItemLeadTime'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT TOP 6 * FROM QGetItemLeadTime
            WHERE ItemCode = @ItemCode AND OrderNumber > 2499999 AND QuantityReceived > 0
            ORDER BY ActualArrivalDate DESC;
            RETURN;
        END

        -- Fallback: Unsupported Operation
        SET @Message = 'Unsupported Operation: ' + COALESCE(@Operation, 'NULL');
        SET @State = 1;

    END TRY
    BEGIN CATCH
        -- Database Exception Handler
        SET @State = ERROR_NUMBER();
        SET @Message = 'SQL Exception: ' + ERROR_MESSAGE() + ' (Line: ' + CAST(ERROR_LINE() AS VARCHAR(10)) + ')';
    END CATCH
END
GO
