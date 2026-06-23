"use client";

import { X } from "lucide-react";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IncidentMeta } from "@/components/race/TrackSVG";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: IncidentMeta | null;
}

function resolveTitle(meta: IncidentMeta): string {
  if (meta.type === "hotspot") return meta.name ?? "Notable corner";
  if (meta.category === "CarEvent") return "Incident";
  if (meta.flag) return `${meta.flag} Flag`;
  return "Race Control";
}

export default function IncidentDialog({ open, onOpenChange, incident }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <div className="flex items-center justify-between mb-3">
            <DialogTitle className="text-base font-bold">
              {incident ? resolveTitle(incident) : ""}
            </DialogTitle>
            <DialogClose
              aria-label="Close"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X size={16} />
            </DialogClose>
          </div>

          {incident?.type === "hotspot" ? (
            <div className="text-sm text-foreground/90 leading-relaxed">
              {incident.description ?? incident.message}
            </div>
          ) : incident ? (
            <div className="space-y-2 text-sm">
              {incident.lap_number != null && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Lap</span>
                  <span className="font-mono font-semibold">{incident.lap_number}</span>
                </div>
              )}
              {incident.driver_number != null && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Driver #</span>
                  <span className="font-mono font-semibold">{incident.driver_number}</span>
                </div>
              )}
              {incident.flag && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Flag</span>
                  <span className="font-semibold">{incident.flag}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20 shrink-0">Message</span>
                <span className="text-foreground/90 leading-relaxed">{incident.message}</span>
              </div>
            </div>
          ) : null}

          <DialogDescription className="sr-only">
            Race control incident detail
          </DialogDescription>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
