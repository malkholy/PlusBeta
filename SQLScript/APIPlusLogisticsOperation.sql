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
              AND (@TrackNumber IS NULL OR @TrackNumber = '' OR TrackNumber LIKE '%' + @TrackNumber + '%' OR PONumber LIKE '%' + @TrackNumber + '%')
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

            SELECT * 
            FROM dbo.QGetTrackDetailsLines
            WHERE TrackNumber = @LineTrackNumber 
            Order By LineNumber;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetTrackingHistoryPayments
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetTrackingHistoryPayments'
        BEGIN
            DECLARE @PayTrackNumber VARCHAR(100) = NULL;
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @PayTrackNumber = JSON_VALUE(@LineData, '$.TrackNumber');
            END

            SELECT * 
            FROM dbo.QGetTrackDetailsPayments
            WHERE TrackNumber = @PayTrackNumber;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetTrackingHistoryReferences
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetTrackingHistoryReferences'
        BEGIN
            DECLARE @RefTrackNumber VARCHAR(100) = NULL;
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @RefTrackNumber = JSON_VALUE(@LineData, '$.TrackNumber');
            END

            SELECT * 
            FROM dbo.QGetTrackDetailsReferences
            WHERE TrackNumber = @RefTrackNumber;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetTrackingHistoryBatches
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetTrackingHistoryBatches'
        BEGIN
            DECLARE @BatchTrackNumber VARCHAR(100) = NULL;
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @BatchTrackNumber = JSON_VALUE(@LineData, '$.TrackNumber');
            END

            SELECT * 
            FROM dbo.QGetTrackDetailsBatches
            WHERE TrackNumber = @BatchTrackNumber;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetTrackingHistoryContainers
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetTrackingHistoryContainers'
        BEGIN
            DECLARE @ConTrackNumber VARCHAR(100) = NULL;
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @ConTrackNumber = JSON_VALUE(@LineData, '$.TrackNumber');
            END

            SELECT * 
            FROM dbo.QGetTrackDetailsContainers
            WHERE TrackNumber = @ConTrackNumber;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetTrackingHistoryExtraAmounts
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetTrackingHistoryExtraAmounts'
        BEGIN
            DECLARE @ExtraTrackNumber VARCHAR(100) = NULL;
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @ExtraTrackNumber = JSON_VALUE(@LineData, '$.TrackNumber');
            END

            SELECT * 
            FROM dbo.QGetTrackDetailsExtraAmounts
            WHERE TrackNumber = @ExtraTrackNumber;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetTrackingHistoryAttachments
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetTrackingHistoryAttachments'
        BEGIN
            DECLARE @AttachTrackNumber VARCHAR(100) = NULL;
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @AttachTrackNumber = JSON_VALUE(@LineData, '$.TrackNumber');
            END

            SELECT * 
            FROM dbo.QGetTrackDetailsAttachments
            WHERE TrackNumber = @AttachTrackNumber;
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: GetSalesExportStatistics
        -- ---------------------------------------------------------------------
        IF @Operation = 'GetSalesExportStatistics'
        BEGIN
            DECLARE @CustomerNo VARCHAR(50) = NULL;
            DECLARE @ItemCode VARCHAR(50) = NULL;
            DECLARE @Month INT = NULL;
            
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                SELECT @CustomerNo = NULLIF(JSON_VALUE(@LineData, '$.CustomerNo'), ''),
                       @ItemCode = NULLIF(JSON_VALUE(@LineData, '$.ItemCode'), ''),
                       @Month = NULLIF(CAST(JSON_VALUE(@LineData, '$.Month') AS INT), 0);
            END

            -- Return Lookup data for Filters (Customer list & Item list)
            SELECT DISTINCT CustomerNo, CustomerExtraName 
            FROM dbo.QGetSalesExportStatistics 
            ORDER BY CustomerExtraName;

            SELECT DISTINCT ItemCode, ItemExtraDescription 
            FROM dbo.QGetSalesExportStatistics 
            ORDER BY ItemCode;

            -- Return monthly raw records for processing on frontend
            SELECT 
                YEAR(InvoiceDate) AS [Year],
                MONTH(InvoiceDate) AS [Month],
                CustomerNo,
                CustomerExtraName,
                ItemCode,
                ItemExtraDescription,
                SUM(ABS(InvoicedQuantity)) AS TotalQuantity,
                SUM(ABS(InvoicedQuantity) * GrossWeight) AS TotalWeight
            FROM dbo.QGetSalesExportStatistics
            WHERE (@CustomerNo IS NULL OR CustomerNo = @CustomerNo)
              AND (@ItemCode IS NULL OR ItemCode = @ItemCode)
              AND (@Month IS NULL OR MONTH(InvoiceDate) = @Month)
            GROUP BY 
                YEAR(InvoiceDate), 
                MONTH(InvoiceDate), 
                CustomerNo, 
                CustomerExtraName, 
                ItemCode, 
                ItemExtraDescription;
            
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
