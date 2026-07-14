USE Express
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
        SELECT 
			ID , 
            [CardType]
            ,[FromSerial]
            ,[ToSerial]
            ,[DeliverdDate]
            ,[Note]
            ,[CreatedBy]
            ,[CreatedDate]
            ,[LastMaintDate]
            ,[LastMaintBy]
            ,[SerialState]
        FROM [Express].[Code].[CardSerialSummary];
        RETURN;
    END

    IF @Operation = 'New Serial'
    BEGIN
        DECLARE @CardType NVARCHAR(100) = JSON_VALUE(@LineData, '$.CardType');
        DECLARE @FromSerial BIGINT = JSON_VALUE(@LineData, '$.FromSerial');
        DECLARE @ToSerial BIGINT = JSON_VALUE(@LineData, '$.ToSerial');
        DECLARE @DeliverdDate DATETIME = NULLIF(JSON_VALUE(@LineData, '$.DeliverdDate'), '');
        DECLARE @Note NVARCHAR(500) = JSON_VALUE(@LineData, '$.Note');

        IF @CardType IS NULL OR @CardType = ''
        BEGIN
            SET @State = 1;
            SET @Message = 'Card Type is required.';
            RETURN;
        END

        IF @FromSerial IS NULL OR @ToSerial IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'From Serial and To Serial are required.';
            RETURN;
        END

        INSERT INTO [Express].[Code].[CardSerialSummary] (
            [CardType]
            ,[FromSerial]
            ,[ToSerial]
            ,[DeliverdDate]
            ,[Note]
            ,[CreatedBy]
            ,[CreatedDate]
            ,[LastMaintDate]
            ,[LastMaintBy]
        )
        VALUES (
            @CardType
            ,@FromSerial
            ,@ToSerial
            ,COALESCE(@DeliverdDate, GETDATE())
            ,@Note
            ,@User
            ,GETDATE()
            ,NULL
            ,''
        );

        SET @Message = 'Serial created successfully.';
        RETURN;
    END

    IF @Operation = 'Request Serial'
    BEGIN
        DECLARE @RequestID INT = JSON_VALUE(@LineData, '$.ID');

        IF @RequestID IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'ID is required.';
            RETURN;
        END

        -- Validation: check if current state is 0
        DECLARE @CurrentState INT = NULL;
        SELECT @CurrentState = [SerialState]
        FROM [Express].[Code].[CardSerialSummary]
        WHERE [ID] = @RequestID;

        IF @CurrentState IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Serial record not found.';
            RETURN;
        END

        IF @CurrentState <> 0
        BEGIN
            SET @State = 1;
            SET @Message = 'Only serials in New state can be requested.';
            RETURN;
        END

        UPDATE [Express].[Code].[CardSerialSummary]
        SET [SerialState] = 1
            ,[LastMaintDate] = GETDATE()
            ,[LastMaintBy] = @User
        WHERE [ID] = @RequestID;

        SET @Message = 'Serial requested successfully.';
        RETURN;
    END

    IF @Operation = 'Move Serial'
    BEGIN
        DECLARE @MoveID INT = JSON_VALUE(@LineData, '$.ID');

        IF @MoveID IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'ID is required.';
            RETURN;
        END

        -- Validation: check if current state is 3
        DECLARE @CurrentState INT = NULL;
        SELECT @CurrentState = [SerialState]
        FROM [Express].[Code].[CardSerialSummary]
        WHERE [ID] = @MoveID;

        IF @CurrentState IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Serial record not found.';
            RETURN;
        END

        IF @CurrentState <> 3
        BEGIN
            SET @State = 1;
            SET @Message = 'Only serials in Generated state can be moved.';
            RETURN;
        END

        UPDATE [Express].[Code].[CardSerialSummary]
        SET [SerialState] = 4
            ,[LastMaintDate] = GETDATE()
            ,[LastMaintBy] = @User
        WHERE [ID] = @MoveID;

        SET @Message = 'Serial moved successfully.';
        RETURN;
    END

    IF @Operation = 'Get Card Types'
    BEGIN
        SELECT 
            [CardType],
            [Description]
        FROM [Express].[Code].[CardTypeMaster];
        RETURN;
    END
END
GO
