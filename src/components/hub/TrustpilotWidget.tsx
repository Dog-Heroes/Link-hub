"use client";

import { useRef, useEffect } from "react";

export default function TrustpilotWidget() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const win = window as unknown as { Trustpilot?: { loadFromElement: (el: HTMLElement, seal?: boolean) => void } };
    if (ref.current && win.Trustpilot) {
      win.Trustpilot.loadFromElement(ref.current, true);
    }
  }, []);

  return (
    <div
      ref={ref}
      className="trustpilot-widget"
      data-locale="it-IT"
      data-template-id="5419b637fa0340045cd0c936"
      data-businessunit-id="5ef37f719b4d640001c640ef"
      data-style-height="20px"
      data-style-width="100%"
      data-token="c7774e47-725c-420b-84bd-5536ba95f678"
      data-theme="dark"
    >
      <a href="https://it.trustpilot.com/review/dogheroes.it" target="_blank" rel="noopener">
        Trustpilot
      </a>
    </div>
  );
}
