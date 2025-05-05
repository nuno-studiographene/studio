"use client";

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Generate a unique ID for each Mermaid chart
let idCounter = 0;
const generateId = () => `mermaid-chart-${idCounter++}`;

interface MermaidChartProps {
  chartDefinition: string;
}

export const MermaidChart: React.FC<MermaidChartProps> = ({ chartDefinition }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartId] = useState(generateId()); // Stable ID per component instance
  const mermaidInitialized = useRef(false); // Track initialization

  useEffect(() => {
    // Initialize Mermaid only once on the client
    if (typeof window !== 'undefined' && !mermaidInitialized.current) {
        try {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'base', // Using 'base' theme for better CSS var compatibility
                 themeVariables: {
                    background: 'hsl(var(--background))',
                    primaryColor: 'hsl(var(--secondary))', // Node background
                    primaryTextColor: 'hsl(var(--secondary-foreground))', // Node text
                    lineColor: 'hsl(var(--foreground))', // Arrow lines
                    textColor: 'hsl(var(--foreground))', // General text outside nodes
                    primaryBorderColor: 'hsl(var(--border))', // Node border
                    // Ensure arrowheads match line color for consistency
                    arrowheadColor: 'hsl(var(--foreground))',
                }
            });
            mermaidInitialized.current = true;
        } catch (e) {
            console.error("Failed to initialize Mermaid", e);
            setError("Failed to initialize the flowchart renderer.");
            setIsLoading(false);
        }
    }
  }, []);

 useEffect(() => {
    if (!mermaidInitialized.current) {
        // Don't proceed if mermaid hasn't initialized
        // Set loading true until initialization effect runs
        setIsLoading(true);
        return;
    }

    if (chartDefinition && containerRef.current) {
        setIsLoading(true);
        setError(null);
        setSvgContent(null); // Clear previous content

        // Validate Mermaid definition before rendering
        try {
             // Check if parse method exists before calling
             if (typeof mermaid.parse !== 'function') {
                 throw new Error("Mermaid 'parse' function not available.");
             }
             mermaid.parse(chartDefinition); // Throws error on invalid syntax
        } catch (parseError: any) {
            console.error("Mermaid parse error:", parseError);
            setError(`Invalid flowchart syntax: ${parseError?.str || parseError?.message || 'Unknown parsing error'}`);
            setIsLoading(false);
            return; // Stop execution if parsing fails
        }


      const renderChart = async () => {
          try {
            // Check if render method exists before calling
            if (typeof mermaid.render !== 'function') {
                throw new Error("Mermaid 'render' function not available.");
            }
            const { svg } = await mermaid.render(chartId, chartDefinition);
            setSvgContent(svg);
            setError(null);
          } catch (renderError: any) {
            console.error("Mermaid render error:", renderError);
            // Attempt to provide a more specific error message if possible
            const message = renderError?.message || renderError?.str || 'Unknown rendering error';
            setError(`Error rendering flowchart: ${message}`);
            setSvgContent(null); // Clear content on error
          } finally {
            setIsLoading(false);
          }
      };

      // Use requestAnimationFrame to ensure the DOM is ready for measurement
      requestAnimationFrame(renderChart);

    } else {
         setIsLoading(false); // Not loading if no definition
         // Optionally clear content if definition becomes empty
         if (!chartDefinition) {
             setSvgContent(null);
             setError(null);
         }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartDefinition, chartId]); // Rerun when definition or ID changes


  return (
    <Card className="border-none shadow-none overflow-auto bg-transparent">
      <CardContent className="p-4 min-h-[200px]" ref={containerRef}>
        {isLoading && (
             <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-8 w-3/4 rounded-md" />
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-8 w-1/2 rounded-md" />
             </div>
        )}
        {error && <div className="text-destructive p-4 border border-destructive rounded-md bg-destructive/10">{error}</div>}
        {/* Render the SVG using dangerouslySetInnerHTML */}
        {!isLoading && svgContent && !error && (
          <div dangerouslySetInnerHTML={{ __html: svgContent }} className="mermaid-container [&>svg]:max-w-full [&>svg]:h-auto flex justify-center"/>
        )}
         {/* Fallback message if rendering fails silently or definition is empty */}
        {!isLoading && !svgContent && !error && !chartDefinition && (
            <p className="text-muted-foreground text-center py-4">Enter details above to generate a flowchart.</p>
        )}
        {/* Specific message for rendering issues after successful parsing */}
        {!isLoading && !svgContent && !error && chartDefinition && (
             <p className="text-muted-foreground text-center py-4">Could not render flowchart. Please check the definition or try again.</p>
        )}
      </CardContent>
    </Card>
  );
};
