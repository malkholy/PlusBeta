# Project Rules - Plus Beta

This document outlines workspace-specific rules and instructions for coding assistants working on the Plus Beta project.

## Navigation and Pages

- **Table Registration Requirement**: Every time a new page or navigation group is added or modified in the frontend (e.g., inside `src/nav.js` or page routes), you must generate a SQL script to register/insert it into the `[PLS].[PagesAndGroups]` database table.

## Database and Tables

- **New Table Creation**: Every time a new database table is created, you must create a new standalone SQL file named after the table (e.g., `TableName.sql`) inside the `SQLScript/` directory containing its DDL scripts.

## Query Master Registry

- **Query Isolation Requirement**: You must register/create a new separate query row in the `[PLS].[QueryMaster]` table if a query (even with the same Stored Procedure or Operation) is going to be used on a different page. Never share a single Query ID/Query Master registration across multiple pages, because permissions and custom row-level filter clauses are stored per User Group and per Query ID.

## Grid Drawers and Click Events

- **Drawer Double-Click Open Rule**: All details drawers (e.g., Candidates Pool detail drawer, Hiring Request detail drawer, PO detail drawer, etc.) that display individual record details must be configured to open only on a **double-click** event on the grid row, rather than a single click. Single clicks on the grid rows are reserved solely for row selection/highlighting.

