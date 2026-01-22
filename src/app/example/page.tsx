"use client";

import {
	Activity,
	AlertCircle,
	AlertTriangle,
	BookOpen,
	Bot,
	Calendar,
	CheckCircle2,
	ChevronRight,
	ClipboardList,
	Clock,
	Droplets,
	Eye,
	FileText,
	Hand,
	Heart,
	HelpCircle,
	Info,
	Lightbulb,
	MessageSquare,
	Minus,
	Moon,
	Pill,
	Scale,
	Send,
	Shield,
	Sparkles,
	Stethoscope,
	Sun,
	Thermometer,
	ThermometerSun,
	TrendingDown,
	TrendingUp,
	User,
	Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Progress,
	ProgressIndicator,
	ProgressLabel,
	ProgressTrack,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// =============================================================================
// GENERATIVE UI COMPONENTS
// =============================================================================

// -----------------------------------------------------------------------------
// 1. VITALS DASHBOARD
// Shows patient vital signs in a visually appealing grid
// -----------------------------------------------------------------------------

type VitalStatus = "normal" | "elevated" | "low" | "critical";

interface Vital {
	label: string;
	value: string | number;
	unit: string;
	icon: ReactNode;
	status: VitalStatus;
	trend?: "up" | "down" | "stable";
	range?: string;
}

interface VitalsDashboardProps {
	vitals: Vital[];
	lastUpdated?: string;
}

const statusColors: Record<VitalStatus, string> = {
	normal: "text-emerald-600 dark:text-emerald-400",
	elevated: "text-amber-600 dark:text-amber-400",
	low: "text-blue-600 dark:text-blue-400",
	critical: "text-rose-600 dark:text-rose-400",
};

const statusBg: Record<VitalStatus, string> = {
	normal: "bg-emerald-500/10 border-emerald-500/20",
	elevated: "bg-amber-500/10 border-amber-500/20",
	low: "bg-blue-500/10 border-blue-500/20",
	critical: "bg-rose-500/10 border-rose-500/20",
};

function VitalCard({ vital, index }: { vital: Vital; index: number }) {
	const TrendIcon =
		vital.trend === "up"
			? TrendingUp
			: vital.trend === "down"
				? TrendingDown
				: Minus;

	return (
		<motion.div
			animate={{ opacity: 1, y: 0, scale: 1 }}
			className={cn(
				"relative overflow-hidden rounded-2xl border p-4",
				statusBg[vital.status],
			)}
			initial={{ opacity: 0, y: 20, scale: 0.95 }}
			transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
		>
			<div className="flex items-start justify-between">
				<div className={cn("rounded-xl p-2", statusBg[vital.status])}>
					<div className={statusColors[vital.status]}>{vital.icon}</div>
				</div>
				{vital.trend && (
					<div
						className={cn(
							"flex items-center gap-1 font-medium text-xs",
							vital.trend === "up"
								? "text-rose-500"
								: vital.trend === "down"
									? "text-emerald-500"
									: "text-muted-foreground",
						)}
					>
						<TrendIcon className="size-3" />
					</div>
				)}
			</div>
			<div className="mt-3">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
					{vital.label}
				</p>
				<div className="mt-1 flex items-baseline gap-1.5">
					<span
						className={cn(
							"font-bold text-2xl tracking-tight",
							statusColors[vital.status],
						)}
					>
						{vital.value}
					</span>
					<span className="text-muted-foreground text-sm">{vital.unit}</span>
				</div>
				{vital.range && (
					<p className="mt-1 text-muted-foreground/70 text-xs">
						Normal: {vital.range}
					</p>
				)}
			</div>
		</motion.div>
	);
}

function VitalsDashboard({ vitals, lastUpdated }: VitalsDashboardProps) {
	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2">
						<Activity className="size-4 text-white" />
					</div>
					<div>
						<h3 className="font-semibold text-foreground">Your Vitals</h3>
						{lastUpdated && (
							<p className="text-muted-foreground text-xs">
								Last updated: {lastUpdated}
							</p>
						)}
					</div>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				{vitals.map((vital, i) => (
					<VitalCard index={i} key={vital.label} vital={vital} />
				))}
			</div>
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 2. MEDICATION SCHEDULE
// Shows daily medication schedule with times and reminders
// -----------------------------------------------------------------------------

interface Medication {
	name: string;
	dosage: string;
	time: string;
	taken: boolean;
	instructions?: string;
	refillDue?: boolean;
}

interface MedicationScheduleProps {
	medications: Medication[];
	date?: string;
}

function MedicationSchedule({
	medications,
	date = "Today",
}: MedicationScheduleProps) {
	const taken = medications.filter((m) => m.taken).length;
	const total = medications.length;
	const progress = Math.round((taken / total) * 100);

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2">
					<Pill className="size-4 text-white" />
				</div>
				<div className="flex-1">
					<h3 className="font-semibold text-foreground">Medication Schedule</h3>
					<p className="text-muted-foreground text-xs">{date}</p>
				</div>
				<Badge className="font-mono" variant="secondary">
					{taken}/{total}
				</Badge>
			</div>

			<div className="space-y-1">
				<div className="flex justify-between text-xs">
					<span className="text-muted-foreground">Daily Progress</span>
					<span className="font-medium text-foreground">{progress}%</span>
				</div>
				<Progress value={progress}>
					<ProgressTrack className="h-2 bg-violet-100 dark:bg-violet-950">
						<ProgressIndicator className="bg-gradient-to-r from-violet-500 to-purple-500" />
					</ProgressTrack>
				</Progress>
			</div>

			<div className="space-y-2">
				{medications.map((med, i) => (
					<motion.div
						animate={{ opacity: 1, x: 0 }}
						className={cn(
							"flex items-center gap-3 rounded-xl border p-3 transition-all",
							med.taken
								? "border-emerald-500/20 bg-emerald-500/5"
								: med.refillDue
									? "border-amber-500/20 bg-amber-500/5"
									: "border-border bg-card",
						)}
						initial={{ opacity: 0, x: -20 }}
						key={`${med.name}-${med.time}`}
						transition={{ delay: i * 0.1 }}
					>
						<div
							className={cn(
								"flex size-10 items-center justify-center rounded-lg",
								med.taken
									? "bg-emerald-500/10 text-emerald-600"
									: "bg-muted text-muted-foreground",
							)}
						>
							{med.taken ? (
								<CheckCircle2 className="size-5" />
							) : (
								<Clock className="size-5" />
							)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<p className="truncate font-medium text-foreground">
									{med.name}
								</p>
								{med.refillDue && (
									<Badge
										className="px-1.5 py-0 text-[10px]"
										variant="destructive"
									>
										Refill
									</Badge>
								)}
							</div>
							<p className="text-muted-foreground text-xs">
								{med.dosage} &middot; {med.time}
							</p>
							{med.instructions && (
								<p className="mt-0.5 text-muted-foreground/70 text-xs">
									{med.instructions}
								</p>
							)}
						</div>
						{!med.taken && (
							<Button className="shrink-0" size="sm" variant="ghost">
								Mark taken
							</Button>
						)}
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 3. SYMPTOM ASSESSMENT
// Interactive symptom checker with severity indicators
// -----------------------------------------------------------------------------

interface Symptom {
	name: string;
	severity: "mild" | "moderate" | "severe";
	duration: string;
	notes?: string;
}

interface SymptomAssessmentProps {
	symptoms: Symptom[];
	recommendation: string;
	urgency: "routine" | "soon" | "urgent";
}

const severityConfig = {
	mild: {
		color: "text-emerald-600 dark:text-emerald-400",
		bg: "bg-emerald-500/10",
		label: "Mild",
	},
	moderate: {
		color: "text-amber-600 dark:text-amber-400",
		bg: "bg-amber-500/10",
		label: "Moderate",
	},
	severe: {
		color: "text-rose-600 dark:text-rose-400",
		bg: "bg-rose-500/10",
		label: "Severe",
	},
};

const urgencyConfig = {
	routine: {
		color: "text-emerald-600",
		bg: "bg-emerald-500/10 border-emerald-500/20",
		icon: Info,
		label: "Routine",
	},
	soon: {
		color: "text-amber-600",
		bg: "bg-amber-500/10 border-amber-500/20",
		icon: AlertCircle,
		label: "Schedule Soon",
	},
	urgent: {
		color: "text-rose-600",
		bg: "bg-rose-500/10 border-rose-500/20",
		icon: AlertTriangle,
		label: "Urgent",
	},
};

function SymptomAssessment({
	symptoms,
	recommendation,
	urgency,
}: SymptomAssessmentProps) {
	const UrgencyIcon = urgencyConfig[urgency].icon;

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 p-2">
					<Stethoscope className="size-4 text-white" />
				</div>
				<div>
					<h3 className="font-semibold text-foreground">Symptom Assessment</h3>
					<p className="text-muted-foreground text-xs">
						Based on your reported symptoms
					</p>
				</div>
			</div>

			<div className="space-y-2">
				{symptoms.map((symptom, i) => (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
						initial={{ opacity: 0, y: 10 }}
						key={symptom.name}
						transition={{ delay: i * 0.1 }}
					>
						<div
							className={cn(
								"size-2 rounded-full",
								severityConfig[symptom.severity].bg,
								symptom.severity === "mild" && "bg-emerald-500",
								symptom.severity === "moderate" && "bg-amber-500",
								symptom.severity === "severe" && "bg-rose-500",
							)}
						/>
						<div className="min-w-0 flex-1">
							<p className="font-medium text-foreground">{symptom.name}</p>
							<p className="text-muted-foreground text-xs">
								{symptom.duration}
								{symptom.notes && ` • ${symptom.notes}`}
							</p>
						</div>
						<Badge
							className={cn("text-xs", severityConfig[symptom.severity].color)}
							variant="secondary"
						>
							{severityConfig[symptom.severity].label}
						</Badge>
					</motion.div>
				))}
			</div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className={cn("rounded-xl border p-4", urgencyConfig[urgency].bg)}
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: symptoms.length * 0.1 }}
			>
				<div className="flex items-start gap-3">
					<UrgencyIcon
						className={cn(
							"mt-0.5 size-5 shrink-0",
							urgencyConfig[urgency].color,
						)}
					/>
					<div>
						<div className="flex items-center gap-2">
							<p className={cn("font-semibold", urgencyConfig[urgency].color)}>
								{urgencyConfig[urgency].label}
							</p>
						</div>
						<p className="mt-1 text-foreground/80 text-sm">{recommendation}</p>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 4. APPOINTMENT SCHEDULER
// Shows available time slots for scheduling
// -----------------------------------------------------------------------------

interface TimeSlot {
	time: string;
	available: boolean;
	type?: "in-person" | "telehealth";
}

interface AppointmentSchedulerProps {
	date: string;
	provider: string;
	specialty: string;
	slots: TimeSlot[];
	onSelect?: (time: string) => void;
}

function AppointmentScheduler({
	date,
	provider,
	specialty,
	slots,
	onSelect,
}: AppointmentSchedulerProps) {
	const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2">
					<Calendar className="size-4 text-white" />
				</div>
				<div className="flex-1">
					<h3 className="font-semibold text-foreground">
						Schedule Appointment
					</h3>
					<p className="text-muted-foreground text-xs">
						{provider} &middot; {specialty}
					</p>
				</div>
			</div>

			<div className="rounded-xl border border-border bg-card p-4">
				<p className="mb-3 font-medium text-foreground text-sm">{date}</p>
				<div className="grid grid-cols-3 gap-2">
					{slots.map((slot, i) => (
						<motion.button
							animate={{ opacity: 1, scale: 1 }}
							className={cn(
								"relative rounded-lg border px-3 py-2 font-medium text-sm transition-all",
								!slot.available
									? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-50"
									: selectedSlot === slot.time
										? "border-blue-500 bg-blue-500/10 text-blue-600 ring-2 ring-blue-500/20"
										: "border-border bg-card text-foreground hover:border-blue-500/50 hover:bg-blue-500/5",
							)}
							disabled={!slot.available}
							initial={{ opacity: 0, scale: 0.9 }}
							key={slot.time}
							onClick={() => {
								setSelectedSlot(slot.time);
								onSelect?.(slot.time);
							}}
							transition={{ delay: i * 0.05 }}
						>
							{slot.time}
							{slot.type === "telehealth" && slot.available && (
								<span className="absolute -top-1 -right-1 size-2 rounded-full bg-blue-500" />
							)}
						</motion.button>
					))}
				</div>
				<div className="mt-3 flex items-center gap-4 text-muted-foreground text-xs">
					<span className="flex items-center gap-1.5">
						<span className="size-2 rounded-full bg-blue-500" />
						Telehealth available
					</span>
				</div>
			</div>

			{selectedSlot && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					initial={{ opacity: 0, y: 10 }}
				>
					<Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
						Confirm {selectedSlot} Appointment
						<ChevronRight className="ml-1 size-4" />
					</Button>
				</motion.div>
			)}
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 5. HEALTH RISK ASSESSMENT
// Visual risk indicators for various health metrics
// -----------------------------------------------------------------------------

interface RiskFactor {
	name: string;
	level: "low" | "moderate" | "high";
	score: number;
	description: string;
}

interface HealthRiskAssessmentProps {
	overallRisk: "low" | "moderate" | "high";
	factors: RiskFactor[];
}

const riskLevelConfig = {
	low: {
		color: "text-emerald-600 dark:text-emerald-400",
		bg: "bg-emerald-500",
		label: "Low Risk",
		gradient: "from-emerald-500 to-teal-500",
	},
	moderate: {
		color: "text-amber-600 dark:text-amber-400",
		bg: "bg-amber-500",
		label: "Moderate Risk",
		gradient: "from-amber-500 to-orange-500",
	},
	high: {
		color: "text-rose-600 dark:text-rose-400",
		bg: "bg-rose-500",
		label: "High Risk",
		gradient: "from-rose-500 to-pink-500",
	},
};

function HealthRiskAssessment({
	overallRisk,
	factors,
}: HealthRiskAssessmentProps) {
	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div
					className={cn(
						"rounded-lg bg-gradient-to-br p-2",
						riskLevelConfig[overallRisk].gradient,
					)}
				>
					<Sparkles className="size-4 text-white" />
				</div>
				<div>
					<h3 className="font-semibold text-foreground">
						Health Risk Assessment
					</h3>
					<p className="text-muted-foreground text-xs">
						Based on your health data & history
					</p>
				</div>
			</div>

			<motion.div
				animate={{ opacity: 1, scale: 1 }}
				className={cn(
					"rounded-xl border p-4 text-center",
					overallRisk === "low" && "border-emerald-500/20 bg-emerald-500/5",
					overallRisk === "moderate" && "border-amber-500/20 bg-amber-500/5",
					overallRisk === "high" && "border-rose-500/20 bg-rose-500/5",
				)}
				initial={{ opacity: 0, scale: 0.95 }}
				transition={{ delay: 0.1 }}
			>
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
					Overall Risk Level
				</p>
				<p
					className={cn(
						"mt-1 font-bold text-2xl",
						riskLevelConfig[overallRisk].color,
					)}
				>
					{riskLevelConfig[overallRisk].label}
				</p>
			</motion.div>

			<div className="space-y-3">
				{factors.map((factor, i) => (
					<motion.div
						animate={{ opacity: 1, x: 0 }}
						className="space-y-2"
						initial={{ opacity: 0, x: -20 }}
						key={factor.name}
						transition={{ delay: 0.2 + i * 0.1 }}
					>
						<div className="flex items-center justify-between">
							<span className="font-medium text-foreground text-sm">
								{factor.name}
							</span>
							<Badge
								className={cn("text-xs", riskLevelConfig[factor.level].color)}
								variant="secondary"
							>
								{factor.level}
							</Badge>
						</div>
						<Progress value={factor.score}>
							<ProgressTrack className="h-2">
								<ProgressIndicator
									className={cn(
										"bg-gradient-to-r",
										riskLevelConfig[factor.level].gradient,
									)}
								/>
							</ProgressTrack>
						</Progress>
						<p className="text-muted-foreground text-xs">
							{factor.description}
						</p>
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 6. LAB RESULTS SUMMARY
// Clean presentation of laboratory test results
// -----------------------------------------------------------------------------

interface LabResult {
	name: string;
	value: string | number;
	unit: string;
	referenceRange: string;
	status: "normal" | "abnormal-high" | "abnormal-low" | "critical";
	previousValue?: string | number;
}

interface LabResultsSummaryProps {
	testName: string;
	date: string;
	results: LabResult[];
}

const labStatusConfig = {
	normal: {
		color: "text-emerald-600 dark:text-emerald-400",
		bg: "bg-emerald-500/10",
		label: "Normal",
	},
	"abnormal-high": {
		color: "text-amber-600 dark:text-amber-400",
		bg: "bg-amber-500/10",
		label: "High",
	},
	"abnormal-low": {
		color: "text-blue-600 dark:text-blue-400",
		bg: "bg-blue-500/10",
		label: "Low",
	},
	critical: {
		color: "text-rose-600 dark:text-rose-400",
		bg: "bg-rose-500/10",
		label: "Critical",
	},
};

function LabResultsSummary({
	testName,
	date,
	results,
}: LabResultsSummaryProps) {
	const abnormalCount = results.filter((r) => r.status !== "normal").length;

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-orange-500 to-red-600 p-2">
					<FileText className="size-4 text-white" />
				</div>
				<div className="flex-1">
					<h3 className="font-semibold text-foreground">{testName}</h3>
					<p className="text-muted-foreground text-xs">{date}</p>
				</div>
				{abnormalCount > 0 && (
					<Badge className="text-xs" variant="destructive">
						{abnormalCount} abnormal
					</Badge>
				)}
			</div>

			<div className="overflow-hidden rounded-xl border border-border">
				<div className="grid grid-cols-12 gap-2 bg-muted/50 px-4 py-2 font-medium text-muted-foreground text-xs">
					<span className="col-span-4">Test</span>
					<span className="col-span-2 text-right">Value</span>
					<span className="col-span-3 text-right">Range</span>
					<span className="col-span-3 text-right">Status</span>
				</div>
				{results.map((result, i) => (
					<motion.div
						animate={{ opacity: 1 }}
						className={cn(
							"grid grid-cols-12 gap-2 border-border border-t px-4 py-3 text-sm",
							result.status !== "normal" && labStatusConfig[result.status].bg,
						)}
						initial={{ opacity: 0 }}
						key={result.name}
						transition={{ delay: i * 0.05 }}
					>
						<span className="col-span-4 truncate font-medium text-foreground">
							{result.name}
						</span>
						<span
							className={cn(
								"col-span-2 text-right font-mono font-semibold",
								labStatusConfig[result.status].color,
							)}
						>
							{result.value}
							<span className="ml-0.5 text-muted-foreground text-xs">
								{result.unit}
							</span>
						</span>
						<span className="col-span-3 text-right text-muted-foreground text-xs">
							{result.referenceRange}
						</span>
						<span className="col-span-3 text-right">
							<Badge
								className={cn("text-xs", labStatusConfig[result.status].color)}
								variant="secondary"
							>
								{labStatusConfig[result.status].label}
							</Badge>
						</span>
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 7. DIFFERENTIAL DIAGNOSIS
// Shows possible conditions ranked by likelihood based on symptoms
// -----------------------------------------------------------------------------

interface DiagnosisOption {
	condition: string;
	likelihood: "high" | "moderate" | "low";
	matchingSymptoms: string[];
	ruledOutBy?: string;
	description: string;
}

interface DifferentialDiagnosisProps {
	possibleConditions: DiagnosisOption[];
	keyQuestion?: string;
}

const likelihoodConfig = {
	high: {
		color: "text-rose-600 dark:text-rose-400",
		bg: "bg-rose-500/10 border-rose-500/20",
		barColor: "bg-rose-500",
		label: "High likelihood",
		percent: 85,
	},
	moderate: {
		color: "text-amber-600 dark:text-amber-400",
		bg: "bg-amber-500/10 border-amber-500/20",
		barColor: "bg-amber-500",
		label: "Moderate",
		percent: 50,
	},
	low: {
		color: "text-slate-600 dark:text-slate-400",
		bg: "bg-slate-500/10 border-slate-500/20",
		barColor: "bg-slate-400",
		label: "Less likely",
		percent: 20,
	},
};

function DifferentialDiagnosis({
	possibleConditions,
	keyQuestion,
}: DifferentialDiagnosisProps) {
	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 p-2">
					<Stethoscope className="size-4 text-white" />
				</div>
				<div>
					<h3 className="font-semibold text-foreground">Possible Conditions</h3>
					<p className="text-muted-foreground text-xs">
						Based on your reported symptoms
					</p>
				</div>
			</div>

			<div className="space-y-3">
				{possibleConditions.map((condition, i) => (
					<motion.div
						animate={{ opacity: 1, x: 0 }}
						className={cn(
							"rounded-xl border p-4",
							likelihoodConfig[condition.likelihood].bg,
						)}
						initial={{ opacity: 0, x: -20 }}
						key={condition.condition}
						transition={{ delay: i * 0.1 }}
					>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<h4 className="font-semibold text-foreground">
										{condition.condition}
									</h4>
									{condition.ruledOutBy && (
										<Badge className="text-[10px]" variant="outline">
											Needs confirmation
										</Badge>
									)}
								</div>
								<p className="mt-1 text-muted-foreground text-sm">
									{condition.description}
								</p>
							</div>
							<Badge
								className={cn(
									"shrink-0 text-xs",
									likelihoodConfig[condition.likelihood].color,
								)}
								variant="secondary"
							>
								{likelihoodConfig[condition.likelihood].label}
							</Badge>
						</div>

						<div className="mt-3">
							<div className="mb-1.5 flex items-center justify-between text-xs">
								<span className="text-muted-foreground">Match strength</span>
								<span className="font-medium">
									{likelihoodConfig[condition.likelihood].percent}%
								</span>
							</div>
							<div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
								<motion.div
									animate={{
										width: `${likelihoodConfig[condition.likelihood].percent}%`,
									}}
									className={cn(
										"h-full rounded-full",
										likelihoodConfig[condition.likelihood].barColor,
									)}
									initial={{ width: 0 }}
									transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
								/>
							</div>
						</div>

						<div className="mt-3 flex flex-wrap gap-1.5">
							{condition.matchingSymptoms.map((symptom) => (
								<span
									className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/5"
									key={symptom}
								>
									<CheckCircle2 className="size-3 text-emerald-500" />
									{symptom}
								</span>
							))}
						</div>

						{condition.ruledOutBy && (
							<p className="mt-2 text-muted-foreground text-xs italic">
								Would be ruled out by: {condition.ruledOutBy}
							</p>
						)}
					</motion.div>
				))}
			</div>

			{keyQuestion && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: possibleConditions.length * 0.1 }}
				>
					<div className="flex items-start gap-3">
						<HelpCircle className="mt-0.5 size-5 shrink-0 text-blue-500" />
						<div>
							<p className="font-medium text-blue-600 dark:text-blue-400">
								Key Question
							</p>
							<p className="mt-1 text-foreground/80 text-sm">{keyQuestion}</p>
						</div>
					</div>
				</motion.div>
			)}
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 8. CARE PLAN
// Structured next steps and follow-up instructions
// -----------------------------------------------------------------------------

interface CarePlanStep {
	action: string;
	timing: string;
	details?: string;
	priority: "required" | "recommended" | "optional";
}

interface CarePlanProps {
	title: string;
	duration: string;
	steps: CarePlanStep[];
	warningSignsTitle?: string;
	warningSigns?: string[];
	followUp?: string;
}

const priorityConfig = {
	required: {
		color: "text-rose-600 dark:text-rose-400",
		bg: "bg-rose-500",
		label: "Required",
	},
	recommended: {
		color: "text-amber-600 dark:text-amber-400",
		bg: "bg-amber-500",
		label: "Recommended",
	},
	optional: {
		color: "text-slate-600 dark:text-slate-400",
		bg: "bg-slate-400",
		label: "Optional",
	},
};

function CarePlan({
	title,
	duration,
	steps,
	warningSignsTitle = "Seek immediate care if you experience",
	warningSigns,
	followUp,
}: CarePlanProps) {
	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-2">
					<ClipboardList className="size-4 text-white" />
				</div>
				<div className="flex-1">
					<h3 className="font-semibold text-foreground">{title}</h3>
					<p className="text-muted-foreground text-xs">{duration}</p>
				</div>
			</div>

			<div className="space-y-2">
				{steps.map((step, i) => (
					<motion.div
						animate={{ opacity: 1, x: 0 }}
						className="flex gap-3 rounded-xl border border-border bg-card p-3"
						initial={{ opacity: 0, x: -20 }}
						key={step.action}
						transition={{ delay: i * 0.08 }}
					>
						<div
							className={cn(
								"mt-0.5 size-2 shrink-0 rounded-full",
								priorityConfig[step.priority].bg,
							)}
						/>
						<div className="min-w-0 flex-1">
							<div className="flex items-start justify-between gap-2">
								<p className="font-medium text-foreground">{step.action}</p>
								<span className="shrink-0 text-muted-foreground text-xs">
									{step.timing}
								</span>
							</div>
							{step.details && (
								<p className="mt-1 text-muted-foreground text-sm">
									{step.details}
								</p>
							)}
						</div>
					</motion.div>
				))}
			</div>

			{warningSigns && warningSigns.length > 0 && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4"
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: steps.length * 0.08 }}
				>
					<div className="flex items-start gap-3">
						<AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-500" />
						<div>
							<p className="font-semibold text-rose-600 dark:text-rose-400">
								{warningSignsTitle}
							</p>
							<ul className="mt-2 space-y-1">
								{warningSigns.map((sign) => (
									<li
										className="flex items-center gap-2 text-foreground/80 text-sm"
										key={sign}
									>
										<span className="size-1 rounded-full bg-rose-500" />
										{sign}
									</li>
								))}
							</ul>
						</div>
					</div>
				</motion.div>
			)}

			{followUp && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="rounded-xl border border-border bg-muted/50 p-4"
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: steps.length * 0.08 + 0.1 }}
				>
					<div className="flex items-start gap-3">
						<Calendar className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
						<div>
							<p className="font-medium text-foreground">Follow-up</p>
							<p className="mt-1 text-muted-foreground text-sm">{followUp}</p>
						</div>
					</div>
				</motion.div>
			)}
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 9. MEDICATION EXPLAINER
// Detailed information about a medication
// -----------------------------------------------------------------------------

interface MedicationExplainerProps {
	name: string;
	genericName?: string;
	purpose: string;
	howItWorks: string;
	dosage: string;
	instructions: string[];
	sideEffects: { common: string[]; serious: string[] };
	interactions: string[];
	warnings?: string[];
}

function MedicationExplainer({
	name,
	genericName,
	purpose,
	howItWorks,
	dosage,
	instructions,
	sideEffects,
	interactions,
	warnings,
}: MedicationExplainerProps) {
	const [expandedSection, setExpandedSection] = useState<string | null>(null);

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 p-2">
					<Pill className="size-4 text-white" />
				</div>
				<div>
					<h3 className="font-semibold text-foreground">{name}</h3>
					{genericName && (
						<p className="text-muted-foreground text-xs">
							Generic: {genericName}
						</p>
					)}
				</div>
			</div>

			<div className="rounded-xl border border-border bg-card p-4">
				<p className="font-medium text-foreground">{purpose}</p>
				<p className="mt-2 text-muted-foreground text-sm">{howItWorks}</p>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-xl border border-border bg-card p-3">
					<p className="text-muted-foreground text-xs uppercase tracking-wider">
						Dosage
					</p>
					<p className="mt-1 font-semibold text-foreground">{dosage}</p>
				</div>
				<div className="rounded-xl border border-border bg-card p-3">
					<p className="text-muted-foreground text-xs uppercase tracking-wider">
						Frequency
					</p>
					<p className="mt-1 font-semibold text-foreground">
						{instructions[0]}
					</p>
				</div>
			</div>

			<div className="space-y-2">
				<button
					className={cn(
						"w-full rounded-xl border p-3 text-left transition-all",
						expandedSection === "instructions"
							? "border-blue-500/30 bg-blue-500/5"
							: "border-border bg-card hover:border-blue-500/20",
					)}
					onClick={() =>
						setExpandedSection(
							expandedSection === "instructions" ? null : "instructions",
						)
					}
					type="button"
				>
					<div className="flex items-center justify-between">
						<span className="font-medium text-foreground">How to Take</span>
						<ChevronRight
							className={cn(
								"size-4 text-muted-foreground transition-transform",
								expandedSection === "instructions" && "rotate-90",
							)}
						/>
					</div>
					<AnimatePresence>
						{expandedSection === "instructions" && (
							<motion.ul
								animate={{ height: "auto", opacity: 1 }}
								className="mt-2 space-y-1 overflow-hidden"
								exit={{ height: 0, opacity: 0 }}
								initial={{ height: 0, opacity: 0 }}
							>
								{instructions.map((instruction) => (
									<li
										className="flex items-start gap-2 text-muted-foreground text-sm"
										key={instruction}
									>
										<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
										{instruction}
									</li>
								))}
							</motion.ul>
						)}
					</AnimatePresence>
				</button>

				<button
					className={cn(
						"w-full rounded-xl border p-3 text-left transition-all",
						expandedSection === "sideEffects"
							? "border-amber-500/30 bg-amber-500/5"
							: "border-border bg-card hover:border-amber-500/20",
					)}
					onClick={() =>
						setExpandedSection(
							expandedSection === "sideEffects" ? null : "sideEffects",
						)
					}
					type="button"
				>
					<div className="flex items-center justify-between">
						<span className="font-medium text-foreground">Side Effects</span>
						<ChevronRight
							className={cn(
								"size-4 text-muted-foreground transition-transform",
								expandedSection === "sideEffects" && "rotate-90",
							)}
						/>
					</div>
					<AnimatePresence>
						{expandedSection === "sideEffects" && (
							<motion.div
								animate={{ height: "auto", opacity: 1 }}
								className="mt-2 space-y-3 overflow-hidden"
								exit={{ height: 0, opacity: 0 }}
								initial={{ height: 0, opacity: 0 }}
							>
								<div>
									<p className="mb-1 font-medium text-muted-foreground text-xs">
										Common (usually mild)
									</p>
									<div className="flex flex-wrap gap-1">
										{sideEffects.common.map((effect) => (
											<span
												className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 text-xs dark:text-amber-400"
												key={effect}
											>
												{effect}
											</span>
										))}
									</div>
								</div>
								<div>
									<p className="mb-1 font-medium text-muted-foreground text-xs">
										Serious (seek help if experienced)
									</p>
									<div className="flex flex-wrap gap-1">
										{sideEffects.serious.map((effect) => (
											<span
												className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-600 text-xs dark:text-rose-400"
												key={effect}
											>
												{effect}
											</span>
										))}
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</button>

				<button
					className={cn(
						"w-full rounded-xl border p-3 text-left transition-all",
						expandedSection === "interactions"
							? "border-purple-500/30 bg-purple-500/5"
							: "border-border bg-card hover:border-purple-500/20",
					)}
					onClick={() =>
						setExpandedSection(
							expandedSection === "interactions" ? null : "interactions",
						)
					}
					type="button"
				>
					<div className="flex items-center justify-between">
						<span className="font-medium text-foreground">
							Avoid Combining With
						</span>
						<ChevronRight
							className={cn(
								"size-4 text-muted-foreground transition-transform",
								expandedSection === "interactions" && "rotate-90",
							)}
						/>
					</div>
					<AnimatePresence>
						{expandedSection === "interactions" && (
							<motion.div
								animate={{ height: "auto", opacity: 1 }}
								className="mt-2 flex flex-wrap gap-1 overflow-hidden"
								exit={{ height: 0, opacity: 0 }}
								initial={{ height: 0, opacity: 0 }}
							>
								{interactions.map((interaction) => (
									<span
										className="rounded-full bg-purple-500/10 px-2 py-0.5 text-purple-600 text-xs dark:text-purple-400"
										key={interaction}
									>
										{interaction}
									</span>
								))}
							</motion.div>
						)}
					</AnimatePresence>
				</button>
			</div>

			{warnings && warnings.length > 0 && (
				<div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
					<div className="flex items-start gap-2">
						<AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-500" />
						<div className="space-y-1">
							{warnings.map((warning) => (
								<p
									className="text-rose-600 text-sm dark:text-rose-400"
									key={warning}
								>
									{warning}
								</p>
							))}
						</div>
					</div>
				</div>
			)}
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 10. SELF-EXAM GUIDE
// Step-by-step instructions for physical self-examination
// -----------------------------------------------------------------------------

interface ExamStep {
	step: number;
	title: string;
	instruction: string;
	tip?: string;
	warning?: string;
}

interface SelfExamGuideProps {
	examType: string;
	purpose: string;
	duration: string;
	steps: ExamStep[];
	whatToLookFor: string[];
	whenToWorry: string[];
}

function SelfExamGuide({
	examType,
	purpose,
	duration,
	steps,
	whatToLookFor,
	whenToWorry,
}: SelfExamGuideProps) {
	const [currentStep, setCurrentStep] = useState(0);

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 p-2">
					<Hand className="size-4 text-white" />
				</div>
				<div className="flex-1">
					<h3 className="font-semibold text-foreground">{examType}</h3>
					<p className="text-muted-foreground text-xs">
						{purpose} &middot; ~{duration}
					</p>
				</div>
			</div>

			{/* Progress indicator */}
			<div className="flex gap-1">
				{steps.map((_, i) => (
					<button
						className={cn(
							"h-1.5 flex-1 rounded-full transition-all",
							i <= currentStep ? "bg-indigo-500" : "bg-indigo-500/20",
						)}
						key={`step-${steps[i]?.step ?? i}`}
						onClick={() => setCurrentStep(i)}
						type="button"
					/>
				))}
			</div>

			{/* Current step */}
			<AnimatePresence mode="wait">
				<motion.div
					animate={{ opacity: 1, x: 0 }}
					className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4"
					exit={{ opacity: 0, x: -20 }}
					initial={{ opacity: 0, x: 20 }}
					key={currentStep}
				>
					<div className="mb-3 flex items-center gap-3">
						<span className="flex size-8 items-center justify-center rounded-full bg-indigo-500 font-bold text-sm text-white">
							{steps[currentStep]?.step}
						</span>
						<h4 className="font-semibold text-foreground">
							{steps[currentStep]?.title}
						</h4>
					</div>
					<p className="text-foreground/90">
						{steps[currentStep]?.instruction}
					</p>
					{steps[currentStep]?.tip && (
						<div className="mt-3 flex items-start gap-2 rounded-lg bg-white/50 p-2 dark:bg-black/20">
							<Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
							<p className="text-muted-foreground text-sm">
								{steps[currentStep]?.tip}
							</p>
						</div>
					)}
					{steps[currentStep]?.warning && (
						<div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-500/10 p-2">
							<AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
							<p className="text-rose-600 text-sm dark:text-rose-400">
								{steps[currentStep]?.warning}
							</p>
						</div>
					)}
				</motion.div>
			</AnimatePresence>

			{/* Navigation */}
			<div className="flex gap-2">
				<Button
					className="flex-1"
					disabled={currentStep === 0}
					onClick={() => setCurrentStep((s) => s - 1)}
					variant="outline"
				>
					Previous
				</Button>
				<Button
					className="flex-1 bg-indigo-500 hover:bg-indigo-600"
					disabled={currentStep === steps.length - 1}
					onClick={() => setCurrentStep((s) => s + 1)}
				>
					Next Step
				</Button>
			</div>

			{/* What to look for */}
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="rounded-xl border border-border bg-card p-3">
					<p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
						What to Look For
					</p>
					<ul className="space-y-1">
						{whatToLookFor.map((item) => (
							<li
								className="flex items-center gap-2 text-foreground text-sm"
								key={item}
							>
								<Eye className="size-3 text-indigo-500" />
								{item}
							</li>
						))}
					</ul>
				</div>
				<div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
					<p className="mb-2 font-medium text-rose-600 text-xs uppercase tracking-wider dark:text-rose-400">
						Contact Doctor If
					</p>
					<ul className="space-y-1">
						{whenToWorry.map((item) => (
							<li
								className="flex items-center gap-2 text-foreground text-sm"
								key={item}
							>
								<AlertTriangle className="size-3 text-rose-500" />
								{item}
							</li>
						))}
					</ul>
				</div>
			</div>
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 11. CONDITION EXPLAINER
// Educational breakdown of a medical condition
// -----------------------------------------------------------------------------

interface ConditionExplainerProps {
	condition: string;
	pronunciation?: string;
	summary: string;
	causes: string[];
	symptoms: string[];
	riskFactors: string[];
	treatmentOptions: { type: string; description: string }[];
	prognosis: string;
	prevention?: string[];
}

function ConditionExplainer({
	condition,
	pronunciation,
	summary,
	causes,
	symptoms,
	riskFactors,
	treatmentOptions,
	prognosis,
	prevention,
}: ConditionExplainerProps) {
	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 p-2">
					<BookOpen className="size-4 text-white" />
				</div>
				<div>
					<h3 className="font-semibold text-foreground">{condition}</h3>
					{pronunciation && (
						<p className="text-muted-foreground text-xs italic">
							{pronunciation}
						</p>
					)}
				</div>
			</div>

			<div className="rounded-xl border border-border bg-card p-4">
				<p className="text-foreground/90">{summary}</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="rounded-xl border border-border bg-card p-3"
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: 0.1 }}
				>
					<p className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
						<Zap className="size-3" />
						Common Causes
					</p>
					<ul className="space-y-1">
						{causes.map((cause) => (
							<li className="text-foreground text-sm" key={cause}>
								• {cause}
							</li>
						))}
					</ul>
				</motion.div>

				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="rounded-xl border border-border bg-card p-3"
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: 0.15 }}
				>
					<p className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
						<ThermometerSun className="size-3" />
						Typical Symptoms
					</p>
					<ul className="space-y-1">
						{symptoms.map((symptom) => (
							<li className="text-foreground text-sm" key={symptom}>
								• {symptom}
							</li>
						))}
					</ul>
				</motion.div>
			</div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.2 }}
			>
				<p className="mb-2 flex items-center gap-2 font-medium text-amber-600 text-xs uppercase tracking-wider dark:text-amber-400">
					<AlertCircle className="size-3" />
					Risk Factors
				</p>
				<div className="flex flex-wrap gap-1.5">
					{riskFactors.map((factor) => (
						<span
							className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 text-xs dark:text-amber-300"
							key={factor}
						>
							{factor}
						</span>
					))}
				</div>
			</motion.div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.25 }}
			>
				<p className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
					<Pill className="size-3" />
					Treatment Options
				</p>
				<div className="space-y-2">
					{treatmentOptions.map((option, i) => (
						<div
							className="rounded-xl border border-border bg-card p-3"
							key={option.type}
						>
							<p className="font-medium text-foreground">{option.type}</p>
							<p className="mt-1 text-muted-foreground text-sm">
								{option.description}
							</p>
						</div>
					))}
				</div>
			</motion.div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.3 }}
			>
				<p className="font-medium text-emerald-600 dark:text-emerald-400">
					Outlook
				</p>
				<p className="mt-1 text-foreground/80 text-sm">{prognosis}</p>
			</motion.div>

			{prevention && prevention.length > 0 && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="rounded-xl border border-border bg-muted/50 p-3"
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: 0.35 }}
				>
					<p className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
						<Shield className="size-3" />
						Prevention Tips
					</p>
					<ul className="space-y-1">
						{prevention.map((tip) => (
							<li
								className="flex items-center gap-2 text-foreground text-sm"
								key={tip}
							>
								<CheckCircle2 className="size-3 text-emerald-500" />
								{tip}
							</li>
						))}
					</ul>
				</motion.div>
			)}
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 12. FOLLOW-UP QUESTIONS
// Structured intake-style questions from the AI
// -----------------------------------------------------------------------------

interface FollowUpQuestion {
	id: string;
	question: string;
	type: "choice" | "scale" | "text";
	options?: string[];
	scaleMin?: number;
	scaleMax?: number;
	scaleLabels?: { min: string; max: string };
}

interface FollowUpQuestionsProps {
	context: string;
	questions: FollowUpQuestion[];
	onSubmit?: (answers: Record<string, string | number>) => void;
}

function FollowUpQuestions({
	context,
	questions,
	onSubmit,
}: FollowUpQuestionsProps) {
	const [answers, setAnswers] = useState<Record<string, string | number>>({});
	const [currentQuestion, setCurrentQuestion] = useState(0);

	const handleAnswer = (questionId: string, answer: string | number) => {
		setAnswers((prev) => ({ ...prev, [questionId]: answer }));
		if (currentQuestion < questions.length - 1) {
			setTimeout(() => setCurrentQuestion((q) => q + 1), 300);
		}
	};

	const allAnswered = questions.every((q) => answers[q.id] !== undefined);

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 p-2">
					<MessageSquare className="size-4 text-white" />
				</div>
				<div>
					<h3 className="font-semibold text-foreground">
						A few quick questions
					</h3>
					<p className="text-muted-foreground text-xs">{context}</p>
				</div>
			</div>

			{/* Progress */}
			<div className="flex items-center gap-2">
				<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pink-500/20">
					<motion.div
						animate={{
							width: `${((currentQuestion + 1) / questions.length) * 100}%`,
						}}
						className="h-full rounded-full bg-pink-500"
						initial={{ width: 0 }}
					/>
				</div>
				<span className="text-muted-foreground text-xs">
					{currentQuestion + 1}/{questions.length}
				</span>
			</div>

			{/* Current Question */}
			<AnimatePresence mode="wait">
				{(() => {
					const currentQ = questions[currentQuestion];
					if (!currentQ) return null;
					return (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className="rounded-xl border border-border bg-card p-4"
							exit={{ opacity: 0, y: -10 }}
							initial={{ opacity: 0, y: 10 }}
							key={currentQ.id}
						>
							<p className="mb-4 font-medium text-foreground">
								{currentQ.question}
							</p>

							{currentQ.type === "choice" && currentQ.options && (
								<div className="space-y-2">
									{currentQ.options.map((option) => (
										<button
											className={cn(
												"w-full rounded-lg border p-3 text-left text-sm transition-all",
												answers[currentQ.id] === option
													? "border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400"
													: "border-border hover:border-pink-500/50 hover:bg-pink-500/5",
											)}
											key={option}
											onClick={() => handleAnswer(currentQ.id, option)}
											type="button"
										>
											{option}
										</button>
									))}
								</div>
							)}

							{currentQ.type === "scale" && (
								<div className="space-y-3">
									<div className="flex justify-between text-muted-foreground text-xs">
										<span>{currentQ.scaleLabels?.min ?? "Low"}</span>
										<span>{currentQ.scaleLabels?.max ?? "High"}</span>
									</div>
									<div className="flex gap-2">
										{Array.from(
											{
												length:
													(currentQ.scaleMax ?? 10) -
													(currentQ.scaleMin ?? 1) +
													1,
											},
											(_, i) => i + (currentQ.scaleMin ?? 1),
										).map((num) => (
											<button
												className={cn(
													"flex-1 rounded-lg border py-3 font-medium transition-all",
													answers[currentQ.id] === num
														? "border-pink-500 bg-pink-500 text-white"
														: "border-border hover:border-pink-500/50 hover:bg-pink-500/5",
												)}
												key={num}
												onClick={() => handleAnswer(currentQ.id, num)}
												type="button"
											>
												{num}
											</button>
										))}
									</div>
								</div>
							)}
						</motion.div>
					);
				})()}
			</AnimatePresence>

			{/* Navigation dots */}
			<div className="flex justify-center gap-2">
				{questions.map((q, i) => (
					<button
						className={cn(
							"size-2 rounded-full transition-all",
							i === currentQuestion
								? "scale-125 bg-pink-500"
								: answers[q.id] !== undefined
									? "bg-pink-500/50"
									: "bg-pink-500/20",
						)}
						key={q.id}
						onClick={() => setCurrentQuestion(i)}
						type="button"
					/>
				))}
			</div>

			{allAnswered && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					initial={{ opacity: 0, y: 10 }}
				>
					<Button
						className="w-full bg-gradient-to-r from-pink-500 to-rose-500"
						onClick={() => onSubmit?.(answers)}
					>
						Submit Answers
						<ChevronRight className="ml-1 size-4" />
					</Button>
				</motion.div>
			)}
		</motion.div>
	);
}

// -----------------------------------------------------------------------------
// 13. LIFESTYLE RECOMMENDATIONS
// Personalized health and lifestyle suggestions
// -----------------------------------------------------------------------------

interface LifestyleCategory {
	category: string;
	icon: ReactNode;
	color: string;
	recommendations: {
		title: string;
		description: string;
		frequency?: string;
	}[];
}

interface LifestyleRecommendationsProps {
	title: string;
	categories: LifestyleCategory[];
}

function LifestyleRecommendations({
	title,
	categories,
}: LifestyleRecommendationsProps) {
	const [expandedCategory, setExpandedCategory] = useState<string | null>(
		categories[0]?.category ?? null,
	);

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="w-full space-y-4"
			initial={{ opacity: 0 }}
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-gradient-to-br from-lime-500 to-green-600 p-2">
					<Heart className="size-4 text-white" />
				</div>
				<div>
					<h3 className="font-semibold text-foreground">{title}</h3>
					<p className="text-muted-foreground text-xs">
						Personalized for your health profile
					</p>
				</div>
			</div>

			<div className="space-y-2">
				{categories.map((category, catIndex) => (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="overflow-hidden rounded-xl border border-border"
						initial={{ opacity: 0, y: 10 }}
						key={category.category}
						transition={{ delay: catIndex * 0.1 }}
					>
						<button
							className={cn(
								"flex w-full items-center gap-3 p-4 text-left transition-all",
								expandedCategory === category.category
									? "bg-muted/50"
									: "hover:bg-muted/30",
							)}
							onClick={() =>
								setExpandedCategory(
									expandedCategory === category.category
										? null
										: category.category,
								)
							}
							type="button"
						>
							<div className={cn("rounded-lg p-2", category.color)}>
								{category.icon}
							</div>
							<span className="flex-1 font-medium text-foreground">
								{category.category}
							</span>
							<Badge className="text-xs" variant="secondary">
								{category.recommendations.length} tips
							</Badge>
							<ChevronRight
								className={cn(
									"size-4 text-muted-foreground transition-transform",
									expandedCategory === category.category && "rotate-90",
								)}
							/>
						</button>
						<AnimatePresence>
							{expandedCategory === category.category && (
								<motion.div
									animate={{ height: "auto", opacity: 1 }}
									className="overflow-hidden border-border border-t"
									exit={{ height: 0, opacity: 0 }}
									initial={{ height: 0, opacity: 0 }}
								>
									<div className="space-y-3 p-4">
										{category.recommendations.map((rec, i) => (
											<motion.div
												animate={{ opacity: 1, x: 0 }}
												className="flex gap-3"
												initial={{ opacity: 0, x: -10 }}
												key={rec.title}
												transition={{ delay: i * 0.05 }}
											>
												<div className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500" />
												<div>
													<p className="font-medium text-foreground text-sm">
														{rec.title}
													</p>
													<p className="text-muted-foreground text-sm">
														{rec.description}
													</p>
													{rec.frequency && (
														<p className="mt-1 text-muted-foreground/70 text-xs">
															{rec.frequency}
														</p>
													)}
												</div>
											</motion.div>
										))}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}

// =============================================================================
// DEMO DATA
// =============================================================================

const demoVitals: Vital[] = [
	{
		label: "Heart Rate",
		value: 72,
		unit: "bpm",
		icon: <Heart className="size-4" />,
		status: "normal",
		trend: "stable",
		range: "60-100 bpm",
	},
	{
		label: "Blood Pressure",
		value: "128/82",
		unit: "mmHg",
		icon: <Activity className="size-4" />,
		status: "elevated",
		trend: "up",
		range: "< 120/80",
	},
	{
		label: "Temperature",
		value: 98.6,
		unit: "°F",
		icon: <Thermometer className="size-4" />,
		status: "normal",
		trend: "stable",
		range: "97-99°F",
	},
	{
		label: "Oxygen Sat",
		value: 98,
		unit: "%",
		icon: <Droplets className="size-4" />,
		status: "normal",
		trend: "stable",
		range: "95-100%",
	},
	{
		label: "Weight",
		value: 165,
		unit: "lbs",
		icon: <Scale className="size-4" />,
		status: "normal",
		trend: "down",
		range: "Goal: 160",
	},
	{
		label: "Blood Sugar",
		value: 142,
		unit: "mg/dL",
		icon: <Activity className="size-4" />,
		status: "elevated",
		trend: "up",
		range: "70-100",
	},
];

const demoMedications: Medication[] = [
	{
		name: "Lisinopril",
		dosage: "10mg",
		time: "8:00 AM",
		taken: true,
		instructions: "Take with food",
	},
	{
		name: "Metformin",
		dosage: "500mg",
		time: "8:00 AM",
		taken: true,
		instructions: "Take with breakfast",
	},
	{
		name: "Atorvastatin",
		dosage: "20mg",
		time: "9:00 PM",
		taken: false,
		instructions: "Take at bedtime",
	},
	{
		name: "Vitamin D",
		dosage: "2000 IU",
		time: "12:00 PM",
		taken: false,
		refillDue: true,
	},
];

const demoSymptoms: Symptom[] = [
	{
		name: "Headache",
		severity: "moderate",
		duration: "2 days",
		notes: "Behind eyes",
	},
	{ name: "Fatigue", severity: "mild", duration: "1 week" },
	{
		name: "Mild cough",
		severity: "mild",
		duration: "3 days",
		notes: "Dry, no mucus",
	},
];

const demoSlots: TimeSlot[] = [
	{ time: "9:00 AM", available: true, type: "in-person" },
	{ time: "9:30 AM", available: false },
	{ time: "10:00 AM", available: true, type: "telehealth" },
	{ time: "10:30 AM", available: true, type: "telehealth" },
	{ time: "11:00 AM", available: false },
	{ time: "11:30 AM", available: true, type: "in-person" },
	{ time: "2:00 PM", available: true, type: "telehealth" },
	{ time: "2:30 PM", available: false },
	{ time: "3:00 PM", available: true, type: "in-person" },
];

const demoRiskFactors: RiskFactor[] = [
	{
		name: "Cardiovascular",
		level: "moderate",
		score: 45,
		description: "Slightly elevated due to blood pressure readings",
	},
	{
		name: "Diabetes",
		level: "moderate",
		score: 55,
		description: "Blood sugar trending above target range",
	},
	{
		name: "Cholesterol",
		level: "low",
		score: 25,
		description: "Well-controlled with current medication",
	},
];

const demoLabResults: LabResult[] = [
	{
		name: "Glucose",
		value: 142,
		unit: "mg/dL",
		referenceRange: "70-100",
		status: "abnormal-high",
	},
	{
		name: "HbA1c",
		value: 6.8,
		unit: "%",
		referenceRange: "<5.7",
		status: "abnormal-high",
	},
	{
		name: "Cholesterol",
		value: 185,
		unit: "mg/dL",
		referenceRange: "<200",
		status: "normal",
	},
	{
		name: "HDL",
		value: 52,
		unit: "mg/dL",
		referenceRange: ">40",
		status: "normal",
	},
	{
		name: "LDL",
		value: 98,
		unit: "mg/dL",
		referenceRange: "<100",
		status: "normal",
	},
	{
		name: "Triglycerides",
		value: 145,
		unit: "mg/dL",
		referenceRange: "<150",
		status: "normal",
	},
];

// Demo data for new components

const demoDifferentialDiagnosis: DiagnosisOption[] = [
	{
		condition: "Tension Headache",
		likelihood: "high",
		matchingSymptoms: ["Headache", "Fatigue", "Stress"],
		description:
			"Most common type of headache, often triggered by stress, poor posture, or lack of sleep. Typically presents as a dull, pressing pain.",
	},
	{
		condition: "Viral Upper Respiratory Infection",
		likelihood: "moderate",
		matchingSymptoms: ["Headache", "Fatigue", "Cough"],
		description:
			"Common cold or flu-like illness. Usually self-limiting and resolves within 7-10 days.",
		ruledOutBy: "No fever reported",
	},
	{
		condition: "Seasonal Allergies",
		likelihood: "moderate",
		matchingSymptoms: ["Headache", "Cough"],
		description:
			"Allergic response to environmental triggers. Often seasonal with clear nasal discharge.",
		ruledOutBy: "Allergy testing",
	},
	{
		condition: "Migraine",
		likelihood: "low",
		matchingSymptoms: ["Headache"],
		description:
			"Typically presents with throbbing pain, often one-sided, may include nausea or light sensitivity.",
		ruledOutBy: "No nausea or light sensitivity reported",
	},
];

const demoCarePlan: CarePlanProps = {
	title: "Recovery Care Plan",
	duration: "Next 5-7 days",
	steps: [
		{
			action: "Rest and hydration",
			timing: "Ongoing",
			details:
				"Aim for 8+ hours of sleep and drink at least 8 glasses of water daily",
			priority: "required",
		},
		{
			action: "Over-the-counter pain relief",
			timing: "As needed",
			details:
				"Acetaminophen 500mg or Ibuprofen 200mg every 6 hours for headache",
			priority: "recommended",
		},
		{
			action: "Monitor temperature",
			timing: "Twice daily",
			details: "Check in morning and evening, record readings",
			priority: "recommended",
		},
		{
			action: "Limit screen time",
			timing: "During recovery",
			details: "Reduce to 2 hours max to help with headache recovery",
			priority: "optional",
		},
	],
	warningSigns: [
		"Fever above 101.3°F (38.5°C)",
		"Severe headache that doesn't respond to medication",
		"Stiff neck or confusion",
		"Difficulty breathing",
	],
	followUp:
		"If symptoms persist beyond 7 days or worsen, schedule a follow-up appointment.",
};

const demoMedicationExplainer: MedicationExplainerProps = {
	name: "Ibuprofen",
	genericName: "Ibuprofen",
	purpose: "Pain relief and anti-inflammatory",
	howItWorks:
		"Ibuprofen belongs to a class of drugs called NSAIDs. It works by blocking the production of prostaglandins, chemicals that cause inflammation, pain, and fever.",
	dosage: "200-400mg",
	instructions: [
		"Take every 4-6 hours as needed",
		"Take with food or milk to prevent stomach upset",
		"Do not exceed 1200mg in 24 hours without medical supervision",
		"Swallow tablets whole with a full glass of water",
	],
	sideEffects: {
		common: ["Stomach upset", "Nausea", "Dizziness", "Mild headache"],
		serious: [
			"Black/bloody stool",
			"Chest pain",
			"Severe stomach pain",
			"Vision changes",
		],
	},
	interactions: [
		"Aspirin",
		"Blood thinners (Warfarin)",
		"Alcohol",
		"Other NSAIDs",
		"ACE inhibitors",
	],
	warnings: [
		"Do not use if you have a history of stomach ulcers or bleeding",
		"Avoid if allergic to aspirin or other NSAIDs",
	],
};

const demoSelfExam: SelfExamGuideProps = {
	examType: "Lymph Node Self-Examination",
	purpose: "Check for swollen lymph nodes that may indicate infection",
	duration: "2-3 minutes",
	steps: [
		{
			step: 1,
			title: "Prepare",
			instruction:
				"Stand in front of a mirror in good lighting. Relax your neck and shoulders.",
			tip: "It's easier to feel lymph nodes when your muscles are relaxed.",
		},
		{
			step: 2,
			title: "Check under your jaw",
			instruction:
				"Using your fingertips, gently press along the underside of your jaw on both sides. Feel for any lumps or tenderness.",
			tip: "Normal lymph nodes feel like small peas and are usually not tender.",
		},
		{
			step: 3,
			title: "Check sides of neck",
			instruction:
				"Move your fingers down the sides of your neck, along the muscle that runs from behind your ear to your collarbone. Press gently but firmly.",
			warning: "Don't press too hard - firm but gentle pressure is enough.",
		},
		{
			step: 4,
			title: "Check behind ears",
			instruction:
				"Feel the area just behind and below your earlobes on both sides.",
		},
		{
			step: 5,
			title: "Check base of skull",
			instruction:
				"Run your fingers along the base of your skull where it meets your neck.",
			tip: "This area can be tender if you have tension headaches.",
		},
	],
	whatToLookFor: [
		"Lumps larger than a pea",
		"Tenderness when pressing",
		"Lumps that are hard or don't move",
		"Asymmetry between sides",
	],
	whenToWorry: [
		"Lumps larger than 1 inch",
		"Nodes that are hard and fixed",
		"Swelling that persists more than 2 weeks",
		"Unexplained weight loss with swollen nodes",
	],
};

const demoConditionExplainer: ConditionExplainerProps = {
	condition: "Tension-Type Headache",
	pronunciation: "TEN-shun type HED-ayk",
	summary:
		"Tension-type headaches are the most common form of headache, affecting about 80% of people at some point. They cause a constant, dull, pressing or tightening pain, usually on both sides of the head.",
	causes: [
		"Stress and anxiety",
		"Poor posture",
		"Eye strain (especially from screens)",
		"Lack of sleep or irregular sleep",
		"Skipping meals",
		"Dehydration",
	],
	symptoms: [
		"Dull, aching head pain",
		"Sensation of tightness or pressure",
		"Tenderness in scalp, neck, and shoulders",
		"Usually affects both sides of head",
	],
	riskFactors: [
		"High stress",
		"Desk work",
		"Poor sleep",
		"Caffeine overuse",
		"Female gender",
	],
	treatmentOptions: [
		{
			type: "Over-the-counter medications",
			description:
				"Acetaminophen, ibuprofen, or aspirin can provide relief. Avoid overuse (more than 2-3 times per week) to prevent rebound headaches.",
		},
		{
			type: "Lifestyle modifications",
			description:
				"Regular sleep schedule, stress management, proper hydration, and regular exercise can significantly reduce frequency.",
		},
		{
			type: "Physical therapy",
			description:
				"For chronic cases, physical therapy focusing on neck and shoulder muscles, posture correction, and relaxation techniques may help.",
		},
	],
	prognosis:
		"Tension headaches are not dangerous and typically respond well to treatment. With lifestyle modifications, most people can significantly reduce their frequency and severity.",
	prevention: [
		"Maintain regular sleep schedule",
		"Stay hydrated throughout the day",
		"Take regular breaks from screens",
		"Practice stress management techniques",
		"Maintain good posture",
	],
};

const demoFollowUpQuestions: FollowUpQuestionsProps = {
	context: "To better understand your headache",
	questions: [
		{
			id: "q1",
			question: "Where exactly is the pain located?",
			type: "choice",
			options: [
				"Both sides of head",
				"One side only",
				"Behind the eyes",
				"Back of head/neck",
				"Forehead",
			],
		},
		{
			id: "q2",
			question: "How would you describe the pain?",
			type: "choice",
			options: [
				"Dull/aching",
				"Throbbing/pulsing",
				"Sharp/stabbing",
				"Pressure/tightness",
			],
		},
		{
			id: "q3",
			question: "On a scale of 1-10, how severe is the pain right now?",
			type: "scale",
			scaleMin: 1,
			scaleMax: 10,
			scaleLabels: { min: "Mild", max: "Severe" },
		},
		{
			id: "q4",
			question: "Do you have any of these accompanying symptoms?",
			type: "choice",
			options: [
				"Nausea",
				"Light sensitivity",
				"Sound sensitivity",
				"Vision changes",
				"None of these",
			],
		},
	],
};

const demoLifestyleRecommendations: LifestyleRecommendationsProps = {
	title: "Lifestyle Recommendations",
	categories: [
		{
			category: "Sleep Hygiene",
			icon: <Moon className="size-4 text-white" />,
			color: "bg-indigo-500",
			recommendations: [
				{
					title: "Consistent sleep schedule",
					description:
						"Go to bed and wake up at the same time every day, even weekends.",
					frequency: "Daily",
				},
				{
					title: "Limit screen time before bed",
					description: "Avoid phones and computers for 1 hour before sleep.",
					frequency: "Every night",
				},
				{
					title: "Cool, dark bedroom",
					description: "Keep your room at 65-68°F and use blackout curtains.",
				},
			],
		},
		{
			category: "Stress Management",
			icon: <Heart className="size-4 text-white" />,
			color: "bg-rose-500",
			recommendations: [
				{
					title: "Deep breathing exercises",
					description:
						"Practice 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s.",
					frequency: "2-3 times daily",
				},
				{
					title: "Regular breaks",
					description: "Take a 5-minute break every hour during work.",
					frequency: "Hourly",
				},
				{
					title: "Physical activity",
					description:
						"30 minutes of moderate exercise helps reduce stress hormones.",
					frequency: "At least 3x/week",
				},
			],
		},
		{
			category: "Hydration & Nutrition",
			icon: <Droplets className="size-4 text-white" />,
			color: "bg-cyan-500",
			recommendations: [
				{
					title: "Water intake",
					description:
						"Drink at least 8 glasses (64 oz) of water throughout the day.",
					frequency: "Daily",
				},
				{
					title: "Regular meals",
					description:
						"Don't skip meals - low blood sugar can trigger headaches.",
					frequency: "3 meals + snacks",
				},
				{
					title: "Limit caffeine",
					description: "Keep coffee to 2-3 cups max. Avoid caffeine after 2pm.",
					frequency: "Daily",
				},
			],
		},
	],
};

// =============================================================================
// CHAT INTERFACE
// =============================================================================

type MessageContent =
	| { type: "text"; text: string }
	| { type: "vitals"; data: VitalsDashboardProps }
	| { type: "medications"; data: MedicationScheduleProps }
	| { type: "symptoms"; data: SymptomAssessmentProps }
	| { type: "appointment"; data: AppointmentSchedulerProps }
	| { type: "risk"; data: HealthRiskAssessmentProps }
	| { type: "labs"; data: LabResultsSummaryProps }
	| { type: "differential"; data: DifferentialDiagnosisProps }
	| { type: "carePlan"; data: CarePlanProps }
	| { type: "medicationInfo"; data: MedicationExplainerProps }
	| { type: "selfExam"; data: SelfExamGuideProps }
	| { type: "conditionInfo"; data: ConditionExplainerProps }
	| { type: "followUp"; data: FollowUpQuestionsProps }
	| { type: "lifestyle"; data: LifestyleRecommendationsProps };

interface Message {
	id: string;
	role: "user" | "assistant";
	content: MessageContent[];
}

const demoConversation: Message[] = [
	{
		id: "1",
		role: "user",
		content: [{ type: "text", text: "Can you show me my current vitals?" }],
	},
	{
		id: "2",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Here are your most recent vital measurements. Your blood pressure and blood sugar are slightly elevated - let's keep an eye on those.",
			},
			{
				type: "vitals",
				data: { vitals: demoVitals, lastUpdated: "Today, 8:30 AM" },
			},
		],
	},
	{
		id: "3",
		role: "user",
		content: [
			{ type: "text", text: "What medications do I need to take today?" },
		],
	},
	{
		id: "4",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Here's your medication schedule for today. Good job taking your morning doses! Don't forget your Vitamin D needs a refill soon.",
			},
			{
				type: "medications",
				data: { medications: demoMedications },
			},
		],
	},
	{
		id: "5",
		role: "user",
		content: [
			{
				type: "text",
				text: "I've been having headaches for a couple days and feeling tired. Also a slight cough.",
			},
		],
	},
	{
		id: "6",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "I've logged your symptoms. Based on what you've described, this could be related to seasonal allergies or a mild viral infection. Here's my assessment:",
			},
			{
				type: "symptoms",
				data: {
					symptoms: demoSymptoms,
					recommendation:
						"Your symptoms appear mild and consistent with seasonal allergies or a mild cold. Rest, stay hydrated, and consider over-the-counter antihistamines. If symptoms worsen or fever develops, schedule an appointment.",
					urgency: "routine",
				},
			},
		],
	},
	{
		id: "7",
		role: "user",
		content: [
			{ type: "text", text: "Can I schedule an appointment just to be safe?" },
		],
	},
	{
		id: "8",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Absolutely, prevention is always a good approach. Here are the available slots with Dr. Sarah Chen this week:",
			},
			{
				type: "appointment",
				data: {
					date: "Thursday, January 23rd",
					provider: "Dr. Sarah Chen",
					specialty: "Internal Medicine",
					slots: demoSlots,
				},
			},
		],
	},
	{
		id: "9",
		role: "user",
		content: [
			{ type: "text", text: "What's my overall health risk looking like?" },
		],
	},
	{
		id: "10",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Based on your health data and recent measurements, here's your personalized risk assessment:",
			},
			{
				type: "risk",
				data: {
					overallRisk: "moderate",
					factors: demoRiskFactors,
				},
			},
		],
	},
	{
		id: "11",
		role: "user",
		content: [{ type: "text", text: "Show me my recent lab results" }],
	},
	{
		id: "12",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Here are your results from last week's blood panel. Your glucose and HbA1c are elevated, which aligns with the blood sugar readings we saw in your vitals.",
			},
			{
				type: "labs",
				data: {
					testName: "Comprehensive Metabolic Panel",
					date: "January 15, 2026",
					results: demoLabResults,
				},
			},
		],
	},
	// NEW GENERATIVE UI DEMOS
	{
		id: "13",
		role: "user",
		content: [
			{
				type: "text",
				text: "What do you think might be causing my headaches?",
			},
		],
	},
	{
		id: "14",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Based on your symptoms, here are the most likely possibilities. I've ranked them by how well they match what you've described:",
			},
			{
				type: "differential",
				data: {
					possibleConditions: demoDifferentialDiagnosis,
					keyQuestion:
						"Does the headache get worse with bright lights or loud sounds? This would help distinguish between tension headache and migraine.",
				},
			},
		],
	},
	{
		id: "15",
		role: "user",
		content: [
			{
				type: "text",
				text: "Tell me more about tension headaches",
			},
		],
	},
	{
		id: "16",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Here's everything you need to know about tension-type headaches:",
			},
			{
				type: "conditionInfo",
				data: demoConditionExplainer,
			},
		],
	},
	{
		id: "17",
		role: "user",
		content: [
			{
				type: "text",
				text: "Can you ask me some follow-up questions to help narrow it down?",
			},
		],
	},
	{
		id: "18",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Of course! Let me ask you a few targeted questions:",
			},
			{
				type: "followUp",
				data: demoFollowUpQuestions,
			},
		],
	},
	{
		id: "19",
		role: "user",
		content: [
			{
				type: "text",
				text: "What should I do to feel better?",
			},
		],
	},
	{
		id: "20",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Here's a care plan to help you recover. Follow these steps over the next week:",
			},
			{
				type: "carePlan",
				data: demoCarePlan,
			},
		],
	},
	{
		id: "21",
		role: "user",
		content: [
			{
				type: "text",
				text: "What about ibuprofen - is that safe for me?",
			},
		],
	},
	{
		id: "22",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Good question! Here's detailed information about ibuprofen to help you use it safely:",
			},
			{
				type: "medicationInfo",
				data: demoMedicationExplainer,
			},
		],
	},
	{
		id: "23",
		role: "user",
		content: [
			{
				type: "text",
				text: "Should I check my lymph nodes to see if they're swollen?",
			},
		],
	},
	{
		id: "24",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "That's a good idea - swollen lymph nodes could indicate your body is fighting an infection. Here's how to check them:",
			},
			{
				type: "selfExam",
				data: demoSelfExam,
			},
		],
	},
	{
		id: "25",
		role: "user",
		content: [
			{
				type: "text",
				text: "Any lifestyle changes that could help prevent these headaches?",
			},
		],
	},
	{
		id: "26",
		role: "assistant",
		content: [
			{
				type: "text",
				text: "Absolutely! Here are personalized lifestyle recommendations that can help reduce headache frequency:",
			},
			{
				type: "lifestyle",
				data: demoLifestyleRecommendations,
			},
		],
	},
];

function MessageBubble({ message }: { message: Message }) {
	const isUser = message.role === "user";

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className={cn("flex gap-3", isUser && "flex-row-reverse")}
			initial={{ opacity: 0, y: 20 }}
		>
			<div
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-full",
					isUser
						? "bg-gradient-to-br from-blue-500 to-indigo-600"
						: "bg-gradient-to-br from-emerald-500 to-teal-600",
				)}
			>
				{isUser ? (
					<User className="size-4 text-white" />
				) : (
					<Bot className="size-4 text-white" />
				)}
			</div>
			<div
				className={cn("flex max-w-[85%] flex-col gap-3", isUser && "items-end")}
			>
				{message.content.map((content) => {
					const contentKey = `${message.id}-${content.type}`;
					if (content.type === "text") {
						return (
							<div
								className={cn(
									"rounded-2xl px-4 py-2.5 text-sm",
									isUser
										? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
										: "bg-muted text-foreground",
								)}
								key={contentKey}
							>
								{content.text}
							</div>
						);
					}
					if (content.type === "vitals") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<VitalsDashboard {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "medications") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<MedicationSchedule {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "symptoms") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<SymptomAssessment {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "appointment") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<AppointmentScheduler {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "risk") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<HealthRiskAssessment {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "labs") {
						return (
							<Card className="w-full max-w-lg" key={contentKey}>
								<CardContent className="pt-4">
									<LabResultsSummary {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "differential") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<DifferentialDiagnosis {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "carePlan") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<CarePlan {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "medicationInfo") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<MedicationExplainer {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "selfExam") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<SelfExamGuide {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "conditionInfo") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<ConditionExplainer {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "followUp") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<FollowUpQuestions {...content.data} />
								</CardContent>
							</Card>
						);
					}
					if (content.type === "lifestyle") {
						return (
							<Card className="w-full max-w-md" key={contentKey}>
								<CardContent className="pt-4">
									<LifestyleRecommendations {...content.data} />
								</CardContent>
							</Card>
						);
					}
					return null;
				})}
			</div>
		</motion.div>
	);
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function ExamplePage() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [messageIndex, setMessageIndex] = useState(0);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [darkMode, setDarkMode] = useState(false);

	const messagesLength = messages.length;
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messagesLength]);

	useEffect(() => {
		// Check initial theme
		setDarkMode(document.documentElement.classList.contains("dark"));
	}, []);

	const toggleTheme = () => {
		document.documentElement.classList.toggle("dark");
		setDarkMode(!darkMode);
	};

	const simulateNextMessage = () => {
		if (messageIndex >= demoConversation.length) return;

		const nextMessage = demoConversation[messageIndex];
		if (!nextMessage) return;

		if (nextMessage.role === "user") {
			setMessages((prev) => [...prev, nextMessage]);
			setMessageIndex((prev) => prev + 1);

			// Simulate assistant typing
			setTimeout(() => {
				setIsTyping(true);
				setTimeout(() => {
					setIsTyping(false);
					const assistantMessage = demoConversation[messageIndex + 1];
					if (assistantMessage) {
						setMessages((prev) => [...prev, assistantMessage]);
						setMessageIndex((prev) => prev + 1);
					}
				}, 1500);
			}, 500);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim()) return;

		// For demo, just trigger next message in sequence
		simulateNextMessage();
		setInput("");
	};

	const handleQuickAction = (action: string) => {
		setInput(action);
		simulateNextMessage();
	};

	const quickActions = [
		"Show me my vitals",
		"What medications do I take?",
		"I have symptoms to report",
		"Schedule an appointment",
		"Show my health risk",
		"View lab results",
		"What could be causing this?",
		"Tell me about this condition",
		"Ask me follow-up questions",
		"Give me a care plan",
		"Explain this medication",
		"How do I check my lymph nodes?",
		"Lifestyle recommendations",
	];

	return (
		<div className="flex h-screen flex-col bg-gradient-to-b from-background to-muted/30">
			{/* Header */}
			<header className="flex items-center justify-between border-border border-b bg-background/80 px-6 py-4 backdrop-blur-sm">
				<div className="flex items-center gap-3">
					<div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5">
						<Stethoscope className="size-5 text-white" />
					</div>
					<div>
						<h1 className="font-light text-foreground chroma-text-hover">Carely AI</h1>
						<p className="text-muted-foreground text-xs">
							Your AI Primary Care Physician
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={toggleTheme} size="icon" variant="ghost">
						{darkMode ? (
							<Sun className="size-4" />
						) : (
							<Moon className="size-4" />
						)}
					</Button>
					<Badge className="text-xs" variant="outline">
						Generative UI Demo
					</Badge>
				</div>
			</header>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-4 py-6">
				<div className="mx-auto max-w-3xl space-y-6">
					{messages.length === 0 && (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className="py-12 text-center"
							initial={{ opacity: 0, y: 20 }}
						>
							<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600">
								<Sparkles className="size-8 text-white" />
							</div>
							<h2 className="mb-2 font-semibold text-foreground text-xl">
								Welcome to Carely AI
							</h2>
							<p className="mx-auto mb-6 max-w-md text-muted-foreground">
								I'm your AI primary care assistant. Ask me about your vitals,
								medications, symptoms, or schedule appointments.
							</p>
							<div className="flex flex-wrap justify-center gap-2">
								{quickActions.map((action) => (
									<Button
										className="text-xs"
										key={action}
										onClick={() => handleQuickAction(action)}
										size="sm"
										variant="outline"
									>
										{action}
									</Button>
								))}
							</div>
						</motion.div>
					)}

					<AnimatePresence mode="popLayout">
						{messages.map((message) => (
							<MessageBubble key={message.id} message={message} />
						))}
					</AnimatePresence>

					{isTyping && (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className="flex gap-3"
							initial={{ opacity: 0, y: 10 }}
						>
							<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
								<Bot className="size-4 text-white" />
							</div>
							<div className="rounded-2xl bg-muted px-4 py-3">
								<div className="flex gap-1">
									<motion.span
										animate={{ opacity: [0.4, 1, 0.4] }}
										className="size-2 rounded-full bg-muted-foreground/50"
										transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
									/>
									<motion.span
										animate={{ opacity: [0.4, 1, 0.4] }}
										className="size-2 rounded-full bg-muted-foreground/50"
										transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
									/>
									<motion.span
										animate={{ opacity: [0.4, 1, 0.4] }}
										className="size-2 rounded-full bg-muted-foreground/50"
										transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
									/>
								</div>
							</div>
						</motion.div>
					)}

					<div ref={messagesEndRef} />
				</div>
			</div>

			{/* Quick Actions (when there are messages) */}
			{messages.length > 0 && messageIndex < demoConversation.length && (
				<div className="border-border border-t bg-background/80 px-4 py-3 backdrop-blur-sm">
					<div className="mx-auto max-w-3xl">
						<div className="flex flex-wrap gap-2">
							{quickActions
								.slice(messageIndex / 2, messageIndex / 2 + 3)
								.map((action) => (
									<Button
										className="text-xs"
										key={action}
										onClick={() => handleQuickAction(action)}
										size="sm"
										variant="outline"
									>
										{action}
									</Button>
								))}
						</div>
					</div>
				</div>
			)}

			{/* Input */}
			<div className="border-border border-t bg-background px-4 py-4">
				<form
					className="mx-auto flex max-w-3xl items-center gap-3"
					onSubmit={handleSubmit}
				>
					<input
						className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
						onChange={(e) => setInput(e.target.value)}
						placeholder="Ask about your health..."
						type="text"
						value={input}
					/>
					<Button
						className="size-11 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
						size="icon"
						type="submit"
					>
						<Send className="size-4" />
					</Button>
				</form>
				<p className="mt-2 text-center text-muted-foreground text-xs">
					This is a demo. Click quick actions or type to see generative UI
					components.
				</p>
			</div>
		</div>
	);
}
