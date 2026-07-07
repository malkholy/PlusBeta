USE ERPMega
GO

-- Create PLS schema if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'PLS')
BEGIN
    EXEC('CREATE SCHEMA PLS')
END
GO

-- Create [PLS].[UserQueryPermissions] Table
IF OBJECT_ID('PLS.UserQueryPermissions', 'U') IS NULL
BEGIN
    CREATE TABLE [PLS].[UserQueryPermissions] (
        [PermissionID] INT IDENTITY(1,1) PRIMARY KEY,
        [Username] VARCHAR(100) NOT NULL,
        [QueryID] INT NOT NULL,
        [SQLFilter] NVARCHAR(MAX) NULL,
        [GrantedBy] NVARCHAR(100) NULL,
        [GrantedDate] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_UserQueryPermissions_QueryMaster FOREIGN KEY ([QueryID]) REFERENCES [PLS].[QueryMaster]([QueryID])
    );

    CREATE NONCLUSTERED INDEX IX_UserQueryPermissions_UserQuery 
    ON [PLS].[UserQueryPermissions] (Username, QueryID);
END
GO
