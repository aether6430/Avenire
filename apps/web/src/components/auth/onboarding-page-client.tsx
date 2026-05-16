"use client";

import {
  type HelloLocale,
  resolveAppleHelloLocale,
  resolveAppleHelloLocaleFromCountry,
} from "@avenire/ui/components/apple-hello-locale";
import { Button } from "@avenire/ui/components/button";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { MeshGradient } from "@/components/marketing/mesh-gradient";
import { PetPreferencesFields } from "@/components/pets/pet-preferences-fields";
import { DEFAULT_PET_NAME, type PetAccessory } from "@/lib/pet-preferences";

const AppleHelloEffect = dynamic(
  () =>
    import("@avenire/ui/components/apple-hello-effect").then(
      (module) => module.AppleHelloEffect
    ),
  { loading: () => null, ssr: false }
);

const STEPS = [
  {
    body: [
      "Bring in a PDF, note, or scan so the workspace has something real to read.",
      "Uploads become reusable context across mindset, notes, and methods.",
    ],
    eyebrow: "Upload your first file",
    title: "Start with source material.",
  },
  {
    body: [
      "Give your pet a name and pick an accessory before you enter the workspace.",
      "This is a separate setup step so it does not crowd the main onboarding screen.",
    ],
    eyebrow: "Personalize your pet",
    title: "Set up your pet.",
  },
  {
    body: [
      "Generate a first mindset set from the material you just added.",
      "Keep the cards tight enough to study and easy enough to revise later.",
    ],
    eyebrow: "Turn it into practice",
    title: "Build the first mindset set.",
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

export function OnboardingPageClient({
  countryCode,
}: {
  countryCode?: string | null;
}) {
  const router = useRouter();
  const initialHelloLocale = resolveAppleHelloLocaleFromCountry(countryCode);
  const [step, setStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showFlush, setShowFlush] = useState(false);
  const [helloLocale, setHelloLocale] = useState<HelloLocale>(
    initialHelloLocale ?? "en"
  );
  const [petName, setPetName] = useState(DEFAULT_PET_NAME);
  const [petAccessory, setPetAccessory] = useState<PetAccessory>("none");
  const current = STEPS[step] ?? STEPS[0];
  const isPetStep = step === 1;

  useEffect(() => {
    setHelloLocale(
      initialHelloLocale ?? resolveAppleHelloLocale(navigator.languages)
    );
  }, [initialHelloLocale]);

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
          petName: petName.trim() || DEFAULT_PET_NAME,
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
        <div className="space-y-2">
          <h1 className="font-semibold text-3xl text-foreground leading-tight">
            Onboarding
          </h1>
          <p className="text-muted-foreground text-sm">
            Set up the workspace from real study material before you dive in.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
          <span>
            Step {String(step + 1).padStart(2, "0")} /{" "}
            {String(STEPS.length).padStart(2, "0")}
          </span>
          <div className="ml-2 flex items-center gap-1.5">
            {STEPS.map((stepItem, index) => (
              <span
                className={`h-1.5 rounded-full transition-all ${
                  index === step
                    ? "w-5 bg-foreground"
                    : index < step
                      ? "w-1.5 bg-foreground/70"
                      : "w-1.5 bg-foreground/20"
                }`}
                key={stepItem.eyebrow}
              />
            ))}
          </div>
        </div>

        <div className="relative mt-8 min-h-[22rem] max-w-md sm:min-h-[21rem]">
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
              <h2 className="mt-2 font-semibold text-3xl text-foreground leading-tight">
                {current.title}
              </h2>
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
              {isPetStep ? (
                <div className="mt-6 rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
                  <PetPreferencesFields
                    accessory={petAccessory}
                    accessoryDescription="Pick an accessory for your pet. The pet stays hidden until the workspace opens."
                    className="border-0 bg-transparent p-0 shadow-none sm:grid-cols-1"
                    name={petName}
                    nameDescription="Name your pet before you enter the workspace."
                    namePlaceholder={DEFAULT_PET_NAME}
                    onAccessoryChange={setPetAccessory}
                    onNameChange={setPetName}
                  />
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
