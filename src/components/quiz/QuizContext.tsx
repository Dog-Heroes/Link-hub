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
  gender: string;       // "male" | "female"
  ageYears: number;
  ageMonths: number;
  weight: string;
  bodyCondition: string; // handle, e.g. "ideale"
}

export interface HealthData {
  neutered: string;        // "yes" | "no"
  activity: string;        // handle, e.g. "attivo"
  hunger: string;           // handle, e.g. "ghiotto" ("" = not chosen)
  diet: string[];           // handles, e.g. ["secco", "umido"]
  allergies: string[];     // handles; "nessuna" is exclusive
  hasDiseases: string;     // "yes" | "no"
  healthIssues: string[];  // handles; only meaningful when hasDiseases === "yes"
}

export interface QuizState {
  dog: DogData;
  health: HealthData;
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
    gender: "male",
    ageYears: 0,
    ageMonths: 0,
    weight: "",
    bodyCondition: "ideale",
  },
  health: {
    neutered: "no",
    activity: "attivo",
    hunger: "",
    diet: [],
    allergies: ["nessuna"],
    hasDiseases: "no",
    healthIssues: [],
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
