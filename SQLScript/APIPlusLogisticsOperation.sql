USE [ERPMega]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =========================================================================
-- Author:      Plus Beta Developer
-- Create date: 2026-07-09
-- Description: Logistics tracking history operations
-- =========================================================================
CREATE OR ALTER PROCEDURE [dbo].[APIPlusLogisticsOperation]
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
    DECLARE @FromDate DATE = NULL;
    DECLARE @ToDate DATE = NULL;
    DECLARE @TrackNumber VARCHAR(100) = NULL;
    DECLARE @VendorNumber VARCHAR(50) = NULL;

    -- Extract common fields from JSON @LineData if provided
    IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
    BEGIN
        SELECT 
            @FromDate = TRY_CAST(JSON_VALUE(@LineData, '$.FromDate') AS DATE),
            @ToDate = TRY_CAST(JSON_VALUE(@LineData, '$.ToDate') AS DATE),
            @TrackNumber = JSON_VALUE(@LineData, '$.TrackNumber'),
            @VendorNumber = JSON_VALUE(@LineData, '$.VendorNumber');
    END

    BEGIN TRY

        -- ---------------------------------------------------------------------
        -- Operation: GetTrackingHistory
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetTrackingHistory'
        BEGIN
            SELECT * FROM QGetTrackingHistory
            WHERE (@FromDate IS NULL OR LogisticCreatedDate >= @FromDate)
              AND (@ToDate IS NULL OR LogisticCreatedDate <= @ToDate)
              AND (@TrackNumber IS NULL OR @TrackNumber = '' OR TrackNumber LIKE '%' + @TrackNumber + '%')
              AND (@VendorNumber IS NULL OR @VendorNumber = '' OR VendorNumber = @VendorNumber)
            ORDER BY LogisticCreatedDate DESC, TrackNumber DESC;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetTrackingHistoryLines
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetTrackingHistoryLines'
        BEGIN
            DECLARE @LineTrackNumber VARCHAR(100) = NULL;
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @LineTrackNumber = JSON_VALUE(@LineData, '$.TrackNumber');
            END

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
            Left outer join INV.ItemMaster im on im.ItemID=ll.ItemID 
            LEFT OUTER JOIN PUR.PurchaseOrderHeader poh on poh.PurchaseOrderNumber=ll.PurchaseOrderNumber   
            WHERE ll.TrackNumber = @LineTrackNumber 
            Order By LineNumber;
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
