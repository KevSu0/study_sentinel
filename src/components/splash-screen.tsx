import {Flame} from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-center">
      <div className="flex items-center gap-4 mb-4">
        <Flame className="h-12 w-12 text-primary animate-pulse" />
        <h1 className="text-3xl font-bold text-primary tracking-tighter">
          KuKe&apos;s Motivation
        </h1>
      </div>
      <p className="text-xl text-muted-foreground italic px-4">
        &ldquo;The secret of getting ahead is getting started.&rdquo;
      </p>
    </div>
  );
}

