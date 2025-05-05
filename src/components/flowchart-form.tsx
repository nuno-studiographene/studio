"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { generateFlowchart, FlowchartGeneratorInput, FlowchartGeneratorOutput } from "@/ai/flows/flowchart-generator";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MermaidChart } from "./mermaid-chart";

const formSchema = z.object({
  userFlowDescription: z.string().min(10, "Please provide a more detailed flow description."),
  apiOrServerSide: z.enum(["api", "ssr"]),
  loadersOrSkeletons: z.enum(["loaders", "skeletons", "none"]),
  apiRequestParameters: z.string().optional(),
  backendDatabaseConnection: z.string().min(5, "Please describe the database connection."),
});

type FormValues = z.infer<typeof formSchema>;

export function FlowchartForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [flowchartData, setFlowchartData] = useState<FlowchartGeneratorOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const flowchartRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userFlowDescription: "",
      apiOrServerSide: "api",
      loadersOrSkeletons: "skeletons",
      apiRequestParameters: "",
      backendDatabaseConnection: "",
    },
  });

  const watchApiOrServerSide = form.watch("apiOrServerSide");

  const totalSteps = 5; // Adjust based on the number of distinct questions/steps

  const nextStep = async () => {
    const fieldsToValidate: (keyof FormValues)[] = [];
    if (currentStep === 1) fieldsToValidate.push("userFlowDescription");
    if (currentStep === 2) fieldsToValidate.push("apiOrServerSide");
    if (currentStep === 3) fieldsToValidate.push("loadersOrSkeletons");
    if (currentStep === 4 && watchApiOrServerSide === 'api') fieldsToValidate.push("apiRequestParameters");
    if (currentStep === 5) fieldsToValidate.push("backendDatabaseConnection");

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      if (currentStep < totalSteps) {
        // Skip API parameters step if SSR is selected
        if (currentStep === 2 && form.getValues("apiOrServerSide") === "ssr") {
            setCurrentStep(currentStep + 2); // Skip to step 4 (loaders/skeletons)
        } else {
             setCurrentStep(currentStep + 1);
        }
      } else {
        onSubmit(form.getValues());
      }
    }
  };

   const prevStep = () => {
    if (currentStep > 1) {
        // If coming back from step 4 and SSR was selected, skip back to step 2
        if (currentStep === 4 && form.getValues("apiOrServerSide") === "ssr") {
            setCurrentStep(currentStep - 2);
        } else {
            setCurrentStep(currentStep - 1);
        }
    }
  };

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setFlowchartData(null); // Clear previous flowchart
    try {
      const input: FlowchartGeneratorInput = {
        ...values,
        apiRequestParameters: values.apiOrServerSide === 'api' ? values.apiRequestParameters || 'N/A' : 'N/A',
      };
      const result = await generateFlowchart(input);
      setFlowchartData(result);
      toast({
        title: "Flowchart Generated!",
        description: "Your technical flowchart is ready.",
      });
      // Scroll to the flowchart after a short delay to allow rendering
      setTimeout(() => {
        flowchartRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Error generating flowchart:", error);
      toast({
        title: "Error",
        description: "Failed to generate flowchart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="bg-card shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary">Create Your Technical Flowchart</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {currentStep === 1 && (
                <FormField
                  control={form.control}
                  name="userFlowDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-medium">Describe the User Flow</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., User lands on the product page, scrolls down, and sees related products."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a clear description of the user interaction from their perspective.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {currentStep === 2 && (
                <FormField
                  control={form.control}
                  name="apiOrServerSide"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-lg font-medium">How is data fetched?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="api" />
                            </FormControl>
                            <FormLabel className="font-normal">Via an API call from the frontend</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="ssr" />
                            </FormControl>
                            <FormLabel className="font-normal">Through Server-Side Rendering (SSR)</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {currentStep === 3 && (
                 <FormField
                  control={form.control}
                  name="loadersOrSkeletons"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-lg font-medium">What loading indicators are used?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="loaders" />
                            </FormControl>
                            <FormLabel className="font-normal">Loaders (e.g., spinners)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="skeletons" />
                            </FormControl>
                            <FormLabel className="font-normal">Skeletons (placeholder layouts)</FormLabel>
                          </FormItem>
                           <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="none" />
                            </FormControl>
                            <FormLabel className="font-normal">None</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

             {currentStep === 4 && watchApiOrServerSide === 'api' && (
                <FormField
                  control={form.control}
                  name="apiRequestParameters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-medium">API Request Parameters</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., product ID, category, user token" {...field} />
                      </FormControl>
                      <FormDescription>
                        List the key parameters sent in the API request URL or body. Leave blank if none.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {currentStep === 5 && (
                <FormField
                  control={form.control}
                  name="backendDatabaseConnection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-medium">Backend & Database Connection</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Node.js backend connects to a PostgreSQL database on AWS RDS using Prisma ORM."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Describe how the backend system retrieves data from the database, including technologies or services used.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1 || isLoading}>
                  Previous
                </Button>
                <Button type="button" onClick={nextStep} disabled={isLoading}>
                  {isLoading && currentStep === totalSteps ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : currentStep === totalSteps ? (
                    "Generate Flowchart"
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && currentStep === totalSteps && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Generating your flowchart...</p>
        </div>
      )}

      {flowchartData && flowchartData.flowchartDefinition && (
         <div ref={flowchartRef}>
            <Card className="bg-card shadow-lg rounded-lg mt-8">
                <CardHeader>
                <CardTitle className="text-xl font-semibold text-primary">Generated Flowchart</CardTitle>
                </CardHeader>
                <CardContent>
                    <MermaidChart chartDefinition={flowchartData.flowchartDefinition} />
                </CardContent>
            </Card>
         </div>
      )}
    </div>
  );
}
