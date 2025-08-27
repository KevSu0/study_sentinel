# Stats Page: A Comprehensive Overview

This document provides a detailed breakdown of the Stats page, covering its role within the application, its data sources, key features, and design principles.

## 1. Introduction & User Context

**Application Purpose:**  
This application serves as an AI-powered productivity and motivation coach. It's designed to help users structure their work, track their progress, and maintain focus on long-term goals. By combining task management with data analysis and personalized AI feedback, it helps users build consistent, effective habits.

**Target Audience:**  
The primary users are students, professionals, and lifelong learners who are engaged in activities that require sustained, focused effort over a long period. This includes:
- University students preparing for exams.
- Professionals studying for certifications (e.g., PMP, CFA, AWS).
- Individuals learning a new skill (e.g., coding, a new language).
- Anyone looking to overcome procrastination and build better work habits.

**Use Cases for the Stats Page:**  
The Stats page is the user's mission control for self-reflection and strategic planning. Users come to this page to:
- **Identify Patterns:** Discover their most productive times of day and days of the week.
- **Track Progress:** See tangible evidence of their effort over time, which is a powerful motivator.
- **Optimize Schedules:** Use the "Peak Productivity" insights to schedule their most challenging tasks when they are most likely to succeed.
- **Prevent Burnout:** Monitor their study hours and streaks to ensure they are maintaining a sustainable pace.
- **Review Habits:** Analyze their routine completion rates to see if their structured habits are effective.

## 2. Data Sources

The Stats page synthesizes a rich set of user data to generate its insights. The primary data inputs are:

-   **Tasks (`StudyTask[]`):** The complete list of all user-created tasks, including their status (todo, completed, archived), priority, date, and points. This is crucial for calculating task completion rates and understanding the user's planned workload.
-   **All Completed Work (`CompletedWork[]`):** A comprehensive historical log of every completed study session, whether from a timed task or a timed routine. Each entry includes the date, duration (in seconds), type (task/routine), title, and points earned. This is the **primary source** for all time-based and point-based metrics, representing the user's actual effort.
-   **All Badges (`Badge[]`):** The full list of available system and custom badges, including their conditions, names, and icons. This is used for the Badge Collection gallery.
-   **Earned Badges (`Map<string, string>`):** A map detailing which badges the user has earned and on what date. This allows the page to show which badges are unlocked.
-   **User Profile (`UserProfile`):** Contains the user's daily study goal and ideal start/end times. This data provides a baseline against which the user's actual performance can be compared.

## 3. Key Features & Components

The Stats page is composed of several dynamic components that adapt based on the selected time range.

### 3.1. Time Range Tabs

-   **Functionality:** The primary control on the page, allowing the user to switch the view between four distinct time ranges: "Today", "Last 7 Days", "Last 30 Days", and "Overall".
-   **User Benefit:** This enables both micro-level analysis ("How did I do today?") and macro-level review ("Am I being consistent this month?"). It helps users see both the daily details and the bigger picture of their long-term progress.

### 3.2. Today View (Default)

This view provides a deep dive into the currently selected day's performance.

-   **Date Navigator:** Allows the user to move backward and forward day-by-day or jump to a specific date using a calendar popover.
-   **Performance Coach:** 
    - **Functionality:** An AI-driven component that provides natural language feedback by comparing the current day's performance (study duration, points, start/end times) against yesterday's stats and the weekly average.
    - **User Benefit:** Translates raw data into actionable advice. Instead of just seeing numbers, the user gets personalized insights like "Great job starting earlier than usual!" or "You're studying longer than your weekly average."
-   **Productivity Pie Chart:** 
    - **Functionality:** A donut chart that visually breaks down the total study time for the day by individual tasks and routines. Hovering over a slice reveals the specific item and its duration.
    - **User Benefit:** Helps users immediately understand where their time was spent. They can see if one task took up most of their day or if they had a balanced distribution of effort.
-   **Daily Activity Timeline:** 
    - **Functionality:** A horizontal bar chart that maps out all productive sessions on a 24-hour timeline (from 4 AM to 4 AM). 
    - **User Benefit:** Provides a clear visual of the user's daily rhythm. They can easily spot patterns, like whether they are more productive in the morning or evening, and identify when they take breaks.

### 3.3. Weekly, Monthly, & Overall Views

These views provide an aggregated look at performance over longer periods.

-   **Stat Card Grid:** 
    - **Functionality:** A grid of cards displaying key performance indicators (KPIs) for the selected time range, such as total points, total study hours, completion rate, and current study streak.
    - **User Benefit:** Offers a quick, scannable summary of their performance. It's the "at-a-glance" dashboard for their long-term progress.
-   **Study Activity Chart:** 
    - **Functionality:** A bar chart that visualizes total study hours per day (for weekly/monthly views) or per month (for the overall view).
    - **User Benefit:** This is the primary tool for visualizing consistency. A user can easily see if they are maintaining a steady level of effort or if their study habits are sporadic.
-   **Peak Productivity Card:** 
    - **Functionality:** A bar chart that analyzes all activity within the selected time range to identify the hours of the day when the user is most productive.
    - **User Benefit:** This is one of the most powerful features. It helps users answer the question, "When am I at my best?" They can then use this insight to schedule their most difficult or important work during their peak hours, maximizing their effectiveness.
-   **Routine Analysis List:** 
    - **Functionality:** A detailed table that breaks down performance by each routine, showing total time, session count, average session length, and total points for each.
    - **User Benefit:** Helps users evaluate the effectiveness of their habits. They can see which routines they are consistently completing and which ones might need adjustment.
-   **Badge Collection:** 
    - **Functionality:** A comprehensive gallery displaying all available badges, categorized and showing their earned status.
    - **User Benefit:** Provides a gamified sense of accomplishment and a roadmap for future challenges. It encourages users to try new features or push their limits to unlock the next badge.

## 4. Design & Layout

-   **Header:** A clean header displays the page title ("Your Progress & Stats") and a descriptive subtitle.
-   **Responsive Layout:** The page uses a responsive grid system. On larger screens, charts and cards are arranged in a multi-column layout to make efficient use of space. On smaller mobile screens, components stack vertically for clear, single-column readability.
-   **Interactive Elements:** The page is highly interactive. Hovering over charts provides tooltips with detailed information, and tabs are used to switch between different data views without reloading the page.
-   **Visual Hierarchy:** `Card` components are used to group related information. Larger, more complex visualizations like the main charts are given more prominence, while smaller, key metrics are displayed in easily scannable `StatCard` components.
-   **Load States:** When data is being fetched or calculated, the page displays `Skeleton` components that mimic the layout of the final content. This provides a smooth loading experience for the user.
-   **Empty States:** If there is no data to display for a particular chart or section, a user-friendly message is shown instead of a blank space, guiding the user on how to populate the section.