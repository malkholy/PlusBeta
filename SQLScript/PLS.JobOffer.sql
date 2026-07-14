USE [HR]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'JobOffer' AND schema_id = SCHEMA_ID('PLS'))
BEGIN
    CREATE TABLE [PLS].[JobOffer] (
        [OfferID] INT IDENTITY(1,1) PRIMARY KEY,
        [CandidateID] INT NOT NULL FOREIGN KEY REFERENCES [PLS].[Candidate]([CandidateID]) ON DELETE CASCADE,
        [ProposedSalary] DECIMAL(18,2) NOT NULL,
        [ProposedStartDate] DATE NOT NULL,
        [OfferTerms] NVARCHAR(MAX) NULL,
        [OfferState] INT NOT NULL DEFAULT 0, -- 0: Draft, 1: Pending Approval, 2: Sent, 3: Accepted, 4: Declined
        [OnboardingChecked] NVARCHAR(MAX) NULL -- JSON checklist
    );
END
GO
