"use client";

import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DogData {
  name: string;
  breed: string;
  gender: string;       // "Maschietto" | "Femminuccia"
  ageYears: number;
  ageMonths: number;
  weight: string;
  bodyCondition: string; // "Sottopeso" | "Ideale" | "Sovrappeso"
}

export interface HealthData {
  neutered: string;     // "Sì" | "No"
  activity: string;
  hunger: string;
  diet: string;
  allergies: string[];
  healthIssues: string[];
}

export interface OwnerData {
  name: string;
  email: string;
  phone: string;
  cap: string;
}

export interface QuizState {
  dog: DogData;
  health: HealthData;
  owner: OwnerData;
  currentSection: number;
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

type QuizAction =
  | { type: "SET_DOG"; field: keyof DogData; value: DogData[keyof DogData] }
  | { type: "SET_HEALTH"; field: keyof HealthData; value: HealthData[keyof HealthData] }
  | { type: "SET_OWNER"; field: keyof OwnerData; value: string }
  | { type: "SET_SECTION"; section: number };

/* ------------------------------------------------------------------ */
/*  Initial state                                                      */
/* ------------------------------------------------------------------ */

const initialState: QuizState = {
  dog: {
    name: "",
    breed: "",
    gender: "Maschietto",
    ageYears: 0,
    ageMonths: 0,
    weight: "",
    bodyCondition: "",
  },
  health: {
    neutered: "No",
    activity: "",
    hunger: "",
    diet: "",
    allergies: [],
    healthIssues: [],
  },
  owner: {
    name: "",
    email: "",
    phone: "",
    cap: "",
  },
  currentSection: 1,
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
    case "SET_OWNER":
      return { ...state, owner: { ...state.owner, [action.field]: action.value } };
    case "SET_SECTION":
      return { ...state, currentSection: action.section };
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
