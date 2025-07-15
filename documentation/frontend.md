# Frontend Architecture

This document describes the frontend architecture of the application, covering the technologies used, the project structure, and the interaction between different parts of the frontend.

## Technologies Used

*   **React**: The core JavaScript library for building the user interface.
*   **Next.js**: The React framework used for server-side rendering, routing, and API routes.
*   **TypeScript**: Provides static typing for improved code reliability and maintainability.
*   **Tailwind CSS**: A utility-first CSS framework for styling.
*   **Shadcn/ui**: A collection of reusable components built with Tailwind CSS and Radix UI.
*   **Zustand**: A small, fast, and scalable bearbones state-management solution.
*   **React Query (TanStack Query)**: For fetching, caching, and updating asynchronous data.
*   **Genkit**: Used for integrating and interacting with AI models.
*   **Firebase**: Used for authentication and potentially other backend services.

## Project Structure

The project follows a standard Next.js application structure, with key directories organized as follows:

*   `src/app`: Contains the Next.js App Router structure for defining routes and pages.
    *   `src/app/[route]`: Individual pages or route segments.
    *   `src/app/api`: Next.js API routes for backend interactions.
    *   `src/app/layout.tsx`: Root layout for the application.
    *   `src/app/page.tsx`: The main index page component.
*   `src/components`: Houses reusable React components used across the application.
    *   `src/components/ui`: Contains components from the Shadcn/ui library (e.g., `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`).
    *   `src/components/[feature]`: Components specific to a particular feature (e.g., `src/components/tasks`, `src/components/dashboard`).
*   `src/hooks`: Custom React hooks for encapsulating reusable logic (e.g., state management, data fetching).
*   `src/lib`: Contains utility functions, configurations, and shared logic.
    *   `src/lib/utils.ts`: General utility functions.
    *   `src/lib/firebase.ts`: Firebase initialization and configuration.
    *   `src/lib/types.ts`: TypeScript type definitions.
    *   `src/lib/actions.ts`: Server actions for mutations.
*   `src/ai`: Contains logic related to AI integration using Genkit.
    *   `src/ai/flows`: Defines Genkit AI flows.
*   `docs`: Project documentation.
*   `public`: Static assets like images and fonts.

## Interaction Between Parts

*   **Pages (`src/app`)** are the entry points for different routes. They compose components to build the complete UI for a specific view.
*   **Components (`src/components`)** are the building blocks of the UI. They receive data via props and emit events through callbacks. They are designed to be reusable and independent.
*   **Custom Hooks (`src/hooks`)** manage complex logic or state that needs to be shared across components or pages. They abstract away implementation details and provide a clean interface.
*   **Utility Functions (`src/lib/utils.ts`)** provide helper functions for common tasks like formatting data, handling dates, or performing calculations.
*   **State Management (`src/hooks/use-global-state.tsx` using Zustand)** is used for managing global application state that needs to be accessible across different parts of the application (e.g., user authentication status, theme).
*   **Data Fetching and Caching (React Query)** is handled by custom hooks or within components/pages using React Query's hooks (`useQuery`, `useMutation`). This manages asynchronous data operations, caching, and background updates.
*   **Server Actions (`src/lib/actions.ts`)** are used for mutations that require server-side logic. The frontend calls these actions directly, and Next.js handles the communication.
*   **AI Integration (`src/ai`)** is typically accessed through API routes (`src/app/api`) or potentially server actions that interact with the Genkit flows.
*   **Styling (Tailwind CSS)** is applied directly within component JSX using utility classes.
*   **UI Components (Shadcn/ui)** are imported and used as building blocks within pages and other components, providing consistent styling and behavior.
*   **Firebase** interactions (authentication, database operations) are managed through the Firebase SDK, often encapsulated within custom hooks or utility functions in `src/lib/firebase.ts`.