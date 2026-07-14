USE [ERPMega]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =========================================================================
-- Author:      Plus Beta Developer
-- Create date: 2026-07-14
-- Description: Express Code Serials operations
-- =========================================================================
CREATE OR ALTER PROCEDURE [dbo].[APIPlusExpressGenerateCodeOperation]
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
    
    IF @Operation = 'Get Serials'
    BEGIN
        SELECT * FROM code.CardSerialSummary;
        RETURN;
    END
END
GO
