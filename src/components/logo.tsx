import {BrainCircuit} from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <BrainCircuit className="h-8 w-8 text-primary" />
      <h1 className="text-xl font-bold text-primary tracking-tighter">
        Study Sentinel
      </h1>
    </div>
  );
}
