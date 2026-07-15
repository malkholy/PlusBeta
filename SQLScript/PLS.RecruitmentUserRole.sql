USE [HR]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RecruitmentUserRole' AND schema_id = SCHEMA_ID('PLS'))
BEGIN
    CREATE TABLE [PLS].[RecruitmentUserRole] (
        [UserRoleID] INT IDENTITY(1,1) PRIMARY KEY,
        [Username] NVARCHAR(100) NOT NULL,
        [RoleName] NVARCHAR(100) NOT NULL, -- 'Department Manager' or 'HR Responsible'
        [CreatedBy] NVARCHAR(100) NOT NULL,
        [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO
