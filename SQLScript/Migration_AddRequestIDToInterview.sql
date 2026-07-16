USE [HR]
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('[PLS].[CandidateInterview]') AND name = 'RequestID')
BEGIN
    ALTER TABLE [PLS].[CandidateInterview] ADD [RequestID] INT NULL FOREIGN KEY REFERENCES [PLS].[HiringRequest]([RequestID]);
END
GO

-- Backfill existing interviews based on their candidate's current request link
UPDATE i
SET i.RequestID = c.RequestID
FROM [PLS].[CandidateInterview] i
JOIN [PLS].[Candidate] c ON i.CandidateID = c.CandidateID
WHERE i.RequestID IS NULL;
GO
