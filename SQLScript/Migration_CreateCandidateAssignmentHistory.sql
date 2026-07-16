USE [HR]
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CandidateAssignmentHistory' AND schema_id = SCHEMA_ID('PLS'))
BEGIN
    CREATE TABLE [PLS].[CandidateAssignmentHistory] (
        [AssignmentHistoryID] INT IDENTITY(1,1) PRIMARY KEY,
        [CandidateID] INT NOT NULL FOREIGN KEY REFERENCES [PLS].[Candidate]([CandidateID]) ON DELETE CASCADE,
        [OldRequestID] INT NULL FOREIGN KEY REFERENCES [PLS].[HiringRequest]([RequestID]),
        [NewRequestID] INT NOT NULL FOREIGN KEY REFERENCES [PLS].[HiringRequest]([RequestID]),
        [AssignedBy] NVARCHAR(100) NOT NULL,
        [AssignedDate] DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO
