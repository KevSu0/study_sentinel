# Comprehensive Test Optimization Plan

This document outlines a plan to enhance the test coverage and quality for the application's features. The goal is to move beyond basic rendering and click tests to cover more complex user interactions, edge cases, and integration points, particularly with the AI features.

## General Principles

*   **Increase Integration Testing:** While unit tests with mocks are useful, we should increase integration testing. This means reducing mocks where possible (e.g., for custom hooks like `useGlobalState`) and testing how components work together. We can use MSW (Mock Service Worker) to mock API calls instead of mocking hooks that make those calls.
*   **Test Edge Cases:** Systematically test for edge cases, such as empty states, error states, and unexpected user input.
*   **Test Asynchronous Behavior:** Use `@testing-library/react`'s `waitFor` and `findBy*` queries to properly test asynchronous operations like data fetching, AI responses, and timers.
*   **Visual Regression Testing:** (Future consideration) For UI-heavy components like charts and dashboards, consider adding visual regression tests with a tool like Storybook or Percy.
*   **AI Feature Testing:**
    *   Mock AI responses to test how the UI handles different types of content (e.g., long text, markdown, empty responses, error responses).
    *   Verify that the correct data and context are being sent to the AI prompts.

## Feature-Specific Optimization Plans

### 1. Timer Page (`/timer`)

**Current State:** **Completed.** The test file `src/app/timer/__tests__/timer.test.tsx` now has 100% test coverage.

**Implementation Details:**

*   **Comprehensive Mocks:** The test utilizes a robust mocking strategy for all child components and hooks:
    *   **Child Components (`MotivationalQuote`, `TimerControls`, `StopTimerDialog`):** Mocked as simple functional components that assert the correct props are passed and simulate user interactions. This isolates the `TimerPage` component for focused unit testing.
    *   **`lucide-react` Icons:** All icons are mocked to prevent rendering complex SVGs, improving test performance and stability.
    *   **`useWakeLock` Hook:** The hook is mocked to spy on the `request` and `release` calls, ensuring the component correctly manages the wake lock lifecycle on mount and unmount.
    *   **`useGlobalState` and `useRouter`:** These core hooks are mocked to provide controlled state and routing behavior for all test scenarios.

*   **Complete State Coverage:** The tests cover all possible states and user flows:
    *   **Running, Paused, Muted, and Overtime states** are all tested, including assertions for correct button labels and CSS classes.
    *   **`StopTimerDialog` flow** is fully tested, including opening the dialog, confirming the stop action, and canceling.
    *   **Visual states** such as the star count display, star animation, and dynamic font size changes are all verified.
    *   **Edge cases** like the page redirecting when no active timer is present are also covered.

### 2. Dashboard Page (/)

**Current State:** Tests mock out all widgets and dialogs, only verifying that they are "rendered" as simple divs. It checks for opening dialogs but not their content or functionality. Drag-and-drop, a core feature, is not tested at all.

**Optimization Plan:**

*   **Remove Child Component Mocks:** Remove the `jest.mock` for all widget and dialog components (`DailyBriefingWidget`, `StatsOverviewWidget`, `AddItemDialog`, `CustomizeDialog`, etc.) to enable true integration testing.
*   **Test Widget Rendering with Data:**
    *   Provide realistic data through the `useGlobalState` mock to test the actual content of widgets.
    *   For `StatsOverviewWidget`, assert that `todaysPoints`, `todaysBadges`, and `completedSessions` are displayed correctly.
    *   For `TodaysPlanWidget` and `TodaysRoutinesWidget`, assert they render correctly (even if they are placeholders, we test the placeholder).
*   **Test Drag-and-Drop Reordering:**
    *   This is complex to test with `@testing-library`. A possible approach is to mock the `@dnd-kit/sortable` and `@dnd-kit/core` to a degree that we can simulate the `onDragEnd` event.
    *   Trigger `handleDragEnd` with a mock event.
    *   Assert that the `setLayout` function from `useDashboardLayout` is called with the new, reordered layout.
*   **Test `CustomizeDialog` Functionality:**
    *   Open the dialog.
    *   Simulate toggling the visibility of a widget (e.g., unchecking a checkbox).
    *   Assert that the `setLayout` function is called with the updated visibility settings.
    *   Close the dialog and assert that the widget is no longer visible on the dashboard.
*   **Test `AddItemDialog` Integration:**
    *   Open the dialog.
    *   Assert that the `UnifiedAddItemDialog` is rendered within it, ready to accept input for a new task or routine.
*   **Test Empty State Interaction:**
    *   When the empty state is shown, find the "Go to Plans" button (or similar CTA).
    *   Click the button and assert that `router.push` or `router.replace` was called with the correct path (`/plans`).
    
    ### 3. Archive Page (`/archive`)
    
    **Current State:** The tests cover rendering archived tasks, the empty state, and the `unarchiveTask` action. It correctly mocks the `useGlobalState` hook to provide archived tasks.
    
    **Optimization Plan:**
    
    *   **Test Other Task Actions:** The documentation mentions `pushTaskToNextDay` and `updateTask` as potential actions on archived tasks.
        *   Add a test case to simulate clicking the "Push to Next Day" button on an archived task and assert that `pushTaskToNextDay` is called with the correct task ID.
        *   Add a test case to simulate clicking the "Edit" button, which should open the `AddItemDialog`. Assert that the dialog opens and is pre-filled with the correct task data.
    *   **Test `TaskList` Integration:**
        *   Instead of just checking for the task title, more thoroughly test the `TaskList` component's rendering.
        *   Assert that the correct number of `TaskCard` components are rendered within the `TaskList`.
    *   **Test Loading State:**
        *   Add a test for the `isLoaded: false` state to ensure a loading indicator is displayed while tasks are being fetched.
        
        ### 4. Badges & Manage Badges Pages (`/badges`, `/badges/manage`)
        
        **Current State:** The tests cover rendering badges, switching categories, and basic actions on the manage page (delete, toggle). However, they do not test the creation or editing of badges within the `BadgeDialog`.
        
        **Optimization Plan:**
        
        *   **Test `BadgeDialog` Form Submission:**
            *   On the `ManageBadgesPage` test, after opening the "Create Custom Badge" dialog, simulate filling out the entire form.
            *   Use `fireEvent.change` for text inputs (name, description).
            *   Simulate selecting an icon from the `IconPicker`.
            *   Simulate setting a duration in the `DurationInput`.
            *   Simulate adding conditions.
            *   Click the "Save" button.
            *   Assert that the `addBadge` function from `useGlobalState` is called with the correct data, matching the `badgeSchema`.
        *   **Test `BadgeDialog` Form Validation:**
            *   Attempt to submit the form with invalid data (e.g., an empty name).
            *   Assert that validation error messages are displayed (e.g., "Name is required").
            *   Assert that `addBadge` is **not** called.
        *   **Test `BadgeDialog` in Edit Mode:**
            *   Open the dialog in edit mode.
            *   Assert that the form fields are pre-populated with the data from the badge being edited.
            *   Change a value (e.g., the description).
            *   Click "Save" and assert that `updateBadge` is called with the correct ID and the updated data.
        *   **Test Badge Card Earned Status:**
            *   On the `BadgesPage` test, find a badge that is in the `earnedBadges` set.
            *   Assert that its `BadgeCard` has a visual indicator of being earned (e.g., is not grayscale, has a checkmark).
            *   Find a badge that is *not* earned and assert that it has a visual indicator of being unearned (e.g., is grayscale).
            
            ### 5. AI Daily Briefing Page (`/briefing`)
            
            **Current State:** The tests cover loading, empty state, successful fetch, and caching logic. It correctly mocks the `getDailySummary` action.
            
            **Optimization Plan:**
            
            *   **Test `getDailySummary` Action Call:**
                *   Verify that the `getDailySummary` action is called with the correct arguments.
                *   The arguments should include the user's profile, previous day's logs, tasks, and routines from the `useGlobalState` mock. This ensures the AI is getting the right context.
            *   **Test AI Error Handling:**
                *   Create a test case where `getDailySummary` `rejects` with an error.
                *   Assert that an appropriate error message is displayed to the user on the page (e.g., "Failed to generate briefing. Please try again later.").
            *   **Test Different AI Responses:**
                *   Test how the page renders different types of AI-generated content.
                *   Simulate a response with long paragraphs and ensure it wraps correctly.
                *   Simulate a response containing Markdown (e.g., bullet points, bold text) and assert that it is rendered as proper HTML.
            *   **Test Cache Invalidation:**
                *   Set up the cache in `localStorage` for a *previous* date.
                *   Render the component.
                *   Assert that `getDailySummary` *is* called, because the cached data is stale.
                
                ### 6. Calendar Page (`/calendar`)
                
                **Current State:** The tests cover view switching and adding a new event through the dialog. However, it completely mocks out `WeekView` and `DayView`, which contain the critical drag-and-drop functionality.
                
                **Optimization Plan:**
                
                *   **Remove View Mocks:** Remove the `jest.mock` for `WeekView` and `DayView` to allow for more integrated testing.
                *   **Test Drag-and-Drop Rescheduling:**
                    *   This is a high-priority but complex test to implement. We will need a good testing setup for `@dnd-kit`.
                    *   In the `WeekView` test, simulate dragging an event from one day to another.
                    *   Assert that `updateEvent` is called with the correct event ID and the new date.
                    *   In the `DayView` test, simulate dragging an event to a new time slot.
                    *   Assert that `updateEvent` is called with the correct event ID and the new start/end times.
                *   **Test `EventDialog` in Edit Mode:**
                    *   Simulate clicking on an existing event in one of the views (this may require adding a `data-testid` to the event elements).
                    *   Assert that the `EventDialog` opens in "Edit Event" mode.
                    *   Assert that the form is pre-filled with the correct event data.
                    *   Modify the event's title, and click "Save".
                    *   Assert that `updateEvent` is called with the correct event ID and the updated title.
                *   **Test `DayView` To-Do List:**
                    *   When in the `DayView`, provide mock tasks for the selected day through the `useGlobalState` hook.
                    *   Assert that the `TodoList` component is rendered within the `DayView`.
                    *   Assert that the tasks are displayed correctly in the list.
                    
                    ### 7. AI Chat Page (`/chat`)
                    
                    **Current State:** The tests cover sending a message, clearing history, and loading/sending states. It correctly mocks the `useChatHistory` hook and the `getChatbotResponse` action.
                    
                    **Optimization Plan:**
                    
                    *   **Test `getChatbotResponse` Action Call:**
                        *   This is the most critical test. Verify that the `getChatbotResponse` action is called with the correct, rich context.
                        *   The arguments should include the user's profile, daily summary, upcoming tasks, and the current chat history. This ensures the AI has the necessary information to provide a personalized response.
                    *   **Test AI Error Handling:**
                        *   Create a test case where `getChatbotResponse` `rejects` with an error.
                        *   Assert that an error message is added to the chat history (e.g., "Sorry, I'm having trouble connecting. Please try again.").
                        *   Assert that the "sending" indicator is turned off.
                    *   **Test Streaming AI Responses:**
                        *   The documentation mentions that the ideal implementation would use streaming. While hard to test with Jest, we can simulate it.
                        *   Mock `getChatbotResponse` to return a stream-like object or resolve multiple times.
                        *   Assert that the message from the model is progressively updated in the UI as new "chunks" of the response arrive.
                    *   **Test Markdown Rendering in Chat:**
                        *   Mock an AI response that includes Markdown elements (e.g., `**bold**`, `* list item`).
                        *   Assert that these are rendered as the correct HTML tags (`<strong>`, `<li>`) in the `MessageBubble`.
                    *   **Test Empty State:**
                        *   Render the page with an empty `messages` array in `useChatHistory`.
                        *   Assert that an initial welcome message or prompt is displayed (e.g., "Ask me anything!").
                        
                        ### 8. Activity Log Page (`/logs`)
                        
                        **Current State:** The tests cover rendering a list of logs, the empty state, and the loading state.
                        
                        **Optimization Plan:**
                        
                        *   **Test Log Entry Details:**
                            *   Instead of just checking for the log type (e.g., "TASK ADD"), assert that the other details are rendered correctly.
                            *   Assert that the timestamp is formatted correctly (e.g., using `toLocaleTimeString`).
                            *   Assert that the JSON payload is rendered and properly formatted.
                        *   **Test Icon Rendering:**
                            *   The documentation mentions a `getIconForLogType` helper.
                            *   For each log entry, assert that the correct icon is displayed. This can be done by checking for a `data-testid` on the icon component.
                        *   **Test Reverse Chronological Order:**
                            *   Provide a mock `logs` array that is not in chronological order.
                            *   Assert that the logs are rendered on the page in reverse chronological order (most recent first).
                            
                            ### 9. Plans Page (`/plans`)
                            
                            **Current State:** The tests mock out all item and dialog components, so it only tests that the correct sections are rendered. It doesn't test any user actions on the plan items themselves.
                            
                            **Optimization Plan:**
                            
                            *   **Remove Item and Dialog Mocks:** Remove the `jest.mock` for `PlanItemCard`, `PlanItemListItem`, `CompletedTodayWidget`, and `AddItemDialog` to enable true integration testing.
                            *   **Test Item Actions:**
                                *   Find an "Upcoming" task.
                                *   Simulate clicking the "Complete" button and assert that the `updateTask` function (or similar) is called with the correct task ID and a status of "completed".
                                *   Find an "Overdue" task.
                                *   Simulate clicking the "Push to Today" button and assert that `pushTaskToNextDay` is called.
                            *   **Test Completed Items Actions:**
                                *   Find a completed item in the `CompletedTodayWidget`.
                                *   Simulate clicking the "Undo" button and assert that `handleUndoCompleteRoutine` (or the task equivalent) is called.
                                *   Simulate clicking the "Hard Undo" button and assert that `handleHardUndo` is called.
                            *   **Test Date Navigation:**
                                *   Simulate clicking the "Next Day" button.
                                *   Assert that the `changeDate` function is called with the correct new date.
                                *   Simulate selecting a date from the `Calendar` date picker and assert the same.
                            *   **Test View Mode Rendering:**
                                *   When `viewMode` is "card", assert that `PlanItemCard` components are rendered.
                                *   Switch the `viewMode` to "list" and assert that `PlanItemListItem` components are rendered instead.
                                
                                ### 10. Profile Page (`/profile`)
                                
                                **Current State:** The tests are already quite good. They cover form rendering, submission, validation, and loading states.
                                
                                **Optimization Plan:**
                                
                                *   **Comprehensive Field Testing:**
                                    *   Expand the existing tests to explicitly check every single field in the profile form.
                                    *   For each field (passion, dream, daily study goal, etc.), assert that it renders with the correct initial value from the mock `profile` object.
                                    *   In the submission test, simulate changing every field's value and assert that `updateProfile` is called with a complete object containing all the new values. This will make the test more resilient to future schema changes.
                                    
                                    ### 11. Settings Page (`/settings`)
                                    
                                    **Current State:** The tests are good, covering the rendering of settings, updating them, and the loading state.
                                    
                                    **Optimization Plan:**
                                    
                                    *   **Test Sound Preview:**
                                        *   The documentation mentions that `handleSoundChange` should play a preview of the selected sound.
                                        *   We can test this by mocking the `Audio` object in the global scope.
                                        *   When a sound setting is changed, assert that `new Audio()` was called with the correct sound file path.
                                        *   Assert that the `play` method on the mock audio object was called.
                                        
                                        ### 12. Stats Page (`/stats`)
                                        
                                        **Current State:** The tests mock out all stat and chart components, only verifying that the correct component *names* are rendered when switching tabs. It doesn't test any data handling or actual chart rendering.
                                        
                                        **Optimization Plan:**
                                        
                                        *   **Remove Child Component Mocks:** Remove the `jest.mock` for all child components (`StatCardGrid`, `WeeklyChart`, `PerformanceCoach`, etc.) to enable true integration testing.
                                        *   **Test `useStats` Hook Integration:**
                                            *   The `useStats` hook is the core of this page. We need to test its integration with the UI.
                                            *   Provide a rich set of mock data to `useGlobalState` (tasks, logs, completed work, etc.).
                                            *   Instead of mocking `useStats`, let the real hook run.
                                            *   Assert that the calculated stats are rendered correctly in the `StatCardGrid`. For example, check that the "Points Earned" card displays the correct sum of points from the mock data.
                                        *   **Test Chart Data Propagation:**
                                            *   Assert that the chart components receive the correct data props from the `useStats` hook. For example, check that `WeeklyChart` receives a `data` prop that matches the expected format and values based on the mock input data.
                                        *   **Test `PerformanceCoach` AI Integration:**
                                            *   Similar to the other AI features, we need to test the `PerformanceCoach`.
                                            *   Mock the AI response from the `getPerformanceCoachInsight` action (or similar).
                                            *   Assert that the `PerformanceCoach` component renders the AI-generated text.
                                            *   Test the error state when the AI call fails.
                                        *   **Test Time Range Switching:**
                                            *   When switching time range tabs, assert that the `useStats` hook is called with the correct new time range.
                                            *   Assert that the data displayed in the components (e.g., `StatCardGrid`) updates to reflect the new time range.