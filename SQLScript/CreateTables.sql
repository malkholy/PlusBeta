USE ERPMega
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Create PUR schema if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'PUR')
BEGIN
    EXEC('CREATE SCHEMA PUR')
END
GO

-- 1. Create [PUR].[SaftyStockItemMaster] Table
IF OBJECT_ID('PUR.SaftyStockItemMaster', 'U') IS NULL
BEGIN
    CREATE TABLE [PUR].[SaftyStockItemMaster] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [ItemID] INT NOT NULL,
        [ItemCode] VARCHAR(50) NOT NULL,
        [SaftyStock] DECIMAL(18,5) NOT NULL DEFAULT 0,
        [LeadTime] INT NOT NULL DEFAULT 0,
        [ServiceLevelFactor] DECIMAL(18,5) NOT NULL DEFAULT 1.65,
        [PurchasingWarehouse] INT NOT NULL DEFAULT 1,
        [ProducationWarehouse] INT NOT NULL DEFAULT 0,
        [CreatedBy] NVARCHAR(100) NULL,
        [CreatedDate] DATETIME DEFAULT GETDATE(),
        [LastMaintBy] NVARCHAR(100) NULL,
        [LastMaintDate] DATETIME DEFAULT GETDATE(),
        [ItemType] VARCHAR(50) NULL
    );

    CREATE NONCLUSTERED INDEX IX_SaftyStockItemMaster_ItemCode 
    ON [PUR].[SaftyStockItemMaster] (ItemCode);
END
GO

-- 2. Create [PUR].[SaftyStockStatusHistory] Table
IF OBJECT_ID('PUR.SaftyStockStatusHistory', 'U') IS NULL
BEGIN
    CREATE TABLE [PUR].[SaftyStockStatusHistory] (
        [LogID] INT IDENTITY(1,1) PRIMARY KEY,
        [ItemID] INT NOT NULL,
        [ItemCode] VARCHAR(50) NOT NULL,
        [OldStatus] VARCHAR(50) NULL,
        [NewStatus] VARCHAR(50) NOT NULL,
        [MonitoredBalance] DECIMAL(18,4) NOT NULL,
        [ReorderLimit] DECIMAL(18,4) NOT NULL,
        [CalculatedSafetyStock] DECIMAL(18,4) NOT NULL,
        [OpenPOQty] DECIMAL(18,4) NOT NULL,
        [LogDate] DATETIME DEFAULT GETDATE()
    );

    CREATE NONCLUSTERED INDEX IX_SaftyStockStatusHistory_Latest 
    ON [PUR].[SaftyStockStatusHistory] (ItemCode, LogDate DESC);
END
GO
