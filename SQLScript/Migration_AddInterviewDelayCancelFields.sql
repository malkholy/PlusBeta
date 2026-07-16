USE [HR]
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('[PLS].[CandidateInterview]') AND name = 'DelayCancelReason')
BEGIN
    ALTER TABLE [PLS].[CandidateInterview] ADD [DelayCancelReason] NVARCHAR(MAX) NULL;
END
GO
