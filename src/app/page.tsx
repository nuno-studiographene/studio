import { FlowchartForm } from '@/components/flowchart-form';
import { Header } from '@/components/header';

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      {/* Adjusted padding and flex for main content area */}
      <main className="flex-grow container mx-auto px-4 py-4 md:py-8 overflow-hidden">
        <FlowchartForm />
      </main>
      {/* Footer is removed or can be kept minimal if needed outside the chat area */}
      {/* <footer className="bg-muted text-muted-foreground py-2 text-center text-sm">
        Built with Firebase Studio & Genkit AI
      </footer> */}
    </div>
  );
}
