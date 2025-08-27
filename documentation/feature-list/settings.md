# Settings Page

The Settings page allows users to customize their application experience, with a focus on sound and notification preferences.

### 11.1. Core Functionality

*   **Sound Customization:** Provides options to select different sounds for various application events.
*   **Notification Configuration:** Allows users to set the frequency of reminders.

### 11.2. Features & Sub-features

| Feature | Functionality | Sub-features | Code References |
| :--- | :--- | :--- | :--- |
| **Sound & Notifications** | A card containing all sound and notification settings. | - **Alarm Sound:** Select the sound for timer completion alerts.<br>- **Timer Tick Sound:** Select the sound that plays while a timer is active.<br>- **Reminder Interval:** Set the frequency for motivational reminders during study sessions. | - [`src/app/settings/page.tsx`](src/app/settings/page.tsx): `SettingsPage` (line 24), `setSoundSettings` (line 25), `handleSoundChange` (line 29)<br>- [`src/hooks/use-global-state.ts`](src/hooks/use-global-state.ts) |

### 11.3. Inter-component and Feature Element References

*   `SettingsPage` directly interacts with `setSoundSettings` and `handleSoundChange` to update global sound preferences.
*   These functions likely interact with `use-global-state.ts` to persist and retrieve sound and notification settings.

### 11.4. Impacting and Dependent Factors

*   **Global Sound State:** The application's sound behavior (e.g., alarm sounds, timer ticks) is directly dependent on the settings configured here. Incorrect settings could lead to a poor user experience.
*   **Audio Playback:** The selected sounds require proper audio playback mechanisms in the application. This might involve browser APIs or specific audio libraries.
*   **Notification System:** The `reminderInterval` impacts the application's notification system, which might be handled by browser notifications or a service worker for PWA capabilities.

### 11.5. Ideal Nature of Functions (Micro and Sub-micro functions)

*   **Sound State Management (`setSoundSettings`):** This function should update the global state related to sound preferences, ensuring that changes are immediately reflected throughout the application (e.g., in the Timer page). It should also handle persistence of these settings (e.g., to local storage or a backend).
*   **Sound Playback (`handleSoundChange`):** This function should not only update the setting but also potentially play a preview of the selected sound to provide immediate feedback to the user. This involves a micro-function for playing audio.
    *   **Example (Handle Sound Change):**
        ```typescript
        // Ideal: Handle sound selection and play preview
        function handleSoundChange(soundType: 'alarm' | 'tick', soundFile: string) {
            setSoundSettings((prev) => ({ ...prev, [soundType]: soundFile })); // Update state
            playSound(soundFile); // Micro-function to play audio
        }

        // Sub-micro function for playing audio
        function playSound(file: string) {
            const audio = new Audio(`/sounds/${file}.mp3`); // Assuming sounds are in public/sounds
            audio.play().catch(e => console.error("Error playing sound:", e));
        }
        ```
*   **Reminder Scheduling:** A background process or service (potentially a service worker for PWAs) should read the `reminderInterval` from the global state and schedule notifications accordingly. This involves complex logic for managing timers and browser notifications.
*   **Reusable UI Components:** Dropdowns or radio groups for sound selection should be generic and reusable, accepting a list of available sounds as props.

### 11.6. Future Enhancements/Considerations

*   **Custom Sound Upload:** Allow users to upload their own custom sound files for alarms and timer ticks.
*   **Volume Control:** Implement individual volume controls for different sound types.
*   **Notification Types:** Offer more granular control over notification types (e.g., task completion, routine start, motivational reminders).
*   **Integration with System Notifications:** Leverage native system notification APIs for a more integrated experience.
*   **Sound Packs:** Provide curated sound packs for users to choose from.