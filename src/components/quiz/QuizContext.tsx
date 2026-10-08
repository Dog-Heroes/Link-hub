"use client";

import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from "react";
import type { QuizOptions } from "@/lib/quiz-options";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * All the selectable fields below store the SAME value/handle the live
 * dogheroes.it quiz sends to the bridge (e.g. "molto-attivo", not "Molto
 * attivo") — see src/lib/quiz-options.ts. Labels for display come from the
 * fetched QuizOptions, never from a local copy, so the hub can't drift out
 * of sync with the site again.
 */
export interface DogData {
  name: string;
  breed: string;       // handle, e.g. "labrador-retriever" ("" = not chosen)
  breedLabel: string;  // display name kept in sync with `breed`
  gender: string;       // "" (not chosen) | "male" | "female" — the site has
                         // no default either, see the dropdown's un-set state
  // Kept as the raw <select> string value, not a number, so "" (not chosen)
  // is distinguishable from "0" (explicitly chosen): the live site accepts
  // 0 anni + 0 mesi as a valid age once BOTH are picked, but shows no
  // default and requires an explicit choice for each (verified live,
  // 08/10/2026 — see isQuizValid in PlanStep.tsx).
  ageYears: string;
  ageMonths: string;
  weight: string;
  bodyCondition: string; // handle, e.g. "ideale"
}

export interface HealthData {
  neutered: string;        // "" (not chosen) | "yes" | "no" — no default on
                             // the site either, must be chosen explicitly
  activity: string;        // handle, e.g. "attivo"
  hunger: string;           // handle, e.g. "ghiotto" ("" = not chosen)
  diet: string[];           // handles, e.g. ["secco", "umido"]
  allergies: string[];     // handles; "nessuna" is exclusive
  hasDiseases: string;     // "yes" | "no"
  healthIssues: string[];  // handles; only meaningful when hasDiseases === "yes"
}

/**
 * Contact details + consent, entered on the hub's own final step. Required
 * to reach the bridge (decision of 08/10/2026: the hub now sends the user
 * straight to the site's recipe page with their data already filled in).
 * NEVER persisted here or sent to the hub's own analytics/DB — they only
 * ever leave the browser inside the bridge URL's fragment (c_name/c_email/
 * c_phone/c_zip/c_consent, see PlanStep.tsx buildBridgeUrl), never in the
 * query string, so they can't end up in logs, GA4 or a referrer header.
 */
export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  zip: string;
  /** Same consent checkbox as the site's own customer-data step (privacy
   * policy + terms of service) — must be explicitly checked, never
   * pre-ticked. */
  consent: boolean;
}

export interface QuizState {
  dog: DogData;
  health: HealthData;
  customer: CustomerData;
  currentSection: number;
  options: QuizOptions | null;
  optionsLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

type QuizAction =
  | { type: "SET_DOG"; field: keyof DogData; value: DogData[keyof DogData] }
  | { type: "SET_HEALTH"; field: keyof HealthData; value: HealthData[keyof HealthData] }
  | { type: "SET_CUSTOMER"; field: keyof CustomerData; value: CustomerData[keyof CustomerData] }
  | { type: "SET_SECTION"; section: number }
  | { type: "SET_OPTIONS"; options: QuizOptions }
  | { type: "SET_OPTIONS_LOADING"; loading: boolean };

/* ------------------------------------------------------------------ */
/*  Initial state                                                      */
/* ------------------------------------------------------------------ */

const initialState: QuizState = {
  dog: {
    name: "",
    breed: "",
    breedLabel: "",
    gender: "", // no default on the site (verified live, 08/10/2026)
    ageYears: "", // idem — Anni/Mesi start empty, not "0"
    ageMonths: "",
    weight: "",
    bodyCondition: "ideale",
  },
  health: {
    neutered: "", // no default on the site (verified live, 08/10/2026)
    activity: "attivo",
    hunger: "",
    diet: [],
    allergies: ["nessuna"],
    hasDiseases: "no",
    healthIssues: [],
  },
  customer: {
    name: "",
    email: "",
    phone: "",
    zip: "",
    consent: false, // never pre-ticked
  },
  currentSection: 1,
  options: null,
  optionsLoading: true,
};

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "SET_DOG":
      return { ...state, dog: { ...state.dog, [action.field]: action.value } };
    case "SET_HEALTH":
      return { ...state, health: { ...state.health, [action.field]: action.value } };
    case "SET_CUSTOMER":
      return { ...state, customer: { ...state.customer, [action.field]: action.value } };
    case "SET_SECTION":
      return { ...state, currentSection: action.section };
    case "SET_OPTIONS":
      return { ...state, options: action.options, optionsLoading: false };
    case "SET_OPTIONS_LOADING":
      return { ...state, optionsLoading: action.loading };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const QuizContext = createContext<{
  state: QuizState;
  dispatch: Dispatch<QuizAction>;
} | null>(null);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(quizReducer, initialState);
  return (
    <QuizContext.Provider value={{ state, dispatch }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used inside QuizProvider");
  return ctx;
}
