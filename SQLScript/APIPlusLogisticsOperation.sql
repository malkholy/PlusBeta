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
            WHERE (@FromDate IS NULL OR ETA >= @FromDate)
              AND (@ToDate IS NULL OR ETA <= @ToDate)
              AND (@TrackNumber IS NULL OR @TrackNumber = '' OR TrackNumber LIKE '%' + @TrackNumber + '%')
              AND (@VendorNumber IS NULL OR @VendorNumber = '' OR VendorNumber = @VendorNumber)
            ORDER BY LogisticCreatedDate DESC, TrackNumber DESC;
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
