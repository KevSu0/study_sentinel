# Badges Page

The Badges page is designed to gamify the user experience by rewarding them with badges for achieving specific milestones and goals.

### 3.1. Core Functionality

*   **View Badges:** Displays all available badges, categorized and showing their earned status.
*   **Manage Badges:** Provides a separate interface for creating, editing, and managing custom badges.

### 3.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Header** | Displays the page title and a link to the badge management page. | - | - [`src/app/badges/page.tsx`](src/app/badges/page.tsx): `BadgesPage` (line 19) |
| **Badge Categories** | Organizes badges into categories (e.g., daily, weekly, monthly, overall) for easy navigation. | - **Tabbed Navigation:** Allows users to switch between badge categories. | - [`src/app/badges/page.tsx`](src/app/badges/page.tsx): `badgeCategories` (line 12), `Tabs` (line 59) |
| **Badge Grid** | Displays all badges within the selected category. | - **Badge Card:** Shows individual badge details including icon, name, description, and earned status. | - [`src/app/badges/page.tsx`](src/app/badges/page.tsx): `categorizedBadges` (line 29)<br>- [`src/components/badges/badge-card.tsx`](src/components/badges/badge-card.tsx): `BadgeCard` (line 14) |

### 3.3. Manage Badges Page

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Header** | Displays the page title and primary action buttons. | - **View Earned Badges Button:** Navigates back to the main badges page.<br>- **Create Custom Badge Button:** Opens a dialog to create a new badge. | - [`src/app/badges/manage/page.tsx`](src/app/badges/manage/page.tsx): `ManageBadgesPage` (line 20), `openAddDialog` (line 27) |
| **Badge List** | Displays a list of all badges, both system-defined and custom. | - **Edit Badge:** Opens a dialog to modify a badge's properties.<br>- **Delete Badge:** Allows for the deletion of custom badges.<br>- **Toggle Badge:** Enables or disables a badge. | - [`src/app/badges/manage/page.tsx`](src/app/badges/manage/page.tsx): `sortedBadges` (line 37), `openEditDialog` (line 32), `deleteBadge` (line 21), `updateBadge` (line 21)<br>- [`src/components/badges/badge-list-item.tsx`](src/components/badges/badge-list-item.tsx): `BadgeListItem` (line 33) |
| **Badge Dialog** | A comprehensive dialog for creating and editing badges. | - **Name, Description, Icon, and Color:** Basic badge properties.<br>- **Conditions:** Defines the criteria for earning a badge (e.g., tasks completed, study time). | - [`src/components/badges/badge-dialog.tsx`](src/components/badges/badge-dialog.tsx): `BadgeDialog` (line 93), `badgeSchema` (line 52), `conditionSchema` (line 33), `useForm` (line 112), `onSubmit` (line 166)<br>- [`src/components/badges/duration-input.tsx`](src/components/badges/duration-input.tsx)<br>- [`src/components/badges/icon-picker.tsx`](src/components/badges/icon-picker.tsx) |

### 3.4. Inter-component and Feature Element References

*   `BadgesPage` uses `Tabs` for navigation and `BadgeCard` for displaying individual badges.
*   `ManageBadgesPage` uses `BadgeListItem` to display badges and triggers `BadgeDialog` for add/edit operations.
*   `BadgeDialog` integrates `DurationInput` and `IconPicker` for specific input types.
*   The `badgeSchema` and `conditionSchema` define the data structure for badges, impacting how `BadgeDialog` handles form validation and submission.

### 3.5. Impacting and Dependent Factors

*   **Badge Data:** The display of badges is dependent on the available badge data (system-defined and custom).
*   **Categorization Logic:** The `badgeCategories` and `categorizedBadges` logic dictates how badges are grouped and displayed.
*   **Form Validation:** `badgeSchema` and `conditionSchema` are critical for ensuring valid badge data during creation and editing.
*   **State Management:** `deleteBadge` and `updateBadge` functions rely on a robust state management system to persist changes.

### 3.6. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Schema-driven Forms:** The use of `zod` and `react-hook-form` with `badgeSchema` and `conditionSchema` is an excellent pattern for robust form handling, ensuring data integrity.
    *   **Example (Badge Dialog Submission):**
        ```typescript
        // Ideal: Form submission with schema validation
        const onSubmit = async (data: BadgeFormData) => {
            try {
                if (data.id) {
                    await updateBadge(data.id, data); // Update existing badge
                } else {
                    await createBadge(data); // Create new badge
                }
                closeDialog(); // Close dialog on success
            } catch (error) {
                handleFormError(error); // Handle form-specific errors
            }
        };
        ```
*   **CRUD Operations:** Functions like `createBadge`, `updateBadge`, `deleteBadge`, and `toggleBadge` should encapsulate the logic for interacting with the badge data store, ensuring consistency and error handling. These should ideally be part of a dedicated badge service or global state management.
*   **UI State Management:** Functions like `openAddDialog` and `openEditDialog` should manage the visibility and state of the `BadgeDialog`.
*   **Helper Functions:** Micro-functions for icon selection (`IconPicker`), duration input (`DurationInput`), and data transformation (e.g., for `categorizedBadges`) promote reusability and maintainability.

### 3.7. Future Enhancements/Considerations

*   **Progress Tracking:** Display progress towards earning unearned badges (e.g., "3/5 tasks completed for 'Task Master' badge").
*   **Badge Notifications:** Implement in-app notifications when a new badge is earned.
*   **Badge Sharing:** Allow users to share their earned badges on social media.
*   **More Complex Conditions:** Support for more intricate badge conditions (e.g., "complete 3 tasks of high priority within a week").