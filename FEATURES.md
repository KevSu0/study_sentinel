# Study Sentinel Application: Feature & Architecture Overview

This document provides a comprehensive overview of the features, architecture, and implementation details of the Study Sentinel application, based on a thorough analysis of the codebase.

## 1. High-Level Summary

Study Sentinel is a sophisticated, offline-first Progressive Web App (PWA) designed to help users track, manage, and analyze their study habits. It combines task management, time tracking, and motivational elements into a unified experience. The application is built with a modern tech stack, featuring a React/Next.js frontend, TypeScript for type safety, and Tailwind CSS for styling. Data persistence is handled locally using IndexedDB with an offline-first strategy, ensuring robustness and reliability.

**Key Architectural Concepts:**
- **Component-Based UI**: Built with React and `shadcn/ui` components.
- **Centralized State Management**: A global state context (`useGlobalState`) manages all core application data and logic.
- **Offline-First Data Persistence**: Uses `Dexie.js` (IndexedDB wrapper) with an outbox pattern to handle offline data changes, ensuring no data is lost.
- **Modular Hooks**: Application logic is cleanly separated into reusable hooks for concerns like statistics calculation, layout management, and device APIs.
- **File-Based Routing**: Leverages Next.js for a clear and organized page structure.

---

## 2. Core Features

### 2.1. Task and Routine Management

Users can create, manage, and track two primary types of activities: Tasks and Routines.

- **Tasks**: Represent specific, one-off study goals.
  - **Properties**: Title, description, date, time, duration, priority, and points.
  - **Timer Types**:
    - **Countdown**: For tasks with a fixed duration.
    - **Infinity (Stopwatch)**: For tasks where the duration is not predetermined.
  - **Actions**: Tasks can be archived, unarchived, or pushed to the next day.
- **Routines**: Represent recurring activities or subjects (e.g., "Math Practice," "Reading").
  - **Properties**: Title, description, start time, end time, and priority.
  - **Functionality**: Routines are primarily used with the stopwatch timer to log time spent on a general activity.

- **Implementation**:
  - **UI**: `components/tasks/add-task-dialog.tsx` provides a unified interface for creating and editing both tasks and routines.
  - **State**: Managed within `hooks/use-global-state.tsx`.
  - **Persistence**: Handled by `lib/repositories/task.repository.ts` and `lib/repositories/routine.repository.ts`.

### 2.2. Interactive Timer

The application features a robust, interactive timer for tracking study sessions.

- **Fullscreen Timer Page**: A dedicated, distraction-free timer view (`app/timer/page.tsx`) with a large time display and an animated hourglass SVG.
- **Timer Controls**: Users can start, pause, resume, and stop the timer.
- **Motivational Elements**: Displays random motivational quotes during sessions to keep users engaged.
- **Milestone Rewards**:
  - **Stars**: Users earn stars for every 30 minutes of focused work.
  - **Notifications**: Provides periodic notifications to maintain focus.
- **Screen Wake Lock**: Utilizes the Screen Wake Lock API (`hooks/use-wake-lock.ts`) to prevent the screen from sleeping during active sessions.

- **Implementation**:
  - **UI**: `app/timer/page.tsx`, `components/hourglass.tsx`.
  - **Logic**: All timer state and logic are managed in `hooks/use-global-state.tsx`.

### 2.3. Comprehensive Statistics and Analytics

The application provides a detailed statistics page (`app/stats/page.tsx`) for users to analyze their performance.

- **Time Range Filtering**: Users can view stats for different periods: Daily, Weekly, Monthly, and Overall.
- **Key Metrics**:
  - Total study hours, points earned, and sessions completed.
  - Task completion rate and average session duration.
  - **Focus Score**: A percentage representing productive time vs. paused time.
- **Data Visualizations**:
  - **Productivity Pie Chart**: Breaks down time spent on different tasks and routines for a given day.
  - **Activity Timeline**: A visual representation of study sessions throughout the day.
  - **Bar Charts**: Show study hours over the last 7 or 30 days, or monthly for the overall view.
  - **Performance Comparison**: Compares today's stats (duration, points, start/end times) with yesterday and historical averages.
- **Study Streak**: Tracks the number of consecutive days a user has studied.

- **Implementation**:
  - **UI**: `app/stats/page.tsx` and various components in `src/components/stats/`.
  - **Logic**: All calculations are performed in the `hooks/use-stats.tsx` hook, which queries data directly from the repositories.

### 2.4. Gamification and Motivation

Gamification is a core concept, designed to encourage consistent user engagement.

- **Points System**: Users earn points for completing tasks and logging study sessions.
- **Badge System**:
  - Users can unlock a variety of predefined badges for achieving specific milestones (e.g., "Early Bird," "Night Owl," "Perfect Week").
  - The system supports custom, user-created badges.
- **Confetti and Toasts**: Positive reinforcement is provided through confetti animations (`useConfetti`) and toast notifications upon task completion and badge unlocks.
- **AI Coach**:
  - **Daily Briefing**: An AI-generated summary of the previous day's performance with a motivational message (`app/briefing/page.tsx`).
  - **Chatbot**: An interactive "AI Positive Psychologist" that provides encouragement and advice (`app/chat/page.tsx`).

- **Implementation**:
  - **Badge Logic**: `lib/badges.ts` contains the rules for unlocking system badges.
  - **State**: `hooks/use-global-state.tsx` manages earned badges and points.
  - **AI Chat**: `hooks/use-chat-history.ts` manages the chat state.

### 2.5. Customizable Dashboard

The main dashboard (`app/page.tsx`) is a customizable space where users can arrange widgets to see the information that is most important to them.

- **Drag-and-Drop Interface**: Users can reorder widgets to their liking.
- **Widget Visibility**: Users can show or hide individual widgets.
- **Available Widgets**:
  - Daily Briefing / Quote
  - Statistics Overview
  - Badges Unlocked Today
  - Today's Routines & Plan
  - Today's Activity Feed
  - Achievement Countdown
  - Daily Active Productivity
- **Persistence**: The user's layout is saved to `localStorage`.

- **Implementation**:
  - **UI**: `app/page.tsx` uses `@dnd-kit/core` for drag-and-drop functionality.
  - **State Management**: The `hooks/use-dashboard-layout.tsx` hook manages the layout's state and persistence.

---

## 3. Technical Architecture

### 3.1. Frontend

- **Framework**: Next.js 14 with the App Router.
- **Language**: TypeScript.
- **UI Library**: React.
- **Component Library**: `shadcn/ui` (a collection of reusable components built on Radix UI and Tailwind CSS).
- **Styling**: Tailwind CSS.
- **Icons**: `lucide-react`.
- **Forms**: `react-hook-form` with `zod` for schema validation.
- **Animations**: `framer-motion`.
- **Charts**: `recharts`.

### 3.2. Data Persistence (Client-Side)

The application uses an offline-first architecture, storing all data locally in the browser.

- **Database**: IndexedDB is used as the primary data store.
- **ORM/Wrapper**: `Dexie.js` provides a robust and developer-friendly API for interacting with IndexedDB.
- **Repository Pattern**: The data access layer is organized using the repository pattern (`src/lib/repositories/`). A `BaseRepository` provides generic CRUD methods, and model-specific repositories extend it.
- **Offline Support**: Write operations (`add`, `update`, `delete`) are queued in an `outbox` table when the user is offline. A `SyncEngine` is responsible for processing this queue when connectivity is restored.
- **Local Storage**: Used for non-critical state that needs to be persisted, such as UI preferences (dashboard layout, view mode) and the active timer state.

### 3.3. State Management

- **Global State**: A single React Context, provided by `GlobalStateProvider` (`hooks/use-global-state.tsx`), serves as the central hub for all application state and business logic. This avoids the need for an external state management library like Redux.
- **Local State**: Standard React `useState` and `useReducer` are used for component-level state.
- **Data Fetching**: `dexie-react-hooks` (`useLiveQuery`) is used to create reactive bindings between UI components and IndexedDB queries, ensuring the UI updates automatically when the underlying data changes.

---

## 4. File and Directory Structure

- **`src/app/`**: Contains the application's pages and routes, following the Next.js App Router convention.
- **`src/components/`**: Contains all reusable React components, organized by feature (e.g., `tasks`, `stats`, `dashboard`).
- **`src/hooks/`**: Contains all custom React hooks, which encapsulate business logic and state management.
- **`src/lib/`**: Contains core application logic, utilities, and type definitions.
  - **`src/lib/repositories/`**: The data access layer for interacting with IndexedDB.
  - **`src/lib/db.ts`**: The Dexie.js database schema definition.
  - **`src/lib/types.ts`**: Centralized TypeScript type and interface definitions.
  - **`src/lib/utils.ts`**: General utility functions.