"use client";

import { useEffect, useState } from "react";
import { getUTMFromURL, type UTMParams } from "@/lib/utm";

export function useUTM(): UTMParams {
  const [utm, setUtm] = useState<UTMParams>({});

  useEffect(() => {
    setUtm(getUTMFromURL());
  }, []);

  return utm;
}
