"use client";

import { useState } from "react";
import { getUTMFromURL, type UTMParams } from "@/lib/utm";

export function useUTM(): UTMParams {
  const [utm] = useState<UTMParams>(() => getUTMFromURL());

  return utm;
}
