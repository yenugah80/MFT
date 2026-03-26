# Architecture Documentation

System architecture and design decisions for MyFoodTracker.

## Overview

MyFoodTracker follows a monorepo structure with:
- **mobile/**: React Native Expo app
- **backend/**: Node.js Express API
- **worker/**: Cloudflare Workers for edge functions
- **shared/**: Shared code via npm workspaces

## Data Flow

1. User interacts with mobile app
2. API calls go to backend (Render.com)
3. Backend uses OpenAI for food analysis
4. Data stored in PostgreSQL (Neon)
5. Authentication handled by Clerk
