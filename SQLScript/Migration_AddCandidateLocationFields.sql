USE [HR]
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('[PLS].[Candidate]') AND name = 'Government')
BEGIN
    ALTER TABLE [PLS].[Candidate] ADD [Government] NVARCHAR(100) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('[PLS].[Candidate]') AND name = 'City')
BEGIN
    ALTER TABLE [PLS].[Candidate] ADD [City] NVARCHAR(100) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('[PLS].[Candidate]') AND name = 'Address')
BEGIN
    ALTER TABLE [PLS].[Candidate] ADD [Address] NVARCHAR(250) NULL;
END
GO
