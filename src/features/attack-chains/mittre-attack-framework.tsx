"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PopulatedTechnique } from "@/types/technique";
import { Tactic, Technique } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { useRef } from "react";
import { exportComponentAsPNG } from "react-component-export-image";

type TechniqueItemProps = {
  technique: PopulatedTechnique;
};

export default function MittreAttackFramework({
  allTtps,
  ttps,
}: {
  allTtps: PopulatedTechnique[];
  ttps: PopulatedTechnique[];
}) {
  const componentRef = useRef<HTMLDivElement>(null);
  function TechniqueItem({ technique }: { technique: Technique }) {
    const baseClasses = "rounded-lg border";
    const isSelected = ttps.some((t) => t.id === technique.id);
    const selectedClasses = isSelected
      ? "border-blue-500 bg-blue-50"
      : "border-gray-200 hover:border-gray-300";

    return (
      <div className={`${baseClasses} ${selectedClasses} p-3`}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{technique.name}</span>
          {isSelected && <span className="text-blue-500">✓</span>}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {technique.ttpIdentifier}
        </div>
      </div>
    );
  }

  function CollapsibleTechniqueItem({ technique }: TechniqueItemProps) {
    const baseClasses =
      "w-full justify-start items-start rounded-lg border p-3";
    const isSelected = ttps.some(
      (t) =>
        t.id === technique.id ||
        technique.childrenTechniques.some((ct) => ct.id === t.id)
    );
    const selectedClasses = isSelected
      ? "border-blue-500 bg-blue-50"
      : "border-gray-200 hover:border-gray-300";

    return (
      <Collapsible>
        <div>
          <CollapsibleTrigger
            className={`${baseClasses} ${selectedClasses}`}
            asChild
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{technique.name}</span>
                  {isSelected && <span className="text-blue-500">✓</span>}
                </div>
                <ChevronDown className="w-4 h-4" />
              </div>
              <div className="text-xs text-start text-gray-500 mt-1">
                {technique.ttpIdentifier}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-2">
            {technique.childrenTechniques.map((childTechnique) => (
              <div key={childTechnique.id} className="mb-2">
                <TechniqueItem technique={childTechnique} />
              </div>
            ))}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <div className="w-full">
      <div className="flex overflow-x-auto gap-4 p-4" ref={componentRef}>
        {Object.values(Tactic).map((tactic) => {
          const techniques = allTtps.filter((t) => t.tactic === tactic);
          return (
            <div key={tactic} className="min-w-[200px] flex-shrink-0">
              <div className="font-bold text-lg mb-4 text-gray-700">
                {tactic.replace(/_/g, " ")}
              </div>
              <div className="flex flex-col gap-2">
                {techniques.map((technique) => {
                  const isParent = technique.childrenTechniques.length > 0;

                  return isParent ? (
                    <CollapsibleTechniqueItem
                      key={technique.id}
                      technique={technique}
                    />
                  ) : (
                    <TechniqueItem key={technique.id} technique={technique} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <Button onClick={() => exportComponentAsPNG(componentRef)}>
        Export as PNG
      </Button>
    </div>
  );
}