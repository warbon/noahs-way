"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"

import Reveal from "@/components/Reveal"
import { cn } from "@/lib/utils"
import type { TravelPackage } from "@/lib/package-data"
import { buildPackageHref, derivePackageSlug } from "@/lib/package-slug"
import { formatPackagePrice } from "@/lib/price"

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
  const [carouselViewportWidth, setCarouselViewportWidth] = useState(0)
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
  const pressedCardLinkRef = useRef<HTMLAnchorElement | null>(null)
  const didDragCarouselRef = useRef(false)
  const suppressCardClickUntilRef = useRef(0)
  const wheelResumeTimeoutRef = useRef<number | null>(null)
  /**
   * Holds the current wheel logic so the listener below can be registered once.
   * The handler reads only refs, but it is re-created every render, and putting
   * it in the effect's dependencies would re-bind the listener each time.
   */
  const wheelHandlerRef = useRef<(event: WheelEvent) => void>(() => {})

  useEffect(() => {
    return () => {
      if (wheelResumeTimeoutRef.current !== null) {
        window.clearTimeout(wheelResumeTimeoutRef.current)
      }
    }
  }, [])

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
    wheelHandlerRef.current = (event: WheelEvent) => {
      if (layout !== "carousel" || carouselLoopDistanceRef.current <= 0) return

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
    }
  })

  /**
   * Registered natively with { passive: false } rather than via React's onWheel.
   * React attaches wheel listeners passively, so preventDefault() inside one is
   * ignored — the page kept scrolling underneath and the browser logged
   * "Unable to preventDefault inside passive event listener invocation" on every
   * wheel event. Only a native non-passive listener can hold the gesture.
   */
  useEffect(() => {
    if (layout !== "carousel") return

    const viewport = carouselViewportRef.current
    if (!viewport) return

    const onWheel = (event: WheelEvent) => wheelHandlerRef.current(event)
    viewport.addEventListener("wheel", onWheel, { passive: false })

    return () => viewport.removeEventListener("wheel", onWheel)
  }, [layout])

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
    const slug = derivePackageSlug(pkg)
    const href = buildPackageHref(pkg.category, slug)

    const card = (
      <Link
        data-package-card="true"
        href={href}
        onClick={(event) => {
          // Suppress the navigation that follows a carousel drag.
          if (Date.now() < suppressCardClickUntilRef.current) event.preventDefault()
        }}
        className="card-hover-lift package-card-hover group relative block w-full overflow-hidden rounded-[26px] border border-primary/10 bg-background text-left shadow-lg shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="relative h-72 overflow-hidden">
          <Image
            src={pkg.previewImage}
            alt={pkg.imageAlt ?? `${pkg.title} package poster`}
            fill
            sizes={
              layout === "carousel"
                ? "(max-width: 640px) 85vw, (max-width: 1024px) 47vw, 32vw"
                : "(max-width: 768px) 100vw, 50vw"
            }
            className="media-fade object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(6,12,24,0.45),transparent)]" />
        <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-black/35 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white">
          {formatPackagePrice(pkg)}
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(6,12,24,0.62)_40%,rgba(6,12,24,0.78))] p-6 text-white">
          <h3 className="text-2xl font-bold leading-tight">{pkg.title}</h3>
          <p className="mt-3 text-sm text-white/80">{pkg.details}</p>
          <span className="mt-5 inline-flex text-sm font-semibold uppercase tracking-[0.14em] text-secondary transition group-hover:text-accent">
            View package details
          </span>
        </div>
      </Link>
    )

    if (!reveal) return card

    return (
      <Reveal key={`${pkg.category}-${slug}`} delay={index * 120}>
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

              pressedCardLinkRef.current =
                event.target instanceof Element
                  ? (event.target.closest('a[data-package-card="true"]') as HTMLAnchorElement | null)
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

              const pressedCardLink = pressedCardLinkRef.current
              if (didDragCarouselRef.current) {
                suppressCardClickUntilRef.current = Date.now() + 250
              } else if (pressedCardLink && pressedCardLink.isConnected) {
                // Pointer capture can swallow native click events on some browsers.
                pressedCardLink.click()
              }

              pressedCardLinkRef.current = null
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

              pressedCardLinkRef.current = null
              dragPointerIdRef.current = null
              dragStartXRef.current = null
              didDragCarouselRef.current = false
              isCarouselPausedRef.current = false
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
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
            <div key={`${pkg.category}-${derivePackageSlug(pkg)}`}>{renderCard(pkg, index)}</div>
          ))}
        </div>
      )}

    </>
  )
}
