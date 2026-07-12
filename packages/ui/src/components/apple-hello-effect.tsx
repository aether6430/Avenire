"use client"

import type { TargetAndTransition } from "motion/react"
import { motion } from "motion/react"
import type { ComponentProps, ComponentType } from "react"

import { cn } from "../lib/utils"
import { AppleHelloEffectEnglish } from "./apple-hello-effect-english"
import { AppleHelloEffectHindi } from "./apple-hello-effect-hindi"
import { AppleHelloEffectSpanish } from "./apple-hello-effect-spanish"
import { AppleHelloEffectVietnamese } from "./apple-hello-effect-vietnamese"

type HelloEffectProps = Omit<
  ComponentProps<typeof motion.svg>,
  "durationScale" | "onAnimationComplete"
> & {
  durationScale?: number
  onAnimationComplete?: () => void
}

type HelloLocale = "ar" | "en" | "es" | "hi" | "it" | "ja" | "vi" | "zh-Hans"

const COUNTRY_LOCALE_MAP: Partial<Record<string, HelloLocale>> = {
  AR: "es",
  BO: "es",
  CL: "es",
  CN: "zh-Hans",
  CO: "es",
  CR: "es",
  CU: "es",
  DO: "es",
  EC: "es",
  ES: "es",
  GT: "es",
  HN: "es",
  IN: "hi",
  IT: "it",
  JP: "ja",
  MX: "es",
  NI: "es",
  PA: "es",
  PE: "es",
  PR: "es",
  PY: "es",
  SV: "es",
  UY: "es",
  VE: "es",
  VN: "vi",
}

const initialProps: TargetAndTransition = {
  pathLength: 0,
  opacity: 0,
}

const animateProps: TargetAndTransition = {
  pathLength: 1,
  opacity: 1,
}

const PATH_EFFECTS = {
  ar: {
    title: "مرحبا",
    viewBox: "0 0 558 226",
    durationScale: 0.8,
    paths: [
      "M512.414 176.427C488.345 173.946 475.938 155.829 475.938 134.988C475.938 112.599 492.067 94.7893 513.655 94.7893C537.476 94.7893 550.38 111.911 550.38 132.506C550.38 160.298 530.528 176.923 495.4 179.166C441.975 182.576 399.187 148.726 388.097 95.0375",
      "M388.097 95.0375C392.315 120.348 394.3 138.214 392.811 160.794C390.826 197.023 365.764 218.363 334.747 218.363C329.04 218.363 323.829 217.618 318.37 216.129",
      "M182.886 204.467C166.757 143.176 184.126 104.963 218.121 104.963C236.065 104.963 249.328 114.277 265.02 133.003C281.987 153.251 295.171 161.042 309.092 161.042C326.723 161.042 325.566 147.147 305.715 146.402C274.697 145.41 230.032 181.886 173.702 181.886C135.329 181.886 115.031 157.694 111.174 116.626",
      "M111.174 116.626C115.392 161.042 98.0222 181.886 66.5893 181.886C40.6957 181.886 26.5992 158.747 20.6094 121.061C14.8956 85.1119 10.6773 45.6578 8.44403 7.4444",
      "M121.844 26.0548C107.451 29.7769 87.6003 35.7323 72.4639 41.4395",
      "M128.791 54.839C114.151 58.5611 94.052 64.5164 79.1636 70.2236",
    ],
  },
  it: {
    title: "ciao",
    viewBox: "0 0 500 200",
    durationScale: 0.9,
    paths: [
      "M83.8683 66.9698C78.9651 57.5405 68.6425 50.5927 52.9006 50.5927C23.0973 50.5927 8.44403 76.3991 8.44403 101.709C8.44403 129.253 26.5085 149.6 57.1631 149.6C96.8289 149.6 132.317 119.641 140.456 75.8408C141.835 68.4155 143.68 60.8311 144.949 53.3222",
      "M144.949 53.3223C142.097 70.1958 139.471 84.0915 137.826 96.4985C136.895 104.687 136.45 111.635 136.502 118.583C136.635 136.449 143.67 148.608 160.871 148.608C184.995 148.608 208.524 121.743 216.925 92.2907",
      "M295.184 70.0896C290.319 58.8946 279.979 51.337 263.519 51.337C236.224 51.337 215.711 78.6323 214.364 107.913C213.19 134.712 225.556 149.776 243.17 149.6C268.17 149.35 286.547 124.794 294.75 72.8369C295.762 66.4265 296.811 59.7325 297.823 53.3221",
      "M297.823 53.3221C296.798 59.8246 295.774 66.3271 294.749 72.8295C290.268 101.269 288.2 112.49 288.422 119.823C288.94 136.945 295.098 148.607 311.377 148.607C333.876 148.607 352.279 121.816 361.579 95.3836C370.965 68.7067 382.628 52.0814 406.945 52.0814C427.045 52.0814 442.925 66.9697 442.925 95.0094C442.925 126.027 422.802 149.352 397.372 149.6C374.993 149.848 360.295 131.734 361.784 104.439C363.521 74.1658 381.883 52.0814 405.953 52.0814C419.849 52.0814 431.52 58.2583 440.692 64.9846C465.559 83.1254 484.719 71.9148 492.057 53.9779",
    ],
  },
  ja: {
    title: "こんにちは",
    viewBox: "0 0 878 200",
    durationScale: 0.8,
    paths: [
      "M20.77 26.3153C50.6822 26.8169 81.7522 34.646 94.1177 42.1426C102.683 47.3352 105.39 52.7026 105.363 58.3136C105.318 67.7398 96.5278 74.2747 85.8699 77.623",
      "M27.7721 114.781C14.2436 124.928 8.12192 135.832 7.54157 147.724C6.69983 164.973 20.9603 176.208 48.6115 176.972C73.6387 177.663 98.2063 173.119 112.672 165.139",
      "M216.122 18.0386C194.264 60.1085 167.029 128.042 152.842 180.77",
      "M152.863 180.737C168.486 140.082 187.141 117.421 207.059 117.373C219.529 117.343 227.466 125.123 230.265 141.85C230.857 145.386 231.449 148.923 232.041 152.459C235.115 170.823 243.133 178.466 256.399 178.466C273.763 178.466 292.588 163.308 302.26 138.148",
      "M364.55 19.0474C354.121 68.3442 347.392 130.229 345.912 184.092",
      "M404.96 46.4579C430.058 43.5478 455.947 46.3004 466.541 51.5215C473.535 54.9687 475.787 59.5891 475.781 64.5347C475.77 73.098 468.439 80.0158 459.536 84.2495",
      "M410.33 120.125C398.93 129.54 393.789 139.533 393.333 150.343C392.643 166.685 404.748 176.908 428.111 177.187C449.256 177.441 469.998 173.002 482.196 165.628",
      "M524.883 45.1566C537.331 54.29 560.824 63.9289 597.238 62.4704C629.756 61.1681 644.77 48.8428 644.77 35.2193C644.77 25.3479 637.718 19.2543 624.317 19.2543C592.907 19.2543 563.089 52.7082 538.849 124.069",
      "M538.849 124.069C561.189 110.058 586.605 101.355 611.062 101.355C641.746 101.355 655.04 115.539 654.972 136.58C654.876 166.756 621.481 182.664 587.217 182.664C565.547 182.664 548.494 178.271 540.265 173.045",
      "M729.81 19.8643C719.382 68.673 712.653 129.945 711.173 183.274",
      "M767.068 59.1714C789.142 61.4061 842.299 58.4217 870.454 54.8559",
      "M821.742 15.7711C824.666 41.779 825.669 73.7762 824.709 109.577C823.413 157.862 805.904 179.993 780.67 180.47C764.063 180.784 755.316 171.11 755.48 159.378C755.663 146.303 766.998 136.203 787.725 136.157C811.678 136.104 832.846 148.877 862.631 176.867",
    ],
  },
  "zh-Hans": {
    title: "你好",
    viewBox: "0 0 492 220",
    durationScale: 0.85,
    paths: [
      "M60.0571 18.1155C42.9356 50.4563 25.814 82.797 8.69238 115.138",
      "M41.6947 55.8326C44.6724 99.7532 43.4317 171.713 40.7021 201.242",
      "M130.033 7.44551C115.723 33.0865 101.414 58.7276 87.1045 84.3686",
      "M87.1045 84.3686C107.427 58.841 135.925 39.2073 169.983 39.2073C187.353 39.2073 198.767 47.1477 198.767 62.5323C198.767 75.9318 190.578 87.8425 178.42 95.2867",
      "M136.98 92.5571C139.71 109.927 142.687 145.907 142.687 178.661C142.687 201.986 136.98 212.16 121.844 212.408C102.489 212.656 82.5992 191.968 82.6104 173.854C82.6162 164.424 86.5916 156.071 96.7701 148.346C111.049 137.328 140.454 129.53 168.99 130.026C194.796 130.522 206.955 141.192 206.955 158.314C206.955 173.947 199.759 188.091 189.337 198.264",
      "M329.381 11.7535C307.274 62.3829 294.259 103.476 294.259 123.942C294.259 149.535 327.177 190.68 353.81 204.679",
      "M349.861 66.5026C344.65 124.071 328.273 166.006 313.881 183.872C305.196 194.79 295.519 200.001 282.367 199.753C265.246 199.257 248.124 181.143 246.387 154.84C245.395 139.952 249.365 126.552 256.313 115.138C277.653 79.9021 329.514 61.2917 365.99 61.2917",
      "M388.818 25.3115C396.196 16.1529 407.429 9.18247 422.317 9.67875C436.213 10.175 444.65 17.6192 445.146 30.0261C445.89 46.8988 431.466 61.8038 403.707 75.6837",
      "M403.707 75.6837C422.797 90.3686 435.947 115.611 438.198 149.629C440.928 189.828 430.506 210.175 412.64 210.175C392.293 210.175 369.96 179.902 368.968 153.103C368.471 138.711 373.698 129.274 387.578 122.334C408.67 111.664 452.59 112.905 484.104 124.567",
    ],
  },
} satisfies Record<string, { durationScale: number; paths: string[]; title: string; viewBox: string }>

const COMPONENT_EFFECTS: Partial<Record<HelloLocale, ComponentType<HelloEffectProps>>> = {
  en: AppleHelloEffectEnglish,
  es: AppleHelloEffectSpanish,
  hi: AppleHelloEffectHindi,
  vi: AppleHelloEffectVietnamese,
}

function normalizeLocale(input: string): HelloLocale | null {
  const locale = input.toLowerCase()
  if (locale.startsWith("ar")) return "ar"
  if (locale.startsWith("es")) return "es"
  if (locale.startsWith("hi")) return "hi"
  if (locale.startsWith("it")) return "it"
  if (locale.startsWith("ja")) return "ja"
  if (locale.startsWith("vi")) return "vi"
  if (locale.startsWith("zh")) return "zh-Hans"
  if (locale.startsWith("en")) return "en"
  return null
}

export function resolveAppleHelloLocale(languages: readonly string[]): HelloLocale {
  for (const language of languages) {
    const region = language.split("-")[1]?.toUpperCase()
    if (region) {
      const locale = COUNTRY_LOCALE_MAP[region]
      if (locale) return locale
    }
  }

  for (const language of languages) {
    const locale = normalizeLocale(language)
    if (locale) return locale
  }
  return "en"
}

export function resolveAppleHelloLocaleFromCountry(
  countryCode: string | null | undefined,
): HelloLocale | null {
  if (!countryCode) return null
  return COUNTRY_LOCALE_MAP[countryCode.toUpperCase()] ?? null
}

function PathHelloEffect({
  className,
  durationScale,
  label,
  onAnimationComplete,
  paths,
  svgViewBox,
  ...props
}: HelloEffectProps & {
  label: string
  paths: string[]
  svgViewBox: string
}) {
  const scale = durationScale ?? 1

  return (
    <motion.svg
      className={cn("h-20", className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={svgViewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="14.8883"
      strokeLinecap="round"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      {...props}
    >
      <title>{label}</title>
      {paths.map((path, index) => {
        const delay = index * 0.34 * scale
        const isLast = index === paths.length - 1

        return (
          <motion.path
            d={path}
            initial={initialProps}
            animate={animateProps}
            transition={{
              duration: 0.65 * scale,
              ease: "easeInOut",
              delay,
              opacity: { duration: 0.25 * scale, delay },
            }}
            onAnimationComplete={isLast ? onAnimationComplete : undefined}
            key={label}
          />
        )
      })}
    </motion.svg>
  )
}

export function AppleHelloEffect({
  locale,
  ...props
}: HelloEffectProps & {
  locale?: HelloLocale
}) {
  const targetLocale = locale ?? "en"
  const Component = COMPONENT_EFFECTS[targetLocale]

  if (Component) {
    return <Component {...props} />
  }

  const effect = PATH_EFFECTS[targetLocale as keyof typeof PATH_EFFECTS] ?? PATH_EFFECTS.it
  return (
    <PathHelloEffect
      durationScale={effect.durationScale}
      label={effect.title}
      paths={effect.paths}
      svgViewBox={effect.viewBox}
      {...props}
    />
  )
}
