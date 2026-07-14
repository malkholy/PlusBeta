USE [HR]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'HiringRequestApproval' AND schema_id = SCHEMA_ID('PLS'))
BEGIN
    CREATE TABLE [PLS].[HiringRequestApproval] (
        [ApprovalID] INT IDENTITY(1,1) PRIMARY KEY,
        [RequestID] INT NOT NULL FOREIGN KEY REFERENCES [PLS].[HiringRequest]([RequestID]) ON DELETE CASCADE,
        [ApproverUser] NVARCHAR(100) NOT NULL,
        [StepNumber] INT NOT NULL,
        [ApprovalState] INT NOT NULL DEFAULT 0, -- 0: Pending, 1: Approved, 2: Rejected, 3: Returned
        [Comments] NVARCHAR(500) NULL,
        [ActionDate] DATETIME NULL
    );
END
GO
