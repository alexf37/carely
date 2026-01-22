"use client";

type EmergencyType =
  | "general"
  | "poison"
  | "suicide"
  | "domesticViolence"
  | "sexualAssault"
  | "childAbuse"
  | "substanceAbuse"
  | "veterans"
  | "lgbtqYouth"
  | "eatingDisorders";

type Hotline = {
  type: EmergencyType;
  name: string;
  number: string;
};

const STRIPE_COLORS: Record<EmergencyType, string> = {
  general: "bg-red-500",           // Emergency red
  poison: "bg-green-500",          // Green cross / pharmacy association
  suicide: "bg-yellow-500",        // Yellow ribbon for suicide prevention
  domesticViolence: "bg-purple-500", // Purple ribbon for DV awareness
  sexualAssault: "bg-teal-500",    // Teal ribbon for sexual assault awareness
  childAbuse: "bg-blue-500",       // Blue ribbon for child abuse prevention
  substanceAbuse: "bg-fuchsia-500", // Recovery awareness
  veterans: "bg-emerald-700",      // Military green
  lgbtqYouth: "bg-orange-500",     // Trevor Project branding
  eatingDisorders: "bg-violet-400", // Periwinkle for eating disorder awareness
};

const HOTLINES: Record<EmergencyType, Hotline> = {
  general: {
    type: "general",
    name: "Emergency",
    number: "911",
  },
  poison: {
    type: "poison",
    name: "Poison Control",
    number: "1-800-222-1222",
  },
  suicide: {
    type: "suicide",
    name: "Crisis Lifeline",
    number: "988",
  },
  domesticViolence: {
    type: "domesticViolence",
    name: "Domestic Violence",
    number: "1-800-799-7233",
  },
  sexualAssault: {
    type: "sexualAssault",
    name: "Sexual Assault (RAINN)",
    number: "1-800-656-4673",
  },
  childAbuse: {
    type: "childAbuse",
    name: "Child Abuse",
    number: "1-800-422-4453",
  },
  substanceAbuse: {
    type: "substanceAbuse",
    name: "Substance Abuse (SAMHSA)",
    number: "1-800-662-4357",
  },
  veterans: {
    type: "veterans",
    name: "Veterans Crisis",
    number: "988 (press 1)",
  },
  lgbtqYouth: {
    type: "lgbtqYouth",
    name: "Trevor Project",
    number: "1-866-488-7386",
  },
  eatingDisorders: {
    type: "eatingDisorders",
    name: "Eating Disorders",
    number: "1-800-931-2237",
  },
};

type EmergencyHotlinesProps = {
  types: EmergencyType[];
};

export function EmergencyHotlines({ types }: EmergencyHotlinesProps) {
  const hotlines = types.map((type) => HOTLINES[type]);

  return (
    <div className="flex flex-wrap gap-3">
      {hotlines.map((hotline) => (
        <a
          key={hotline.type}
          href={`tel:${hotline.number.replace(/[^0-9+]/g, "")}`}
          className="inline-flex items-center gap-3 rounded-lg border bg-card pl-0 pr-6 py-0 overflow-hidden transition-all hover:shadow-md active:scale-[0.98]"
        >
          <div className={`${STRIPE_COLORS[hotline.type]} w-1.5 self-stretch`} />
          <div className="py-2.5 pl-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{hotline.name}</div>
            <div className="text-lg font-bold tabular-nums">{hotline.number}</div>
          </div>
        </a>
      ))}
    </div>
  );
}
