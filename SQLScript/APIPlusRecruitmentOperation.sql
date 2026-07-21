USE [HR]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =========================================================================
-- Author:      Plus Beta Developer
-- Create date: 2026-07-14
-- Description: Stored procedure handling all recruitment pipeline stages.
-- =========================================================================
CREATE OR ALTER PROCEDURE [PLS].[APIPlusRecruitmentOperation]
    @Operation VARCHAR(100),
    @LineData NVARCHAR(MAX) = '',
    @User           nvarchar(100) = '',
    @FireBaseToken  nvarchar(500) = '',
    @AppVersionWeb  nvarchar(50)  = '',
    @AppVersionAndroid nvarchar(50) = '',
    @AppVersionIos  nvarchar(50)  = '',
    @AppVersionDesktop nvarchar(50) = '',
    @PlatForm       nvarchar(50)  = '',
    @SqlStatement   nvarchar(max) = '',
    @State          int            output,
    @Message        nvarchar(500)  output
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_WARNINGS OFF;

    SET @State = 0;
    SET @Message = 'Success';

    -- Normalize @LineData: treat empty string, 'null', or invalid JSON as SQL NULL
    -- This prevents JSON_VALUE from throwing when LineData is not sent by the client
    IF @LineData IS NOT NULL AND (
        LTRIM(RTRIM(@LineData)) = '' OR 
        LTRIM(RTRIM(@LineData)) = 'null' OR 
        ISJSON(@LineData) = 0
    )
        SET @LineData = NULL;

    BEGIN TRY

    -- ---------------------------------------------------------------------
    -- Operation: Get AI Key
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get AI Key'
    BEGIN
        SELECT TOP 1 [APIKey] FROM [PLS].[AIKey] ORDER BY [ID] DESC;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Public Job Details
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Public Job Details'
    BEGIN
        DECLARE @JobReqID INT = JSON_VALUE(@LineData, '$.RequestID');

        SELECT 
            [RequestID],
            [PositionTitle],
            [Department],
            [JobDescription],
            [RequiredSkills]
        FROM [PLS].[HiringRequest]
        WHERE [RequestID] = @JobReqID AND [RequestState] IN (2, 5); -- Approved or Open sourcing
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Hiring Requests
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Hiring Requests'
    BEGIN
        SELECT 
            r.[RequestID],
            r.[PositionTitle],
            r.[Department],
            r.[Headcount],
            r.[Reason],
            r.[JobDescription],
            r.[RequiredSkills],
            r.[SalaryMin],
            r.[SalaryMax],
            r.[Urgency],
            r.[TargetStartDate],
            r.[RequestState],
            r.[CreatedBy],
            r.[CreatedDate],
            r.[LastMaintBy],
            r.[LastMaintDate],
            COALESCE(r.CreatorName, r.CreatedBy) AS CreatorName,
            (SELECT COUNT(*) FROM [PLS].[Candidate] c WHERE c.RequestID = r.RequestID) AS TotalCandidates,
            (SELECT COUNT(*) FROM [PLS].[Candidate] c WHERE c.RequestID = r.RequestID AND c.CandidateState = 6) AS HiredCount,
            COALESCE((SELECT COUNT(*) FROM [PLS].[CandidateInterview] i JOIN [PLS].[Candidate] c ON i.CandidateID = c.CandidateID WHERE c.RequestID = r.RequestID), 0) AS TotalInterviews,
            DATEDIFF(day, r.CreatedDate, COALESCE(CASE WHEN r.RequestState IN (3, 6) THEN r.LastMaintDate END, GETDATE())) AS TotalDaysForOpening,
            (
                SELECT TOP 1 Comments 
                FROM [PLS].[HiringRequestApproval] 
                WHERE RequestID = r.RequestID AND ApprovalState = 3 
                ORDER BY ActionDate DESC
            ) AS ReturnComments
        FROM [PLS].[HiringRequest] r
        ORDER BY r.CreatedDate DESC;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Save Hiring Request
    -- ---------------------------------------------------------------------
    IF @Operation = 'Save Hiring Request'
    BEGIN
        DECLARE @RequestID INT = NULLIF(JSON_VALUE(@LineData, '$.RequestID'), '');
        DECLARE @PositionTitle NVARCHAR(150) = JSON_VALUE(@LineData, '$.PositionTitle');
        DECLARE @Department NVARCHAR(100) = JSON_VALUE(@LineData, '$.Department');
        DECLARE @Headcount INT = COALESCE(NULLIF(JSON_VALUE(@LineData, '$.Headcount'), ''), 1);
        DECLARE @Reason NVARCHAR(50) = JSON_VALUE(@LineData, '$.Reason');
        DECLARE @JobDescription NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.JobDescription');
        DECLARE @RequiredSkills NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.RequiredSkills');
        DECLARE @SalaryMin DECIMAL(18,2) = NULLIF(JSON_VALUE(@LineData, '$.SalaryMin'), '');
        DECLARE @SalaryMax DECIMAL(18,2) = NULLIF(JSON_VALUE(@LineData, '$.SalaryMax'), '');
        DECLARE @Urgency NVARCHAR(50) = JSON_VALUE(@LineData, '$.Urgency');
        DECLARE @TargetStartDate DATE = NULLIF(JSON_VALUE(@LineData, '$.TargetStartDate'), '');
        DECLARE @CreatorName NVARCHAR(150) = NULLIF(JSON_VALUE(@LineData, '$.CreatorName'), '');

        IF @PositionTitle IS NULL OR @Department IS NULL OR @Reason IS NULL OR @Urgency IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Required request fields are missing.';
            RETURN;
        END

        IF @CreatorName IS NULL SET @CreatorName = @User;

        IF @RequestID IS NULL
        BEGIN
            INSERT INTO [PLS].[HiringRequest] (
                [PositionTitle], [Department], [Headcount], [Reason], [JobDescription], 
                [RequiredSkills], [SalaryMin], [SalaryMax], [Urgency], [TargetStartDate], 
                [RequestState], [CreatedBy], [CreatedDate], [CreatorName]
            )
            VALUES (
                @PositionTitle, @Department, @Headcount, @Reason, @JobDescription, 
                @RequiredSkills, @SalaryMin, @SalaryMax, @Urgency, @TargetStartDate, 
                0, @User, GETDATE(), @CreatorName
            );
            SET @Message = 'Hiring request drafted successfully.';
        END
        ELSE
        BEGIN
            UPDATE [PLS].[HiringRequest]
            SET [PositionTitle] = @PositionTitle,
                [Department] = @Department,
                [Headcount] = @Headcount,
                [Reason] = @Reason,
                [JobDescription] = @JobDescription,
                [RequiredSkills] = @RequiredSkills,
                [SalaryMin] = @SalaryMin,
                [SalaryMax] = @SalaryMax,
                [Urgency] = @Urgency,
                [TargetStartDate] = @TargetStartDate,
                [LastMaintBy] = @User,
                [LastMaintDate] = GETDATE(),
                [CreatorName] = COALESCE([CreatorName], @CreatorName)
            WHERE [RequestID] = @RequestID;
            SET @Message = 'Hiring request updated successfully.';
        END
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Submit Hiring Request
    -- ---------------------------------------------------------------------
    IF @Operation = 'Submit Hiring Request'
    BEGIN
        DECLARE @SubmitID INT = JSON_VALUE(@LineData, '$.RequestID');

        IF NOT EXISTS (SELECT 1 FROM [PLS].[HiringRequest] WHERE [RequestID] = @SubmitID)
        BEGIN
            SET @State = 1;
            SET @Message = 'Hiring request not found.';
            RETURN;
        END

        -- Archive previous Approvals cycle
        UPDATE [PLS].[HiringRequestApproval] 
        SET [IsActive] = 0 
        WHERE [RequestID] = @SubmitID;

        -- Initialize new active Approvals Chain (Step 1: HR Manager)
        INSERT INTO [PLS].[HiringRequestApproval] ([RequestID], [ApproverUser], [StepNumber], [ApprovalState], [IsActive])
        VALUES (@SubmitID, 'HRManager', 1, 0, 1);

        UPDATE [PLS].[HiringRequest]
        SET [RequestState] = 1 -- Pending Approval
        WHERE [RequestID] = @SubmitID;

        SET @Message = 'Hiring request submitted for approvals.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Pending Approvals
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Pending Approvals'
    BEGIN
        SELECT 
            ap.*,
            r.PositionTitle,
            r.Department,
            r.Headcount,
            r.Reason,
            r.Urgency,
            r.TargetStartDate
        FROM [PLS].[HiringRequestApproval] ap
        JOIN [PLS].[HiringRequest] r ON ap.RequestID = r.RequestID
        WHERE ap.ApprovalState = 0 -- Pending
          AND ap.ApproverUser = @User
          AND ap.IsActive = 1;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Approve Reject Request
    -- ---------------------------------------------------------------------
    IF @Operation = 'Approve Reject Request'
    BEGIN
        DECLARE @AppID INT = NULLIF(JSON_VALUE(@LineData, '$.ApprovalID'), '');
        DECLARE @ReqID INT = NULLIF(JSON_VALUE(@LineData, '$.RequestID'), '');
        DECLARE @Decision INT = JSON_VALUE(@LineData, '$.Decision'); -- 1: Approve, 2: Reject, 3: Return
        DECLARE @Comments NVARCHAR(500) = JSON_VALUE(@LineData, '$.Comments');

        IF @AppID IS NULL AND @ReqID IS NOT NULL
        BEGIN
            SELECT TOP 1 @AppID = ApprovalID 
            FROM [PLS].[HiringRequestApproval] 
            WHERE RequestID = @ReqID AND ApprovalState = 0 AND IsActive = 1
            ORDER BY StepNumber ASC;
        END

        IF @AppID IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'No active pending approval step found for this request.';
            RETURN;
        END

        -- Validate to prevent double approval actioning
        IF EXISTS (SELECT 1 FROM [PLS].[HiringRequestApproval] WHERE [ApprovalID] = @AppID AND [ApprovalState] <> 0)
        BEGIN
            SET @State = 1;
            SET @Message = 'This approval step has already been actioned.';
            RETURN;
        END

        -- Retrieve actual Full Name of the actioning user passed from frontend
        DECLARE @UserFullName NVARCHAR(150) = NULLIF(JSON_VALUE(@LineData, '$.UserFullName'), '');
        IF @UserFullName IS NULL SET @UserFullName = @User;

        UPDATE [PLS].[HiringRequestApproval]
        SET [ApprovalState] = @Decision,
            [Comments] = @Comments,
            [ActionDate] = GETDATE(),
            [ActionedBy] = @UserFullName
        WHERE [ApprovalID] = @AppID;

        SET @ReqID = (SELECT RequestID FROM [PLS].[HiringRequestApproval] WHERE [ApprovalID] = @AppID);

        IF @Decision = 2 -- Rejected
        BEGIN
            UPDATE [PLS].[HiringRequest] SET [RequestState] = 3 WHERE [RequestID] = @ReqID; -- Rejected
        END
        ELSE IF @Decision = 3 -- Returned
        BEGIN
            UPDATE [PLS].[HiringRequest] SET [RequestState] = 4 WHERE [RequestID] = @ReqID; -- Returned for edits
        END
        ELSE IF @Decision = 1 -- Approved
        BEGIN
            -- Check if all steps in the current active cycle are approved
            IF NOT EXISTS (SELECT 1 FROM [PLS].[HiringRequestApproval] WHERE [RequestID] = @ReqID AND [ApprovalState] <> 1 AND [IsActive] = 1)
            BEGIN
                UPDATE [PLS].[HiringRequest] SET [RequestState] = 5 WHERE [RequestID] = @ReqID; -- Open for Sourcing
            END
        END

        SET @Message = 'Approval decision submitted successfully.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Candidates
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Candidates'
    BEGIN
        DECLARE @FilterRequestID INT = NULLIF(JSON_VALUE(@LineData, '$.RequestID'), '');

        SELECT 
            c.*,
            r.PositionTitle,
            r.Department,
            r.JobDescription,
            r.RequiredSkills
        FROM [PLS].[Candidate] c
        JOIN [PLS].[HiringRequest] r ON c.RequestID = r.RequestID
        WHERE (@FilterRequestID IS NULL OR c.RequestID = @FilterRequestID)
        ORDER BY c.CreatedDate DESC;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Save Candidate Summary
    -- ---------------------------------------------------------------------
    IF @Operation = 'Save Candidate Summary'
    BEGIN
        DECLARE @SummCandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @SummText NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.Summary');

        IF NOT EXISTS (SELECT 1 FROM [PLS].[Candidate] WHERE [CandidateID] = @SummCandID)
        BEGIN
            SET @State = 1;
            SET @Message = 'Candidate not found.';
            RETURN;
        END

        UPDATE [PLS].[Candidate]
        SET [Summary] = @SummText
        WHERE [CandidateID] = @SummCandID;

        SET @Message = 'Candidate summary saved successfully.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Save Candidate
    -- ---------------------------------------------------------------------
    IF @Operation = 'Save Candidate'
    BEGIN
        DECLARE @CandidateID INT = NULLIF(JSON_VALUE(@LineData, '$.CandidateID'), '');
        DECLARE @CandReqID INT = JSON_VALUE(@LineData, '$.RequestID');
        DECLARE @FullName NVARCHAR(150) = JSON_VALUE(@LineData, '$.FullName');
        DECLARE @Email NVARCHAR(150) = JSON_VALUE(@LineData, '$.Email');
        DECLARE @Phone NVARCHAR(50) = JSON_VALUE(@LineData, '$.Phone');
        DECLARE @CVFileName NVARCHAR(250) = JSON_VALUE(@LineData, '$.CVFileName');
        DECLARE @CVFileContent NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.CVFileContent');
        DECLARE @CandSource NVARCHAR(50) = JSON_VALUE(@LineData, '$.Source');
        DECLARE @Government NVARCHAR(100) = JSON_VALUE(@LineData, '$.Government');
        DECLARE @City NVARCHAR(100) = JSON_VALUE(@LineData, '$.City');
        DECLARE @Address NVARCHAR(250) = JSON_VALUE(@LineData, '$.Address');

        IF @CandReqID IS NULL OR @FullName IS NULL OR @Email IS NULL OR @CandSource IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Required candidate fields are missing.';
            RETURN;
        END

        IF @CandidateID IS NULL
        BEGIN
            INSERT INTO [PLS].[Candidate] (
                [RequestID], [FullName], [Email], [Phone], [CVFileName], [CVFileContent], 
                [Source], [CandidateState], [CreatedBy], [CreatedDate],
                [Government], [City], [Address]
            )
            VALUES (
                @CandReqID, @FullName, @Email, @Phone, @CVFileName, @CVFileContent, 
                @CandSource, 0, @User, GETDATE(),
                @Government, @City, @Address
            );
            SET @Message = 'Candidate registered successfully.';
        END
        ELSE
        BEGIN
            UPDATE [PLS].[Candidate]
            SET [RequestID] = @CandReqID,
                [FullName] = @FullName,
                [Email] = @Email,
                [Phone] = @Phone,
                [CVFileName] = COALESCE(@CVFileName, [CVFileName]),
                [CVFileContent] = COALESCE(@CVFileContent, [CVFileContent]),
                [Source] = @CandSource,
                [Government] = @Government,
                [City] = @City,
                [Address] = @Address
            WHERE [CandidateID] = @CandidateID;
            SET @Message = 'Candidate details updated.';
        END
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Screen Candidate
    -- ---------------------------------------------------------------------
    IF @Operation = 'Screen Candidate'
    BEGIN
        DECLARE @ScrCandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @ScrState INT = JSON_VALUE(@LineData, '$.CandidateState'); -- 1: Shortlisted, 2: Rejected
        DECLARE @RejReason NVARCHAR(300) = JSON_VALUE(@LineData, '$.RejectionReason');

        UPDATE [PLS].[Candidate]
        SET [CandidateState] = @ScrState,
            [RejectionReason] = @RejReason
        WHERE [CandidateID] = @ScrCandID;

        SET @Message = 'Candidate screening status updated.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Interviews
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Interviews'
    BEGIN
        DECLARE @IntFilterCandID INT = NULLIF(JSON_VALUE(@LineData, '$.CandidateID'), '');
        DECLARE @IntFilterReqID INT = NULLIF(JSON_VALUE(@LineData, '$.RequestID'), '');

        SELECT 
            i.*,
            c.FullName,
            c.Email,
            c.Phone,
            c.Source,
            c.CVFileName,
            c.CVFileContent,
            c.Government,
            c.City,
            c.Address,
            r.PositionTitle
        FROM [PLS].[CandidateInterview] i
        JOIN [PLS].[Candidate] c ON i.CandidateID = c.CandidateID
        JOIN [PLS].[HiringRequest] r ON ISNULL(i.RequestID, c.RequestID) = r.RequestID
        WHERE (@IntFilterCandID IS NULL OR i.CandidateID = @IntFilterCandID)
          AND (@IntFilterReqID IS NULL OR ISNULL(i.RequestID, c.RequestID) = @IntFilterReqID)
        ORDER BY i.ScheduledDate DESC;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Interviews Log
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Interviews Log'
    BEGIN
        SELECT 
            i.InterviewID,
            i.CandidateID,
            c.FullName AS CandidateName,
            c.Email AS CandidateEmail,
            c.Phone AS CandidatePhone,
            c.Source AS CandidateSource,
            c.CVFileName,
            c.CVFileContent,
            c.Government AS CandidateGovernment,
            c.City AS CandidateCity,
            c.Address AS CandidateAddress,
            r.PositionTitle,
            r.Department,
            i.RoundNumber,
            i.InterviewerUser,
            i.ScheduledDate,
            i.InterviewState,
            i.Rating,
            i.FeedbackComments,
            i.Recommendation,
            i.DelayCancelReason
        FROM [PLS].[CandidateInterview] i
        JOIN [PLS].[Candidate] c ON i.CandidateID = c.CandidateID
        JOIN [PLS].[HiringRequest] r ON ISNULL(i.RequestID, c.RequestID) = r.RequestID
        ORDER BY i.ScheduledDate DESC;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Schedule Interview
    -- ---------------------------------------------------------------------
    IF @Operation = 'Schedule Interview'
    BEGIN
        DECLARE @SchedCandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @RoundNumber INT = JSON_VALUE(@LineData, '$.RoundNumber');
        DECLARE @Interviewer NVARCHAR(100) = JSON_VALUE(@LineData, '$.InterviewerUser');
        DECLARE @SchedDate DATETIME = JSON_VALUE(@LineData, '$.ScheduledDate');

        IF @SchedCandID IS NULL OR @RoundNumber IS NULL OR @Interviewer IS NULL OR @SchedDate IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Required interview fields are missing.';
            RETURN;
        END

        DECLARE @IntRequestID INT = (SELECT [RequestID] FROM [PLS].[Candidate] WHERE [CandidateID] = @SchedCandID);

        INSERT INTO [PLS].[CandidateInterview] ([CandidateID], [RoundNumber], [InterviewerUser], [ScheduledDate], [InterviewState], [RequestID])
        VALUES (@SchedCandID, @RoundNumber, @Interviewer, @SchedDate, 0, @IntRequestID);

        UPDATE [PLS].[Candidate] SET [CandidateState] = 3 WHERE [CandidateID] = @SchedCandID; -- Interviewing

        SET @Message = 'Interview scheduled successfully.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Submit Feedback
    -- ---------------------------------------------------------------------
    IF @Operation = 'Submit Feedback' OR @Operation = 'Submit interview feedback'
    BEGIN
        DECLARE @IntID INT = JSON_VALUE(@LineData, '$.InterviewID');
        DECLARE @Rating INT = JSON_VALUE(@LineData, '$.Rating');
        DECLARE @FeedbackComments NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.FeedbackComments');
        DECLARE @Rec INT = JSON_VALUE(@LineData, '$.Recommendation'); -- 0: Proceed, 1: Reject, 2: Hold

        IF NOT EXISTS (SELECT 1 FROM [PLS].[CandidateInterview] WHERE [InterviewID] = @IntID)
        BEGIN
            SET @State = 1;
            SET @Message = 'Interview record not found.';
            RETURN;
        END

        UPDATE [PLS].[CandidateInterview]
        SET [Rating] = @Rating,
            [FeedbackComments] = @FeedbackComments,
            [Recommendation] = @Rec,
            [InterviewState] = 1 -- Completed
        WHERE [InterviewID] = @IntID;

        DECLARE @FeedbackCandID INT = (SELECT CandidateID FROM [PLS].[CandidateInterview] WHERE [InterviewID] = @IntID);

        IF @Rec = 1 -- Reject Candidate
        BEGIN
            UPDATE [PLS].[Candidate] SET [CandidateState] = 2, [RejectionReason] = 'Failed interview round' WHERE [CandidateID] = @FeedbackCandID;
        END
        ELSE IF @Rec = 0 -- Passed round
        BEGIN
            UPDATE [PLS].[CandidateInterview] SET [InterviewState] = 2 WHERE [InterviewID] = @IntID; -- Passed
            -- Set candidate state to Selected if it's the final round or user flags Selected
            UPDATE [PLS].[Candidate] SET [CandidateState] = 4 WHERE [CandidateID] = @FeedbackCandID;
        END

        SET @Message = 'Interview feedback submitted.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Update Interview State
    -- ---------------------------------------------------------------------
    IF @Operation = 'Update Interview State'
    BEGIN
        DECLARE @UpdIntID INT = JSON_VALUE(@LineData, '$.InterviewID');
        DECLARE @NewState INT = JSON_VALUE(@LineData, '$.InterviewState'); -- 3: Delayed, 4: Canceled
        DECLARE @DelayReason NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.DelayCancelReason');

        IF NOT EXISTS (SELECT 1 FROM [PLS].[CandidateInterview] WHERE [InterviewID] = @UpdIntID)
        BEGIN
            SET @State = 1;
            SET @Message = 'Interview record not found.';
            RETURN;
        END

        IF @NewState NOT IN (3, 4)
        BEGIN
            SET @State = 1;
            SET @Message = 'Invalid interview state. Only Delayed (3) or Canceled (4) are permitted.';
            RETURN;
        END

        UPDATE [PLS].[CandidateInterview]
        SET [InterviewState] = @NewState,
            [DelayCancelReason] = @DelayReason
        WHERE [InterviewID] = @UpdIntID;

        IF @NewState = 4 -- Canceled
        BEGIN
            DECLARE @CancelCandID INT = (SELECT CandidateID FROM [PLS].[CandidateInterview] WHERE [InterviewID] = @UpdIntID);
            UPDATE [PLS].[Candidate] SET [CandidateState] = 1 WHERE [CandidateID] = @CancelCandID; -- Reset to Shortlisted
        END

        SET @Message = 'Interview status updated successfully.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Job Offers
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Job Offers'
    BEGIN
        SELECT 
            jo.*,
            c.FullName,
            c.Email,
            r.PositionTitle,
            r.SalaryMax
        FROM [PLS].[JobOffer] jo
        JOIN [PLS].[Candidate] c ON jo.CandidateID = c.CandidateID
        JOIN [PLS].[HiringRequest] r ON c.RequestID = r.RequestID;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Save Job Offer
    -- ---------------------------------------------------------------------
    IF @Operation = 'Save Job Offer'
    BEGIN
        DECLARE @OfferID INT = NULLIF(JSON_VALUE(@LineData, '$.OfferID'), '');
        DECLARE @OffCandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @Salary DECIMAL(18,2) = JSON_VALUE(@LineData, '$.ProposedSalary');
        DECLARE @StartDate DATE = JSON_VALUE(@LineData, '$.ProposedStartDate');
        DECLARE @Terms NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.OfferTerms');

        IF @OffCandID IS NULL OR @Salary IS NULL OR @StartDate IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Required offer fields are missing.';
            RETURN;
        END

        -- Set default onboarding checklist JSON
        DECLARE @Checks NVARCHAR(MAX) = '[{"item":"Submit Documents","done":false},{"item":"Create IT Access","done":false},{"item":"Office Seat Assign","done":false}]';

        IF @OfferID IS NULL
        BEGIN
            INSERT INTO [PLS].[JobOffer] ([CandidateID], [ProposedSalary], [ProposedStartDate], [OfferTerms], [OfferState], [OnboardingChecked])
            VALUES (@OffCandID, @Salary, @StartDate, @Terms, 0, @Checks);
            SET @Message = 'Job offer drafted successfully.';
        END
        ELSE
        BEGIN
            UPDATE [PLS].[JobOffer]
            SET [ProposedSalary] = @Salary,
                [ProposedStartDate] = @StartDate,
                [OfferTerms] = @Terms
            WHERE [OfferID] = @OfferID;
            SET @Message = 'Job offer details updated.';
        END
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Update Offer Status
    -- ---------------------------------------------------------------------
    IF @Operation = 'Update Offer Status'
    BEGIN
        DECLARE @UpOfferID INT = JSON_VALUE(@LineData, '$.OfferID');
        DECLARE @NewOfferState INT = JSON_VALUE(@LineData, '$.OfferState'); -- 2: Sent, 3: Accepted, 4: Declined

        UPDATE [PLS].[JobOffer]
        SET [OfferState] = @NewOfferState
        WHERE [OfferID] = @UpOfferID;

        DECLARE @UpCandID INT = (SELECT CandidateID FROM [PLS].[JobOffer] WHERE [OfferID] = @UpOfferID);

        IF @NewOfferState = 3 -- Accepted
        BEGIN
            UPDATE [PLS].[Candidate] SET [CandidateState] = 6 WHERE [CandidateID] = @UpCandID; -- Hired
            
            -- Close Request if headcount met
            DECLARE @ReqToClose INT = (SELECT RequestID FROM [PLS].[Candidate] WHERE [CandidateID] = @UpCandID);
            DECLARE @ReqHeadcount INT = (SELECT Headcount FROM [PLS].[HiringRequest] WHERE [RequestID] = @ReqToClose);
            DECLARE @HiredCount INT = (SELECT COUNT(*) FROM [PLS].[Candidate] WHERE [RequestID] = @ReqToClose AND [CandidateState] = 6);

            IF @HiredCount >= @ReqHeadcount
            BEGIN
                UPDATE [PLS].[HiringRequest] SET [RequestState] = 6 WHERE [RequestID] = @ReqToClose; -- Fulfilled
            END
        END
        ELSE IF @NewOfferState = 4 -- Declined
        BEGIN
            UPDATE [PLS].[Candidate] SET [CandidateState] = 5 WHERE [CandidateID] = @UpCandID; -- On Hold / Declined
        END

        SET @Message = 'Offer status updated.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Update Onboarding Checklist
    -- ---------------------------------------------------------------------
    IF @Operation = 'Update Onboarding Checklist'
    BEGIN
        DECLARE @ChkOfferID INT = JSON_VALUE(@LineData, '$.OfferID');
        DECLARE @ChecklistJson NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.OnboardingChecked');

        UPDATE [PLS].[JobOffer]
        SET [OnboardingChecked] = @ChecklistJson
        WHERE [OfferID] = @ChkOfferID;

        SET @Message = 'Onboarding checklist updated.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- ---------------------------------------------------------------------
    -- Operation: Get Request Approval History
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Request Approval History'
    BEGIN
        DECLARE @HistReqID INT = JSON_VALUE(@LineData, '$.RequestID');
        SELECT 
            ap.*,
            CASE ap.ApprovalState
                WHEN 0 THEN 'Pending'
                WHEN 1 THEN 'Approved'
                WHEN 2 THEN 'Rejected'
                WHEN 3 THEN 'Returned for Edits'
                ELSE 'Unknown'
            END AS StateText
        FROM [PLS].[HiringRequestApproval] ap
        WHERE ap.RequestID = @HistReqID
        ORDER BY ap.StepNumber ASC, ap.ActionDate ASC;
        RETURN;
    END
    -- ---------------------------------------------------------------------
    -- Operation: Get Departments
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Departments'
    BEGIN
        SELECT DepartmentID, DepartmentName FROM Department;
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Recruitment User Roles
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Recruitment User Roles'
    BEGIN
        SELECT * FROM [PLS].[RecruitmentUserRole]
        ORDER BY [RoleName], [Username];
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Save Recruitment User Role
    -- ---------------------------------------------------------------------
    IF @Operation = 'Save Recruitment User Role'
    BEGIN
        DECLARE @LinkID INT = NULLIF(JSON_VALUE(@LineData, '$.UserRoleID'), '');
        DECLARE @LinkUn NVARCHAR(100) = JSON_VALUE(@LineData, '$.Username');
        DECLARE @LinkRole NVARCHAR(100) = JSON_VALUE(@LineData, '$.RoleName');
        DECLARE @LinkDept NVARCHAR(100) = NULLIF(JSON_VALUE(@LineData, '$.Department'), '');

        IF @LinkUn IS NULL OR @LinkRole IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Username and RoleName are required.';
            RETURN;
        END

        IF @LinkID IS NULL
        BEGIN
            -- Check duplicates
            IF EXISTS (SELECT 1 FROM [PLS].[RecruitmentUserRole] WHERE [Username] = @LinkUn AND [RoleName] = @LinkRole AND ISNULL([Department], '') = ISNULL(@LinkDept, ''))
            BEGIN
                SET @State = 1;
                SET @Message = 'This user is already linked to this role and department.';
                RETURN;
            END

            INSERT INTO [PLS].[RecruitmentUserRole] ([Username], [RoleName], [Department], [CreatedBy], [CreatedDate])
            VALUES (@LinkUn, @LinkRole, @LinkDept, @User, GETDATE());
            SET @Message = 'User role linked successfully.';
        END
        ELSE
        BEGIN
            UPDATE [PLS].[RecruitmentUserRole]
            SET [Username] = @LinkUn,
                [RoleName] = @LinkRole,
                [Department] = @LinkDept
            WHERE [UserRoleID] = @LinkID;
            SET @Message = 'User role linkage updated successfully.';
        END
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Delete Recruitment User Role
    -- ---------------------------------------------------------------------
    IF @Operation = 'Delete Recruitment User Role'
    BEGIN
        DECLARE @DelLinkID INT = JSON_VALUE(@LineData, '$.UserRoleID');
        DELETE FROM [PLS].[RecruitmentUserRole] WHERE [UserRoleID] = @DelLinkID;
        SET @Message = 'User role linkage removed successfully.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Reassign Candidate
    -- ---------------------------------------------------------------------
    IF @Operation = 'Reassign Candidate'
    BEGIN
        DECLARE @ReassCandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @NewReqID INT = JSON_VALUE(@LineData, '$.RequestID');

        IF NOT EXISTS (SELECT 1 FROM [PLS].[Candidate] WHERE [CandidateID] = @ReassCandID)
        BEGIN
            SET @State = 1;
            SET @Message = 'Candidate not found.';
            RETURN;
        END

        IF NOT EXISTS (SELECT 1 FROM [PLS].[HiringRequest] WHERE [RequestID] = @NewReqID)
        BEGIN
            SET @State = 1;
            SET @Message = 'Hiring request not found.';
            RETURN;
        END

        DECLARE @OldReqID INT = (SELECT [RequestID] FROM [PLS].[Candidate] WHERE [CandidateID] = @ReassCandID);
        DECLARE @OldState INT = (SELECT [CandidateState] FROM [PLS].[Candidate] WHERE [CandidateID] = @ReassCandID);

        -- Reassign the candidate to the new Hiring Request, resetting their state to Shortlisted
        UPDATE [PLS].[Candidate]
        SET [RequestID] = @NewReqID,
            [CandidateState] = 1,
            [RejectionReason] = NULL
        WHERE [CandidateID] = @ReassCandID;

        -- Record assignment history
        INSERT INTO [PLS].[CandidateAssignmentHistory] ([CandidateID], [OldRequestID], [OldCandidateState], [NewRequestID], [AssignedBy], [AssignedDate])
        VALUES (@ReassCandID, @OldReqID, @OldState, @NewReqID, @User, GETDATE());

        SET @Message = 'Candidate reassigned successfully.';
        RETURN;
    END

    -- ---------------------------------------------------------------------
    -- Operation: Get Candidate Assignment History
    -- ---------------------------------------------------------------------
    IF @Operation = 'Get Candidate Assignment History'
    BEGIN
        DECLARE @HistCandID INT = JSON_VALUE(@LineData, '$.CandidateID');

        SELECT 
            h.AssignmentHistoryID,
            h.CandidateID,
            h.OldRequestID,
            r1.PositionTitle AS OldPositionTitle,
            r1.Department AS OldDepartment,
            h.OldCandidateState,
            h.NewRequestID,
            r2.PositionTitle AS NewPositionTitle,
            r2.Department AS NewDepartment,
            h.AssignedBy,
            h.AssignedDate
        FROM [PLS].[CandidateAssignmentHistory] h
        LEFT JOIN [PLS].[HiringRequest] r1 ON h.OldRequestID = r1.RequestID
        JOIN [PLS].[HiringRequest] r2 ON h.NewRequestID = r2.RequestID
        WHERE h.CandidateID = @HistCandID
        ORDER BY h.AssignedDate DESC;
        RETURN;
    END

    -- ======================================================================
    -- Operation: Get Recruitment Tests
    -- ======================================================================
    IF @Operation = 'GetRecruitmentTests'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        SELECT 
            TestID,
            TestTitle,
            TestType,
            CreatedBy,
            CreatedDate,
            (SELECT COUNT(*) FROM [PLS].[RecruitmentTestQuestions] q WHERE q.TestID = t.TestID) AS QuestionCount
        FROM [PLS].[RecruitmentTests] t
        ORDER BY TestID DESC;
        RETURN;
    END

    -- ======================================================================
    -- Operation: Save Recruitment Test
    -- ======================================================================
    IF @Operation = 'SaveRecruitmentTest'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @SaveTestID INT = JSON_VALUE(@LineData, '$.TestID');
        DECLARE @SaveTestTitle VARCHAR(255) = JSON_VALUE(@LineData, '$.TestTitle');
        DECLARE @SaveTestType VARCHAR(100) = JSON_VALUE(@LineData, '$.TestType');

        IF @SaveTestID IS NULL OR @SaveTestID = 0
        BEGIN
            INSERT INTO [PLS].[RecruitmentTests] (TestTitle, TestType, CreatedBy, CreatedDate)
            VALUES (@SaveTestTitle, @SaveTestType, @User, GETDATE());
            SET @SaveTestID = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE [PLS].[RecruitmentTests]
            SET TestTitle = @SaveTestTitle,
                TestType = @SaveTestType
            WHERE TestID = @SaveTestID;
        END

        SELECT @SaveTestID AS TestID;
        RETURN;
    END

    -- ======================================================================
    -- Operation: Get Test Questions
    -- ======================================================================
    IF @Operation = 'GetTestQuestions'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @QTestID INT = JSON_VALUE(@LineData, '$.TestID');

        SELECT 
            QuestionID,
            TestID,
            QuestionText,
            OptionA,
            OptionB,
            OptionC,
            OptionD,
            CorrectAnswer
        FROM [PLS].[RecruitmentTestQuestions]
        WHERE TestID = @QTestID
        ORDER BY QuestionID ASC;
        RETURN;
    END

    -- ======================================================================
    -- Operation: Save Test Questions (Bulk Replacement)
    -- ======================================================================
    IF @Operation = 'SaveTestQuestions'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @BulkTestID INT = JSON_VALUE(@LineData, '$.TestID');
        DECLARE @QuestionsJson NVARCHAR(MAX) = JSON_QUERY(@LineData, '$.Questions');

        -- Delete existing questions for this test to replace with the new list
        DELETE FROM [PLS].[RecruitmentTestQuestions] WHERE TestID = @BulkTestID;

        -- Insert the new list
        IF @QuestionsJson IS NOT NULL
        BEGIN
            INSERT INTO [PLS].[RecruitmentTestQuestions] (
                TestID, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer
            )
            SELECT 
                @BulkTestID,
                JSON_VALUE(value, '$.QuestionText'),
                JSON_VALUE(value, '$.OptionA'),
                JSON_VALUE(value, '$.OptionB'),
                JSON_VALUE(value, '$.OptionC'),
                JSON_VALUE(value, '$.OptionD'),
                JSON_VALUE(value, '$.CorrectAnswer')
            FROM OPENJSON(@QuestionsJson);
        END

        RETURN;
    END

    -- ======================================================================
    -- Operation: Assign Candidate Test
    -- ======================================================================
    IF @Operation = 'AssignCandidateTest'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @ACandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @ATestID INT = JSON_VALUE(@LineData, '$.TestID');

        INSERT INTO [PLS].[CandidateTestResults] (CandidateID, TestID, Status, TestDate)
        VALUES (@ACandID, @ATestID, 'Assigned', GETDATE());

        SELECT SCOPE_IDENTITY() AS ResultID;
        RETURN;
    END

    -- ======================================================================
    -- Operation: Get Candidate Assigned Tests
    -- ======================================================================
    IF @Operation = 'GetCandidateAssignedTests'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @GCandID INT = JSON_VALUE(@LineData, '$.CandidateID');

        SELECT 
            r.ResultID,
            r.CandidateID,
            r.TestID,
            t.TestTitle,
            t.TestType,
            r.Score,
            r.Status,
            r.TestDate
        FROM [PLS].[CandidateTestResults] r
        JOIN [PLS].[RecruitmentTests] t ON r.TestID = t.TestID
        WHERE r.CandidateID = @GCandID
        ORDER BY r.ResultID DESC;
        RETURN;
    END

    -- ======================================================================
    -- Operation: Save Candidate Test Result
    -- ======================================================================
    IF @Operation = 'SaveCandidateTestResult'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @SResultID INT = JSON_VALUE(@LineData, '$.ResultID');
        DECLARE @SScore DECIMAL(5,2) = CAST(JSON_VALUE(@LineData, '$.Score') AS DECIMAL(5,2));
        DECLARE @SStatus VARCHAR(50) = JSON_VALUE(@LineData, '$.Status');

        UPDATE [PLS].[CandidateTestResults]
        SET Score = @SScore,
            Status = ISNULL(@SStatus, 'Completed')
        WHERE ResultID = @SResultID;

        RETURN;
    END

    -- ======================================================================
    -- Operation: Candidate Login
    -- ======================================================================
    IF @Operation = 'CandidateLogin'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @CPhone VARCHAR(50) = JSON_VALUE(@LineData, '$.Phone');
        DECLARE @CPassword VARCHAR(50) = JSON_VALUE(@LineData, '$.AccessPassword');

        SELECT 
            c.CandidateID,
            c.RequestID,
            c.FullName,
            c.Email,
            c.Phone,
            c.Source,
            c.Government,
            c.City,
            c.Address,
            c.CVFileName,
            c.CVFileContent,
            c.AccessPassword,
            r.PositionTitle,
            r.Department
        FROM [PLS].[Candidate] c
        JOIN [PLS].[HiringRequest] r ON c.RequestID = r.RequestID
        WHERE (c.Phone = @CPhone OR REPLACE(REPLACE(c.Phone, ' ', ''), '-', '') = REPLACE(REPLACE(@CPhone, ' ', ''), '-', ''))
          AND c.AccessPassword = @CPassword;

        IF @@ROWCOUNT = 0
        BEGIN
            SET @State = 1;
            SET @Message = 'Invalid mobile number or access password.';
        END

        RETURN;
    END

    -- ======================================================================
    -- Operation: Generate Candidate Access Code
    -- ======================================================================
    IF @Operation = 'GenerateCandidateAccessCode'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @GenCandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @NewPIN VARCHAR(50) = CAST(FLOOR(100000 + RAND() * 900000) AS VARCHAR(10));

        UPDATE [PLS].[Candidate]
        SET AccessPassword = @NewPIN
        WHERE CandidateID = @GenCandID;

        SELECT @NewPIN AS AccessPassword;
        RETURN;
    END

    -- ======================================================================
    -- Operation: Update Candidate Profile
    -- ======================================================================
    IF @Operation = 'UpdateCandidateProfile'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @UpCandID INT = JSON_VALUE(@LineData, '$.CandidateID');
        DECLARE @UpFullName NVARCHAR(150) = JSON_VALUE(@LineData, '$.FullName');
        DECLARE @UpEmail NVARCHAR(150) = JSON_VALUE(@LineData, '$.Email');
        DECLARE @UpGov NVARCHAR(100) = JSON_VALUE(@LineData, '$.Government');
        DECLARE @UpCity NVARCHAR(100) = JSON_VALUE(@LineData, '$.City');
        DECLARE @UpAddr NVARCHAR(250) = JSON_VALUE(@LineData, '$.Address');
        DECLARE @UpCVName NVARCHAR(250) = JSON_VALUE(@LineData, '$.CVFileName');
        DECLARE @UpCVContent NVARCHAR(MAX) = JSON_QUERY(@LineData, '$.CVFileContent');

        IF @UpCVContent IS NULL
            SET @UpCVContent = JSON_VALUE(@LineData, '$.CVFileContent');

        UPDATE [PLS].[Candidate]
        SET FullName = ISNULL(@UpFullName, FullName),
            Email = ISNULL(@UpEmail, Email),
            Government = ISNULL(@UpGov, Government),
            City = ISNULL(@UpCity, City),
            Address = ISNULL(@UpAddr, Address),
            CVFileName = ISNULL(@UpCVName, CVFileName),
            CVFileContent = ISNULL(@UpCVContent, CVFileContent)
        WHERE CandidateID = @UpCandID;

        RETURN;
    END

    END TRY
    BEGIN CATCH
        SET @State = ERROR_NUMBER();
        SET @Message = 'SQL Exception: ' + ERROR_MESSAGE() + ' (Line: ' + CAST(ERROR_LINE() AS VARCHAR(10)) + ')';
    END CATCH
END
GO
