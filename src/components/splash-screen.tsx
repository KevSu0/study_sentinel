import { Flame } from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-center">
      <div className="flex items-center gap-4 mb-4">
        <Flame className="h-12 w-12 text-primary animate-pulse" />
        <h1 className="text-3xl font-bold text-primary tracking-tighter">
          KuKe's Motivation
        </h1>
      </div>
      <p className="text-xl text-muted-foreground italic px-4">
        "Study for your passion, This is your only purpose"
      </p>
    </div>
  );
}
