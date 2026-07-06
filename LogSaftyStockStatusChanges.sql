USE ERPMega
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =========================================================================
-- Author:      Plus Beta Developer
-- Create date: 2026-07-05
-- Description: Standalone SP run by SQL Server Agent Job to log status changes
-- =========================================================================
CREATE OR ALTER PROCEDURE [PUR].[LogSaftyStockStatusChanges]
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_WARNINGS OFF;

    -- 1. Metrics pre-calculation matching APIPlusOperation exactly
    WITH ConsumptionBase AS (
        SELECT 
            ItemCode,
            AVG(TotalQuantity) AS AvgMonthlyQty,
            STDEV(TotalQuantity) AS StdDevMonthlyQty
        FROM inv.ItemConsuming
        WHERE (Yer * 12 + Mnth) >= (YEAR(GETDATE()) * 12 + MONTH(GETDATE()) - 12)
          AND (Yer * 12 + Mnth) < (YEAR(GETDATE()) * 12 + MONTH(GETDATE()))
        GROUP BY ItemCode
    ),
    LeadTimeBase AS (
        SELECT 
            ItemCode,
            AVG(CAST(LeadTime AS DECIMAL(18,5))) AS AvgHistLT,
            STDEV(CAST(LeadTime AS DECIMAL(18,5))) AS StdDevHistLT
        FROM (
            SELECT 
                pol.PurchasedCode AS ItemCode,
                CASE WHEN DATEDIFF(d, poh.ReleaseDate, (
                    SELECT MAX(rh.ReceivingDate)
                    FROM pur.RecievingLinkLine rll
                    LEFT OUTER JOIN pur.ReceivingOrderHeader rh ON rll.ReceivingNumber = rh.ReceivingOrderNo
                    WHERE rll.PurchaseOrderNumber = pol.OrderNumber
                      AND rll.PurchaseOrderLine = pol.Line
                )) < 0 THEN 0
                ELSE DATEDIFF(d, poh.ReleaseDate, (
                    SELECT MAX(rh.ReceivingDate)
                    FROM pur.RecievingLinkLine rll
                    LEFT OUTER JOIN pur.ReceivingOrderHeader rh ON rll.ReceivingNumber = rh.ReceivingOrderNo
                    WHERE rll.PurchaseOrderNumber = pol.OrderNumber
                      AND rll.PurchaseOrderLine = pol.Line
                )) END AS LeadTime,
                ROW_NUMBER() OVER (PARTITION BY pol.PurchasedCode ORDER BY (
                    SELECT MAX(rh.ReceivingDate)
                    FROM pur.RecievingLinkLine rll
                    LEFT OUTER JOIN pur.ReceivingOrderHeader rh ON rll.ReceivingNumber = rh.ReceivingOrderNo
                    WHERE rll.PurchaseOrderNumber = pol.OrderNumber
                      AND rll.PurchaseOrderLine = pol.Line
                ) DESC) AS rn
            FROM pur.PurchaseOrderLine pol
            LEFT OUTER JOIN pur.PurchaseOrderHeader poh ON pol.OrderNumber = poh.PurchaseOrderNumber
            WHERE pol.OrderNumber > 2499999
              AND pol.QuantityReceived > 0
        ) t
        WHERE rn <= 3
        GROUP BY ItemCode
    ),
    OpenPOBase AS (
        SELECT 
            pol.PurchasedCode AS ItemCode,
            SUM(CASE WHEN pol.QuantityOrdered - pol.QuantityReceived < 0 THEN 0 
                     ELSE pol.QuantityOrdered - pol.QuantityReceived 
                END) AS OpenQtySum
        FROM pur.PurchaseOrderLine pol
        INNER JOIN pur.PurchaseOrderHeader poh ON poh.PurchaseOrderNumber = pol.OrderNumber
        WHERE pol.LineState IN (0, 1)
          AND pol.OrderLineType = 'I'
          AND poh.OrderType = 1
        GROUP BY pol.PurchasedCode
    ),
    MonitoredBalanceBase AS (
        SELECT 
            x.ItemCode,
            SUM(CASE WHEN (
                (LOWER(LTRIM(RTRIM(s.PurchasingWarehouse))) IN ('true', 'y', 'yes', '1', 't') AND LOWER(LTRIM(RTRIM(wm.Purchasing))) IN ('true', 'y', 'yes', '1', 't'))
                OR
                (LOWER(LTRIM(RTRIM(s.ProducationWarehouse))) IN ('true', 'y', 'yes', '1', 't') AND LOWER(LTRIM(RTRIM(wm.Production))) IN ('true', 'y', 'yes', '1', 't'))
            ) THEN x.ItemBalance ELSE 0 END) AS MonitoredBalanceSum
        FROM inv.ItemBalance x
        LEFT OUTER JOIN inv.WarehouseMaster wm ON x.Warehouse = wm.Warehouse
        INNER JOIN PUR.SaftyStockItemMaster s ON x.ItemCode = s.ItemCode
        WHERE x.Warehouse <> '999'
        GROUP BY x.ItemCode
    )
    SELECT  s.[ID]
          ,s.[ItemID]
          ,s.[ItemCode]
          ,s.[SaftyStock]
          ,s.[LeadTime]
          ,s.[ServiceLevelFactor]
          ,s.[PurchasingWarehouse]
          ,s.[ProducationWarehouse]
          ,s.[CreatedBy]
          ,s.[CreatedDate]
          ,s.[LastMaintBy]
          ,s.[LastMaintDate]
          ,i.[ItemType]
          ,i.[StockUM]
          ,ISNULL(o.OpenQtySum, 0) AS TotalOpenPO
          ,ISNULL(mb.MonitoredBalanceSum, 0) AS TotalMonitored
          ,ISNULL(c.AvgMonthlyQty, 0) AS AvgMonthlyConsumption
          ,CEILING(ISNULL(c.AvgMonthlyQty, 0) / 26.0) AS AvgDailyConsumption
          -- Active Lead Time (Use configured if > 0, else hist avg)
          ,CASE WHEN s.LeadTime > 0 THEN s.LeadTime 
                ELSE CEILING(ISNULL(l.AvgHistLT, 0))
           END AS ActiveLeadTime
          -- Active Lead Time Std Dev (If configured, it is 0, else hist std dev)
          ,CASE WHEN s.LeadTime > 0 THEN 0 
                ELSE ISNULL(l.StdDevHistLT, 0) 
           END AS ActiveLeadTimeStdDev
          -- Daily Demand Std Dev
          ,ISNULL(c.StdDevMonthlyQty, 0) / 26.0 AS DailyDemandStdDev
    INTO #TempItems
    FROM PUR.SaftyStockItemMaster s
    LEFT OUTER JOIN INV.ItemMaster i ON s.ItemID = i.ItemID
    LEFT OUTER JOIN ConsumptionBase c ON s.ItemCode = c.ItemCode
    LEFT OUTER JOIN LeadTimeBase l ON s.ItemCode = l.ItemCode
    LEFT OUTER JOIN OpenPOBase o ON s.ItemCode = o.ItemCode
    LEFT OUTER JOIN MonitoredBalanceBase mb ON s.ItemCode = mb.ItemCode
    WHERE i.[ItemType] = 'R';

    -- 2. Select final columns including statistical safety targets & limits into #TempFinal
    SELECT 
        ItemID, ItemCode, SaftyStock, LeadTime, ServiceLevelFactor,
        StockUM, TotalOpenPO, TotalMonitored, AvgDailyConsumption,
        ActiveLeadTime, ActiveLeadTimeStdDev, DailyDemandStdDev,
        -- Statistical target Safety Stock
        CASE WHEN ActiveLeadTime > 0 THEN 
            CEILING(SQRT(
                ActiveLeadTime * POWER(DailyDemandStdDev, 2) +
                POWER(AvgDailyConsumption, 2) * POWER(ActiveLeadTimeStdDev, 2)
            ) * ISNULL(ServiceLevelFactor, 1.65))
            ELSE 0 
        END AS StatisticalTarget,
        -- Reorder Point / Limit
        CASE WHEN ActiveLeadTime > 0 THEN 
            CEILING(
                CEILING(SQRT(
                    ActiveLeadTime * POWER(DailyDemandStdDev, 2) +
                    POWER(AvgDailyConsumption, 2) * POWER(ActiveLeadTimeStdDev, 2)
                ) * ISNULL(ServiceLevelFactor, 1.65)) +
                (AvgDailyConsumption * ActiveLeadTime)
            )
            ELSE 0 
        END AS ReorderLimitPoint
    INTO #TempFinal
    FROM #TempItems;

    -- 3. Perform comparison status check & insert state transitions
    WITH CurrentStatusCTE AS (
        SELECT 
            ItemID,
            ItemCode,
            TotalMonitored,
            ReorderLimitPoint,
            StatisticalTarget,
            TotalOpenPO,
            CASE 
                WHEN StatisticalTarget <= 0 THEN 'Error'
                WHEN TotalMonitored <= 0 THEN 'Out of Stock'
                WHEN TotalMonitored < StatisticalTarget THEN 
                    CASE WHEN TotalOpenPO <= 0 THEN 'Critical' ELSE 'Safety Stock' END
                WHEN TotalMonitored <= ReorderLimitPoint THEN 
                    CASE WHEN TotalOpenPO > 0 THEN 'On Order' ELSE 'Reorder Required' END
                ELSE 'Healthy'
            END AS CurrentStatus
        FROM #TempFinal
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

    DROP TABLE #TempFinal;
    DROP TABLE #TempItems;
END
GO
