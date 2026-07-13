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
                         a.IncoTermID, a.IsLocked, a.CarrierID, a.LogisticCreatedBy, a.LogisticCreatedDate, a.LogisticLastMaintBy, a.LogisticLastMaintDate, a.ClearingAgentID, b.ForwarderName, c.CarrierName, 
                         d.ClearingAgentName, e.TermDescription AS PaymentTermDescription, f.DeliveryTermDescription AS IncoTermDescription,
                             (SELECT        StateDescription
                               FROM            LGI.LogisticStateMaster AS x
                               WHERE        (StateValue = a.TrackState)) AS StateDescription,
                             (SELECT        ValueDescription
                               FROM            dbo.Reference AS x
                               WHERE        (RefID = 40) AND (a.ShipmentState = ValueInt)) AS ShipmentStateDescription,
                             (SELECT        ValueDescription
                               FROM            dbo.Reference AS x
                               WHERE        (RefID = 41) AND (a.DocumentState = ValueInt)) AS DocumentStateDescription,
                             (SELECT        ValueDescription
                               FROM            dbo.Reference AS x
                               WHERE        (RefID = 42) AND (a.AccountingState = ValueInt)) AS AccountingStateDescription,
                             (SELECT TOP 1  ps.StateDescription 
                               FROM            LGI.LogisticPayment AS lp
                               LEFT OUTER JOIN LGI.LogisticPaymentState AS ps ON ps.StateID = lp.PaymentState
                               WHERE        (lp.TrackNumber = a.TrackNumber)
                               ORDER BY     lp.PaymentState DESC) AS PaymentStateDescription,
                             g.VendorName, g.VendorExtraName, z.BankAccountName, a.ItemAmount, a.DiscountAmount, a.FreightAmount, a.InsuranceAmount, 
                         a.TotalAmount, a.ACINumber, a.BLNumber, a.BLType, a.ShipmentMode, a.ShipmentSize, a.AssignToUser, a.CertificateNo,
                          (SELECT MIN(PurchaseOrderNumber) FROM LGI.LogisticLine WHERE TrackNumber = a.TrackNumber) AS PONumber
FROM            LGI.LogisticHeader AS a LEFT OUTER JOIN
                         LGI.ForwarderMaster AS b ON a.ForwarderID = b.ForwarderID LEFT OUTER JOIN
                         LGI.CarrierMaster AS c ON c.CarrierID = a.CarrierID LEFT OUTER JOIN
                         LGI.ClearingAgentMaster AS d ON d.ClearingAgentID = a.ClearingAgentID LEFT OUTER JOIN
                         ACP.VendorPaymentTerm AS e ON e.PaymentTermID = a.PaymentTermID LEFT OUTER JOIN
                         ACP.VendorDeliveryTerm AS f ON f.DeliveryTermID = a.IncoTermID LEFT OUTER JOIN
                         ACP.VendorMaster AS g ON g.VendorNumber = a.VendorNumber LEFT OUTER JOIN
                         ACC.BankAccountsMaster AS z ON z.BankAccountNumber = a.BankNumber;
GO

-- 18. QGetTrackDetailsLines
CREATE OR ALTER VIEW [dbo].[QGetTrackDetailsLines] AS
SELECT ll.*, im.ItemDescription, poh.RequestArrivalDate, (CASE
    WHEN LineType='S' THEN (select SampleDescription From PUR.SampleMaster s where ll.ItemID=s.SampleID)
    WHEN LineType='A' THEN (select AssetExtraDescription From ASS.AssetMaster s where ll.ItemID=s.AssetID)
    WHEN LineType='N' THEN (select ItemDescription From PUR.NonStockItemMaster s where ll.ItemID=s.NonStockItemID)
    WHEN LineType='I' THEN (select ItemExtraDescription From INV.ItemMaster s where ll.ItemID=s.ItemID)
    WHEN LineType='T' THEN (select ItemExtraDescription From IT.ITItemMaster s where ll.ItemID=s.ITItemID)	
END)ItemExtraDescription , (CASE WHEN ll.LineType = 'A' THEN
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
                               WHERE        ll.ItemID = ass.ITItemID) END) AS LogisticItemCode 
FROM LGI.LogisticLine ll 
LEFT OUTER JOIN INV.ItemMaster im on im.ItemID=ll.ItemID 
LEFT OUTER JOIN PUR.PurchaseOrderHeader poh on poh.PurchaseOrderNumber=ll.PurchaseOrderNumber;
GO

-- 19. QGetTrackDetailsPayments
CREATE OR ALTER VIEW [dbo].[QGetTrackDetailsPayments] AS
SELECT lp.*, ps.StateDescription 
FROM LGI.LogisticPayment lp 
LEFT OUTER JOIN LGI.LogisticPaymentState ps on ps.StateID=lp.PaymentState;
GO

-- 20. QGetTrackDetailsReferences
CREATE OR ALTER VIEW [dbo].[QGetTrackDetailsReferences] AS
SELECT lr.*, rm.ReferenceDataType, rm.ReferenceName 
FROM LGI.LogisticReference lr 
LEFT OUTER JOIN LGI.ReferenceMaster rm ON rm.ReferenceID=lr.ReferenceID;
GO

-- 21. QGetTrackDetailsBatches
CREATE OR ALTER VIEW [dbo].[QGetTrackDetailsBatches] AS
SELECT lb.*, im.ItemDescription 
FROM LGI.LogisticBatch lb 
LEFT OUTER JOIN INV.ItemMaster im ON lb.LogisticLineItemID = im.ItemID;
GO

-- 22. QGetTrackDetailsContainers
CREATE OR ALTER VIEW [dbo].[QGetTrackDetailsContainers] AS
SELECT lc.*, im.ItemDescription 
FROM LGI.LogisticContainer lc 
LEFT OUTER JOIN INV.ItemMaster im ON lc.ItemID = im.ItemID;
GO

-- 23. QGetSalesExportStatistics
CREATE OR ALTER VIEW [dbo].[QGetSalesExportStatistics] AS
SELECT 
    a.InvoiceDate, 
    a.ItemCode, 
    b.ItemExtraDescription, 
    a.InvoicedQuantity, 
    a.CustomerNo, 
    c.CustomerExtraName, 
    b.GrossWeight
FROM acr.CustomerInvoiceLine a 
LEFT OUTER JOIN inv.ItemMaster b on a.ItemID = b.ItemID 
LEFT OUTER JOIN acr.CustomerMaster c on c.CustomerNo = a.CustomerNo 
WHERE YEAR(a.InvoiceDate) IN (2025, 2026) 
  AND a.CustomerNo LIKE '6%';
GO

-- 24. QGetTrackDetailsExtraAmounts
CREATE OR ALTER VIEW [dbo].[QGetTrackDetailsExtraAmounts] AS
SELECT * FROM LGI.LogisticExtraAmount;
GO

-- 25. QGetTrackDetailsAttachments
CREATE OR ALTER VIEW [dbo].[QGetTrackDetailsAttachments] AS
SELECT b.ID, b.FileID, b.FileOrginalName, b.FileName, b.FileDescription, b.FileURL, b.CreatedDate, b.CreatedBy, b.IsArchived, b.IsDeleted, b.ServiceID, b.FileDisplay, b.IsExist, a.TrackNumber
FROM LGI.LogisticHeader a 
LEFT OUTER JOIN FIL.FileHistory b ON b.FileID = a.AttachmentID;
GO

-- 26. QGetItemLogistics
CREATE OR ALTER VIEW [dbo].[QGetItemLogistics] AS
SELECT 
    ll.TrackNumber,
    ll.PurchaseOrderNumber,
    ll.ItemID,
    ll.LineNumber,
    ll.LineQuantity AS Quantity,
    ll.LineType,
    ll.LogisticLineUnitOfMeasure AS UOM,
    
    -- Item details
    (CASE
        WHEN ll.LineType='S' THEN (SELECT SampleDescription FROM PUR.SampleMaster WHERE SampleID = ll.ItemID)
        WHEN ll.LineType='A' THEN (SELECT AssetExtraDescription FROM ASS.AssetMaster WHERE AssetID = ll.ItemID)
        WHEN ll.LineType='N' THEN (SELECT ItemDescription FROM PUR.NonStockItemMaster WHERE NonStockItemID = ll.ItemID)
        WHEN ll.LineType='I' THEN (SELECT ItemExtraDescription FROM INV.ItemMaster WHERE ItemID = ll.ItemID)
        WHEN ll.LineType='T' THEN (SELECT ItemExtraDescription FROM IT.ITItemMaster WHERE ITItemID = ll.ItemID)
    END) AS ItemDescription,
    
    (CASE 
        WHEN ll.LineType = 'A' THEN (SELECT AssetCode FROM ASS.AssetMaster WHERE AssetID = ll.ItemID)
        WHEN ll.LineType = 'I' THEN (SELECT ItemCode FROM INV.ItemMaster WHERE ItemID = ll.ItemID)
        WHEN ll.LineType = 'N' THEN (SELECT ItemCode FROM PUR.NonStockItemMaster WHERE NonStockItemID = ll.ItemID)
        WHEN ll.LineType = 'S' THEN (SELECT SampleCode FROM PUR.SampleMaster WHERE SampleID = ll.ItemID)
        ELSE (SELECT ITCode FROM IT.ITItemMaster WHERE ITItemID = ll.ItemID) 
    END) AS ItemCode,
    
    -- Header tracking details
    h.TrackState,
    (SELECT StateDescription FROM LGI.LogisticStateMaster WHERE StateValue = h.TrackState) AS StateDescription,
    h.ShipmentState,
    (SELECT ValueDescription FROM dbo.Reference WHERE RefID = 40 AND ValueInt = h.ShipmentState) AS ShipmentStateDescription,
    h.ETA,
    h.ETD,
    h.InvoiceNumber,
    h.BLNumber,
    h.Destination,
    h.VendorNumber,
    v.VendorName,
    c.CarrierName,
    f.ForwarderName,
    ca.ClearingAgentName,
    h.LogisticCreatedDate
FROM LGI.LogisticLine ll
INNER JOIN LGI.LogisticHeader h ON ll.TrackNumber = h.TrackNumber
LEFT OUTER JOIN ACP.VendorMaster v ON v.VendorNumber = h.VendorNumber
LEFT OUTER JOIN LGI.CarrierMaster c ON c.CarrierID = h.CarrierID
LEFT OUTER JOIN LGI.ForwarderMaster f ON f.ForwarderID = h.ForwarderID
LEFT OUTER JOIN LGI.ClearingAgentMaster ca ON ca.ClearingAgentID = h.ClearingAgentID;
GO

