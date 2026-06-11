"use client";

import Image from "next/image";
import { useState } from "react";

export default function CircuitThumb({
  url,
  country,
  size = 56,
  priority = false,
}: {
  url: string;
  country: string;
  size?: number;
  priority?: boolean;
}) {
  const [err, setErr] = useState(false);
  if (err) return <div style={{ width: size, height: size }} className="shrink-0" />;
  return (
    <Image
      src={url}
      alt={`${country} circuit`}
      width={size}
      height={size}
      sizes="(max-width: 640px) 100vw, 25vw"
      priority={priority}
      className="circuit-thumb object-contain shrink-0"
      onError={() => setErr(true)}
    />
  );
}
