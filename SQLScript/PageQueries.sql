USE ERPMega
GO

-- Create PLS schema if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'PLS')
BEGIN
    EXEC('CREATE SCHEMA PLS')
END
GO

-- Create [PLS].[PageQueries] Table
IF OBJECT_ID('PLS.PageQueries', 'U') IS NULL
BEGIN
    CREATE TABLE [PLS].[PageQueries] (
        [PageGroupID] VARCHAR(50) NOT NULL,
        [QueryID] INT NOT NULL,
        CONSTRAINT PK_PageQueries PRIMARY KEY CLUSTERED ([PageGroupID], [QueryID]),
        CONSTRAINT FK_PageQueries_PagesAndGroups FOREIGN KEY ([PageGroupID]) REFERENCES [PLS].[PagesAndGroups]([PageGroupID]) ON DELETE CASCADE,
        CONSTRAINT FK_PageQueries_QueryMaster FOREIGN KEY ([QueryID]) REFERENCES [PLS].[QueryMaster]([QueryID]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_PageQueries_PageGroupID ON [PLS].[PageQueries] ([PageGroupID]);
    CREATE NONCLUSTERED INDEX IX_PageQueries_QueryID ON [PLS].[PageQueries] ([QueryID]);
END
GO
