"use client";

import { useState } from "react";
import Image from "next/image";

type RemoteImageProps = {
  src: string | null;
  alt: string;
  /** Size and shape of the box, e.g. "size-[50px] rounded-[5px]". */
  className: string;
  /** Pixel width the image is shown at, for the browser's size hint. */
  sizes: string;
  /** Photos of people fill the box; product shots fit inside it. */
  fit?: "cover" | "contain";
};

/**
 * An image from content.hillview.tv with a shimmer until it loads and an icon
 * if it fails or there is none. unoptimized: images load straight from the
 * CDN, never through this server (the studio has one WAN).
 */
export default function RemoteImage({
  src,
  alt,
  className,
  sizes,
  fit = "contain",
}: RemoteImageProps) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">(
    src ? "loading" : "failed",
  );

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${fit === "contain" ? "bg-white" : "bg-[#eef0f5]"} ${className}`}
    >
      {state === "loading" && (
        <div className="skeleton absolute inset-0" aria-hidden />
      )}
      {state === "failed" ? (
        <div
          className="absolute inset-0 flex items-center justify-center text-[#b4bac3]"
          role="img"
          aria-label={alt}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-[40%] max-w-12"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
          </svg>
        </div>
      ) : (
        <Image
          src={src as string}
          alt={alt}
          fill
          unoptimized
          sizes={sizes}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className={`${fit === "contain" ? "object-contain p-[10%] mix-blend-multiply" : "object-cover"} transition-opacity duration-300 ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
