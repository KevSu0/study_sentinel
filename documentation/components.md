# Reusable UI Components

This document details the reusable UI components used throughout the application.

## Accordion

**Purpose:** Displays collapsible content panels. Useful for organizing information and saving space.
**Properties/States:**
*   `type`: Can be `single` (only one item open at a time) or `multiple` (multiple items can be open).
*   `collapsible`: Boolean, whether the accordion items can be closed.
*   `defaultValue`: The item (or items) that are open by default.
*   `onValueChange`: Callback function triggered when the open state changes.

## Alert Dialog

**Purpose:** A modal dialog that requires user interaction before continuing. Typically used for confirmation or important messages.
**Properties/States:**
*   `open`: Boolean, controls the visibility of the dialog.
*   `onOpenChange`: Callback function triggered when the open state changes.
*   `AlertDialogTrigger`: The element that triggers the dialog when clicked.
*   `AlertDialogContent`: The content of the dialog (title, description, actions).
*   `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`: Elements for structuring the header content.
*   `AlertDialogFooter`: Container for action buttons.
*   `AlertDialogAction`, `AlertDialogCancel`: Buttons for user interaction.

## Alert

**Purpose:** Displays a short, important message to the user. Can be used for status updates, warnings, or errors.
**Properties/States:**
*   `variant`: Defines the visual style (e.g., `default`, `destructive`).
*   `AlertTitle`: Title of the alert.
*   `AlertDescription`: Main message content.

## Avatar

**Purpose:** Displays a user's profile picture or initials.
**Properties/States:**
*   `src`: URL of the avatar image.
*   `alt`: Alternative text for the image.
*   `fallback`: Placeholder content (e.g., initials) to display if the image fails to load.

## Badge

**Purpose:** Used to highlight small pieces of information or status labels.
**Properties/States:**
*   `variant`: Defines the visual style (e.g., `default`, `secondary`, `destructive`, `outline`).

## Button

**Purpose:** Triggers an action or event. The primary interactive element.
**Properties/States:**
*   `variant`: Defines the visual style (e.g., `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`).
*   `size`: Defines the size of the button (e.g., `default`, `sm`, `lg`, `icon`).
*   `disabled`: Boolean, prevents interaction when true.
*   `onClick`: Callback function triggered when the button is clicked.

## Calendar

**Purpose:** A date picker component. Allows users to select a single date or a range of dates.
**Properties/States:**
*   `mode`: `single` or `range`.
*   `selected`: The currently selected date(s).
*   `onSelect`: Callback function triggered when a date is selected.
*   `initialFocus`: Boolean, sets focus on the calendar when it opens.
*   `disabled`: Prevents selecting certain dates (e.g., past dates).

## Card

**Purpose:** A container for grouping related content. Provides a distinct visual boundary.
**Properties/States:**
*   `CardHeader`, `CardTitle`, `CardDescription`: Elements for the card header.
*   `CardContent`: Main content area.
*   `CardFooter`: Area for actions or supplementary information at the bottom.

## Carousel

**Purpose:** Displays a series of content items (e.g., images, cards) that can be navigated horizontally.
**Properties/States:**
*   `orientation`: `horizontal` or `vertical`.
*   `opts`: Configuration options (e.g., `loop`, `align`).
*   `plugins`: Optional plugins for additional functionality (e.g., autoplay).
*   `CarouselContent`: Wrapper for carousel items.
*   `CarouselItem`: Individual item within the carousel.
*   `CarouselPrevious`, `CarouselNext`: Navigation buttons.

## Chart

**Purpose:** Visualizes data in graphical format (e.g., bar charts, pie charts, line charts). (Assumed based on usage, specific chart type components may exist internally).
**Properties/States:** Highly dependent on the specific charting library and type. Common properties include data series, labels, axes configuration, and styling options.

## Checkbox

**Purpose:** Allows users to select one or more options from a set.
**Properties/States:**
*   `checked`: Boolean or "indeterminate", indicates the current state.
*   `onCheckedChange`: Callback function triggered when the checked state changes.
*   `disabled`: Boolean, prevents interaction when true.

## Collapsible

**Purpose:** Provides a button that toggles the visibility of content. Similar to Accordion but for a single item.
**Properties/States:**
*   `open`: Boolean, controls the visibility of the content.
*   `onOpenChange`: Callback function triggered when the open state changes.
*   `CollapsibleTrigger`: The element that toggles the content.
*   `CollapsibleContent`: The content that is shown/hidden.

## Dialog

**Purpose:** A modal window that overlays the main content. Used for tasks or information that require user attention without navigating away.
**Properties/States:**
*   `open`: Boolean, controls the visibility of the dialog.
*   `onOpenChange`: Callback function triggered when the open state changes.
*   `DialogTrigger`: The element that triggers the dialog when clicked.
*   `DialogContent`: The content of the dialog (title, description, content area).
*   `DialogHeader`, `DialogTitle`, `DialogDescription`: Elements for structuring the header content.
*   `DialogFooter`: Container for action buttons.

## Dropdown Menu

**Purpose:** Displays a list of menu items or actions when a trigger element is clicked.
**Properties/States:**
*   `open`: Boolean, controls the visibility of the menu.
*   `onOpenChange`: Callback function triggered when the open state changes.
*   `DropdownMenuTrigger`: The element that opens the menu.
*   `DropdownMenuContent`: The container for menu items.
*   `DropdownMenuItem`: An individual item within the menu.
*   `DropdownMenuSeparator`: A visual separator between menu items.
*   `DropdownMenuLabel`: A non-interactive label within the menu.

## Form

**Purpose:** Provides structure and state management for input fields within a form. Often uses a form library (e.g., React Hook Form, Zod).
**Properties/States:**
*   `control`: Provided by the form library for managing form state.
*   `onSubmit`: Callback function triggered when the form is submitted.
*   `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`: Components for building individual form fields with labels, controls, and validation messages.

## Input

**Purpose:** Allows users to enter text or other data.
**Properties/States:**
*   `type`: Defines the type of input (e.g., `text`, `email`, `password`, `number`).
*   `value`: The current value of the input.
*   `onChange`: Callback function triggered when the input value changes.
*   `placeholder`: Text displayed when the input is empty.
*   `disabled`: Boolean, prevents user input when true.
*   `readOnly`: Boolean, prevents user modification but allows selection/copying.

## Label

**Purpose:** Associates a text label with an input element for accessibility.
**Properties/States:**
*   `htmlFor`: The ID of the input element the label is associated with.

## Menubar

**Purpose:** A horizontal list of menu items, typically found at the top of an application window.
**Properties/States:**
*   `MenubarMenu`: A single top-level menu item.
*   `MenubarTrigger`: The element that opens a dropdown for a menu item.
*   `MenubarContent`: The container for dropdown menu items.
*   `MenubarItem`: An individual item within the dropdown menu.
*   `MenubarSeparator`: A visual separator between menu items.
*   `MenubarLabel`: A non-interactive label within the menu.

## Popover

**Purpose:** Displays content in a small overlay near a trigger element. Useful for contextual information or actions.
**Properties/States:**
*   `open`: Boolean, controls the visibility of the popover.
*   `onOpenChange`: Callback function triggered when the open state changes.
*   `PopoverTrigger`: The element that opens the popover.
*   `PopoverContent`: The content displayed within the popover.

## Progress

**Purpose:** Displays the progress of a task or process.
**Properties/States:**
*   `value`: The current progress value (usually between 0 and 100).
*   `max`: The maximum value (defaults to 100).

## Radio Group

**Purpose:** Allows users to select a single option from a set of choices.
**Properties/States:**
*   `value`: The currently selected value.
*   `onValueChange`: Callback function triggered when the selected value changes.
*   `disabled`: Boolean, prevents selection when true.
*   `RadioGroupItem`: An individual radio button within the group.

## Scroll Area

**Purpose:** A container that provides custom scrollbars for its content.
**Properties/States:**
*   `orientation`: `vertical` or `horizontal`.

## Select

**Purpose:** A dropdown list that allows users to select a single value from a set of options.
**Properties/States:**
*   `value`: The currently selected value.
*   `onValueChange`: Callback function triggered when the selected value changes.
*   `disabled`: Boolean, prevents selection when true.
*   `SelectTrigger`: The visible part of the select component.
*   `SelectValue`: Displays the currently selected value.
*   `SelectContent`: The container for dropdown options.
*   `SelectGroup`: Groups related options within the dropdown.
*   `SelectLabel`: A label for an option group.
*   `SelectItem`: An individual option within the dropdown.
*   `SelectSeparator`: A visual separator between options.

## Separator

**Purpose:** A visual line used to divide content.
**Properties/States:**
*   `orientation`: `horizontal` or `vertical`.

## Sheet

**Purpose:** A modal panel that slides in from the edge of the screen. Useful for side menus or supplementary content.
**Properties/States:**
*   `open`: Boolean, controls the visibility of the sheet.
*   `onOpenChange`: Callback function triggered when the open state changes.
*   `SheetTrigger`: The element that opens the sheet.
*   `SheetContent`: The content of the sheet.
*   `SheetHeader`, `SheetTitle`, `SheetDescription`: Elements for structuring the header content.
*   `SheetFooter`: Container for action buttons at the bottom.
*   `side`: The edge from which the sheet slides in (e.g., `top`, `bottom`, `left`, `right`).

## Sidebar

**Purpose:** A persistent navigation or content panel positioned along the side of the screen. (Assumed based on common UI patterns).
**Properties/States:** May have properties for width, position (left/right), and responsiveness (collapsible on smaller screens).

## Skeleton

**Purpose:** A placeholder used to indicate that content is loading. Mimics the structure of the content that will eventually be displayed.
**Properties/States:** Typically only has properties for dimensions (width, height) to match the loading content.

## Slider

**Purpose:** Allows users to select a value from a range by dragging a thumb along a track.
**Properties/States:**
*   `value`: The current value(s) of the slider.
*   `onValueChange`: Callback function triggered when the value changes.
*   `min`, `max`: The minimum and maximum values of the range.
*   `step`: The increment/decrement step size.
*   `disabled`: Boolean, prevents interaction when true.

## Switch

**Purpose:** A toggle switch used to turn an option on or off.
**Properties/States:**
*   `checked`: Boolean, indicates whether the switch is on or off.
*   `onCheckedChange`: Callback function triggered when the state changes.
*   `disabled`: Boolean, prevents interaction when true.

## Table

**Purpose:** Displays data in a tabular format with rows and columns.
**Properties/States:**
*   `TableCaption`: Optional caption for the table.
*   `TableHeader`: Container for table headers.
*   `TableBody`: Container for table rows.
*   `TableFooter`: Optional footer for the table.
*   `TableRow`: Represents a single row in the table.
*   `TableHead`: A header cell within a row.
*   `TableCell`: A data cell within a row.

## Tabs

**Purpose:** Organizes content into multiple sections, with only one section visible at a time.
**Properties/States:**
*   `defaultValue`: The tab that is active by default.
*   `value`: The currently active tab value.
*   `onValueChange`: Callback function triggered when the active tab changes.
*   `TabsList`: The container for tab triggers.
*   `TabsTrigger`: A button that activates a specific tab panel.
*   `TabsContent`: The content panel associated with a tab trigger.

## Textarea

**Purpose:** Allows users to enter multi-line text.
**Properties/States:**
*   `value`: The current value of the textarea.
*   `onChange`: Callback function triggered when the value changes.
*   `placeholder`: Text displayed when the textarea is empty.
*   `disabled`: Boolean, prevents user input when true.
*   `readOnly`: Boolean, prevents user modification but allows selection/copying.

## Toast

**Purpose:** Displays brief, transient messages to the user (e.g., success notifications, errors).
**Properties/States:**
*   Managed by a toast provider. Properties include `title`, `description`, `variant` (success, error, etc.), and `duration`.

## Toaster

**Purpose:** The container component where toast messages are rendered.
**Properties/States:** Typically includes configuration for positioning and appearance of toasts.

## Tooltip

**Purpose:** Displays a small, informative popover when the user hovers over or focuses on an element.
**Properties/States:**
*   `TooltipProvider`: Wrapper to enable tooltips.
*   `Tooltip`: The tooltip component itself.
*   `TooltipTrigger`: The element that triggers the tooltip.
*   `TooltipContent`: The content displayed within the tooltip.
*   `delayDuration`: The time to wait before showing the tooltip.

## Task-Specific Components

Based on the file names in `src/components/tasks/`, the following components are likely used specifically for managing and displaying tasks:

*   **`/src/components/tasks/add-task-dialog.tsx`**: A dialog component for adding new tasks. Likely contains form fields for task details (title, description, priority, due date, etc.).
*   **`/src/components/tasks/empty-state.tsx`**: A component displayed when there are no tasks to show. Provides a visual indication and often a call to action (e.g., a button to add a task).
*   **`/src/components/tasks/global-timer-bar.tsx`**: Likely a component displayed persistently (e.g., at the top or bottom of the screen) showing the currently running task timer. Includes task name and timer controls (pause, stop).
*   **`/src/components/tasks/simple-task-item.tsx`**: A simplified representation of a task, likely used in lists where less detail is needed. May show title, status, and maybe a quick action (e.g., start timer).
*   **`/src/components/tasks/simple-task-list.tsx`**: A component that renders a list of `SimpleTaskItem` components. Used for displaying subsets of tasks.
*   **`/src/components/tasks/stop-timer-dialog.tsx`**: A dialog component displayed when the user stops a task timer. May prompt for confirmation or allow logging details about the completed task session.
*   **`/src/components/tasks/task-card.tsx`**: A more detailed representation of a task, likely used in a primary task list view. Displays more information than `SimpleTaskItem`, potentially including description, priority, due date, and actions.
*   **`/src/components/tasks/task-list.tsx`**: A component that renders a list of `TaskCard` components. The main component for displaying the user's tasks.
*   **`/src/components/tasks/timer-dialog.tsx`**: A dialog component specifically for managing a task timer. Likely displayed when a timer is started or interacted with, providing controls and showing elapsed time.

## Badge-Specific Components

Based on the file names in `src/components/badges/`, the following components are likely related to displaying and managing badges:

*   **`/src/components/badges/badge-card.tsx`**: A card component displaying information about an unlocked or locked badge. Shows badge icon, name, description, and possibly progress towards unlocking.
*   **`/src/components/badges/badge-dialog.tsx`**: A dialog that appears when a badge is earned or selected, providing more details about the badge.
*   **`/src/components/badges/badge-list-item.tsx`**: A simplified item component for displaying a badge in a list, potentially on the badge management or overview screen.
*   **`/src/components/badges/duration-input.tsx`**: A specialized input component likely used for entering time durations, possibly related to logging tasks or routines or setting goals for badges.
*   **`/src/components/badges/icon-picker.tsx`**: A component that allows users to select an icon, likely used when creating or customizing badges or tasks/routines.

## Stats-Specific Components

Based on the file names in `src/components/stats/` and `src/components/dashboard/widgets/`, the following components are likely related to displaying user statistics and progress:

*   **`/src/components/stats/priority-chart.tsx`**: A chart component visualizing task completion or time spent based on task priority.
*   **`/src/components/stats/weekly-chart.tsx`**: A chart component showing activity or progress over a weekly period.
*   **`/src/components/dashboard/widgets/completed-today-widget.tsx`**: A small dashboard widget displaying the number of tasks or routines completed on the current day.
*   **`/src/components/dashboard/widgets/daily-briefing-widget.tsx`**: A dashboard widget presenting a summary or brief for the day, possibly generated by the AI.
*   **`/src/components/dashboard/widgets/stats-overview-widget.tsx`**: A dashboard widget providing a high-level overview of key user statistics.
*   **`/src/components/dashboard/widgets/unlocked-badges-widget.tsx`**: A dashboard widget showcasing recently unlocked or featured badges.

## Dashboard Specific Components

Based on the file names in `src/components/dashboard/`, the following components are likely used specifically within the dashboard screen:

*   **`/src/components/dashboard/completed-routine-card.tsx`**: A card component displaying details about a routine that has been completed.
*   **`/src/components/dashboard/customize-dialog.tsx`**: A dialog component that allows users to customize their dashboard layout or content (e.g., which widgets to display).
*   **`/src/components/dashboard/productivity-pie-chart.tsx`**: A pie chart component visualizing productivity data, potentially based on task categories or time allocation.
*   **`/src/components/dashboard/activity/activity-item.tsx`**: An item component used within an activity feed or log on the dashboard, representing a single user action or event (e.g., task completed, badge earned).

## Other Specific Components

*   **`/src/components/bottom-nav.tsx`**: A component providing navigation links at the bottom of the screen, likely for mobile views.
*   **`/src/components/logo.tsx`**: The application's logo component.
*   **`/src/components/providers.tsx`**: A component that likely wraps the application or parts of it to provide context or state from various libraries (e.g., theme provider, state management provider, toast provider).
*   **`/src/components/splash-screen.tsx`**: The initial screen displayed while the application is loading or initializing.
*   **`/src/components/user-menu.tsx`**: A component providing a menu with options related to the logged-in user (e.g., profile settings, logout).
*   **`/src/components/providers/confetti-provider.tsx`**: A component providing confetti animations, likely used for celebrating achievements like unlocking badges or completing goals.



