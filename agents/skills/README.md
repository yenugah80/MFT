# Claude Code Skills

This directory contains custom Claude Code skills for automating common tasks.

## Creating Skills

Skills are YAML/Markdown files that define reusable prompts. Place them here and they'll be available via slash commands.

Example skill file (`deploy.md`):

```markdown
---
name: deploy
description: Deploy the application to production
---

Deploy the application:
1. Run tests
2. Build the mobile app
3. Deploy backend to Render
4. Deploy worker to Cloudflare
```

## Available Skills

Add skills as needed for your workflow.
