"use client";

import { MapPinIcon, PhoneIcon, ClockIcon, StarIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import type { HealthcareFacility } from "@/ai/tools";

type NearbyHealthcareProps = {
  facilities: HealthcareFacility[];
  searchContext?: string;
  isLoading?: boolean;
};

function openGoogleSearch(facility: HealthcareFacility) {
  const searchQuery = encodeURIComponent(`${facility.name} ${facility.city}`);
  window.open(`https://www.google.com/search?q=${searchQuery}`, "_blank");
}

function FacilityCard({ facility }: { facility: HealthcareFacility }) {
  return (
    <button
      type="button"
      onClick={() => openGoogleSearch(facility)}
      className={cn(
        "w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "group cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {facility.name}
            </h4>
            <ExternalLinkIcon className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{facility.type}</p>
        </div>
        {facility.rating && (
          <div className="flex items-center gap-0.5 text-xs text-amber-500 shrink-0">
            <StarIcon className="size-3 fill-current" />
            <span>{facility.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPinIcon className="size-3 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{facility.address}</span>
        </div>

        {facility.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <PhoneIcon className="size-3 shrink-0" />
            <span>{facility.phone}</span>
          </div>
        )}

        {facility.hours && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClockIcon className="size-3 shrink-0" />
            <span>{facility.hours}</span>
          </div>
        )}
      </div>

      {facility.description && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
          {facility.description}
        </p>
      )}
    </button>
  );
}

export function NearbyHealthcare({
  facilities,
  searchContext,
  isLoading = false,
}: NearbyHealthcareProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-lg border bg-card overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <Loader2Icon className="size-5 text-primary animate-spin" />
          <div>
            <p className="text-sm font-medium">Searching for healthcare facilities...</p>
            <p className="text-xs text-muted-foreground">This may take a moment</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (facilities.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-lg border bg-card overflow-hidden"
      >
        <div className="px-4 py-3">
          <p className="text-sm font-medium">No facilities found</p>
          {searchContext && (
            <p className="text-xs text-muted-foreground mt-0.5">{searchContext}</p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border bg-card overflow-hidden"
    >
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-sm font-medium">Healthcare Facilities Near You</p>
        {searchContext && (
          <p className="text-xs text-muted-foreground mt-0.5">{searchContext}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Click any result to search for more details
        </p>
      </div>

      <div className="p-2 space-y-2">
        {facilities.map((facility, index) => (
          <FacilityCard key={`${facility.name}-${index}`} facility={facility} />
        ))}
      </div>
    </motion.div>
  );
}
