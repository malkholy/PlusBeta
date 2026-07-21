USE [HR]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Candidate' AND schema_id = SCHEMA_ID('PLS'))
BEGIN
    CREATE TABLE [PLS].[Candidate] (
        [CandidateID] INT IDENTITY(1,1) PRIMARY KEY,
        [RequestID] INT NOT NULL FOREIGN KEY REFERENCES [PLS].[HiringRequest]([RequestID]) ON DELETE CASCADE,
        [FullName] NVARCHAR(150) NOT NULL,
        [Email] NVARCHAR(150) NOT NULL,
        [Phone] NVARCHAR(50) NULL,
        [CVFileName] NVARCHAR(250) NULL,
        [CVFileContent] NVARCHAR(MAX) NULL,
        [Source] NVARCHAR(50) NOT NULL, -- Board/Agency/Referral/etc.
        [CandidateState] INT NOT NULL DEFAULT 0, -- 0: New, 1: Shortlisted, 2: Rejected, 3: Interviewing, 4: Selected, 5: On Hold, 6: Hired
        [RejectionReason] NVARCHAR(300) NULL,
        [Summary] NVARCHAR(MAX) NULL,
        [Government] NVARCHAR(100) NULL,
        [City] NVARCHAR(100) NULL,
        [Address] NVARCHAR(250) NULL,
        [AccessPassword] VARCHAR(50) NULL,
        [ProfilePhoto] NVARCHAR(MAX) NULL,
        [DateOfBirth] DATETIME NULL,
        [ExpectedJoiningDate] DATETIME NULL,
        [ExpectedSalary] NVARCHAR(50) NULL,
        [EducationDetails] NVARCHAR(MAX) NULL,
        [WorkExperienceDetails] NVARCHAR(MAX) NULL,
        [IsProfileLocked] BIT NOT NULL DEFAULT 0,
        [CreatedBy] NVARCHAR(100) NOT NULL,
        [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE()
    );
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PLS].[Candidate]') AND name = 'AccessPassword')
        ALTER TABLE [PLS].[Candidate] ADD [AccessPassword] VARCHAR(50) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PLS].[Candidate]') AND name = 'ProfilePhoto')
        ALTER TABLE [PLS].[Candidate] ADD [ProfilePhoto] NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PLS].[Candidate]') AND name = 'DateOfBirth')
        ALTER TABLE [PLS].[Candidate] ADD [DateOfBirth] DATETIME NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PLS].[Candidate]') AND name = 'ExpectedJoiningDate')
        ALTER TABLE [PLS].[Candidate] ADD [ExpectedJoiningDate] DATETIME NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PLS].[Candidate]') AND name = 'ExpectedSalary')
        ALTER TABLE [PLS].[Candidate] ADD [ExpectedSalary] NVARCHAR(50) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PLS].[Candidate]') AND name = 'EducationDetails')
        ALTER TABLE [PLS].[Candidate] ADD [EducationDetails] NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PLS].[Candidate]') AND name = 'WorkExperienceDetails')
        ALTER TABLE [PLS].[Candidate] ADD [WorkExperienceDetails] NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PLS].[Candidate]') AND name = 'IsProfileLocked')
        ALTER TABLE [PLS].[Candidate] ADD [IsProfileLocked] BIT NOT NULL DEFAULT 0;
END
GO
