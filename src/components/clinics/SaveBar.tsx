"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { XCircle } from "lucide-react";

interface SaveBarProps {
  missingFields: string[];
  onSave: () => void;
  onReset?: () => void;
  saving?: boolean;
}

export default function SaveBar({ missingFields, onSave, onReset, saving }: SaveBarProps) {
  const canSave = missingFields.length === 0 && !saving;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <Card className="mx-auto max-w-5xl border-t rounded-none p-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="text-sm">
            {missingFields.length > 0 ? (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                <span>Missing required: {missingFields.join(", ")}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">All required fields look good.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onReset} disabled={saving}>Reset</Button>
            <Button type="button" onClick={onSave} disabled={!canSave} className="min-w-[120px]">
              {saving ? "Saving..." : "Save Clinic"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
