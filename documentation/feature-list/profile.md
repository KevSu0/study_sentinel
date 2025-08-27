# Profile Page

The Profile page allows users to manage their personal information, goals, and notification preferences. This information is used to personalize the AI-driven features of the application.

### 10.1. Core Functionality

*   **User Information Management:** Provides a form for users to input and update their personal and motivational information.
*   **Goal Setting:** Allows users to define their daily study goals and ideal study times.
*   **Notification Preferences:** Provides options for configuring notification settings.

### 10.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Personal Information Form** | A comprehensive form for managing user details. | - **Basic Information:** Name and email.<br>- **Motivational Information:** Passion, dream, and reason for using the app.<br>- **Educational Information:** Current education level.<br>- **Goal Setting:** Daily study goal, ideal start/end times, and achievement date for countdowns. | - [`src/app/profile/page.tsx`](src/app/profile/page.tsx): `profileSchema` (line 28), `useForm` (line 54), `onSubmit` (line 65)<br>- `react-hook-form` (external library)<br>- `zod` (external library) |
| **Notifications & Sounds** | A section for managing notification preferences. | - **Reminder Interval:** Allows users to set the frequency of motivational reminders. | - [`src/app/profile/page.tsx`](src/app/profile/page.tsx): `setSoundSettings` (line 44)<br>- [`src/hooks/use-global-state.ts`](src/hooks/use-global-state.ts) |
| **Save Changes** | A button to submit and save any changes made to the profile. | - | - [`src/app/profile/page.tsx`](src/app/profile/page.tsx): `handleSubmit` (line 50) |

### 10.3. Inter-component and Feature Element References

*   `ProfilePage` uses `react-hook-form` and `zod` with `profileSchema` for form validation and submission.
*   `setSoundSettings` interacts with `use-global-state.ts` to update sound preferences.

### 10.4. Impacting and Dependent Factors

*   **`profileSchema`:** Defines the structure and validation rules for user profile data. Any changes to the data model must be reflected here.
*   **Form State:** The form's current state and validation status impact the `Save Changes` button's availability. Invalid input should prevent submission.
*   **Global State:** Notification and sound settings are likely part of a global application state (`use-global-state.ts`). Changes here should propagate throughout the app.
*   **AI Personalization:** The AI-driven features (e.g., Daily Briefing, AI Chat, Performance Coach) are directly dependent on the information provided in the user's profile. Incomplete or inaccurate profile data can lead to less effective AI interactions.

### 10.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Form Handling (`onSubmit`):** This function should handle the submission of the profile form, including validation, data transformation, and persistence to a backend or global state. It should provide clear feedback to the user (e.g., success messages, error alerts).
    *   **Example (Profile Form Submission):**
        ```typescript
        // Ideal: Profile form submission with validation and persistence
        const onSubmit = async (data: ProfileFormData) => {
            try {
                profileSchema.parse(data); // Validate data against schema
                await api.updateUserProfile(data); // Persist to backend
                globalState.dispatch({ type: 'UPDATE_PROFILE', payload: data }); // Update global state
                showToast('Profile updated successfully!'); // User feedback
            } catch (error) {
                if (error instanceof ZodError) {
                    handleValidationErrors(error.errors); // Display form validation errors
                } else {
                    handleError(error); // Handle API or other errors
                }
            }
        };
        ```
*   **Validation Schema (`profileSchema`):** A robust validation schema using `zod` ensures data integrity before saving. This should cover all fields, including data types, minimum/maximum values, and format requirements.
*   **State Update (`setSoundSettings`):** A dedicated function to update sound and notification settings within the global state, ensuring consistency across the application.
*   **Data Persistence:** Functions responsible for saving profile data should handle asynchronous operations and provide appropriate loading and error states.
*   **Input Components:** Micro-functions or reusable components for specific input types (e.g., date pickers for achievement date, time pickers for ideal study times, dropdowns for education level) would enhance the form's usability and maintainability.

### 10.6. Future Enhancements/Considerations

*   **Profile Picture Upload:** Allow users to upload and manage a profile picture.
*   **Privacy Settings:** Implement granular privacy controls for profile information.
*   **Data Export/Import:** Provide options to export or import user profile data.
*   **AI-driven Goal Suggestions:** Based on user activity, suggest realistic study goals or ideal study times.
*   **Multi-language Support:** Allow users to select their preferred language for the application.