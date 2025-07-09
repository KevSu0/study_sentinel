import {Flame} from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Flame className="h-8 w-8 text-primary" />
      <h1 className="text-xl font-bold text-primary tracking-tighter">
        KuKe's Motivation
      </h1>
    </div>
  );
}
