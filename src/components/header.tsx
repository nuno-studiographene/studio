import { Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center gap-2">
        <Activity className="h-8 w-8" />
        <h1 className="text-2xl font-bold">FlowGenius</h1>
      </div>
    </header>
  );
}
