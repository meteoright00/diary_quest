# GEMINI.md - Project Context for AI Assistants

This document provides a comprehensive overview of the `diary_quest` project for AI assistants to ensure they have the necessary context to understand and contribute effectively.


## 0. Critical Priority (最優先事項)

*   **成果物は日本語で記載**: All artifacts (implementation plans, task lists, walkthroughs), documentation, and communication must be in **Japanese**.

## 1. Project Overview

`diary_quest` is an RPG-style journaling application designed to make the habit of writing a diary fun and sustainable. It transforms users' daily journal entries into adventure logs set in a fantasy world, incorporating gamification elements.

The project is currently in **Phase 1: Desktop App Development**.

### Key Features (MVP)

*   **AI-Powered Diary Conversion:** Converts plain text diaries into narrative-rich adventure logs using LLMs.
*   **Real-Life Quest System:** Users can manage real-world goals as in-game quests.
*   **Emotion & Mental Health Analysis:** AI analyzes diary entries to provide emotional feedback and encouragement.
*   **Random Events:** Surprise events occur during diary writing to enhance the gaming experience.
*   **Story Mode:** Automatically compiles diaries from a certain period into a cohesive story.
*   **Growth Reports:** Generates monthly and annual reports on the user's progress and emotional trends.

### Architecture

The project is a **TypeScript monorepo** managed with **pnpm workspaces** and **Turborepo**. It follows a clean, layered architecture:

*   **`apps/`**: Contains the user-facing applications. The initial focus is `apps/desktop`.
    *   `apps/desktop`: A **Tauri**-based desktop application built with **React**, **Vite**, and **Zustand** for state management.
*   **`packages/`**: Contains shared logic and modules.
    *   `packages/core`: The domain layer, containing all platform-agnostic business logic (diary conversion, character management, quest logic, LLM provider abstraction).
    *   `packages/database`: The infrastructure layer, abstracting database access using a repository pattern. It uses **SQLite** for the desktop app.
    *   `packages/shared`: Contains common utilities, types, and error-handling logic used across the monorepo.

### Technology Stack

*   **Monorepo/Build:** pnpm, Turborepo
*   **Language:** TypeScript
*   **Framework (Desktop):** Tauri, React (with Vite)
*   **UI:** Tailwind CSS, shadcn/ui
*   **State Management:** Zustand
*   **Database:** SQLite (via `better-sqlite3`)
*   **LLM Integration:** A flexible manager (`packages/core/src/llm/manager.ts`) to support multiple providers (OpenAI, Claude, Gemini).
*   **Testing:** Vitest
*   **Code Quality:** ESLint and Prettier

## 2. Building and Running

The following commands are essential for development. They should be run from the project root.

*   **Install Dependencies:**
    ```bash
    pnpm install
    ```

*   **Build All Packages:**
    ```bash
    pnpm build
    ```

*   **Run in Development Mode:** (Starts the Tauri app with hot-reloading)
    ```bash
    pnpm dev
    ```

*   **Run Tests:**
    ```bash
    pnpm test
    ```

*   **Lint and Format:**
    ```bash
    # Run the linter
    pnpm lint

    # Fix formatting issues
    pnpm format
    ```

## 3. Development Conventions

*   **Monorepo Structure:** All new reusable logic should be placed in the appropriate module within the `packages/` directory. Application-specific code resides in `apps/`.
*   **Layered Architecture:** Strictly adhere to the separation of concerns. UI components should not contain business logic. The `core` package should remain UI-agnostic.
*   **Data Flow:** UI actions trigger services in the application layer, which orchestrate calls to the `core` business logic. The `core` logic then uses repositories from the `database` package to persist data.
*   **State Management:** Use Zustand for managing global UI state. Keep stores modular and focused on specific domains (e.g., `diaryStore`, `characterStore`).
*   **API Keys:** Sensitive information like LLM API keys should be handled securely, for example, using Tauri's encrypted store, and not be hardcoded.
*   **Documentation:** The project maintains extensive design and requirements documents in the root directory (e.g., `要件定義書.md`, `設計書_*.md`). Refer to these for in-depth specifications.
*   **Error Handling:** Use the custom error classes defined in `packages/shared/src/errors` for consistent error management.

## 4. Git Conventions

*   **Commit Messages:** Strict adherence to **Conventional Commits** (`feat:`, `fix:`, `docs:`, etc.) is required.
    *   Example: `feat: add new diary conversion logic`
*   **Branching:** Follow the simplified flow (`feature/xxx` -> `main`). Do not commit directly to `main` for complex tasks.

