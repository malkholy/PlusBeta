USE [HR]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CandidateInterview' AND schema_id = SCHEMA_ID('PLS'))
BEGIN
    CREATE TABLE [PLS].[CandidateInterview] (
        [InterviewID] INT IDENTITY(1,1) PRIMARY KEY,
        [CandidateID] INT NOT NULL FOREIGN KEY REFERENCES [PLS].[Candidate]([CandidateID]) ON DELETE CASCADE,
        [RoundNumber] INT NOT NULL, -- 1: HR, 2: Technical, 3: Manager, 4: Final
        [InterviewerUser] NVARCHAR(100) NOT NULL,
        [ScheduledDate] DATETIME NOT NULL,
        [FeedbackComments] NVARCHAR(MAX) NULL,
        [Rating] INT NULL, -- 1 to 5
        [Recommendation] INT NULL, -- 0: Proceed, 1: Reject, 2: Hold
        [InterviewState] INT NOT NULL DEFAULT 0 -- 0: Scheduled, 1: Completed, 2: Passed, 3: Rejected
    );
END
GO
