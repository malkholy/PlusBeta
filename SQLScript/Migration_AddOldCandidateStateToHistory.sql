USE [HR]
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CandidateAssignmentHistory' AND schema_id = SCHEMA_ID('PLS'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE name = 'OldCandidateState' AND object_id = OBJECT_ID('[PLS].[CandidateAssignmentHistory]'))
    BEGIN
        ALTER TABLE [PLS].[CandidateAssignmentHistory]
        ADD [OldCandidateState] INT NULL;
    END
END
GO
