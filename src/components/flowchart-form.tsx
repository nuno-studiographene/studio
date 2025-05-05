"use client";

import { ConversationInput, ConversationOutput, converseAndGenerateFlowchart, Message } from "@/ai/flows/conversational-flowchart-flow";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MermaidChart } from "./mermaid-chart";

export function FlowchartForm() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [flowchartDefinition, setFlowchartDefinition] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();
  const flowchartRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Add initial assistant message
  useEffect(() => {
    setConversation([{ role: 'assistant', content: "Hello! Describe the user flow you'd like me to turn into a technical flowchart." }]);
  }, []);


  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }, 0); // Delay slightly to ensure DOM updates
  }, []);


  useEffect(() => {
    scrollToBottom();
  }, [conversation, scrollToBottom]);

  useEffect(() => {
    if (flowchartDefinition) {
      setTimeout(() => {
        flowchartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [flowchartDefinition]);

  const handleSendMessage = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput || isLoading || isComplete) return;

    const newUserMessage: Message = { role: "user", content: trimmedInput };
    setConversation((prev) => [...prev, newUserMessage]);
    setUserInput("");
    setIsLoading(true);

    try {
      const input: ConversationInput = { messages: [...conversation, newUserMessage] };
      const result: ConversationOutput = await converseAndGenerateFlowchart(input);

      if (result.type === 'question') {
        const assistantMessage: Message = { role: "assistant", content: result.content };
        setConversation((prev) => [...prev, assistantMessage]);
      } else if (result.type === 'flowchart') {
        const assistantMessage: Message = { role: "assistant", content: "Great! I have enough information. Here is the generated flowchart:" };
        setConversation((prev) => [...prev, assistantMessage]);
        setFlowchartDefinition(result.content);
        setIsComplete(true); // Mark conversation as complete
        toast({
          title: "Flowchart Generated!",
          description: "Your technical flowchart is ready below.",
        });
      } else if (result.type === 'error') {
        const errorMessage: Message = { role: "assistant", content: `Sorry, I encountered an error: ${result.content}` };
        setConversation((prev) => [...prev, errorMessage]);
        toast({
          title: "Error",
          description: result.content || "An unexpected error occurred.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Error in conversation:", error);
      const errorMessage: Message = { role: "assistant", content: "Sorry, I ran into a problem processing that. Could you try rephrasing?" };
      setConversation((prev) => [...prev, errorMessage]);
      toast({
        title: "Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-8 flex flex-col h-[calc(100vh-200px)]">
      <Card className="flex-grow flex flex-col bg-card shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
            <Bot /> Chat with FlowGenius AI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow p-0 overflow-hidden">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
              {conversation.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback><Bot size={16} /></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg p-3 text-sm shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {/* Basic markdown link support - replace [text](url) with <a> tag */}
                    {message.content.split(/(\[.*?\]\(.*?\))/g).map((part, i) => {
                      const match = part.match(/\[(.*?)\]\((.*?)\)/);
                      if (match) {
                        return <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">{match[1]}</a>;
                      }
                      // Simple code block/inline code detection
                      if (part.startsWith('`') && part.endsWith('`')) {
                        return <code key={i} className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">{part.slice(1, -1)}</code>;
                      }
                      return part;
                    })}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback><User size={16} /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3 justify-start">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback><Bot size={16} /></AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3 text-sm shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>

          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={isComplete ? "Flowchart generated. Start a new chat if needed." : "Type your message here..."}
              className="flex-1 resize-none min-h-[40px] max-h-[150px]"
              rows={1}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isComplete}
              aria-label="Chat input"
            />
            <Button type="submit" size="icon" disabled={isLoading || !userInput.trim() || isComplete}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardFooter>
      </Card>

      {flowchartDefinition && (
        <div ref={flowchartRef} className="pb-8">
          <Card className="bg-card shadow-lg rounded-lg mt-8 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-primary">Generated Flowchart</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[70vh]">
              <MermaidChart
                chartDefinition={flowchartDefinition}
                title="Generated Technical Flowchart"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
