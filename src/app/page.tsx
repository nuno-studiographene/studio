import { FlowchartForm } from '@/components/flowchart-form';
import { Header } from '@/components/header';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <FlowchartForm />
      </main>
      <footer className="bg-muted text-muted-foreground py-4 text-center text-sm">
        Built with Firebase Studio & Genkit AI
      </footer>
    </div>
  );
}
