-- ==============================================================================
-- Recruitment Tests Schema
-- ==============================================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[PLS].[RecruitmentTests]') AND type in (N'U'))
BEGIN
    CREATE TABLE [PLS].[RecruitmentTests] (
        [TestID] INT IDENTITY(1,1) PRIMARY KEY,
        [TestTitle] VARCHAR(255) NOT NULL,
        [TestType] VARCHAR(100) NULL, -- 'IQ', 'English', etc.
        [CreatedBy] VARCHAR(100) NULL,
        [CreatedDate] DATETIME DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[PLS].[RecruitmentTestQuestions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [PLS].[RecruitmentTestQuestions] (
        [QuestionID] INT IDENTITY(1,1) PRIMARY KEY,
        [TestID] INT NOT NULL,
        [QuestionText] VARCHAR(MAX) NOT NULL,
        [OptionA] VARCHAR(MAX) NOT NULL,
        [OptionB] VARCHAR(MAX) NOT NULL,
        [OptionC] VARCHAR(MAX) NOT NULL,
        [OptionD] VARCHAR(MAX) NOT NULL,
        [CorrectAnswer] CHAR(1) NOT NULL, -- 'A', 'B', 'C', or 'D'
        CONSTRAINT FK_RecruitmentTestQuestions_TestID FOREIGN KEY ([TestID]) REFERENCES [PLS].[RecruitmentTests]([TestID]) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[PLS].[CandidateTestResults]') AND type in (N'U'))
BEGIN
    CREATE TABLE [PLS].[CandidateTestResults] (
        [ResultID] INT IDENTITY(1,1) PRIMARY KEY,
        [CandidateID] INT NOT NULL,
        [TestID] INT NOT NULL,
        [Score] DECIMAL(5,2) NULL,
        [TestDate] DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_CandidateTestResults_TestID FOREIGN KEY ([TestID]) REFERENCES [PLS].[RecruitmentTests]([TestID]) ON DELETE CASCADE,
        CONSTRAINT FK_CandidateTestResults_CandidateID FOREIGN KEY ([CandidateID]) REFERENCES [PLS].[Candidate]([CandidateID]) ON DELETE CASCADE
    );
END
GO
