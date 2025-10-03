"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import dynamicIconImports from "lucide-react/dynamicIconImports";

export type LucideIconProps = React.SVGProps<SVGSVGElement> & {
  name: string;
};

export default function LucideIcon({ name, className, ...rest }: LucideIconProps) {
  const IconComp = useMemo(() => {
    const importer = (dynamicIconImports as Record<string, () => Promise<any>>)[name];
    if (!importer) return null;
    return dynamic(importer, {
      ssr: false,
      loading: () => <span className={className} />,
    });
  }, [name, className]);

  if (!IconComp) return <span className={className} />;
  // @ts-expect-error - dynamic returns a component
  return <IconComp className={className} {...rest} />;
}
