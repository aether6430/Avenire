"use client";

import {
  AppleHelloEffect,
  resolveAppleHelloLocale,
} from "@avenire/ui/components/apple-hello-effect";
import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avenire/ui/components/select";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { MeshGradient } from "@/components/marketing/mesh-gradient";
import { PET_OPTIONS, type PetAccessory } from "@/lib/pet-preferences";

const STEPS = [
  {
    body: [
      "Bring in a PDF, note, or scan so the workspace has something real to read.",
      "Uploads become reusable context across flashcards, notes, and chat.",
    ],
    eyebrow: "Upload your first file",
    title: "Start with source material.",
  },
  {
    body: [
      "Generate a first deck from the material you just added.",
      "Keep the cards tight enough to study and easy enough to revise later.",
    ],
    eyebrow: "Turn it into practice",
    title: "Build the first flashcards.",
  },
  {
    body: [
      "Ask Apollo to explain the weak spots instead of only surfacing an answer.",
      "Once you enter the workspace, this onboarding route closes for this account.",
    ],
    eyebrow: "Use the workspace",
    title: "Then let Apollo teach from it.",
  },
] as const;

export function OnboardingPageClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showFlush, setShowFlush] = useState(false);
  const [helloLocale, setHelloLocale] = useState<
    ReturnType<typeof resolveAppleHelloLocale>
  >("en");
  const [petName, setPetName] = useState("Auri");
  const [petAccessory, setPetAccessory] = useState<PetAccessory>("none");
  const current = STEPS[step] ?? STEPS[0];

  useEffect(() => {
    setHelloLocale(resolveAppleHelloLocale(navigator.languages));
  }, []);

  useEffect(() => {
    if (!showFlush) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.push("/workspace");
      router.refresh();
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [router, showFlush]);

  const finishOnboarding = async () => {
    setIsFinishing(true);

    try {
      const response = await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingCompleted: true,
          petName: petName.trim() || "Auri",
          petAccessory,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to complete onboarding.");
      }

      setShowFlush(true);
    } catch {
      setIsFinishing(false);
    }
  };

  return (
    <AuthShell variant="onboarding">
      <AnimatePresence>
        {showFlush ? (
          <motion.div
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            className="fixed inset-0 z-[100] overflow-hidden bg-background text-white"
            exit={{ opacity: 0 }}
            initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <MeshGradient
              className="absolute inset-0"
              colors={["#101827", "#f45d48", "#2f80ed", "#f5c04e", "#18b788"]}
              resolutionScale={0.9}
              speed={0.85}
            />
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute inset-0 grid place-items-center px-8"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{
                delay: 0.45,
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <AppleHelloEffect
                className="h-auto max-h-32 w-full max-w-[min(78vw,720px)] drop-shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
                durationScale={0.72}
                locale={helloLocale}
                onAnimationComplete={() => {
                  router.push("/workspace");
                  router.refresh();
                }}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
          <span>
            Step {String(step + 1).padStart(2, "0")} /{" "}
            {String(STEPS.length).padStart(2, "0")}
          </span>
          <div className="ml-2 flex items-center gap-1.5">
            {STEPS.map((_, index) => (
              <span
                className={`h-1.5 rounded-full transition-all ${
                  index === step
                    ? "w-5 bg-foreground"
                    : index < step
                      ? "w-1.5 bg-foreground/70"
                      : "w-1.5 bg-foreground/20"
                }`}
                key={index}
              />
            ))}
          </div>
        </div>

        <div className="relative mt-8 min-h-[18.5rem] max-w-md sm:min-h-[17rem]">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              className="absolute inset-0"
              exit={{ filter: "blur(8px)", opacity: 0, y: -10 }}
              initial={{ filter: "blur(10px)", opacity: 0, y: 12 }}
              key={step}
              transition={{
                duration: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
                {current.eyebrow}
              </div>
              <h1 className="mt-2 font-semibold text-3xl text-foreground leading-tight">
                {current.title}
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                Avenire works best when the workspace starts from your material,
                not a blank slate.
              </p>

              <div className="mt-8 space-y-3">
                {current.body.map((line) => (
                  <p
                    className="text-foreground/78 text-sm leading-6"
                    key={line}
                  >
                    {line}
                  </p>
                ))}
              </div>
              {step === 0 ? (
                <div className="mt-6 grid gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                  <Input
                    aria-label="Pet name"
                    maxLength={32}
                    onChange={(event) => setPetName(event.target.value)}
                    placeholder="Pet name"
                    value={petName}
                  />
                  <Select
                    onValueChange={(value) =>
                      setPetAccessory(value as PetAccessory)
                    }
                    value={petAccessory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pet accessory" />
                    </SelectTrigger>
                    <SelectContent>
                      {PET_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.accessory}
                          value={option.accessory}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button
            disabled={step === 0 || isFinishing}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            type="button"
            variant="ghost"
          >
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() =>
                setStep((value) => Math.min(STEPS.length - 1, value + 1))
              }
              type="button"
            >
              Continue
            </Button>
          ) : (
            <Button
              disabled={isFinishing}
              onClick={() => {
                void finishOnboarding();
              }}
              type="button"
            >
              {isFinishing ? "Entering workspace..." : "Enter workspace"}
            </Button>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
