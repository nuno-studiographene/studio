"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown } from "lucide-react";
import mermaid, { type MermaidConfig } from 'mermaid';
import React, { useEffect, useRef, useState } from 'react';

// Dynamic imports for PDF export libraries (only loaded when used)

// Generate a unique ID for each Mermaid chart
let idCounter = 0;
const generateId = () => `mermaid-chart-${idCounter++}`;

// Add a function to sanitize and validate Mermaid chart definition
const sanitizeMermaidDefinition = (definition: string): string => {
  if (!definition) return '';

  let sanitized = definition.trim();

  // Remove any markdown code fence if present
  sanitized = sanitized.replace(/^```(?:mermaid)?\s*/i, '');
  sanitized = sanitized.replace(/\s*```$/i, '');

  // Ensure flowchart definition starts correctly
  if (!sanitized.toLowerCase().startsWith('flowchart') && !sanitized.toLowerCase().startsWith('graph')) {
    sanitized = 'flowchart TD\n' + sanitized;
  }

  // Replace any problematic characters that might break the parser
  // Fix any instance of special quote characters or HTML entities
  sanitized = sanitized.replace(/[ﬂ°¶]/g, ''); // Remove specific special characters that cause issues
  sanitized = sanitized.replace(/&quot;/g, '\\"');
  sanitized = sanitized.replace(/#quot;/g, '\\"');

  return sanitized;
};

// Add a function to export the chart to PDF
const exportToPdf = async (chartId: string, chartTitle = "Flowchart"): Promise<void> => {
  try {
    // Dynamically import jsPDF and html2canvas only when needed
    const jsPDF = (await import('jspdf')).default;
    const html2canvas = (await import('html2canvas')).default;

    // Find the SVG element
    const element = document.getElementById(chartId)?.parentElement;
    if (!element) {
      console.error("Chart element not found");
      return;
    }

    // Use html2canvas to capture the SVG
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Calculate dimensions - maintain aspect ratio
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Add the chart title
    pdf.setFontSize(16);
    pdf.text(chartTitle, 105, 15, { align: 'center' });

    // Add canvas image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 25, imgWidth, imgHeight);

    // Save the PDF
    pdf.save(`${chartTitle.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    alert("Failed to export as PDF. Please try again.");
  }
};

interface MermaidChartProps {
  chartDefinition: string;
  title?: string;
}

// Helper function to get computed style HSL values
const getResolvedColor = (variableName: string): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName)?.trim();
  // Basic check if it looks like HSL (more robust validation could be added)
  if (value && value.startsWith('hsl')) {
    return value;
  }
  // Attempt to convert hex/rgb if needed, or return default. For now, expect HSL.
  console.warn(`Could not resolve CSS variable ${variableName} to HSL format. Received: ${value}`);
  // Return a default/fallback color or undefined
  if (variableName.includes('background')) return 'hsl(0 0% 98%)'; // light background
  if (variableName.includes('foreground')) return 'hsl(0 0% 3.9%)'; // dark text
  if (variableName.includes('secondary')) return 'hsl(0 0% 94%)'; // light grey
  if (variableName.includes('border')) return 'hsl(0 0% 89.8%)'; // default border
  return undefined;
};

export const MermaidChart: React.FC<MermaidChartProps> = ({
  chartDefinition,
  title = "Technical Flowchart"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartId] = useState(generateId()); // Stable ID per component instance
  const mermaidInitialized = useRef(false); // Track initialization
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Initialize Mermaid only once on the client, after styles are computed
    if (typeof window !== 'undefined' && !mermaidInitialized.current) {
      try {
        const themeVariables: MermaidConfig['themeVariables'] = {
          // Resolve CSS variables to actual HSL values
          background: getResolvedColor('--background') || 'hsl(0 0% 98%)', // Provide fallback
          primaryColor: getResolvedColor('--secondary') || 'hsl(0 0% 94%)', // Node background
          primaryTextColor: getResolvedColor('--secondary-foreground') || 'hsl(0 0% 9%)', // Node text
          lineColor: getResolvedColor('--foreground') || 'hsl(0 0% 3.9%)', // Arrow lines
          textColor: getResolvedColor('--foreground') || 'hsl(0 0% 3.9%)', // General text outside nodes
          primaryBorderColor: getResolvedColor('--border') || 'hsl(0 0% 89.8%)', // Node border
          arrowheadColor: getResolvedColor('--foreground') || 'hsl(0 0% 3.9%)', // Ensure arrowheads match line color
          // Add other variables as needed, resolving them similarly
        };

        // Log resolved variables for debugging
        // console.log("Resolved Mermaid Theme Variables:", themeVariables);

        const config: MermaidConfig = {
          startOnLoad: false,
          theme: 'base', // Use 'base' which works well with themeVariables
          themeVariables: themeVariables
        };

        mermaid.initialize(config);
        mermaidInitialized.current = true;
      } catch (e) {
        console.error("Failed to initialize Mermaid", e);
        setError(`Failed to initialize the flowchart renderer: ${e instanceof Error ? e.message : String(e)}`);
        setIsLoading(false);
      }
    }
  }, []); // Empty dependency array ensures this runs once on mount


  useEffect(() => {
    if (!mermaidInitialized.current) {
      // Set loading true until initialization effect runs
      setIsLoading(true);
      // Poll for initialization if needed, or rely on state update triggering re-render
      const checkInit = setInterval(() => {
        if (mermaidInitialized.current) {
          clearInterval(checkInit);
          // Trigger re-render or directly call rendering logic if needed
          // For now, relying on the state change from the init effect
        }
      }, 100);
      return () => clearInterval(checkInit);
      // return; // Don't proceed if mermaid hasn't initialized
    }

    if (chartDefinition && containerRef.current) {
      setIsLoading(true);
      setError(null);
      setSvgContent(null); // Clear previous content

      // Sanitize and validate the chart definition
      const sanitizedDefinition = sanitizeMermaidDefinition(chartDefinition);

      // Validate Mermaid definition before rendering
      try {
        // Check if parse method exists before calling
        if (typeof mermaid.parse !== 'function') {
          throw new Error("Mermaid 'parse' function not available.");
        }
        // Use a dummy element for parsing check if needed, or rely on render's error handling
        // await mermaid.parse(chartDefinition); // Throws error on invalid syntax
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
          // Added basic validation check within render try-catch
          const { svg, bindFunctions } = await mermaid.render(chartId, sanitizedDefinition);
          setSvgContent(svg);
          if (bindFunctions) {
            // Ensure containerRef.current exists before calling bindFunctions
            if (containerRef.current) {
              bindFunctions(containerRef.current);
            } else {
              console.warn("Mermaid container ref not available for binding functions.");
            }
          }
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
  }, [chartDefinition, chartId, mermaidInitialized.current]); // Rerun when definition, ID, or initialization status changes

  const handleExportToPdf = async () => {
    setIsExporting(true);
    try {
      await exportToPdf(chartId, title);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="border-none shadow-none overflow-auto bg-transparent max-h-[600px]">
      {!isLoading && svgContent && !error && (
        <div className="flex justify-end px-4 pt-4 pb-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToPdf}
            disabled={isExporting}
            className="flex items-center gap-1"
          >
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Export as PDF
              </>
            )}
          </Button>
        </div>
      )}
      <CardContent className="p-4 min-h-[200px] overflow-auto" ref={containerRef}>
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
          // Added key prop to force re-render when svgContent changes, which might help with updates
          <div key={svgContent} dangerouslySetInnerHTML={{ __html: svgContent }} className="mermaid-container [&>svg]:max-w-full [&>svg]:h-auto flex justify-center overflow-auto" />
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
