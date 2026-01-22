"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { authClient } from "@/server/better-auth/client";
import { Plus, X, Pill, Stethoscope, Hospital, Check } from "lucide-react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import useMeasure from "react-use-measure";

type Medication = {
  id: string;
  name: string;
  dosage: string;
  notes: string;
};

type MedicalEvent = {
  id: string;
  type: "surgery" | "hospitalization" | "illness";
  description: string;
  year: string;
};

type LifestyleAnswer = "yes" | "no" | null;

type LifestyleAnswers = {
  smoking: LifestyleAnswer;
  formerSmoker: LifestyleAnswer;
  alcohol: LifestyleAnswer;
  recreationalDrugs: LifestyleAnswer;
  sexuallyActive: LifestyleAnswer;
  exercise: LifestyleAnswer;
};

type IntakeFormData = {
  dateOfBirth: string;
  sexAssignedAtBirth: string;
  gender: string;
  allergies: string;
  chronicIllnesses: string[];
  customChronicIllness: string;
  medicalHistory: MedicalEvent[];
  currentMedications: Medication[];
  lifestyleAnswers: LifestyleAnswers;
};

const SEX_ASSIGNED_AT_BIRTH_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

const GENDER_OPTIONS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "trans-woman", label: "Trans woman" },
  { value: "trans-man", label: "Trans man" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

const CHRONIC_ILLNESS_OPTIONS = [
  "Diabetes (Type 1)",
  "Diabetes (Type 2)",
  "Hypertension",
  "Asthma",
  "COPD",
  "Heart Disease",
  "Arthritis",
  "Depression",
  "Anxiety",
  "Thyroid Disorder",
  "Chronic Pain",
  "Migraine",
  "Epilepsy",
  "Autoimmune Disorder",
  "Kidney Disease",
  "Cancer (past or present)",
];

const STEPS = [
  {
    id: "dateOfBirth",
    title: "What is your date of birth?",
    description: "This helps us provide age-appropriate care recommendations.",
    placeholder: "MM/DD/YYYY",
    type: "text",
  },
  {
    id: "sexAssignedAtBirth",
    title: "What sex were you assigned at birth?",
    description: "This information helps us provide appropriate medical care. Your response is confidential.",
    placeholder: "",
    type: "custom",
  },
  {
    id: "gender",
    title: "What is your gender identity?",
    description: "We want to address you correctly and provide inclusive care.",
    placeholder: "",
    type: "custom",
  },
  {
    id: "allergies",
    title: "Do you have any known allergies?",
    description: "Include food, medication, and environmental allergies.",
    placeholder: "e.g., Penicillin, Peanuts, Pollen",
    type: "text",
  },
  {
    id: "chronicIllnesses",
    title: "Do you have any chronic conditions?",
    description: "Select any that apply or add your own.",
    placeholder: "",
    type: "custom",
  },
  {
    id: "medicalHistory",
    title: "Any past surgeries, hospitalizations, or major illnesses?",
    description: "Add any significant medical events from your history.",
    placeholder: "",
    type: "custom",
  },
  {
    id: "medications",
    title: "What medications are you currently taking?",
    description: "Include prescriptions, over-the-counter, and supplements.",
    placeholder: "",
    type: "custom",
  },
  {
    id: "lifestyle",
    title: "Just a few final things",
    description: "These lifestyle questions help us get a fuller picture of your health.",
    placeholder: "",
    type: "custom",
  },
] as const;

type Direction = 1 | -1;

const STEP_VARIANTS = {
  initial(direction: Direction) {
    return { x: `${25 * direction}%`, opacity: 0 };
  },
  active: {
    x: "0%",
    opacity: 1,
    transition: {
      delay: 0.15,
      type: "spring",
      bounce: 0,
      duration: 0.5,
    },
  },
  exit(direction: Direction) {
    return {
      x: `${-50 * direction}%`,
      opacity: 0,
      transition: {
        x: {
          type: "spring",
          bounce: 0,
          duration: 0.5,
        },
        opacity: {
          duration: 0.2,
        },
      },
    };
  },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function SelectionGrid({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-4 py-3.5 text-sm rounded-xl border-2 transition-all text-left font-medium ${selected === option.value
            ? "border-primary bg-primary/10 text-primary"
            : "border-border hover:border-primary/50 hover:bg-muted"
            }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChronicIllnessInput({
  selected,
  customIllness,
  onToggle,
  onCustomChange,
  onAddCustom,
}: {
  selected: string[];
  customIllness: string;
  onToggle: (illness: string) => void;
  onCustomChange: (value: string) => void;
  onAddCustom: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 max-h-[35vh] overflow-y-auto pb-2">
        {CHRONIC_ILLNESS_OPTIONS.map((illness) => {
          const isSelected = selected.includes(illness);
          return (
            <button
              key={illness}
              type="button"
              onClick={() => onToggle(illness)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-full border-2 transition-all ${isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary/50 hover:bg-muted"
                }`}
            >
              {isSelected && <Check className="size-3.5" />}
              {illness}
            </button>
          );
        })}
        {selected
          .filter((s) => !CHRONIC_ILLNESS_OPTIONS.includes(s))
          .map((custom) => (
            <button
              key={custom}
              type="button"
              onClick={() => onToggle(custom)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-full border-2 border-primary bg-primary text-primary-foreground transition-all"
            >
              <Check className="size-3.5" />
              {custom}
            </button>
          ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Add another condition..."
          value={customIllness}
          onChange={(e) => onCustomChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customIllness.trim()) {
              e.preventDefault();
              onAddCustom();
            }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={onAddCustom}
          disabled={!customIllness.trim()}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {selected.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Select any conditions that apply, or skip if none
        </p>
      )}
    </div>
  );
}

function MedicalHistoryInput({
  events,
  onChange,
}: {
  events: MedicalEvent[];
  onChange: (events: MedicalEvent[]) => void;
}) {
  function addEvent(type: MedicalEvent["type"]) {
    onChange([...events, { id: generateId(), type, description: "", year: "" }]);
  }

  function updateEvent(index: number, event: MedicalEvent) {
    const updated = [...events];
    updated[index] = event;
    onChange(updated);
  }

  function removeEvent(index: number) {
    onChange(events.filter((_, i) => i !== index));
  }

  const typeConfig = {
    surgery: { icon: Stethoscope, label: "Surgery", color: "text-blue-500" },
    hospitalization: { icon: Hospital, label: "Hospitalization", color: "text-amber-500" },
    illness: { icon: Pill, label: "Major Illness", color: "text-rose-500" },
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center">
        {(["surgery", "hospitalization", "illness"] as const).map((type) => {
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addEvent(type)}
              className="flex-1"
            >
              <Icon className={`size-4 mr-1.5 ${config.color}`} />
              {config.label}
            </Button>
          );
        })}
      </div>

      <div className="max-h-[40vh] overflow-y-auto px-1 pt-1 pb-1 min-h-[76px]">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
            Click a button above to add an event, or skip if none
          </p>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {events.map((event, index) => {
                const config = typeConfig[event.type];
                const Icon = config.icon;
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    layout
                  >
                    <Card size="sm">
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`size-4 ${config.color}`} />
                            <span className="text-sm font-medium">{config.label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEvent(index)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            aria-label="Remove event"
                          >
                            <X className="size-4 text-muted-foreground" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder={`Describe the ${event.type}...`}
                            value={event.description}
                            onChange={(e) =>
                              updateEvent(index, { ...event, description: e.target.value })
                            }
                            className="flex-1 text-sm"
                          />
                          <Input
                            placeholder="Year"
                            value={event.year}
                            onChange={(e) =>
                              updateEvent(index, { ...event, year: e.target.value.slice(0, 4) })
                            }
                            className="w-20 text-sm text-center"
                            maxLength={4}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function MedicationsInput({
  medications,
  onChange,
}: {
  medications: Medication[];
  onChange: (medications: Medication[]) => void;
}) {
  function addMedication() {
    onChange([...medications, { id: generateId(), name: "", dosage: "", notes: "" }]);
  }

  function updateMedication(index: number, medication: Medication) {
    const updated = [...medications];
    updated[index] = medication;
    onChange(updated);
  }

  function removeMedication(index: number) {
    onChange(medications.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="size-5 text-primary" />
          <span className="text-sm font-medium">
            {medications.length === 0
              ? "No medications added"
              : `${medications.length} medication${medications.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addMedication}>
          <Plus className="size-4 mr-1.5" />
          Add
        </Button>
      </div>

      <div className="max-h-[40vh] overflow-y-auto px-1 pt-1 pb-1 min-h-[76px]">
        {medications.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
            Click "Add" to list your current medications, or skip if none
          </p>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {medications.map((med, index) => (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  layout
                >
                  <Card size="sm">
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Medication name"
                          value={med.name}
                          onChange={(e) => updateMedication(index, { ...med, name: e.target.value })}
                          className="text-sm flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeMedication(index)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          aria-label="Remove medication"
                        >
                          <X className="size-4 text-muted-foreground" />
                        </button>
                      </div>
                      <Input
                        placeholder="Dosage (e.g., 10mg twice daily)"
                        value={med.dosage}
                        onChange={(e) => updateMedication(index, { ...med, dosage: e.target.value })}
                        className="text-sm"
                      />
                      <Textarea
                        placeholder="Additional notes (e.g. schedule, reason for taking)"
                        value={med.notes}
                        onChange={(e) => updateMedication(index, { ...med, notes: e.target.value })}
                        className="text-sm min-h-[60px] resize-none"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

const LIFESTYLE_QUESTIONS: { id: keyof LifestyleAnswers; question: string }[] = [
  { id: "smoking", question: "Do you currently smoke (including vapes)?" },
  { id: "formerSmoker", question: "Are you a former smoker?" },
  { id: "alcohol", question: "Do you drink alcohol?" },
  { id: "recreationalDrugs", question: "Do you use recreational drugs?" },
  { id: "sexuallyActive", question: "Are you sexually active?" },
  { id: "exercise", question: "Do you exercise regularly?" },
];

function LifestyleQuestionsTable({
  answers,
  onChange,
}: {
  answers: LifestyleAnswers;
  onChange: (answers: LifestyleAnswers) => void;
}) {
  function handleAnswer(questionId: keyof LifestyleAnswers, answer: LifestyleAnswer) {
    onChange({
      ...answers,
      [questionId]: answers[questionId] === answer ? null : answer,
    });
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_64px_64px] bg-muted/50 border-b">
        <div className="px-4 py-3 text-sm font-medium text-muted-foreground">
          Question
        </div>
        <div className="px-2 py-3 text-sm font-medium text-center text-muted-foreground border-l">
          Yes
        </div>
        <div className="px-2 py-3 text-sm font-medium text-center text-muted-foreground border-l">
          No
        </div>
      </div>

      {/* Rows */}
      {LIFESTYLE_QUESTIONS.map((item, index) => (
        <div
          key={item.id}
          className={`grid grid-cols-[1fr_64px_64px] ${index !== LIFESTYLE_QUESTIONS.length - 1 ? "border-b" : ""
            }`}
        >
          <div className="px-4 py-3.5 text-sm flex items-center">
            {item.question}
          </div>
          <button
            type="button"
            onClick={() => handleAnswer(item.id, "yes")}
            className="flex items-center justify-center border-l hover:bg-muted transition-colors"
            aria-label={`Yes for ${item.question}`}
          >
            {answers[item.id] === "yes" && <Check className="size-5 text-primary" />}
          </button>
          <button
            type="button"
            onClick={() => handleAnswer(item.id, "no")}
            className="flex items-center justify-center border-l hover:bg-muted transition-colors"
            aria-label={`No for ${item.question}`}
          >
            {answers[item.id] === "no" && <Check className="size-5 text-primary" />}
          </button>
        </div>
      ))}
    </div>
  );
}

function formatDateInput(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");

  // Format as MM/DD/YYYY with slashes appearing after complete sections
  if (digits.length < 2) {
    return digits;
  } else if (digits.length === 2) {
    return `${digits}/`;
  } else if (digits.length < 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  } else if (digits.length === 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/`;
  } else {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
}

function validateDateOfBirth(value: string): string | null {
  // Check if the format is complete (MM/DD/YYYY)
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = value.match(dateRegex);

  if (!match) {
    return "Please enter a complete date in MM/DD/YYYY format";
  }

  const month = parseInt(match[1]!, 10);
  const day = parseInt(match[2]!, 10);
  const year = parseInt(match[3]!, 10);

  // Validate month
  if (month < 1 || month > 12) {
    return "Please enter a valid month (01-12)";
  }

  // Validate day
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return `Please enter a valid day (01-${daysInMonth}) for this month`;
  }

  // Create date and check if it's not in the future
  const inputDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inputDate > today) {
    return "Date of birth cannot be in the future";
  }

  // Check for reasonable age (e.g., not more than 150 years old)
  const minYear = today.getFullYear() - 150;
  if (year < minYear) {
    return "Please enter a valid year";
  }

  return null;
}

export default function IntakePage() {
  const router = useRouter();
  const session = authClient.useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<Direction>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState<IntakeFormData>({
    dateOfBirth: "",
    sexAssignedAtBirth: "",
    gender: "",
    allergies: "",
    chronicIllnesses: [],
    customChronicIllness: "",
    medicalHistory: [],
    currentMedications: [],
    lifestyleAnswers: {
      smoking: null,
      formerSmoker: null,
      alcohol: null,
      recreationalDrugs: null,
      sexuallyActive: null,
      exercise: null,
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [measureRef, bounds] = useMeasure();

  const submitIntake = api.appointment.submitIntake.useMutation();
  const createAppointment = api.appointment.create.useMutation();

  const currentStepData = STEPS[currentStep]!;
  const isLastStep = currentStep === STEPS.length - 1;
  const isCustomStep = currentStepData.type === "custom";
  const currentValue = isCustomStep ? "" : (formData[currentStepData.id as "dateOfBirth" | "allergies"] as string);

  function handleInputChange(value: string) {
    // Clear validation error when user starts typing
    setValidationError(null);

    // Auto-format date of birth input
    if (currentStepData.id === "dateOfBirth") {
      value = formatDateInput(value);
    }

    setFormData((prev) => ({
      ...prev,
      [currentStepData.id]: value,
    }));
  }

  function handleDateKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && currentStepData.id === "dateOfBirth") {
      const value = currentValue;
      // If the last character is a slash, delete both the slash and the digit before it
      if (value.endsWith("/")) {
        e.preventDefault();
        const newValue = value.slice(0, -2); // Remove slash and preceding digit
        setFormData((prev) => ({
          ...prev,
          [currentStepData.id]: newValue,
        }));
      }
    }
  }

  function handleNext() {
    if (isAnimating || isSubmitting) {
      return;
    }

    // Validate date of birth before proceeding
    if (currentStepData.id === "dateOfBirth" && currentValue) {
      const error = validateDateOfBirth(currentValue);
      if (error) {
        setValidationError(error);
        return;
      }
    }

    if (isLastStep) {
      handleSubmit();
      return;
    }

    setDirection(1);
    setIsAnimating(true);
    setCurrentStep((prev) => prev + 1);
  }

  function handleBack() {
    if (isAnimating || isSubmitting || currentStep === 0) {
      return;
    }

    setValidationError(null);
    setDirection(-1);
    setIsAnimating(true);
    setCurrentStep((prev) => prev - 1);
  }

  async function handleSubmit() {
    if (isSubmitting || isAnimating) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit intake data and store in history table
      await submitIntake.mutateAsync({
        dateOfBirth: formData.dateOfBirth,
        sexAssignedAtBirth: formData.sexAssignedAtBirth,
        gender: formData.gender,
        allergies: formData.allergies,
        chronicIllnesses: formData.chronicIllnesses,
        medicalHistory: formData.medicalHistory,
        currentMedications: formData.currentMedications,
        lifestyleAnswers: formData.lifestyleAnswers,
      });

      // Refetch the session to update hasCompletedIntake on the client
      await session.refetch();

      // Create a new appointment
      const { publicId } = await createAppointment.mutateAsync();

      // Redirect to the appointment page
      router.push(`/appointment/${publicId}`);
    } catch (error) {
      console.error("Failed to complete intake:", error);
      setIsSubmitting(false);
    }
  }

  // Redirect to home if not logged in
  if (!session.isPending && !session.data) {
    router.push("/");
    return null;
  }

  if (session.isPending) {
    return (
      <main className="flex flex-col h-screen items-center justify-center w-full px-4 max-w-screen-md mx-auto">
        <Spinner className="size-8" />
      </main>
    );
  }

  return (
    <main className="flex flex-col relative h-screen w-full px-4 max-w-screen-md mx-auto">
      <div className="flex items-center absolute w-full top-0 left-0 py-4 justify-between w-full shrink-0">
        <Link href="/">
          <h1 className="text-3xl font-light">Carely</h1>
        </Link>
        <ModeToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, filter: "blur(5px)", y: 10 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-lg"
        >
          <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
            <motion.div
              animate={{ height: bounds.height || "auto" }}
              className="w-full max-w-lg overflow-y-clip overflow-x-visible"
            >
              <div ref={measureRef} className="flex flex-col gap-8">
                <div className="flex gap-2">
                  {STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 w-12 rounded-full transition-colors ${index <= currentStep ? "bg-primary" : "bg-muted"
                        }`}
                    />
                  ))}
                </div>

                <div className="overflow-y-clip overflow-x-visible">
                  <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                    <motion.div
                      key={currentStepData.id}
                      // @ts-expect-error - Framer Motion is weird and this works
                      variants={STEP_VARIANTS}
                      initial="initial"
                      animate="active"
                      exit="exit"
                      custom={direction}
                      className="flex flex-col gap-6 py-1"
                      onAnimationComplete={() => {
                        if (isAnimating) {
                          setIsAnimating(false);
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <h2 className="text-2xl font-medium tracking-tight">
                          {currentStepData.title}
                        </h2>
                        <p className="text-muted-foreground">
                          {currentStepData.description}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {currentStepData.id === "sexAssignedAtBirth" ? (
                          <SelectionGrid
                            options={SEX_ASSIGNED_AT_BIRTH_OPTIONS}
                            selected={formData.sexAssignedAtBirth}
                            onChange={(value) =>
                              setFormData((prev) => ({ ...prev, sexAssignedAtBirth: value }))
                            }
                          />
                        ) : currentStepData.id === "gender" ? (
                          <SelectionGrid
                            options={GENDER_OPTIONS}
                            selected={formData.gender}
                            onChange={(value) =>
                              setFormData((prev) => ({ ...prev, gender: value }))
                            }
                          />
                        ) : currentStepData.id === "chronicIllnesses" ? (
                          <ChronicIllnessInput
                            selected={formData.chronicIllnesses}
                            customIllness={formData.customChronicIllness}
                            onToggle={(illness) =>
                              setFormData((prev) => ({
                                ...prev,
                                chronicIllnesses: prev.chronicIllnesses.includes(illness)
                                  ? prev.chronicIllnesses.filter((i) => i !== illness)
                                  : [...prev.chronicIllnesses, illness],
                              }))
                            }
                            onCustomChange={(value) =>
                              setFormData((prev) => ({ ...prev, customChronicIllness: value }))
                            }
                            onAddCustom={() => {
                              if (formData.customChronicIllness.trim()) {
                                setFormData((prev) => ({
                                  ...prev,
                                  chronicIllnesses: [...prev.chronicIllnesses, prev.customChronicIllness.trim()],
                                  customChronicIllness: "",
                                }));
                              }
                            }}
                          />
                        ) : currentStepData.id === "medicalHistory" ? (
                          <MedicalHistoryInput
                            events={formData.medicalHistory}
                            onChange={(events) =>
                              setFormData((prev) => ({ ...prev, medicalHistory: events }))
                            }
                          />
                        ) : currentStepData.id === "medications" ? (
                          <MedicationsInput
                            medications={formData.currentMedications}
                            onChange={(medications) =>
                              setFormData((prev) => ({ ...prev, currentMedications: medications }))
                            }
                          />
                        ) : currentStepData.id === "lifestyle" ? (
                          <div className="space-y-4">
                            <LifestyleQuestionsTable
                              answers={formData.lifestyleAnswers}
                              onChange={(lifestyleAnswers) =>
                                setFormData((prev) => ({ ...prev, lifestyleAnswers }))
                              }
                            />
                            <p className="text-xs text-muted-foreground/70 text-center text-pretty">
                              Carely remembers other information from your conversations and medical documents. If you ever want something added to your chart, just ask.
                            </p>
                          </div>
                        ) : (
                          <>
                            <Label htmlFor={currentStepData.id} className="sr-only">
                              {currentStepData.title}
                            </Label>
                            <Input
                              id={currentStepData.id}
                              type="text"
                              placeholder={currentStepData.placeholder}
                              value={currentValue}
                              onChange={(e) => handleInputChange(e.target.value)}
                              onKeyDown={(e) => {
                                handleDateKeyDown(e);
                                if (e.key === "Enter") {
                                  handleNext();
                                }
                              }}
                              className={`text-lg md:text-lg tracking-wide py-6 ${validationError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              autoFocus
                            />
                            {validationError && (
                              <p className="text-sm text-destructive">
                                {validationError}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <motion.div layout className="flex justify-between pt-2">
                  <Button
                    variant="link"
                    className="text-muted-foreground"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isAnimating}
                  >
                    Skip intake
                  </Button>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStep === 0 || isSubmitting || isAnimating}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={isSubmitting || isAnimating}
                    >
                      {isSubmitting ? (
                        <span className="relative">
                          <Spinner className="inset-0 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10" />
                          <span className="text-transparent">
                            {isLastStep ? "Complete" : "Continue"}
                          </span>
                        </span>
                      ) : isLastStep ? (
                        "Complete"
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </MotionConfig>
        </motion.div>
      </div>
    </main>
  );
}
