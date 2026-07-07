# Project Rules - Plus Beta

This document outlines workspace-specific rules and instructions for coding assistants working on the Plus Beta project.

## Navigation and Pages

- **Table Registration Requirement**: Every time a new page or navigation group is added or modified in the frontend (e.g., inside `src/nav.js` or page routes), you must generate a SQL script to register/insert it into the `[PLS].[PagesAndGroups]` database table.
