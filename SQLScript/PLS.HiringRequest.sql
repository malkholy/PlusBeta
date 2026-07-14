USE [HR]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'HiringRequest' AND schema_id = SCHEMA_ID('PLS'))
BEGIN
    CREATE TABLE [PLS].[HiringRequest] (
        [RequestID] INT IDENTITY(1,1) PRIMARY KEY,
        [PositionTitle] NVARCHAR(150) NOT NULL,
        [Department] NVARCHAR(100) NOT NULL,
        [Headcount] INT NOT NULL DEFAULT 1,
        [Reason] NVARCHAR(50) NOT NULL, -- e.g. Replacement / New
        [JobDescription] NVARCHAR(MAX) NULL,
        [RequiredSkills] NVARCHAR(MAX) NULL,
        [SalaryMin] DECIMAL(18,2) NULL,
        [SalaryMax] DECIMAL(18,2) NULL,
        [Urgency] NVARCHAR(50) NOT NULL, -- e.g. Low / Medium / High
        [TargetStartDate] DATE NULL,
        [RequestState] INT NOT NULL DEFAULT 0, -- 0: Draft, 1: Pending Approval, 2: Approved, 3: Rejected, 4: Returned, 5: Open for Sourcing, 6: Fulfilled
        [CreatedBy] NVARCHAR(100) NOT NULL,
        [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE(),
        [LastMaintBy] NVARCHAR(100) NULL,
        [LastMaintDate] DATETIME NULL
    );
END
GO
