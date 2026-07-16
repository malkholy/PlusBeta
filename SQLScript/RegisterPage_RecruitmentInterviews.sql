USE [ERPMega]
GO

-- 1. Register recruitment_interviews page in PLS.PagesAndGroups
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE [PageGroupID] = 'recruitment_interviews')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] ([PageGroupID], [Label], [Icon], [Description], [IsGroup], [ParentID], [SortOrder])
    VALUES ('recruitment_interviews', N'Interviews Log', N'📅', N'Review history, schedules, and feedback of all interviews', 0, 'recruitment_group', 550);
END
GO

-- 2. Register query in PLS.QueryMaster
DECLARE @QID INT;
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Interviews Log')
BEGIN
    INSERT INTO [PLS].[QueryMaster] ([QueryName], [SPName], [Operation], [Description], [QuerySQL], [DatabaseName], [SchemaName], [TableOrViewName], [QueryType], [CreatedBy], [ApiUrl])
    VALUES (N'Get Interviews Log', N'[PLS].[APIPlusRecruitmentOperation]', 'Get Interviews Log', N'Retrieve complete history of candidate interviews', 
            N'SELECT i.InterviewID, i.CandidateID, c.FullName AS CandidateName, r.PositionTitle, r.Department, i.RoundNumber, i.InterviewerUser, i.ScheduledDate, i.InterviewState, i.Rating, i.FeedbackComments, i.Recommendation FROM [PLS].[CandidateInterview] i JOIN [PLS].[Candidate] c ON i.CandidateID = c.CandidateID JOIN [PLS].[HiringRequest] r ON c.RequestID = r.RequestID ORDER BY i.ScheduledDate DESC;', 'HR', 'PLS', 'CandidateInterview', 'Grid', 'System', 'https://quick.glcpaints.com:7001/General/GeneralAPI/');
    SET @QID = SCOPE_IDENTITY();
END
ELSE
BEGIN
    SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE [QueryName] = N'Get Interviews Log';
    UPDATE [PLS].[QueryMaster]
    SET [QuerySQL] = N'SELECT i.InterviewID, i.CandidateID, c.FullName AS CandidateName, r.PositionTitle, r.Department, i.RoundNumber, i.InterviewerUser, i.ScheduledDate, i.InterviewState, i.Rating, i.FeedbackComments, i.Recommendation FROM [PLS].[CandidateInterview] i JOIN [PLS].[Candidate] c ON i.CandidateID = c.CandidateID JOIN [PLS].[HiringRequest] r ON c.RequestID = r.RequestID ORDER BY i.ScheduledDate DESC;',
        [SPName] = N'[PLS].[APIPlusRecruitmentOperation]',
        [Operation] = 'Get Interviews Log',
        [DatabaseName] = 'HR',
        [SchemaName] = 'PLS',
        [TableOrViewName] = 'CandidateInterview',
        [QueryType] = 'Grid',
        [ApiUrl] = 'https://quick.glcpaints.com:7001/General/GeneralAPI/'
    WHERE QueryID = @QID;
END

-- 3. Map query to the new page in PLS.PageQueries
IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'recruitment_interviews' AND QueryID = @QID)
BEGIN
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('recruitment_interviews', @QID);
END
GO
