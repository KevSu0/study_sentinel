# Timer Optimisation Plan

This document outlines the steps to optimize the full-page timer, improve its mobile experience, and add new functionality.

---

### 1. Create a Reusable `TimerControls` Component

**Action:**  
Create a new component that encapsulates the timer controls (pause, complete, stop). This will make the code more modular and reusable.

**Location:**  
- **File Path:** `src/components/tasks/timer-controls.tsx`

**Expected Change:**  
Create a new file with the following content:

```tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, CheckCircle, XCircle } from 'lucide-react';

interface TimerControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onComplete: () => void;
  onStop: () => void;
}

export function TimerControls({ isPaused, onTogglePause, onComplete, onStop }: TimerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button size="lg" variant="outline" onClick={onTogglePause} className="w-32">
        {isPaused ? <Play className="mr-2" /> : <Pause className="mr-2" />}
        {isPaused ? 'Resume' : 'Pause'}
      </Button>
      <Button size="lg" onClick={onComplete} className="w-48 bg-green-500 hover:bg-green-600 text-white">
        <CheckCircle className="mr-2" />
        Complete
      </Button>
      <Button size="lg" variant="destructive" onClick={onStop} className="w-32">
        <XCircle className="mr-2" />
        Stop
      </Button>
    </div>
  );
}
```

---

### 2. Integrate Timer Controls into the Full-Page Timer

**Action:**  
Import and render the new `TimerControls` component within the main timer page.

**Location:**  
- **File Path:** `src/app/timer/page.tsx`

**Expected Change:**

1.  **Import the new component** at the top of the file (e.g., line 8):

    ```diff
    // Before
    import { Shrink, Volume2, VolumeX } from 'lucide-react';

    // After
    import { Shrink, Volume2, VolumeX } from 'lucide-react';
    import { TimerControls } from '@/components/tasks/timer-controls';
    ```

2.  **Add the necessary state and handlers** inside the `TimerPage` component (e.g., after line 52):

    ```diff
    // Before
    const [displayQuote, setDisplayQuote] = useState('');

    // After
    const [displayQuote, setDisplayQuote] = useState('');
    const { togglePause, completeTimer, stopTimer } = useGlobalState();
    const [isStopDialogOpen, setStopDialogOpen] = useState(false);

    const handleComplete = () => {
        completeTimer();
        router.back();
    };

    const handleStop = () => {
        if (!state.isPaused) {
            togglePause();
        }
        setStopDialogOpen(true);
    };
    
    const handleConfirmStop = (reason: string) => {
        stopTimer(reason);
        setStopDialogOpen(false);
        router.back();
    };
    ```

3.  **Render the `TimerControls` component** in the JSX (e.g., after the quote `div` on line 106):

    ```diff
    // Before
    <p className="text-lg md:text-2xl italic text-muted-foreground transition-opacity duration-500 opacity-0 animate-in fade-in-0" key={displayQuote}>
        {displayQuote}
    </p>
    </div>

    // After
    <p className="text-lg md:text-2xl italic text-muted-foreground transition-opacity duration-500 opacity-0 animate-in fade-in-0" key={displayQuote}>
        {displayQuote}
    </p>
    </div>
    <div className="absolute bottom-24 left-0 right-0 px-8 text-center">
        <TimerControls
            isPaused={state.isPaused}
            onTogglePause={togglePause}
            onComplete={handleComplete}
            onStop={handleStop}
        />
    </div>
    ```

4.  **Add the `StopTimerDialog`** to handle the stop confirmation:

    ```diff
    // Before
    import { useWakeLock } from '@/hooks/use-wake-lock';

    // After
    import { useWakeLock } from '@/hooks/use-wake-lock';
    import { StopTimerDialog } from '@/components/tasks/stop-timer-dialog';
    ```

    And at the end of the return statement, before the closing `</div>`:

    ```diff
    // Before
        </div>
      );
    }

    // After
        <StopTimerDialog
            isOpen={isStopDialogOpen}
            onOpenChange={setStopDialogOpen}
            onConfirm={handleConfirmStop}
        />
    </div>
    );
    }
    ```

---

### 3. Implement an Improved Hourglass Animation

**Action:**  
Replace the current simple `Sand` animation with a more detailed SVG-based hourglass animation.

**Location:**  
- **File Path:** `src/app/timer/page.tsx`

**Expected Change:**  
Replace the `Sand` component (lines 24-45) with the following:

```tsx
function Hourglass({ progress }: { progress: number }) {
  const sandLevel = 100 - progress;

  return (
    <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-20">
      <svg width="200" height="300" viewBox="0 0 200 300">
        {/* Glass */}
        <path d="M 30 10 C 30 40, 170 40, 170 10 L 170 0 L 30 0 Z" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 30 290 C 30 260, 170 260, 170 290 L 170 300 L 30 300 Z" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 30 10 L 90 140 C 95 150, 105 150, 110 140 L 170 10" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 30 290 L 90 160 C 95 150, 105 150, 110 160 L 170 290" fill="none" stroke="currentColor" strokeWidth="4" />

        {/* Top Sand */}
        <path 
          d={`M 40 20 L 160 20 L 100 140 Z`} 
          fill="currentColor"
          style={{
            clipPath: `inset(${100 - sandLevel}% 0 0 0)`,
            transition: 'clip-path 1s linear'
          }}
        />

        {/* Bottom Sand */}
        <path 
          d={`M 40 280 L 160 280 L 100 160 Z`} 
          fill="currentColor"
          style={{
            clipPath: `inset(0 0 ${sandLevel}% 0)`,
            transition: 'clip-path 1s linear'
          }}
        />

        {/* Falling Stream */}
        {progress < 100 && (
          <rect x="99" y="145" width="2" height="10" fill="currentColor">
            <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
          </rect>
        )}
      </svg>
    </div>
  );
}
```

And update the call in the `TimerPage` component (line 78):

```diff
// Before
<Sand progress={progress} />

// After
<Hourglass progress={progress} />
```

---

### 4. Optimize for Mobile Devices

**Action:**  
Adjust the layout and font sizes to be more responsive on smaller screens.

**Location:**  
- **File Path:** `src/app/timer/page.tsx`

**Expected Change:**

1.  **Adjust the main heading font size** (line 92):

    ```diff
    // Before
    <h1 className="text-2xl text-muted-foreground font-medium">{activeItem.item.title}</h1>

    // After
    <h1 className="text-xl sm:text-2xl text-muted-foreground font-medium px-4">{activeItem.item.title}</h1>
    ```

2.  **Make the timer display responsive** (line 96):

    ```diff
    // Before
    timeDisplay.length > 5 ? 'text-8xl' : 'text-9xl'

    // After
    timeDisplay.length > 5 ? 'text-7xl sm:text-8xl' : 'text-8xl sm:text-9xl'
    ```

3.  **Adjust the quote font size** (line 103):

    ```diff
    // Before
    <p className="text-lg md:text-2xl italic text-muted-foreground transition-opacity duration-500 opacity-0 animate-in fade-in-0" key={displayQuote}>

    // After
    <p className="text-base sm:text-lg md:text-2xl italic text-muted-foreground transition-opacity duration-500 opacity-0 animate-in fade-in-0" key={displayQuote}>