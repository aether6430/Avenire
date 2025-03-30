"use client";
import { useRef, useEffect, useState } from "react";
import { GraphingCalculator } from "desmos-react";
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@avenire/ui/components/carousel"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@avenire/ui/components/dialog"
import { Plus, X } from "lucide-react"
import { useTheme } from "next-themes";
import { useGraphStore } from "../../stores/graphStore";

interface ImageGalleryProps {
  images: Array<{
    src: string,
    alt: string
  }>
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [open, setOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Show up to 16 images in a 4x4 grid
  const visibleImages = images.slice(0, 4)
  const hasMoreImages = images.length > 4

  return (
    <div className="w-full">
      {/* Grid of images */}
      <div className="grid grid-cols-2 gap-2">
        {visibleImages.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-lg border"
            onClick={() => {
              setCurrentIndex(index)
              setOpen(true)
            }}
          >
            <img
              src={image.src || "/placeholder.svg"}
              alt={image.alt}
              className="object-cover transition-transform hover:scale-105"
            />

            {/* Overlay for the last visible image when there are more */}
            {hasMoreImages && index === images.length - 2 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                <div className="flex flex-col items-center">
                  <Plus className="h-8 w-8" />
                  <span className="text-xl font-bold">{images.length - 3}</span>
                  <span className="text-sm">more</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Popup Carousel Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl p-0 sm:p-0">
          <div className="relative h-[80vh] w-full">
            <Carousel
              className="h-full w-full"
              // defaultApi={{ selectedScrollSnap: () => currentIndex }}
              opts={{
                startIndex: currentIndex,
                loop: true,
              }}
            >
              <CarouselContent className="h-full">
                {images.map((image, index) => (
                  <>
                    <CarouselItem key={index} className="h-full flex flex-col items-center">
                      <div className="relative flex flex-col h-full w-full items-center justify-center p-4">
                        <DialogTitle className="pb-3">Graph of <InlineMath math={image.alt} /></DialogTitle>
                        <img
                          src={image.src || "/placeholder.svg"}
                          alt={image.alt}
                          className="h-1/2 w-1/2 object-contain"
                        />
                      </div>
                    </CarouselItem>
                  </>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const useCalculatorHook = (theme: string) => {
  const graphRef = useRef<Desmos.Calculator>(null)
  const [originalStrokeFunction, setOriginalStrokeFunction] = useState<any | undefined>(undefined)

  useEffect(() => {
    if (originalStrokeFunction) {
      if (theme === "dark") {
        darkTheme(originalStrokeFunction)
      } else {
        lightTheme(originalStrokeFunction)
      }
    }
  }, [theme])

  const init = () => {
    if (graphRef.current !== undefined) {
      //@ts-expect-error
      const originalCtx = graphRef.current.controller.grapher2d.canvasLayer.ctx as CanvasRenderingContext2D;
      const render = originalCtx.stroke.bind(originalCtx)
      setOriginalStrokeFunction({ render })
      if (theme === "dark") {
        darkTheme({
          render
        })
      } else {
        lightTheme({
          render
        })
      }
    }
  }


  const darkTheme = (osf: any) => {
    graphRef.current?.updateSettings({
      //@ts-expect-error
      backgroundColor: "#101010",
      settingsMenu: false,
      textColor: "#F9F8FC"
    })
    const gridLinesColor = (opacity: number) => `rgba(237, 237, 237, ${opacity})`;

    // @ts-expect-error
    const ctx = graphRef.current?.controller.grapher2d.canvasLayer.ctx as CanvasRenderingContext2D;

    ctx.stroke = () => {
      if (!osf) { return }
      const currentStrokeStyle = ctx.strokeStyle;
      const currentStrokeStyleString = currentStrokeStyle.toString();
      if (currentStrokeStyleString.startsWith("rgba(0, 0, 0")) {
        const opacity = currentStrokeStyleString.split(", ")[3].replace(/\)/g, "");
        ctx.strokeStyle = gridLinesColor(Number.parseFloat(opacity));
      }
      osf.render();
      ctx.strokeStyle = currentStrokeStyle;
    };
  }
  const lightTheme = (osf: any) => {
    graphRef.current?.updateSettings({
      //@ts-expect-error
      backgroundColor: "#fff",
      settingsMenu: false,
      textColor: "#000"
    })
    // @ts-expect-error
    const ctx = graphRef.current?.controller.grapher2d.canvasLayer.ctx as CanvasRenderingContext2D;

    ctx.stroke = () => {
      if (!osf) { return }
      osf.render();
    };
  }

  return { graphRef, darkTheme, lightTheme, init }
}

export function GraphImage({ expressions }: { expressions: Desmos.ExpressionState[] }) {
  const { theme } = useTheme()
  const { graphRef } = useCalculatorHook(theme || "dark")
  const [images, setImages] = useState<Array<{
    src: string,
    alt: string
  }>>([])

  useEffect(() => {
    const captureImages = async () => {
      const screenshots = await Promise.all(
        expressions.map((expression) => {
          return new Promise<{ src: string, alt: string }>((resolve) => {
            graphRef.current?.setBlank();
            graphRef.current?.setExpressions([expression]);
            graphRef.current?.asyncScreenshot(
              {
                height: 600,
                width: 600,
                mode: "contain",
              },
              (image) => resolve({ src: image, alt: (expression as any).latex })
            );
          });
        })
      );
      setImages(screenshots); // Set all images at once
    };
    captureImages();
  }, [expressions])

  return (
    <>
      <div className="hidden">
        <GraphingCalculator
          ref={graphRef}
          fontSize={18}
          attributes={{
            className: "desmos",
            style: { height: "400px", width: "600px" },
          }}
          keypad
        />
      </div>
      <div className="w-1/3 h-1/3">
        <ImageGallery images={images} />
      </div>
    </>
  );
}


export function GraphComp() {
  const { theme } = useTheme()
  const { graphRef, init } = useCalculatorHook(theme || "dark")
  const { setGraphRef } = useGraphStore()

  useEffect(() => {
    setGraphRef(graphRef)
    init()
  }, [graphRef])

  return (
    <>
      <GraphingCalculator
        ref={graphRef}
        fontSize={18}
        attributes={{
          className: "desmos",
          style: { height: "inherit", width: "inherit" },
        }}
        keypad
      />
    </>
  );
}
