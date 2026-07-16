USE [HR]
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Candidate' AND schema_id = SCHEMA_ID('PLS'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE name = 'Summary' AND object_id = OBJECT_ID('[PLS].[Candidate]'))
    BEGIN
        ALTER TABLE [PLS].[Candidate]
        ADD [Summary] NVARCHAR(MAX) NULL;
    END
END
GO
