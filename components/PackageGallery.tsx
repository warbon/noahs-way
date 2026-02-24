"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

import Reveal from "@/components/Reveal"
import { cn } from "@/lib/utils"
import type { TravelPackage } from "@/lib/package-data"

type PackageGalleryProps = {
  packages: TravelPackage[]
  layout?: "carousel" | "grid"
  autoScrollDirection?: "left" | "right"
  reveal?: boolean
  gridClassName?: string
  carouselItemClassName?: string
}

export default function PackageGallery({
  packages,
  layout = "grid",
  autoScrollDirection = "left",
  reveal = false,
  gridClassName,
  carouselItemClassName
}: PackageGalleryProps) {
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [carouselViewportWidth, setCarouselViewportWidth] = useState(0)
  const imageViewportRef = useRef<HTMLDivElement | null>(null)
  const carouselViewportRef = useRef<HTMLDivElement | null>(null)
  const carouselTrackRef = useRef<HTMLDivElement | null>(null)
  const carouselSequenceRef = useRef<HTMLDivElement | null>(null)
  const carouselCloneSequenceRef = useRef<HTMLDivElement | null>(null)
  const isCarouselPausedRef = useRef(false)
  const carouselLoopDistanceRef = useRef(0)
  const carouselTrackOffsetRef = useRef(0)
  const dragPointerIdRef = useRef<number | null>(null)
  const dragStartXRef = useRef<number | null>(null)
  const dragStartOffsetRef = useRef(0)
  const pressedCardButtonRef = useRef<HTMLButtonElement | null>(null)
  const didDragCarouselRef = useRef(false)
  const suppressCardClickUntilRef = useRef(0)
  const wheelResumeTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPackage(null)
    }

    if (selectedPackage) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", onEscape)
    }

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onEscape)
    }
  }, [selectedPackage])

  useEffect(() => {
    return () => {
      if (wheelResumeTimeoutRef.current !== null) {
        window.clearTimeout(wheelResumeTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedPackage) setZoomLevel(1)
  }, [selectedPackage])

  useEffect(() => {
    const viewport = imageViewportRef.current
    if (!viewport || !selectedPackage) return

    const centerScrollLeft = Math.max((viewport.scrollWidth - viewport.clientWidth) / 2, 0)
    const centerScrollTop = Math.max((viewport.scrollHeight - viewport.clientHeight) / 2, 0)

    viewport.scrollTo({ left: centerScrollLeft, top: centerScrollTop })
  }, [zoomLevel, selectedPackage])

  const zoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.2, 3))
  const zoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.2, 1))
  const resetZoom = () => setZoomLevel(1)

  const desktopPercent = carouselItemClassName?.includes("lg:min-w-[24%]") ? 24 : 32
  const itemPercent =
    carouselViewportWidth >= 1024 ? desktopPercent : carouselViewportWidth >= 640 ? 47 : 85
  const carouselItemWidthPx =
    layout === "carousel" && carouselViewportWidth > 0
      ? (carouselViewportWidth * itemPercent) / 100
      : null
  const carouselItemStyle = carouselItemWidthPx
    ? {
        width: `${carouselItemWidthPx}px`,
        minWidth: `${carouselItemWidthPx}px`
      }
    : undefined

  const setCarouselTrackTransform = (offset: number) => {
    const track = carouselTrackRef.current
    if (!track) return
    track.style.transform = `translate3d(${offset}px, 0, 0)`
  }

  const normalizeCarouselOffset = (offset: number) => {
    const loopDistance = carouselLoopDistanceRef.current
    if (!loopDistance) return offset

    let normalized = offset
    while (normalized <= -loopDistance) normalized += loopDistance
    while (normalized > 0) normalized -= loopDistance
    return normalized
  }

  const applyCarouselScrollDelta = (deltaX: number) => {
    if (!deltaX || carouselLoopDistanceRef.current <= 0) return
    carouselTrackOffsetRef.current = normalizeCarouselOffset(carouselTrackOffsetRef.current - deltaX)
    setCarouselTrackTransform(carouselTrackOffsetRef.current)
  }

  useEffect(() => {
    if (layout !== "carousel") return

    const viewport = carouselViewportRef.current
    const track = carouselTrackRef.current
    const sequence = carouselSequenceRef.current
    const cloneSequence = carouselCloneSequenceRef.current
    if (!viewport || !track || !sequence || !cloneSequence || packages.length < 2) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let frameId = 0
    let lastTimestamp = 0
    const speedPxPerSecond = 28

    const measure = () => {
      const viewportWidth = viewport.clientWidth
      if (!viewportWidth) return
      setCarouselViewportWidth((prev) => (prev === viewportWidth ? prev : viewportWidth))

      sequence.style.minWidth = `${viewportWidth}px`
      cloneSequence.style.minWidth = `${viewportWidth}px`

      const gap = Number.parseFloat(window.getComputedStyle(track).columnGap || "0") || 0
      carouselLoopDistanceRef.current = sequence.scrollWidth + gap

      if (!carouselLoopDistanceRef.current) return

      carouselTrackOffsetRef.current =
        autoScrollDirection === "right" ? -carouselLoopDistanceRef.current : 0
      setCarouselTrackTransform(carouselTrackOffsetRef.current)
    }

    measure()

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(viewport)
    resizeObserver.observe(track)
    resizeObserver.observe(sequence)

    const animate = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp
      const delta = timestamp - lastTimestamp
      lastTimestamp = timestamp

      if (!isCarouselPausedRef.current && carouselLoopDistanceRef.current > 0) {
        const deltaPx = (speedPxPerSecond * delta) / 1000

        if (autoScrollDirection === "left") {
          carouselTrackOffsetRef.current -= deltaPx
          if (carouselTrackOffsetRef.current <= -carouselLoopDistanceRef.current) {
            carouselTrackOffsetRef.current += carouselLoopDistanceRef.current
          }
        } else {
          carouselTrackOffsetRef.current += deltaPx
          if (carouselTrackOffsetRef.current >= 0) {
            carouselTrackOffsetRef.current -= carouselLoopDistanceRef.current
          }
        }

        setCarouselTrackTransform(carouselTrackOffsetRef.current)
      }

      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      resizeObserver.disconnect()
      window.cancelAnimationFrame(frameId)
      track.style.transform = ""
    }
  }, [autoScrollDirection, layout, packages.length])

  const renderCard = (pkg: TravelPackage, index: number) => {
    const card = (
      <button
        data-package-card="true"
        type="button"
        onClick={() => {
          if (Date.now() < suppressCardClickUntilRef.current) return
          setSelectedPackage(pkg)
        }}
        className="card-hover-lift package-card-hover group relative block w-full overflow-hidden rounded-[26px] border border-primary/10 bg-background text-left shadow-lg shadow-primary/5"
        aria-label={`Open image preview for ${pkg.title}`}
      >
        <div
          className="h-72 bg-cover bg-center transition duration-700 group-hover:scale-105"
          style={{
            backgroundColor: "#10203b",
            backgroundImage: `url('${pkg.previewImage}'), url('/images/noahs-way-logo.jpg')`
          }}
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(6,12,24,0.45),transparent)]" />
        <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-black/35 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white">
          {pkg.price}
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(6,12,24,0.62)_40%,rgba(6,12,24,0.78))] p-6 text-white">
          <h5 className="text-2xl font-bold leading-tight">{pkg.title}</h5>
          <p className="mt-3 text-sm text-white/80">{pkg.details}</p>
          <span className="mt-5 inline-flex text-sm font-semibold uppercase tracking-[0.14em] text-secondary transition group-hover:text-accent">
            Open Image Preview
          </span>
        </div>
      </button>
    )

    if (!reveal) return card

    return (
      <Reveal key={pkg.title} delay={index * 120}>
        {card}
      </Reveal>
    )
  }

  return (
    <>
      {layout === "carousel" ? (
        <div>
          <div
            ref={carouselViewportRef}
            className="-my-4 overflow-hidden py-4"
            style={{
              touchAction: "pan-y",
              WebkitMaskImage:
                "linear-gradient(to right, rgba(0,0,0,0) 0px, rgba(0,0,0,0.08) 12px, rgba(0,0,0,0.22) 24px, rgba(0,0,0,0.45) 40px, rgba(0,0,0,0.72) 56px, rgba(0,0,0,0.9) 72px, black 92px, black calc(100% - 92px), rgba(0,0,0,0.9) calc(100% - 72px), rgba(0,0,0,0.72) calc(100% - 56px), rgba(0,0,0,0.45) calc(100% - 40px), rgba(0,0,0,0.22) calc(100% - 24px), rgba(0,0,0,0.08) calc(100% - 12px), rgba(0,0,0,0) 100%)",
              maskImage:
                "linear-gradient(to right, rgba(0,0,0,0) 0px, rgba(0,0,0,0.08) 12px, rgba(0,0,0,0.22) 24px, rgba(0,0,0,0.45) 40px, rgba(0,0,0,0.72) 56px, rgba(0,0,0,0.9) 72px, black 92px, black calc(100% - 92px), rgba(0,0,0,0.9) calc(100% - 72px), rgba(0,0,0,0.72) calc(100% - 56px), rgba(0,0,0,0.45) calc(100% - 40px), rgba(0,0,0,0.22) calc(100% - 24px), rgba(0,0,0,0.08) calc(100% - 12px), rgba(0,0,0,0) 100%)"
            }}
            onMouseEnter={() => {
              isCarouselPausedRef.current = true
            }}
            onMouseLeave={() => {
              if (dragPointerIdRef.current === null) {
                isCarouselPausedRef.current = false
              }
            }}
            onPointerDown={(event) => {
              if (layout !== "carousel" || carouselLoopDistanceRef.current <= 0) return
              if (event.pointerType === "mouse" && event.button !== 0) return

              pressedCardButtonRef.current =
                event.target instanceof Element
                  ? (event.target.closest('button[data-package-card="true"]') as HTMLButtonElement | null)
                  : null
              dragPointerIdRef.current = event.pointerId
              dragStartXRef.current = event.clientX
              dragStartOffsetRef.current = carouselTrackOffsetRef.current
              didDragCarouselRef.current = false
              isCarouselPausedRef.current = true
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (dragPointerIdRef.current !== event.pointerId) return

              const startX = dragStartXRef.current
              if (startX === null || carouselLoopDistanceRef.current <= 0) return

              const deltaX = event.clientX - startX
              if (Math.abs(deltaX) > 6) {
                didDragCarouselRef.current = true
              }
              if (!didDragCarouselRef.current) return

              carouselTrackOffsetRef.current = normalizeCarouselOffset(
                dragStartOffsetRef.current + deltaX
              )
              setCarouselTrackTransform(carouselTrackOffsetRef.current)
            }}
            onPointerUp={(event) => {
              if (dragPointerIdRef.current !== event.pointerId) return

              const pressedCardButton = pressedCardButtonRef.current
              if (didDragCarouselRef.current) {
                suppressCardClickUntilRef.current = Date.now() + 250
              } else if (pressedCardButton && pressedCardButton.isConnected) {
                // Pointer capture can swallow native click events on some browsers.
                pressedCardButton.click()
              }

              pressedCardButtonRef.current = null
              dragPointerIdRef.current = null
              dragStartXRef.current = null
              didDragCarouselRef.current = false
              isCarouselPausedRef.current = false
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
            }}
            onPointerCancel={(event) => {
              if (dragPointerIdRef.current !== event.pointerId) return

              pressedCardButtonRef.current = null
              dragPointerIdRef.current = null
              dragStartXRef.current = null
              didDragCarouselRef.current = false
              isCarouselPausedRef.current = false
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
            }}
            onWheel={(event) => {
              if (layout !== "carousel" || carouselLoopDistanceRef.current <= 0) return
              if (selectedPackage) return

              const horizontalIntent =
                Math.abs(event.deltaX) > 0 || (event.shiftKey && Math.abs(event.deltaY) > 0)
              if (!horizontalIntent) return

              event.preventDefault()
              isCarouselPausedRef.current = true

              const deltaX = Math.abs(event.deltaX) > 0 ? event.deltaX : event.deltaY
              applyCarouselScrollDelta(deltaX)

              if (wheelResumeTimeoutRef.current !== null) {
                window.clearTimeout(wheelResumeTimeoutRef.current)
              }
              wheelResumeTimeoutRef.current = window.setTimeout(() => {
                isCarouselPausedRef.current = false
              }, 140)
            }}
          >
            <div ref={carouselTrackRef} className="flex w-max gap-7 will-change-transform">
              <div ref={carouselSequenceRef} className="flex shrink-0 gap-7">
                {packages.map((pkg, index) => (
                  <div
                    key={`${pkg.title}-primary-${index}`}
                    className={cn(
                      "shrink-0",
                      carouselItemClassName ?? "min-w-[85%] sm:min-w-[47%] lg:min-w-[32%]"
                    )}
                    style={carouselItemStyle}
                  >
                    {renderCard(pkg, index)}
                  </div>
                ))}
              </div>

              <div ref={carouselCloneSequenceRef} className="flex shrink-0 gap-7" aria-hidden="true">
                {packages.map((pkg, index) => (
                  <div
                    key={`${pkg.title}-clone-${index}`}
                    className={cn(
                      "shrink-0",
                      carouselItemClassName ?? "min-w-[85%] sm:min-w-[47%] lg:min-w-[32%]"
                    )}
                    style={carouselItemStyle}
                  >
                    {renderCard(pkg, index + packages.length)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={cn("grid gap-7 md:grid-cols-2", gridClassName)}>
          {packages.map((pkg, index) => (
            <div key={pkg.title}>{renderCard(pkg, index)}</div>
          ))}
        </div>
      )}

      {selectedPackage && (
        <div
          className="animate-modal-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedPackage(null)}
        >
          <article
            role="dialog"
            aria-modal="true"
            className="animate-modal-in w-full max-w-[96vw] rounded-3xl bg-white p-5 shadow-2xl md:max-w-6xl md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h5 className="text-xl font-bold text-primary md:text-2xl">{selectedPackage.title}</h5>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-primary/20 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/5"
                  onClick={zoomOut}
                  aria-label="Zoom out"
                >
                  -
                </button>
                <button
                  type="button"
                  className="rounded-full border border-primary/20 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/5"
                  onClick={zoomIn}
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  className="rounded-full border border-primary/20 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/5"
                  onClick={resetZoom}
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  className="rounded-full border border-primary/20 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/5"
                  onClick={() => setSelectedPackage(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div
              ref={imageViewportRef}
              className="h-[78vh] w-full overflow-auto rounded-2xl bg-muted/30"
              onWheel={(event) => {
                if (!(event.ctrlKey || event.metaKey)) return

                event.preventDefault()
                if (event.deltaY < 0) zoomIn()
                if (event.deltaY > 0) zoomOut()
              }}
            >
              <div
                className="relative min-h-full min-w-full"
                style={{
                  width: `${zoomLevel * 100}%`,
                  height: `${zoomLevel * 100}%`,
                  transition: "width 160ms ease-out, height 160ms ease-out"
                }}
              >
                <Image
                  src={selectedPackage.imagePath}
                  alt={`${selectedPackage.title} package image`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 80vw"
                />
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  )
}
