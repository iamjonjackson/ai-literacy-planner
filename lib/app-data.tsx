"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { demoProgrammeId } from "@/lib/programme";

const STORAGE_KEY = "ai-literacy-planner-v2";

type Programme = {
  id: string;
  name: string;
  description: string;
  years: number;
  ownerEmail: string;
  role: "owner" | "editor" | "viewer";
  updatedAt: string;
};

type Module = {
  id: string;
  programmeId: string;
  year: number;
  name: string;
  code: string;
  credits: string;
  description: string;
  order: number;
};

type LearningOutcome = {
  id: string;
  programmeId: string;
  competencyId: string | null;
  text: string;
  moduleId: string | null;
  category?: string;
  loNumber?: string;
};

type PriorityRating = "Low" | "Medium" | "High";
type RagStatus = "Red" | "Amber" | "Green";

type Assessment = {
  id: string;
  programmeId: string;
  moduleId: string;
  title: string;
  type: string;
  description: string;
  weight: string;
  priority: PriorityRating | null;
  rag: RagStatus | null;
  learningOutcomeIds: string[];
};

type BackupPayload = {
  programme: Programme;
  modules: Module[];
  learningOutcomes: LearningOutcome[];
  assessments: Assessment[];
};

type AppDataState = {
  programmes: Programme[];
  modules: Module[];
  learningOutcomes: LearningOutcome[];
  assessments: Assessment[];
};

type AppDataContextValue = {
  state: AppDataState;
  isOffline: boolean;
  createProgramme: (input: { name: string; description: string; years: number }) => string;
  renameProgramme: (programmeId: string, name: string) => void;
  updateProgrammeYears: (programmeId: string, years: number) => void;
  deleteProgramme: (programmeId: string) => void;
  addModule: (programmeId: string, input: { year: number; name: string; code?: string }) => string;
  updateModule: (moduleId: string, patch: Partial<Pick<Module, "name" | "code" | "credits" | "description" | "year">>) => void;
  deleteModule: (moduleId: string) => void;
  addLearningOutcome: (programmeId: string, input: { competencyId: string | null; text: string }) => string;
  updateLearningOutcome: (
    learningOutcomeId: string,
    patch: Partial<Pick<LearningOutcome, "text" | "competencyId" | "moduleId">>,
  ) => void;
  deleteLearningOutcome: (learningOutcomeId: string) => void;
  addAssessment: (
    programmeId: string,
    input: { moduleId: string; title: string; rag: RagStatus; priority?: PriorityRating | null },
  ) => string;
  updateAssessment: (
    assessmentId: string,
    patch: Partial<
      Pick<Assessment, "title" | "type" | "description" | "weight" | "priority" | "rag" | "learningOutcomeIds" | "moduleId">
    >,
  ) => void;
  deleteAssessment: (assessmentId: string) => void;
  exportProgrammeBackup: (programmeId: string) => BackupPayload | null;
  importProgrammeBackup: (payload: BackupPayload) => string;
};

const initialState: AppDataState = {
  programmes: [
    {
      id: demoProgrammeId,
      name: "Sample Programme",
      description: "Starter programme for UNESCO AI competency planning.",
      years: 3,
      ownerEmail: "owner@example.edu",
      role: "owner",
      updatedAt: new Date().toISOString(),
    },
  ],
  modules: [],
  learningOutcomes: [],
  assessments: [],
};

function loadInitialState(): AppDataState {
  if (typeof window === "undefined") {
    return initialState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialState;
    }

    const parsed = JSON.parse(raw) as Partial<AppDataState>;
    if (
      Array.isArray(parsed.programmes) &&
      Array.isArray(parsed.modules) &&
      Array.isArray(parsed.learningOutcomes) &&
      Array.isArray(parsed.assessments)
    ) {
      return {
        programmes: parsed.programmes,
        modules: parsed.modules,
        learningOutcomes: parsed.learningOutcomes,
        assessments: parsed.assessments,
      };
    }
  } catch {}

  return initialState;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function touchProgramme(programmes: Programme[], programmeId: string) {
  return programmes.map((programme) =>
    programme.id === programmeId ? { ...programme, updatedAt: new Date().toISOString() } : programme,
  );
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(loadInitialState);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const updateStatus = () => setIsOffline(!navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const createProgramme = useCallback(
    (input: { name: string; description: string; years: number }) => {
      const programmeId = generateId();
      const record: Programme = {
        id: programmeId,
        name: input.name,
        description: input.description,
        years: input.years,
        ownerEmail: "owner@example.edu",
        role: "owner",
        updatedAt: new Date().toISOString(),
      };

      setState((current) => ({ ...current, programmes: [record, ...current.programmes] }));
      return programmeId;
    },
    [],
  );

  const renameProgramme = useCallback((programmeId: string, name: string) => {
    setState((current) => ({
      ...current,
      programmes: current.programmes.map((programme) =>
        programme.id === programmeId ? { ...programme, name, updatedAt: new Date().toISOString() } : programme,
      ),
    }));
  }, []);

  const updateProgrammeYears = useCallback((programmeId: string, years: number) => {
    setState((current) => {
      const programmes = current.programmes.map((programme) =>
        programme.id === programmeId ? { ...programme, years, updatedAt: new Date().toISOString() } : programme,
      );

      const modules = current.modules.filter(
        (module) => module.programmeId !== programmeId || module.year <= years,
      );

      const remainingModuleIds = new Set(modules.map((module) => module.id));
      const learningOutcomes = current.learningOutcomes.map((learningOutcome) =>
        learningOutcome.moduleId && !remainingModuleIds.has(learningOutcome.moduleId)
          ? { ...learningOutcome, moduleId: null }
          : learningOutcome,
      );
      const assessments = current.assessments.filter((assessment) =>
        remainingModuleIds.has(assessment.moduleId),
      );

      return { programmes, modules, learningOutcomes, assessments };
    });
  }, []);

  const deleteProgramme = useCallback((programmeId: string) => {
    setState((current) => ({
      programmes: current.programmes.filter((programme) => programme.id !== programmeId),
      modules: current.modules.filter((module) => module.programmeId !== programmeId),
      learningOutcomes: current.learningOutcomes.filter(
        (learningOutcome) => learningOutcome.programmeId !== programmeId,
      ),
      assessments: current.assessments.filter((assessment) => assessment.programmeId !== programmeId),
    }));
  }, []);

  const addModule = useCallback(
    (programmeId: string, input: { year: number; name: string; code?: string }) => {
      const moduleId = generateId();
      setState((current) => {
        const siblings = current.modules.filter(
          (module) => module.programmeId === programmeId && module.year === input.year,
        );

        return {
          ...current,
          programmes: touchProgramme(current.programmes, programmeId),
          modules: [
            ...current.modules,
            {
              id: moduleId,
              programmeId,
              year: input.year,
              name: input.name,
              code: input.code?.trim() ?? "",
              credits: "",
              description: "",
              order: siblings.length,
            },
          ],
        };
      });
      return moduleId;
    },
    [],
  );

  const updateModule = useCallback(
    (moduleId: string, patch: Partial<Pick<Module, "name" | "code" | "credits" | "description" | "year">>) => {
      setState((current) => {
        const target = current.modules.find((module) => module.id === moduleId);
        if (!target) {
          return current;
        }

        return {
          ...current,
          programmes: touchProgramme(current.programmes, target.programmeId),
          modules: current.modules.map((module) =>
            module.id === moduleId ? { ...module, ...patch } : module,
          ),
        };
      });
    },
    [],
  );

  const deleteModule = useCallback((moduleId: string) => {
    setState((current) => {
      const target = current.modules.find((module) => module.id === moduleId);
      if (!target) {
        return current;
      }

      return {
        ...current,
        programmes: touchProgramme(current.programmes, target.programmeId),
        modules: current.modules.filter((module) => module.id !== moduleId),
        learningOutcomes: current.learningOutcomes.map((learningOutcome) =>
          learningOutcome.moduleId === moduleId ? { ...learningOutcome, moduleId: null } : learningOutcome,
        ),
        assessments: current.assessments.filter((assessment) => assessment.moduleId !== moduleId),
      };
    });
  }, []);

  const addLearningOutcome = useCallback(
    (programmeId: string, input: { competencyId: string | null; text: string }) => {
      const learningOutcomeId = generateId();
      setState((current) => ({
        ...current,
        programmes: touchProgramme(current.programmes, programmeId),
        learningOutcomes: [
          ...current.learningOutcomes,
          {
            id: learningOutcomeId,
            programmeId,
            competencyId: input.competencyId,
            text: input.text,
            moduleId: null,
          },
        ],
      }));

      return learningOutcomeId;
    },
    [],
  );

  const updateLearningOutcome = useCallback(
    (
      learningOutcomeId: string,
      patch: Partial<Pick<LearningOutcome, "text" | "competencyId" | "moduleId">>,
    ) => {
      setState((current) => {
        const target = current.learningOutcomes.find((learningOutcome) => learningOutcome.id === learningOutcomeId);
        if (!target) {
          return current;
        }

        return {
          ...current,
          programmes: touchProgramme(current.programmes, target.programmeId),
          learningOutcomes: current.learningOutcomes.map((learningOutcome) =>
            learningOutcome.id === learningOutcomeId ? { ...learningOutcome, ...patch } : learningOutcome,
          ),
        };
      });
    },
    [],
  );

  const deleteLearningOutcome = useCallback((learningOutcomeId: string) => {
    setState((current) => {
      const target = current.learningOutcomes.find((learningOutcome) => learningOutcome.id === learningOutcomeId);
      if (!target) {
        return current;
      }

      return {
        ...current,
        programmes: touchProgramme(current.programmes, target.programmeId),
        learningOutcomes: current.learningOutcomes.filter(
          (learningOutcome) => learningOutcome.id !== learningOutcomeId,
        ),
        assessments: current.assessments.map((assessment) => ({
          ...assessment,
          learningOutcomeIds: assessment.learningOutcomeIds.filter((id) => id !== learningOutcomeId),
        })),
      };
    });
  }, []);

  const addAssessment = useCallback(
    (
      programmeId: string,
      input: { moduleId: string; title: string; rag: RagStatus; priority?: PriorityRating | null },
    ) => {
      const assessmentId = generateId();
      setState((current) => ({
        ...current,
        programmes: touchProgramme(current.programmes, programmeId),
        assessments: [
          ...current.assessments,
          {
            id: assessmentId,
            programmeId,
            moduleId: input.moduleId,
            title: input.title,
            type: "",
            description: "",
            weight: "",
            priority: input.priority ?? null,
            rag: input.rag,
            learningOutcomeIds: current.learningOutcomes
              .filter((learningOutcome) => learningOutcome.moduleId === input.moduleId)
              .map((learningOutcome) => learningOutcome.id),
          },
        ],
      }));
      return assessmentId;
    },
    [],
  );

  const updateAssessment = useCallback(
    (
      assessmentId: string,
      patch: Partial<
        Pick<
          Assessment,
          "title" | "type" | "description" | "weight" | "priority" | "rag" | "learningOutcomeIds" | "moduleId"
        >
      >,
    ) => {
      setState((current) => {
        const target = current.assessments.find((assessment) => assessment.id === assessmentId);
        if (!target) {
          return current;
        }

        return {
          ...current,
          programmes: touchProgramme(current.programmes, target.programmeId),
          assessments: current.assessments.map((assessment) =>
            assessment.id === assessmentId ? { ...assessment, ...patch } : assessment,
          ),
        };
      });
    },
    [],
  );

  const deleteAssessment = useCallback((assessmentId: string) => {
    setState((current) => {
      const target = current.assessments.find((assessment) => assessment.id === assessmentId);
      if (!target) {
        return current;
      }

      return {
        ...current,
        programmes: touchProgramme(current.programmes, target.programmeId),
        assessments: current.assessments.filter((assessment) => assessment.id !== assessmentId),
      };
    });
  }, []);

  const exportProgrammeBackup = useCallback(
    (programmeId: string) => {
      const programme = state.programmes.find((record) => record.id === programmeId);
      if (!programme) {
        return null;
      }

      return {
        programme,
        modules: state.modules.filter((module) => module.programmeId === programmeId),
        learningOutcomes: state.learningOutcomes.filter(
          (learningOutcome) => learningOutcome.programmeId === programmeId,
        ),
        assessments: state.assessments.filter((assessment) => assessment.programmeId === programmeId),
      };
    },
    [state],
  );

  const importProgrammeBackup = useCallback((payload: BackupPayload) => {
    const programmeId = generateId();
    const moduleIdMap = new Map<string, string>();
    const learningOutcomeIdMap = new Map<string, string>();

    const programmes: Programme[] = [
      {
        ...payload.programme,
        id: programmeId,
        role: "owner",
        ownerEmail: "owner@example.edu",
        name: `${payload.programme.name} (Imported)`,
        updatedAt: new Date().toISOString(),
      },
    ];

    const modules = payload.modules.map((module) => {
      const id = generateId();
      moduleIdMap.set(module.id, id);
      return { ...module, id, programmeId };
    });

    const learningOutcomes = payload.learningOutcomes.map((learningOutcome) => {
      const id = generateId();
      learningOutcomeIdMap.set(learningOutcome.id, id);
      return {
        ...learningOutcome,
        id,
        programmeId,
        moduleId: learningOutcome.moduleId ? moduleIdMap.get(learningOutcome.moduleId) ?? null : null,
      };
    });

    const assessments = payload.assessments
      .map((assessment) => ({
        ...assessment,
        id: generateId(),
        programmeId,
        moduleId: moduleIdMap.get(assessment.moduleId) ?? "",
        learningOutcomeIds: assessment.learningOutcomeIds
          .map((id) => learningOutcomeIdMap.get(id))
          .filter((id): id is string => Boolean(id)),
      }))
      .filter((assessment) => Boolean(assessment.moduleId));

    setState((current) => ({
      programmes: [...programmes, ...current.programmes],
      modules: [...modules, ...current.modules],
      learningOutcomes: [...learningOutcomes, ...current.learningOutcomes],
      assessments: [...assessments, ...current.assessments],
    }));

    return programmeId;
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      state,
      isOffline,
      createProgramme,
      renameProgramme,
      updateProgrammeYears,
      deleteProgramme,
      addModule,
      updateModule,
      deleteModule,
      addLearningOutcome,
      updateLearningOutcome,
      deleteLearningOutcome,
      addAssessment,
      updateAssessment,
      deleteAssessment,
      exportProgrammeBackup,
      importProgrammeBackup,
    }),
    [
      state,
      isOffline,
      createProgramme,
      renameProgramme,
      updateProgrammeYears,
      deleteProgramme,
      addModule,
      updateModule,
      deleteModule,
      addLearningOutcome,
      updateLearningOutcome,
      deleteLearningOutcome,
      addAssessment,
      updateAssessment,
      deleteAssessment,
      exportProgrammeBackup,
      importProgrammeBackup,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }

  return context;
}

export type { Programme, Module, LearningOutcome, Assessment, BackupPayload, PriorityRating, RagStatus };
