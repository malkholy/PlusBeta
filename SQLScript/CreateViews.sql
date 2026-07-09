USE [ERPMega]
GO

-- =========================================================================
-- Views Creation for Plus Beta Purchasing Operations
-- =========================================================================

-- 1. QGetPurchasingData
CREATE OR ALTER VIEW [dbo].[QGetPurchasingData] AS
SELECT 
    1500000.00 AS TotalPurchasingAmount,
    1200000.00 AS TotalPaid,
    300000.00  AS VendorBalance;
GO

-- 2. QGetPurchaseOrders
CREATE OR ALTER VIEW [dbo].[QGetPurchaseOrders] AS
SELECT 
    a.PurchaseOrderNumber, 
    a.EnteredDate, 
    a.VendorNumber, 
    a.Facility, 
    a.ShipToID, 
    a.ShipToName, 
    a.ShipToAddress, 
    a.OrderState, 
    a.OrderCurrency, 
    a.TotalAmount, 
    a.OrderDoucmentState, 
    a.ReleaseDate, 
    a.ReleaseNumber, 
    a.DeliveryTermID, 
    a.PaymentTermID, 
    a.VendorType, 
    a.OrderCloseDate, 
    a.OrderClosedBy, 
    a.OrderCreatedBy, 
    a.OrderCreatedDate, 
    a.OrderLastMaintBy, 
    a.OrderLastMaintDate, 
    a.OrderType, 
    a.LogisticNeed, 
    a.OrderInUse, 
    a.OrderInUseBy, 
    a.AttachmentFileID, 
    d.VendorName, 
    d.VendorExtraName, 
    c.DeliveryTermDescription, 
    b.TermDescription,
    (SELECT StateDescription FROM PUR.PurchaseOrderState WHERE State = a.OrderState AND Type = 'H') AS OrderStateDescription, 
    CASE WHEN a.OrderType = 1 THEN 'Purchase Order' ELSE 'Returned Order' END AS OrderTypeDescription, 
    a.TotalRecievedAmount, 
    a.TotalFinalAmount, 
    a.TotalInsurance, 
    a.TotalFreight, 
    a.TotalDiscount, 
    a.ReleasedBy, 
    a.OrderClosedReason, 
    a.PurchaseOrderCategoryCode, 
    a.BuyerCode, 
    a.ReleaseState, 
    a.TotalCostedAmount, 
    a.TotalPaidAmount, 
    d.AccountantID, 
    d.VendorCategoryID1, 
    d.VendorCategoryID2, 
    d.VendorCategoryID3, 
    a.RequestingDepartmentID, 
    rdm.DeparntmentName AS RequestingDeparntmentName, 
    a.PINumber, 
    a.RequestArrivalDate
FROM PUR.PurchaseOrderHeader AS a 
LEFT OUTER JOIN ACP.VendorPaymentTerm AS b ON a.PaymentTermID = b.PaymentTermID 
LEFT OUTER JOIN ACP.VendorDeliveryTerm AS c ON a.DeliveryTermID = c.DeliveryTermID 
LEFT OUTER JOIN ACP.VendorMaster AS d ON a.VendorNumber = d.VendorNumber 
LEFT OUTER JOIN PUR.RequestingDepartmentMaster AS rdm ON rdm.RequestingDepartmentID = a.RequestingDepartmentID;
GO

-- 3. QGetPurchaseOrderLinesAll
CREATE OR ALTER VIEW [dbo].[QGetPurchaseOrderLinesAll] AS
SELECT 
    b.Facility, 
    a.OrderNumber, 
    a.Line, 
    a.PurchasedID, 
    a.PurchasedCode, 
    a.CodeDescription, 
    a.ItemType, 
    a.Vendor, 
    c.VendorName,
    c.VendorExtraName,
    a.QuantityOrdered, 
    a.QuantityReceived, 
    a.QuantityCosted, 
    a.PurchaseUnitOfMeasure, 
    a.Price, 
    a.Price * a.QuantityOrdered AS LineAmount,
    a.LineState, 
    (SELECT StateDescription FROM PUR.PurchaseOrderState WHERE State = a.LineState AND Type = 'L') AS LineStateDescription,
    a.OrderLineType, 
    (SELECT TypeDescription FROM PUR.PurchaseLineTypeMaster WHERE LineType = a.OrderLineType) AS LineTypeDescription,
    a.ETA, 
    a.ETD,
    b.OrderCreatedDate,
    b.OrderCreatedBy,
    b.OrderState,
    (SELECT StateDescription FROM PUR.PurchaseOrderState WHERE State = b.OrderState AND Type = 'H') AS OrderStateDescription,
    CASE WHEN b.OrderType = 1 THEN 'Purchase Order' ELSE 'Returned Order' END AS OrderTypeDescription,
    b.OrderCurrency,
    b.ReleaseDate,
    b.VendorType,
    b.PaymentTermID,
    b.DeliveryTermID,
    vpt.TermDescription,
    vdt.DeliveryTermDescription
FROM PUR.PurchaseOrderLine AS a 
LEFT OUTER JOIN PUR.PurchaseOrderHeader AS b ON b.PurchaseOrderNumber = a.OrderNumber 
LEFT OUTER JOIN ACP.VendorMaster AS c ON c.VendorNumber = a.Vendor
LEFT OUTER JOIN ACP.VendorPaymentTerm AS vpt ON vpt.PaymentTermID = b.PaymentTermID
LEFT OUTER JOIN ACP.VendorDeliveryTerm AS vdt ON vdt.DeliveryTermID = b.DeliveryTermID;
GO

-- 4. QGetPurchaseOrderLines
CREATE OR ALTER VIEW [dbo].[QGetPurchaseOrderLines] AS
SELECT 
    b.Facility, 
    a.OrderNumber, 
    a.Line, 
    a.PurchasedID, 
    a.PurchasedCode, 
    a.CodeDescription, 
    a.ItemType, 
    a.Vendor, 
    b.VendorType, 
    a.OriginID, 
    a.QuantityOrdered, 
    a.QuantityReceived, 
    a.QuantityCosted, 
    a.QuantityLogisted, 
    a.PurchaseUnitOfMeasure, 
    a.Price, 
    a.LineState, 
    a.OrderLineType, 
    a.ProposalPrice, 
    rdm.RequestingDepartmentID, 
    rdm.DeparntmentName,
    (SELECT StateDescription FROM PUR.PurchaseOrderState AS c WHERE (State = a.LineState) AND (Type = 'L')) AS LineStateDescription,
    (SELECT TypeDescription FROM PUR.PurchaseLineTypeMaster AS x WHERE (LineType = a.OrderLineType)) AS LineTypeDescription,
    (SELECT StateDescription FROM PUR.PurchaseOrderState AS c WHERE (State = b.OrderState) AND (Type = 'H')) AS OrderStateDesc, 
    c.VendorName, 
    c.VendorExtraName, 
    b.OrderState, 
    b.OrderCurrency, 
    b.EnteredDate, 
    b.OrderType, 
    b.PurchaseOrderCategoryCode, 
    b.BuyerCode, 
    a.POReference, 
    a.POLineReference, 
    a.ClosedReasonID, 
    a.IsClosed, 
    a.ClosedQty, 
    b.PaymentTermID, 
    ACP.VendorPaymentTerm.TermDescription, 
    CASE WHEN b.OrderType = 1 THEN 'PurchaseOrder ' ELSE 'Returned Order ' END AS OrderTypeDescription, 
    a.Price * a.QuantityOrdered AS LineAmount, 
    O.OriginDescription, 
    a.ETA, 
    a.ETD, 
    a.PurchasingPackingTypeID,
    (SELECT PackingDescription FROM PUR.PurchasingPackingType AS x WHERE (PackingID = a.PurchasingPackingTypeID)) AS PackingDescription, 
    IM.ItemDescription, 
    IM.ItemExtraDescription, 
    IM.ItemPurchasingDescription, 
    IM.ItemID, 
    a.LineCreatedBy, 
    a.LineCreatedDate, 
    a.LineLastMaintBy, 
    a.LastMaintDate, 
    a.ClosedBy, 
    a.ClosedDate, 
    a.ReOpenDate, 
    a.ReOpenBy, 
    c.AccountantID, 
    c.AccountantGroupID, 
    b.DeliveryTermID, 
    vdt.DeliveryTermDescription
FROM PUR.PurchaseOrderLine AS a 
LEFT OUTER JOIN PUR.PurchaseOrderHeader AS b ON b.PurchaseOrderNumber = a.OrderNumber 
LEFT OUTER JOIN ACP.VendorMaster AS c ON c.VendorNumber = a.Vendor 
LEFT OUTER JOIN ACP.VendorPaymentTerm ON ACP.VendorPaymentTerm.PaymentTermID = b.PaymentTermID 
LEFT OUTER JOIN PUR.PurchasingOriginMaster AS O ON O.OriginID = a.OriginID 
LEFT OUTER JOIN INV.ItemMaster AS IM ON IM.ItemID = a.PurchasedID AND a.OrderLineType = 'I' 
LEFT OUTER JOIN PUR.RequestingDepartmentMaster AS rdm ON rdm.RequestingDepartmentID = b.RequestingDepartmentID 
LEFT OUTER JOIN ACP.VendorDeliveryTerm AS vdt ON vdt.DeliveryTermID = b.DeliveryTermID;
GO

-- 5. QGetPurchaseOrderExtraAmounts
CREATE OR ALTER VIEW [dbo].[QGetPurchaseOrderExtraAmounts] AS
SELECT 
    'Ins' AS [Type],
    PurchaseOrderNo,
    Line,
    Description,
    InsuranceAmount AS Amount,
    InsuranceInvoiced AS Invoiced
FROM PUR.PurchaseOrderInsurance
UNION ALL
SELECT 
    'Dis' AS [Type],
    PurchaseOrderNo,
    Line,
    Description,
    DiscountOffered AS Amount,
    DiscountInvoiced AS Invoiced
FROM PUR.PurchaseOrderDiscount
UNION ALL 
SELECT 
    'Frg' AS [Type],
    PurchaseOrderNo,
    Line,
    Description,
    FreightAmount AS Amount,
    FreightInvoiced AS Invoiced
FROM PUR.PurchaseOrderFreight;
GO

-- 6. QGetPurchaseOrderReleaseHistory
CREATE OR ALTER VIEW [dbo].[QGetPurchaseOrderReleaseHistory] AS
SELECT 
    operation, 
    po, 
    OperationDate, 
    ByUser, 
    Reason 
FROM pur.PurchaseOrderReleaseHistory;
GO

-- 7. QGetPurchaseOrderReceivingHistory
CREATE OR ALTER VIEW [dbo].[QGetPurchaseOrderReceivingHistory] AS
SELECT 
    a.PurchaseOrderNumber, 
    a.PurchaseOrderLine, 
    a.ReceivingNumber,
    a.ItemID, 
    a.ItemCode, 
    a.LinkedQuantity AS RecievedQty,
    b.ReceivingDate  
FROM pur.RecievingLinkLine a 
LEFT OUTER JOIN pur.ReceivingOrderHeader b ON a.ReceivingNumber = b.ReceivingOrderNo;
GO

-- 8. QGetSaftyStockItems
CREATE OR ALTER VIEW [dbo].[QGetSaftyStockItems] AS
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
        STDEV(CAST(LeadTime AS DECIMAL(18,5))) AS StdDevHistLT,
        MIN(LeadTime) AS MinHistLT
    FROM (
        SELECT 
            pol.PurchasedCode AS ItemCode,
            CASE WHEN DATEDIFF(d, (SELECT MIN(x.OperationDate) FROM pur.PurchaseOrderReleaseHistory x WHERE x.po = pol.OrderNumber), (
                SELECT MAX(rh.ReceivingDate)
                FROM pur.RecievingLinkLine rll
                LEFT OUTER JOIN pur.ReceivingOrderHeader rh ON rll.ReceivingNumber = rh.ReceivingOrderNo
                WHERE rll.PurchaseOrderNumber = pol.OrderNumber
                  AND rll.PurchaseOrderLine = pol.Line
            )) < 0 THEN 0
            ELSE DATEDIFF(d, (SELECT MIN(x.OperationDate) FROM pur.PurchaseOrderReleaseHistory x WHERE x.po = pol.OrderNumber), (
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
),
TempItems AS (
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
          ,ISNULL(l.MinHistLT, -1) AS MinHistLT
    FROM PUR.SaftyStockItemMaster s
    LEFT OUTER JOIN INV.ItemMaster i ON s.ItemID = i.ItemID
    LEFT OUTER JOIN ConsumptionBase c ON s.ItemCode = c.ItemCode
    LEFT OUTER JOIN LeadTimeBase l ON s.ItemCode = l.ItemCode
    LEFT OUTER JOIN OpenPOBase o ON s.ItemCode = o.ItemCode
    LEFT OUTER JOIN MonitoredBalanceBase mb ON s.ItemCode = mb.ItemCode
    WHERE i.[ItemType] = 'R'
)
SELECT 
     ID, ItemID, ItemCode, SaftyStock, LeadTime, ServiceLevelFactor,
     PurchasingWarehouse, ProducationWarehouse, CreatedBy, CreatedDate, LastMaintBy, LastMaintDate,
     ItemType, StockUM, TotalOpenPO, TotalMonitored, AvgMonthlyConsumption, AvgDailyConsumption,
     ActiveLeadTime, ActiveLeadTimeStdDev, DailyDemandStdDev, MinHistLT,
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
FROM TempItems;
GO

-- 9. QGetVendors
CREATE OR ALTER VIEW [dbo].[QGetVendors] AS
SELECT DISTINCT 
    VendorNumber, 
    VendorName
FROM ACP.VendorMaster
WHERE VendorNumber IS NOT NULL AND VendorName IS NOT NULL;
GO

-- 10. QGetItems
CREATE OR ALTER VIEW [dbo].[QGetItems] AS
SELECT DISTINCT 
    ItemID AS ItemCode,
    ItemDescription
FROM INV.ItemMaster
WHERE ItemID IS NOT NULL AND ItemDescription IS NOT NULL;
GO

-- 11. QSearchItems
CREATE OR ALTER VIEW [dbo].[QSearchItems] AS
SELECT ItemID, ItemID AS ItemCode, ItemDescription, ItemType
FROM INV.ItemMaster;
GO

-- 12. QGetItemStatusHistory
CREATE OR ALTER VIEW [dbo].[QGetItemStatusHistory] AS
SELECT 
    LogID, ItemID, ItemCode, OldStatus, NewStatus,
    MonitoredBalance, ReorderLimit, CalculatedSafetyStock, OpenPOQty,
    LogDate
FROM [PUR].[SaftyStockStatusHistory];
GO

-- 13. QGetItemReceipts
CREATE OR ALTER VIEW [dbo].[QGetItemReceipts] AS
SELECT 
    c.StateDescription, 
    b.ReceivingDate, 
    a.QuantityReceived, 
    a.Warehouse,
    a.ReceivedCode AS ItemCode,
    b.ReceivingState
FROM pur.ReceivingOrderLine a 
LEFT OUTER JOIN pur.ReceivingOrderHeader b ON a.LineOrderNumber = b.ReceivingOrderNo 
LEFT OUTER JOIN pur.ReceivingOrderState c ON c.StateValue = b.ReceivingState AND c.Type = 'H';
GO

-- 14. QGetItemBalance
CREATE OR ALTER VIEW [dbo].[QGetItemBalance] AS
SELECT 
    x.ItemCode,
    z.WarehouseFacility,
    x.Warehouse,
    x.ItemBalance,
    z.Production,
    z.Purchasing
FROM inv.ItemBalance x
LEFT OUTER JOIN inv.WarehouseMaster z ON x.Warehouse = z.Warehouse
WHERE x.Warehouse <> '999';
GO

-- 15. QGetItemConsumption
CREATE OR ALTER VIEW [dbo].[QGetItemConsumption] AS
SELECT 
    Yer,
    Mnth,
    Facility,
    Warehouse,
    ItemCode,
    TotalQuantity
FROM inv.ItemConsuming;
GO

-- 16. QGetItemOpenPOs
CREATE OR ALTER VIEW [dbo].[QGetItemOpenPOs] AS
SELECT 
    a.OrderNumber,
    d.OrderCreatedDate AS OrderDate,
    d.VendorNumber,
    v.VendorName,
    b.ItemID, 
    b.ItemCode, 
    b.ItemDescription, 
    b.ItemExtraDescription, 
    a.ItemType, 
    a.QuantityOrdered,  
    a.QuantityReceived,   
    CASE WHEN a.QuantityOrdered - a.QuantityReceived < 0 THEN 0 
         ELSE a.QuantityOrdered - a.QuantityReceived 
    END AS OpenQty,
    a.ETA,
    a.ETD,
    d.OrderState,
    (SELECT StateDescription FROM PUR.PurchaseOrderState WHERE State = d.OrderState AND Type = 'H') AS OrderStateDescription,
    d.ReleaseDate,
    a.LineState,
    a.OrderLineType,
    d.OrderType
FROM pur.PurchaseOrderLine a 
LEFT OUTER JOIN inv.ItemMaster b ON a.PurchasedID = b.ItemID 
LEFT OUTER JOIN pur.PurchaseOrderHeader d ON d.PurchaseOrderNumber = a.OrderNumber
LEFT OUTER JOIN ACP.VendorMaster v ON d.VendorNumber = v.VendorNumber;
GO

-- 17. QGetItemLeadTime
CREATE OR ALTER VIEW [dbo].[QGetItemLeadTime] AS
SELECT 
    a.OrderNumber, 
    a.LineState,  
    a.QuantityOrdered, 
    a.QuantityReceived, 
    (SELECT MIN(x.OperationDate) FROM pur.PurchaseOrderReleaseHistory x WHERE x.po = a.OrderNumber) AS ReleaseDate, 
    a.ETD, 
    a.ETA,
    (SELECT MAX(y.ReceivingDate) 
     FROM pur.RecievingLinkLine z 
     LEFT OUTER JOIN pur.ReceivingOrderHeader y ON z.ReceivingNumber = y.ReceivingOrderNo 
     WHERE z.PurchaseOrderNumber = a.OrderNumber 
       AND z.PurchaseOrderLine = a.Line) AS ActualArrivalDate, 	
    ISNULL(DATEDIFF(d, a.ETD, a.ETA), 0) AS ETS,		
    CASE WHEN DATEDIFF(d, (SELECT MIN(x.OperationDate) FROM pur.PurchaseOrderReleaseHistory x WHERE x.po = a.OrderNumber), 
              (SELECT MAX(y.ReceivingDate) 
               FROM pur.RecievingLinkLine z 
               LEFT OUTER JOIN pur.ReceivingOrderHeader y ON z.ReceivingNumber = y.ReceivingOrderNo 
               WHERE z.PurchaseOrderNumber = a.OrderNumber 
                 AND z.PurchaseOrderLine = a.Line)) < 0 THEN 0
         ELSE DATEDIFF(d, (SELECT MIN(x.OperationDate) FROM pur.PurchaseOrderReleaseHistory x WHERE x.po = a.OrderNumber), 
              (SELECT MAX(y.ReceivingDate) 
               FROM pur.RecievingLinkLine z 
               LEFT OUTER JOIN pur.ReceivingOrderHeader y ON z.ReceivingNumber = y.ReceivingOrderNo 
               WHERE z.PurchaseOrderNumber = a.OrderNumber 
                 AND z.PurchaseOrderLine = a.Line))
    END AS LeadTime,
    a.PurchasedCode AS ItemCode,
    b.VendorNumber,
    v.VendorName
FROM pur.PurchaseOrderLine a 
LEFT OUTER JOIN pur.PurchaseOrderHeader b ON a.OrderNumber = b.PurchaseOrderNumber
LEFT OUTER JOIN ACP.VendorMaster v ON b.VendorNumber = v.VendorNumber;
GO

-- 17. QGetTrackingHistory
CREATE OR ALTER VIEW [dbo].[QGetTrackingHistory] AS
SELECT        a.LHID, a.TrackNumber, a.TrackState, a.VendorNumber, a.BankNumber, a.ForwarderID, a.PINumber, a.ShipmentState, a.AccountingState, a.DocumentState, a.Currency, a.ETA, a.ETD, a.InvoiceNumber, a.Destination, 
                         a.LogisitcNote, a.AttachmentID, a.CustomsBrokerRef, a.RequestShippingDate, a.OfficeCourierArrivalDate, a.BankCourierArrivalDate, a.SentToBankDate, a.ReleasedFromBankDate, a.FactoryArrivalDate, a.PaymentTermID, 
                         a.IncoTermID, a.IsLocked, a.CarrierID, a.LogisticCreatedBy, a.LogisticCreatedDate, a.LogisticLastMaintBy, a.LogisticLastMaintDate, a.ClearingAgentID, b.ForwarderName, ll.PackingType AS LinePackingType, c.CarrierName, 
                         d.ClearingAgentName, e.TermDescription AS PaymentTermDescription, f.DeliveryTermDescription AS IncoTermDescription,
                             (SELECT        StateDescription
                               FROM            LGI.LogisticStateMaster AS x
                               WHERE        (StateValue = a.TrackState)) AS StateDescription,
                             (SELECT        StateDescription
                               FROM            LGI.LogisticStateMaster AS x
                               WHERE        (StateValue = ll.LineState)) AS LineStateDescription,
                             (SELECT        ValueDescription
                               FROM            dbo.Reference AS x
                               WHERE        (RefID = 40) AND (a.ShipmentState = ValueInt)) AS ShipmentStateDescription,
                             (SELECT        ValueDescription
                               FROM            dbo.Reference AS x
                               WHERE        (RefID = 41) AND (a.DocumentState = ValueInt)) AS DocumentStateDescription,
                             (SELECT        ValueDescription
                               FROM            dbo.Reference AS x
                               WHERE        (RefID = 42) AND (a.AccountingState = ValueInt)) AS AccountingStateDescription, g.VendorName, g.VendorExtraName, z.BankAccountName, a.ItemAmount, a.DiscountAmount, a.FreightAmount, a.InsuranceAmount, 
                         a.TotalAmount, a.ACINumber, a.BLNumber, a.BLType, a.ShipmentMode, ll.PurchaseOrderNumber, ll.PurchaseOrderLineNumber, ll.LineState, ll.LineNumber, ll.NonItemFlag, ll.ItemID, ll.NonInventoryItemDescription, 
                         ll.LineQuantity, ll.LogisticLineUnitOfMeasure, ll.Currency AS LineCurrency, ll.Price, ll.Amount AS LineAmount, ll.BatchNumber, ll.Origin, ll.RecievedDate, pom.OriginDescription, (CASE WHEN ll.LineType = 'A' THEN
                             (SELECT        ass.AssetCode
                               FROM            ass.AssetMaster ass
                               WHERE        ll.ItemID = ass.AssetID) WHEN ll.LineType = 'I' THEN
                             (SELECT        ass.ItemCode
                               FROM            INV.ItemMaster ass
                               WHERE        ll.ItemID = ass.ItemID) WHEN ll.LineType = 'N' THEN
                             (SELECT        ass.ItemCode
                               FROM            PUR.NonStockItemMaster ass
                               WHERE        ll.ItemID = ass.NonStockItemID) WHEN ll.LineType = 'S' THEN
                             (SELECT        ass.SampleCode
                               FROM            PUR.SampleMaster ass
                               WHERE        ll.ItemID = ass.SampleID) ELSE
                             (SELECT        ass.ITCode
                               FROM            IT.ITItemMaster ass
                               WHERE        ll.ItemID = ass.ITItemID) END) AS ItemCode, (CASE WHEN ll.LineType = 'A' THEN
                             (SELECT        ass.AssetDescription
                               FROM            ass.AssetMaster ass
                               WHERE        ll.ItemID = ass.AssetID) WHEN ll.LineType = 'I' THEN
                             (SELECT        ass.ItemDescription
                               FROM            INV.ItemMaster ass
                               WHERE        ll.ItemID = ass.ItemID) WHEN ll.LineType = 'N' THEN
                             (SELECT        ass.ItemDescription
                               FROM            PUR.NonStockItemMaster ass
                               WHERE        ll.ItemID = ass.NonStockItemID) WHEN ll.LineType = 'S' THEN
                             (SELECT        ass.SampleDescription
                               FROM            PUR.SampleMaster ass
                               WHERE        ll.ItemID = ass.SampleID) ELSE
                             (SELECT        ass.ItemDescription
                               FROM            IT.ITItemMaster ass
                               WHERE        ll.ItemID = ass.ITItemID) END) AS ItemDescription, (CASE WHEN ll.LineType = 'A' THEN
                             (SELECT        ass.AssetExtraDescription
                               FROM            ass.AssetMaster ass
                               WHERE        ll.ItemID = ass.AssetID) WHEN ll.LineType = 'I' THEN
                             (SELECT        ass.ItemExtraDescription
                               FROM            INV.ItemMaster ass
                               WHERE        ll.ItemID = ass.ItemID) WHEN ll.LineType = 'N' THEN
                             (SELECT        ass.ItemDescription
                               FROM            PUR.NonStockItemMaster ass
                               WHERE        ll.ItemID = ass.NonStockItemID) WHEN ll.LineType = 'S' THEN
                             (SELECT        ass.SampleDescription
                               FROM            PUR.SampleMaster ass
                               WHERE        ll.ItemID = ass.SampleID) ELSE
                             (SELECT        ass.ItemDescription
                               FROM            IT.ITItemMaster ass
                               WHERE        ll.ItemID = ass.ITItemID) END) AS ItemExtraDescription, (CASE WHEN ll.LineType = 'A' THEN
                             (SELECT        ass.AssetType
                               FROM            ass.AssetMaster ass
                               WHERE        ll.ItemID = ass.AssetID) WHEN ll.LineType = 'I' THEN
                             (SELECT        ass.ItemType
                               FROM            INV.ItemMaster ass
                               WHERE        ll.ItemID = ass.ItemID) WHEN ll.LineType = 'N' THEN
                             (SELECT        ass.ItemType
                               FROM            PUR.NonStockItemMaster ass
                               WHERE        ll.ItemID = ass.NonStockItemID) WHEN ll.LineType = 'S' THEN
                             (SELECT        ass.SampleType
                               FROM            PUR.SampleMaster ass
                               WHERE        ll.ItemID = ass.SampleID) ELSE
                             (SELECT        ass.ItemType
                               FROM            IT.ITItemMaster ass
                               WHERE        ll.ItemID = ass.ITItemID) END) AS ItemType, a.ShipmentSize, poh.EnteredDate AS PurchaseOrderEnteredDate, poh.OrderCloseDate AS PurchaseOrderCloseDate, poh.ReleaseDate AS PurchaseOrderReleaseDate, 
                         a.AssignToUser, a.CertificateNo, poh.RequestArrivalDate
FROM            LGI.LogisticHeader AS a LEFT OUTER JOIN
                         LGI.ForwarderMaster AS b ON a.ForwarderID = b.ForwarderID LEFT OUTER JOIN
                         LGI.CarrierMaster AS c ON c.CarrierID = a.CarrierID LEFT OUTER JOIN
                         LGI.ClearingAgentMaster AS d ON d.ClearingAgentID = a.ClearingAgentID LEFT OUTER JOIN
                         ACP.VendorPaymentTerm AS e ON e.PaymentTermID = a.PaymentTermID LEFT OUTER JOIN
                         ACP.VendorDeliveryTerm AS f ON f.DeliveryTermID = a.IncoTermID LEFT OUTER JOIN
                         ACP.VendorMaster AS g ON g.VendorNumber = a.VendorNumber LEFT OUTER JOIN
                         ACC.BankAccountsMaster AS z ON z.BankAccountNumber = a.BankNumber LEFT OUTER JOIN
                         LGI.LogisticLine AS ll ON ll.TrackNumber = a.TrackNumber LEFT OUTER JOIN
                         PUR.PurchasingOriginMaster AS pom ON ll.Origin = pom.Origin LEFT OUTER JOIN
                         PUR.PurchaseOrderHeader AS poh ON poh.PurchaseOrderNumber = ll.PurchaseOrderNumber;
GO

