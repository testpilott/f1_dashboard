"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DriversCompareTab from "@/components/compare/DriversCompareTab";
import TeamsCompareTab from "@/components/compare/TeamsCompareTab";

export default function ComparePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Head-to-Head</h1>
      <p className="text-muted-foreground text-sm mb-6">Driver or constructor comparison — season stats &amp; circuit history</p>

      <Tabs defaultValue="drivers">
        <TabsList className="bg-surface-2 mb-6">
          <TabsTrigger value="drivers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Drivers
          </TabsTrigger>
          <TabsTrigger value="teams" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Constructors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drivers">
          <DriversCompareTab />
        </TabsContent>

        <TabsContent value="teams">
          <TeamsCompareTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
