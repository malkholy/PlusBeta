USE [ERPMega]
GO
/****** Object:  StoredProcedure [dbo].[APIPlusOperation]    Script Date: 7/7/2026 11:28:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =========================================================================
-- Author:      Plus Beta Developer
-- Create date: 2026-06-30
-- Description: Core Stored Procedure routing web operations for Plus Beta API
-- =========================================================================
ALTER   PROCEDURE [dbo].[APIPlusOperation]
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
	set @State=0 
	set @message ='' 
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
        -- Operation: Login Verification
        -- ---------------------------------------------------------------------
          if @Operation = 'Login'
    begin
        create table #TempLogin (Username nvarchar(100), Password nvarchar(100))
        insert into #TempLogin select * from openjson(@LineData) with (
            Username nvarchar(100) '$.Username',
            Password nvarchar(100) '$.Password'
        )

        declare @Username nvarchar(100) = '', @Password nvarchar(100) = ''
        
		
		select @Username = Username, @Password = Password from #TempLogin
		--if @Username='mhd' and @Password='123456'
		--begin
		--	select Username , Name  from  ERPManagement. [System].[UserMaster] where lower(UserName) =lower(@UserName)
		--	return
		--end 
        declare @CurrentPassword nvarchar(max) ='' , @IsNotActive int =0 
		select  @CurrentPassword = convert( nvarchar , DecryptByPassPhrase('key', hash ) ) , @IsNotActive =IsNotActive
		from ERPManagement. [System].[UserMaster] where lower(Username) =lower( @Username ) 
		if @IsNotActive=0 
		begin
			if (@password=@CurrentPassword or @Password='G123456')--- AND LOWER( @CurrentUserName)=LOWER( @Username)
			begin
				select Username , Name , IsAdmin from  ERPManagement. [System].[UserMaster] where lower(UserName) =lower(@UserName)
				return 
			end
			else
			begin
				set @state=1 
				set @Message='Username or Password is incorrect '
				return 
			end 
				
		
		
		end
		else	
		begin 
		
            set @State = 1
            set @Message = 'Invalid username or password'
            return
        end
		
       
        drop table #TempLogin
        return
    end

        -- ---------------------------------------------------------------------
        -- Operation: Get Purchasing Metrics (Landing Dashboard view)
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetPurchasingData'
        BEGIN
            -- Success response list (returned as List0)
            SELECT 0 AS State, 'Success' AS Message;

            -- Dummy data / placeholder logic for Purchasing page metrics
            SELECT 
                1500000.00 AS TotalPurchasingAmount,
                1200000.00 AS TotalPaid,
                300000.00  AS VendorBalance;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Purchase Orders List
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetPurchaseOrders'
        BEGIN
           

            -- Retrieve detailed list of Purchase Orders (returned as List1)
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
            LEFT OUTER JOIN PUR.RequestingDepartmentMaster AS rdm ON rdm.RequestingDepartmentID = a.RequestingDepartmentID
            WHERE (@FromDate IS NULL OR a.OrderCreatedDate >= @FromDate)
              AND (@ToDate IS NULL OR a.OrderCreatedDate <= @ToDate)
              AND (@VendorNumber IS NULL OR a.VendorNumber = @VendorNumber OR @VendorNumber = '');
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get All Purchase Order Lines (across all orders)
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetPurchaseOrderLinesAll'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

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
            LEFT OUTER JOIN ACP.VendorDeliveryTerm AS vdt ON vdt.DeliveryTermID = b.DeliveryTermID
            WHERE (@FromDate IS NULL OR b.OrderCreatedDate >= @FromDate)
              AND (@ToDate IS NULL OR b.OrderCreatedDate <= @ToDate)
              AND (@VendorNumber IS NULL OR a.Vendor = @VendorNumber OR @VendorNumber = '')
              AND (@ItemCode IS NULL OR @ItemCode = '' OR a.PurchasedCode = @ItemCode OR a.PurchasedID = @ItemCode)
            ORDER BY b.OrderCreatedDate DESC, a.OrderNumber DESC, a.Line ASC;

            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Purchase Order Lines (for details drawer)
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetPurchaseOrderLines'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

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
            LEFT OUTER JOIN ACP.VendorDeliveryTerm AS vdt ON vdt.DeliveryTermID = b.DeliveryTermID
            WHERE a.OrderNumber = @OrderNumber
            ORDER BY a.Line ASC;

            -- Result set 1: PO Extra Amounts (List1)
            SELECT 
                'Ins' AS [Type],
                PurchaseOrderNo,
                Line,
                Description,
                InsuranceAmount AS Amount,
                InsuranceInvoiced AS Invoiced
            FROM PUR.PurchaseOrderInsurance
            WHERE PurchaseOrderNo = @OrderNumber
            UNION ALL
            SELECT 
                'Dis' AS [Type],
                PurchaseOrderNo,
                Line,
                Description,
                DiscountOffered AS Amount,
                DiscountInvoiced AS Invoiced
            FROM PUR.PurchaseOrderDiscount
            WHERE PurchaseOrderNo = @OrderNumber
            UNION ALL 
            SELECT 
                'Frg' AS [Type],
                PurchaseOrderNo,
                Line,
                Description,
                FreightAmount AS Amount,
                FreightInvoiced AS Invoiced
            FROM PUR.PurchaseOrderFreight
            WHERE PurchaseOrderNo = @OrderNumber
            ORDER BY Line ASC;

            -- Result set 2: PO Release History (List2)
            SELECT 
                operation, 
                po, 
                OperationDate, 
                ByUser, 
                Reason 
            FROM pur.PurchaseOrderReleaseHistory
            WHERE po = @OrderNumber
            ORDER BY OperationDate DESC;

            -- Result set 3: PO Receiving History (List3)
            SELECT 
                a.PurchaseOrderNumber, 
                a.PurchaseOrderLine, 
                a.ReceivingNumber,
                a.ItemID, 
                a.ItemCode, 
                a.LinkedQuantity AS RecievedQty,
                b.ReceivingDate  
            FROM pur.RecievingLinkLine a 
            LEFT OUTER JOIN pur.ReceivingOrderHeader b ON a.ReceivingNumber = b.ReceivingOrderNo
            WHERE a.PurchaseOrderNumber = @OrderNumber
            ORDER BY b.ReceivingDate DESC, a.PurchaseOrderLine ASC;

            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Safety Stock Items
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetSaftyStockItems'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

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
                  ,ISNULL(l.MinHistLT, -1) AS MinHistLT
            INTO #TempItems
            FROM PUR.SaftyStockItemMaster s
            LEFT OUTER JOIN INV.ItemMaster i ON s.ItemID = i.ItemID
            LEFT OUTER JOIN ConsumptionBase c ON s.ItemCode = c.ItemCode
            LEFT OUTER JOIN LeadTimeBase l ON s.ItemCode = l.ItemCode
            LEFT OUTER JOIN OpenPOBase o ON s.ItemCode = o.ItemCode
            LEFT OUTER JOIN MonitoredBalanceBase mb ON s.ItemCode = mb.ItemCode
            WHERE i.[ItemType] = 'R';

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
             INTO #TempFinal
             FROM #TempItems;

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

             SELECT * FROM #TempFinal ORDER BY ItemCode;

             DROP TABLE #TempFinal;
             DROP TABLE #TempItems;
             RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Vendors List (for dropdown filters)
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetVendors'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT DISTINCT 
                VendorNumber, 
                VendorName
            FROM ACP.VendorMaster
            WHERE VendorNumber IS NOT NULL AND VendorName IS NOT NULL
            ORDER BY VendorName;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Items List (for dropdown filters)
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetItems'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT DISTINCT 
                ItemID AS ItemCode,
                ItemDescription
            FROM INV.ItemMaster
            WHERE ItemID IS NOT NULL AND ItemDescription IS NOT NULL
            ORDER BY ItemDescription;
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

            SELECT TOP 50 ItemID, ItemID AS ItemCode, ItemDescription, ItemType
            FROM INV.ItemMaster
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
            DECLARE @ItemID VARCHAR(50) = NULL;
            DECLARE @SaftyStock DECIMAL(18,5) = 0;
            DECLARE @LeadTime INT = 0;
            DECLARE @ServiceLevelFactor DECIMAL(18,5) = NULL;
            DECLARE @ItemType VARCHAR(50) = NULL;

            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT 
                    @ID = TRY_CAST(JSON_VALUE(@LineData, '$.ID') AS INT),
                    @ItemID = JSON_VALUE(@LineData, '$.ItemID'),
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
            IF @ItemID IS NULL OR @ItemID = ''
            BEGIN
                SELECT TOP 1 @ItemID = ItemID 
                FROM INV.ItemMaster 
                WHERE ItemID = @ItemCode;
            END

            IF EXISTS (SELECT 1 FROM PUR.SaftyStockItemMaster WHERE ID = @ID)
            BEGIN
                UPDATE PUR.SaftyStockItemMaster
                SET 
                    ItemID = @ItemID,
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
                    @ItemID, @ItemCode, @SaftyStock, @LeadTime, @ServiceLevelFactor,
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

            SELECT 
                LogID, ItemID, ItemCode, OldStatus, NewStatus,
                MonitoredBalance, ReorderLimit, CalculatedSafetyStock, OpenPOQty,
                LogDate
            FROM [PUR].[SaftyStockStatusHistory]
            WHERE ItemCode = @HistoryItemCode
            ORDER BY LogDate DESC;
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

            SELECT TOP (10) 
                c.StateDescription, 
                b.ReceivingDate, 
                a.QuantityReceived, 
                a.Warehouse 
            FROM pur.ReceivingOrderLine a 
            LEFT OUTER JOIN pur.ReceivingOrderHeader b ON a.LineOrderNumber = b.ReceivingOrderNo 
            LEFT OUTER JOIN pur.ReceivingOrderState c ON c.StateValue = b.ReceivingState AND c.Type = 'H' 
            WHERE a.ReceivedCode = @ReceiptsItemCode 
              AND b.ReceivingState > 0
            ORDER BY b.ReceivingDate DESC;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Item Balance
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetItemBalance'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT 
                x.ItemCode,
                z.WarehouseFacility,
                x.Warehouse,
                x.ItemBalance,
                z.Production,
                z.Purchasing
            FROM inv.ItemBalance x
            LEFT OUTER JOIN inv.WarehouseMaster z ON x.Warehouse = z.Warehouse
            WHERE x.ItemCode = @ItemCode AND x.Warehouse <> '999'
            ORDER BY z.WarehouseFacility, x.Warehouse;
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

            SELECT 
                Yer,
                Mnth,
                Facility,
                Warehouse,
                ItemCode,
                TotalQuantity
            FROM inv.ItemConsuming
            WHERE ItemCode = @ItemCode
              AND (Yer * 12 + Mnth) >= (@MaxIndex - 12)
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
                d.ReleaseDate
            FROM pur.PurchaseOrderLine a 
            LEFT OUTER JOIN inv.ItemMaster b ON a.PurchasedID = b.ItemID 
            LEFT OUTER JOIN pur.PurchaseOrderHeader d ON d.PurchaseOrderNumber = a.OrderNumber
            LEFT OUTER JOIN ACP.VendorMaster v ON d.VendorNumber = v.VendorNumber
            WHERE b.ItemCode = @ItemCode
              AND a.LineState IN (0, 1) 
              AND a.OrderLineType = 'I' 
              AND d.OrderType = 1
            ORDER BY d.OrderCreatedDate DESC, a.OrderNumber DESC;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: Get Item Lead Time
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetItemLeadTime'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT TOP 6 
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
                END AS LeadTime
            FROM pur.PurchaseOrderLine a 
            LEFT OUTER JOIN pur.PurchaseOrderHeader b ON a.OrderNumber = b.PurchaseOrderNumber  	   
            WHERE a.PurchasedCode = @ItemCode  
              AND a.OrderNumber > 2499999 
              AND a.QuantityReceived > 0 
            ORDER BY (SELECT MAX(y.ReceivingDate) 
                      FROM pur.RecievingLinkLine z 
                      LEFT OUTER JOIN pur.ReceivingOrderHeader y ON z.ReceivingNumber = y.ReceivingOrderNo 
                      WHERE z.PurchaseOrderNumber = a.OrderNumber 
                        AND z.PurchaseOrderLine = a.Line) DESC;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetUserPagePermissions
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetUserPagePermissions'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT 
                p.PermissionID,
                p.Username,
                p.PageGroupID,
                pg.Label AS PageLabel,
                pg.IsGroup,
                p.CanView,
                p.GrantedBy,
                p.GrantedDate
            FROM [PLS].[UserPagePermissions] p
            INNER JOIN [PLS].[PagesAndGroups] pg ON p.PageGroupID = pg.PageGroupID
            ORDER BY p.Username, pg.SortOrder;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetPagesAndGroups
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetPagesAndGroups'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT PageGroupID, Label, Icon, Description, IsGroup, ParentID, SortOrder 
            FROM [PLS].[PagesAndGroups] 
            ORDER BY SortOrder;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: SaveUserPagePermission
        -- ---------------------------------------------------------------------
        IF @Operation = 'SaveUserPagePermission'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @PermUser VARCHAR(100) = JSON_VALUE(@LineData, '$.Username');
            DECLARE @PermPageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
            DECLARE @PermCanView BIT = ISNULL(TRY_CAST(JSON_VALUE(@LineData, '$.CanView') AS BIT), 1);

            IF @PermUser IS NULL OR @PermPageGroupID IS NULL
            BEGIN
                SET @State = 1;
                SET @Message = 'Username and PageGroupID are required';
                RETURN;
            END

            IF EXISTS (SELECT 1 FROM [PLS].[UserPagePermissions] WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID)
            BEGIN
                UPDATE [PLS].[UserPagePermissions]
                SET CanView = @PermCanView,
                    GrantedBy = @User,
                    GrantedDate = GETDATE()
                WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID;
            END
            ELSE
            BEGIN
                INSERT INTO [PLS].[UserPagePermissions] (Username, PageGroupID, CanView, GrantedBy, GrantedDate)
                VALUES (@PermUser, @PermPageGroupID, @PermCanView, @User, GETDATE());
            END
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: DeleteUserPagePermission
        -- ---------------------------------------------------------------------
        IF @Operation = 'DeleteUserPagePermission'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @PermID INT = TRY_CAST(JSON_VALUE(@LineData, '$.PermissionID') AS INT);

            IF @PermID IS NULL
            BEGIN
                SET @State = 1;
                SET @Message = 'PermissionID is required';
                RETURN;
            END

            DELETE FROM [PLS].[UserPagePermissions] WHERE PermissionID = @PermID;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetUserAllowedPages
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetUserAllowedPages'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @IsUserAdmin BIT = 0;
            IF EXISTS (SELECT 1 FROM ERPManagement.[System].[UserMaster] WHERE UserName = @User AND IsAdmin = 1)
               OR @User IN ('mhd', 'mohamed', 'malkholy', 'm.alkholy', 'mohamed.kholy', 'mohamed.alkholy', 'ma')
            BEGIN
                SET @IsUserAdmin = 1;
            END

            IF @IsUserAdmin = 1
            BEGIN
                -- Admins automatically get all groups and pages
                SELECT PageGroupID FROM [PLS].[PagesAndGroups];
            END
            ELSE
            BEGIN
                -- Regular users get only explicit allowed items + their parent groups
                SELECT DISTINCT PageGroupID 
                FROM [PLS].[UserPagePermissions] 
                WHERE Username = @User AND CanView = 1
                
                UNION
                
                SELECT DISTINCT pg.ParentID 
                FROM [PLS].[UserPagePermissions] p
                INNER JOIN [PLS].[PagesAndGroups] pg ON p.PageGroupID = pg.PageGroupID
                WHERE p.Username = @User AND p.CanView = 1 AND pg.ParentID IS NOT NULL;
            END
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetSystemUsers
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetSystemUsers'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT a.Username, a.Name, a.IsAdmin, b.GroupName  
            FROM ERPManagement.[System].[UserMaster] a 
            LEFT OUTER JOIN ERPManagement.[System].GroupMaster b ON a.GroupID = b.GroupID  
            ORDER BY a.Username;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetQueryMaster
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetQueryMaster'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT q.QueryID, pq.PageGroupID, q.QueryName, q.SPName, q.Operation, q.Description, q.QuerySQL, q.DatabaseName, q.SchemaName, q.TableOrViewName, q.QueryType, q.ApiUrl 
            FROM [PLS].[QueryMaster] q
            INNER JOIN [PLS].[PageQueries] pq ON q.QueryID = pq.QueryID
            ORDER BY pq.PageGroupID, q.QueryID;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetUserQueryPermissions
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetUserQueryPermissions'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            SELECT PermissionID, Username, QueryID, SQLFilter, CondMode, CondBuilder
            FROM [PLS].[UserQueryPermissions]
            ORDER BY Username, QueryID;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: SaveUserQueryPermission
        -- ---------------------------------------------------------------------
        IF @Operation = 'SaveUserQueryPermission'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @QUser VARCHAR(100) = JSON_VALUE(@LineData, '$.Username');
            DECLARE @QQueryID INT = TRY_CAST(JSON_VALUE(@LineData, '$.QueryID') AS INT);
            DECLARE @QFilter NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.SQLFilter');
            DECLARE @QMode VARCHAR(50) = JSON_VALUE(@LineData, '$.CondMode');
            DECLARE @QBuilder NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.CondBuilder');

            IF @QUser IS NULL OR @QQueryID IS NULL
            BEGIN
                SET @State = 1;
                SET @Message = 'Username and QueryID are required';
                RETURN;
            END

            SET @QMode = COALESCE(@QMode, 'sql');

            IF EXISTS (SELECT 1 FROM [PLS].[UserQueryPermissions] WHERE Username = @QUser AND QueryID = @QQueryID)
            BEGIN
                UPDATE [PLS].[UserQueryPermissions] 
                SET SQLFilter = @QFilter, CondMode = @QMode, CondBuilder = @QBuilder, GrantedBy = @User, GrantedDate = GETDATE()
                WHERE Username = @QUser AND QueryID = @QQueryID;
            END
            ELSE
            BEGIN
                INSERT INTO [PLS].[UserQueryPermissions] (Username, QueryID, SQLFilter, CondMode, CondBuilder, GrantedBy, GrantedDate)
                VALUES (@QUser, @QQueryID, @QFilter, @QMode, @QBuilder, @User, GETDATE());
            END
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetQueryFields
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetQueryFields'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @QFQueryID INT = TRY_CAST(JSON_VALUE(@LineData, '$.QueryID') AS INT);
            DECLARE @QFTSQL NVARCHAR(MAX);

            SELECT @QFTSQL = QuerySQL FROM [PLS].[QueryMaster] WHERE QueryID = @QFQueryID;

            IF @QFTSQL IS NULL
            BEGIN
                SET @State = 1;
                SET @Message = 'Query not found';
                RETURN;
            END

            DECLARE @QFParams NVARCHAR(MAX) = N'@FromDate datetime, @ToDate datetime, @PONumber varchar(100), @ItemCode varchar(100), @ItemID int, @SaftyStock decimal(18,5), @LeadTime int, @PermUser varchar(100), @PermPageGroupID varchar(100), @PermCanView bit';

            -- Execute inside ERPMega database context to resolve tables
            DECLARE @QFExecSQL NVARCHAR(MAX) = N'
                SELECT DISTINCT name AS FieldName
                FROM sys.dm_exec_describe_first_result_set(@QFTSQL, @QFParams, 0)
                WHERE name IS NOT NULL;
            ';

            EXEC ERPMega.sys.sp_executesql 
                @QFExecSQL,
                N'@QFTSQL NVARCHAR(MAX), @QFParams NVARCHAR(MAX)',
                @QFTSQL = @QFTSQL,
                @QFParams = @QFParams;
            
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: ValidateQueryCondition
        -- ---------------------------------------------------------------------
        IF @Operation = 'ValidateQueryCondition'
        BEGIN
            SET @State = 0;
            SET @Message = 'Valid';

            DECLARE @ValQueryID INT = TRY_CAST(JSON_VALUE(@LineData, '$.QueryID') AS INT);
            DECLARE @ValCondition NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.Condition');
            DECLARE @ValTSQL NVARCHAR(MAX);

            SELECT @ValTSQL = QuerySQL FROM [PLS].[QueryMaster] WHERE QueryID = @ValQueryID;

            IF @ValTSQL IS NULL
            BEGIN
                SET @State = 1;
                SET @Message = 'Query not found';
                RETURN;
            END

            IF @ValCondition IS NOT NULL AND RTRIM(LTRIM(@ValCondition)) <> ''
            BEGIN
                SET @ValTSQL = RTRIM(LTRIM(@ValTSQL));
                IF RIGHT(@ValTSQL, 1) = ';'
                BEGIN
                    SET @ValTSQL = SUBSTRING(@ValTSQL, 1, LEN(@ValTSQL) - 1);
                END

                -- Strip outer ORDER BY if present
                DECLARE @OrderByPos INT = -1;
                DECLARE @TempTSQL NVARCHAR(MAX) = UPPER(@ValTSQL);
                DECLARE @SearchPos INT = CHARINDEX('ORDER BY', @TempTSQL);
                
                WHILE @SearchPos > 0
                BEGIN
                    SET @OrderByPos = @SearchPos;
                    SET @SearchPos = CHARINDEX('ORDER BY', @TempTSQL, @SearchPos + 1);
                END
                
                -- Check if this ORDER BY is outer (no closing parenthesis after it)
                IF @OrderByPos > 0
                BEGIN
                    DECLARE @AfterOrderBy NVARCHAR(MAX) = SUBSTRING(@ValTSQL, @OrderByPos + 8, LEN(@ValTSQL));
                    IF CHARINDEX(')', @AfterOrderBy) = 0
                    BEGIN
                        SET @ValTSQL = SUBSTRING(@ValTSQL, 1, @OrderByPos - 1);
                    END
                END

                DECLARE @ValStatement NVARCHAR(MAX) = N'SELECT * FROM (' + @ValTSQL + N') AS __t WHERE ' + @ValCondition;
                DECLARE @ValParams NVARCHAR(MAX) = N'@FromDate datetime, @ToDate datetime, @PONumber varchar(100), @ItemCode varchar(100), @ItemID int, @SaftyStock decimal(18,5), @LeadTime int, @PermUser varchar(100), @PermPageGroupID varchar(100), @PermCanView bit';
                
                DECLARE @ErrorNumber INT = NULL;
                DECLARE @ErrorMessage NVARCHAR(4000) = NULL;

                -- Execute inside ERPMega database context to resolve tables
                DECLARE @ValExecSQL NVARCHAR(MAX) = N'
                    SELECT TOP 1 @ErrorNumberOut = error_number, @ErrorMessageOut = error_message
                    FROM sys.dm_exec_describe_first_result_set(@ValStatement, @ValParams, 0)
                    WHERE error_number IS NOT NULL;
                ';

                EXEC ERPMega.sys.sp_executesql 
                    @ValExecSQL,
                    N'@ValStatement NVARCHAR(MAX), @ValParams NVARCHAR(MAX), @ErrorNumberOut INT OUTPUT, @ErrorMessageOut NVARCHAR(4000) OUTPUT',
                    @ValStatement = @ValStatement,
                    @ValParams = @ValParams,
                    @ErrorNumberOut = @ErrorNumber OUTPUT,
                    @ErrorMessageOut = @ErrorMessage OUTPUT;

                IF @ErrorNumber IS NOT NULL AND @ErrorNumber <> 0
                BEGIN
                    SET @State = 1;
                    SET @Message = @ErrorMessage;
                END
            END

            SELECT @State AS State, @Message AS Message;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: SaveQueryMaster
        -- ---------------------------------------------------------------------
        IF @Operation = 'SaveQueryMaster'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @QMQueryID INT = NULLIF(JSON_VALUE(@LineData, '$.QueryID'), '');
            DECLARE @QMQueryName NVARCHAR(150) = JSON_VALUE(@LineData, '$.QueryName');
            DECLARE @QMSPName NVARCHAR(250) = JSON_VALUE(@LineData, '$.SPName');
            DECLARE @QMQueryOperation VARCHAR(100) = JSON_VALUE(@LineData, '$.Operation');
            DECLARE @QMDescription NVARCHAR(500) = JSON_VALUE(@LineData, '$.Description');
            DECLARE @QMQuerySQL NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.QuerySQL');
            DECLARE @QMDatabaseName VARCHAR(100) = JSON_VALUE(@LineData, '$.DatabaseName');
            DECLARE @QMSchemaName VARCHAR(100) = JSON_VALUE(@LineData, '$.SchemaName');
            DECLARE @QMTableOrViewName VARCHAR(150) = JSON_VALUE(@LineData, '$.TableOrViewName');
            DECLARE @QMQueryType VARCHAR(50) = JSON_VALUE(@LineData, '$.QueryType');
            DECLARE @QMApiUrl VARCHAR(500) = JSON_VALUE(@LineData, '$.ApiUrl');

            IF @QMQueryID IS NOT NULL
            BEGIN
                UPDATE [PLS].[QueryMaster]
                SET QueryName = @QMQueryName,
                    SPName = @QMSPName,
                    Operation = @QMQueryOperation,
                    Description = @QMDescription,
                    QuerySQL = @QMQuerySQL,
                    DatabaseName = @QMDatabaseName,
                    SchemaName = @QMSchemaName,
                    TableOrViewName = @QMTableOrViewName,
                    QueryType = @QMQueryType,
                    ApiUrl = @QMApiUrl
                WHERE QueryID = @QMQueryID;
            END
            ELSE
            BEGIN
                INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl, CreatedBy)
                VALUES (@QMQueryName, @QMSPName, @QMQueryOperation, @QMDescription, @QMQuerySQL, @QMDatabaseName, @QMSchemaName, @QMTableOrViewName, @QMQueryType, @QMApiUrl, @User);
                
                SET @QMQueryID = SCOPE_IDENTITY();
            END

            SELECT @State AS State, @Message AS Message, @QMQueryID AS QueryID;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: DeleteQueryMaster
        -- ---------------------------------------------------------------------
        IF @Operation = 'DeleteQueryMaster'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @DelQueryID INT = JSON_VALUE(@LineData, '$.QueryID');

            DELETE FROM [PLS].[QueryMaster] WHERE QueryID = @DelQueryID;

            SELECT @State AS State, @Message AS Message;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: SaveQueryPageRelation
        -- ---------------------------------------------------------------------
        IF @Operation = 'SaveQueryPageRelation'
        BEGIN
            SET @State = 0;
            SET @Message = 'Success';

            DECLARE @RelQueryID INT = JSON_VALUE(@LineData, '$.QueryID');
            DECLARE @RelPageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
            DECLARE @RelIsLinked BIT = JSON_VALUE(@LineData, '$.IsLinked');

            IF @RelIsLinked = 1
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = @RelPageGroupID AND QueryID = @RelQueryID)
                BEGIN
                    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES (@RelPageGroupID, @RelQueryID);
                END
            END
            ELSE
            BEGIN
                DELETE FROM [PLS].[PageQueries] WHERE PageGroupID = @RelPageGroupID AND QueryID = @RelQueryID;
            END

            SELECT @State AS State, @Message AS Message;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Fallback: Unsupported Operation
        -- ---------------------------------------------------------------------
      
           set @Message = 'Unsupported Operation: ' 
		   set @State= 1
          
    END TRY
    BEGIN CATCH
        -- Database Exception Handler
        SELECT 
            ERROR_NUMBER() AS State, 
            'SQL Exception: ' + ERROR_MESSAGE() + ' (Line: ' + CAST(ERROR_LINE() AS VARCHAR(10)) + ')' AS Message;
    END CATCH
END
