"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Star, Medal } from "lucide-react";

interface ClassificationSelectorProps {
  classification?: 'A' | 'B' | 'C';
  creditStatus?: 'green' | 'yellow' | 'red';
  onChange: (v: { classification?: 'A' | 'B' | 'C'; creditStatus?: 'green' | 'yellow' | 'red' }) => void;
}

const creditColors: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export default function ClassificationSelector({ classification, creditStatus, onChange }: ClassificationSelectorProps) {
  return (
    <Card className="bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Classification & Credit</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Classification *</Label>
          <RadioGroup value={classification} onValueChange={(v) => onChange({ classification: v as 'A' | 'B' | 'C' })} className="grid grid-cols-3 gap-3">
            {[
              { key: 'A', icon: Star, label: 'Class A - Excellent' },
              { key: 'B', icon: Medal, label: 'Class B - Good' },
              { key: 'C', icon: Shield, label: 'Class C - Average' },
            ].map(({ key, icon: Icon, label }) => (
              <div key={key} className="border rounded-md p-3 hover:border-primary transition-colors flex items-center gap-2">
                <RadioGroupItem id={`cls-${key}`} value={key} />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor={`cls-${key}`} className="cursor-pointer">{label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Credit Status *</Label>
          <RadioGroup value={creditStatus} onValueChange={(v) => onChange({ creditStatus: v as 'green' | 'yellow' | 'red' })} className="grid grid-cols-3 gap-3">
            {[
              { key: 'green', label: 'Green - Excellent' },
              { key: 'yellow', label: 'Yellow - Good' },
              { key: 'red', label: 'Red - Needs Follow-up' },
            ].map(({ key, label }) => (
              <div key={key} className="border rounded-md p-3 hover:border-primary transition-colors flex items-center gap-2">
                <RadioGroupItem id={`cr-${key}`} value={key} />
                <span className={`inline-block h-3 w-3 rounded-full ${creditColors[key as 'green' | 'yellow' | 'red']}`}></span>
                <Label htmlFor={`cr-${key}`} className="cursor-pointer">{label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
