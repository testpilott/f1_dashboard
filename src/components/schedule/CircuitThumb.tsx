"use client";

import Image from "next/image";
import { useState } from "react";

export default function CircuitThumb({ url, country }: { url: string; country: string }) {
  const [err, setErr] = useState(false);
  if (err) return <div className="w-14 h-14 shrink-0" />;
  return (
    <Image
      src={url}
      alt={`${country} circuit`}
      width={56}
      height={56}
      className="object-contain shrink-0 opacity-60 dark:invert dark:opacity-70"
      onError={() => setErr(true)}
    />
  );
}
