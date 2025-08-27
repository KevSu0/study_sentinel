# Gamification and Motivation

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