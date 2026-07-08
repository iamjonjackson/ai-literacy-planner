"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { demoProgrammeId } from "@/lib/programme";
import {
  loadAllFromIdb,
  saveAllToIdb,
  getPendingRecords,
  markSynced,
  mergeFromSupabase,
  type IdbProgramme,
  type IdbModule,
  type IdbLearningOutcome,
  type IdbAssessment,
} from "@/lib/idb-store";
import { getSupabaseClient } from "@/lib/supabase";

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
  // Fields populated by CSV import
  aims?: string;
  scheme?: string;
  organiser?: string;
  url?: string;
  isCompulsory?: boolean;
};

type LearningOutcome = {
  id: string;
  programmeId: string;
  competencyId: string | null;
  text: string;
  moduleId: string | null;
  category?: string;
  loNumber?: string;
  status?: "to_delete";
};

type PriorityRating = "Low" | "Medium" | "High";
type RagStatus = "" | "Red" | "Amber" | "Green";

type Assessment = {
  id: string;
  programmeId: string;
  moduleId: string;
  assessmentCode: string;
  title: string;
  description: string;
  weight: string;
  duration: string;
  priority: PriorityRating | null;
  rag: RagStatus | null;
  status?: "to_delete";
  learningOutcomeIds: string[];
};

type CsvModuleImportRow = {
  code: string;
  name: string;
  year: number;
  isCompulsory: boolean;
  credits: string;
  scheme: string;
  organiser: string;
  aims: string;
  url: string;
  learningOutcomes: Array<{ category: string; loNumber: string; text: string }>;
  assessments: Array<{ assessmentCode: string; title: string; weight: string; duration: string }>;
};

type CsvProgrammeLearningOutcomeImportRow = {
  loNumber: string;
  category: string;
  text: string;
};

type BackupPayload = {
  programme: Programme;
  modules: Module[];
  learningOutcomes: LearningOutcome[];
  assessments: Assessment[];
};

type ModuleDeletionImpact = {
  moduleId: string;
  programmeId: string;
  moduleName: string;
  mappedLearningOutcomeCount: number;
  assessmentCount: number;
  ratedAssessmentCount: number;
  canDelete: boolean;
};

type BulkModuleDeletionResult = {
  deletedCount: number;
  skippedCount: number;
  skippedModules: string[];
};

export type { PriorityRating, RagStatus };

type AppDataState = {
  programmes: Programme[];
  modules: Module[];
  learningOutcomes: LearningOutcome[];
  assessments: Assessment[];
};

type SyncState = "idle" | "syncing" | "offline";

type AppDataContextValue = {
  state: AppDataState;
  isOffline: boolean;
  syncState: SyncState;
  pendingCount: number;
  createProgramme: (input: { name: string; description: string; years: number }) => string;
  updateProgramme: (programmeId: string, patch: Partial<Pick<Programme, "name" | "description" | "years">>) => void;
  renameProgramme: (programmeId: string, name: string) => void;
  updateProgrammeYears: (programmeId: string, years: number) => void;
  deleteProgramme: (programmeId: string) => void;
  addModule: (programmeId: string, input: { year: number; name: string; code?: string }) => string;
  getModuleDeletionImpact: (moduleId: string) => ModuleDeletionImpact | null;
  clearModulesForYear: (programmeId: string, year: number) => BulkModuleDeletionResult;
  resetProgrammeModules: (programmeId: string) => BulkModuleDeletionResult;
  updateModule: (moduleId: string, patch: Partial<Pick<Module, "name" | "code" | "credits" | "description" | "year" | "aims" | "scheme" | "organiser" | "url" | "isCompulsory">>) => void;
  deleteModule: (moduleId: string) => ModuleDeletionImpact | null;
  addLearningOutcome: (
    programmeId: string,
    input: { competencyId: string | null; text: string; category?: string; loNumber?: string },
  ) => string;
  updateLearningOutcome: (
    learningOutcomeId: string,
    patch: Partial<Pick<LearningOutcome, "text" | "competencyId" | "moduleId" | "category" | "loNumber" | "status">>,
  ) => void;
  deleteLearningOutcome: (learningOutcomeId: string) => void;
  addAssessment: (
    programmeId: string,
    input: {
      moduleId: string;
      assessmentCode?: string;
      title: string;
      weight?: string;
      duration?: string;
      rag: RagStatus;
      priority?: PriorityRating | null;
    },
  ) => string;
  updateAssessment: (
    assessmentId: string,
    patch: Partial<
      Pick<Assessment, "assessmentCode" | "title" | "description" | "weight" | "duration" | "priority" | "rag" | "status" | "learningOutcomeIds" | "moduleId">
    >,
  ) => void;
  deleteAssessment: (assessmentId: string) => void;
  exportProgrammeBackup: (programmeId: string) => BackupPayload | null;
  importProgrammeBackup: (payload: BackupPayload) => string;
  importCsvModules: (programmeId: string, rows: CsvModuleImportRow[]) => void;
  importProgrammeLearningOutcomes: (
    programmeId: string,
    rows: CsvProgrammeLearningOutcomeImportRow[],
  ) => void;
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

function idbRecordToState<T>(record: T): T {
  // IDB records have extra fields (syncStatus, localUpdatedAt) that we carry
  // through transparently — they don't affect in-memory state behaviour.
  return record;
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

function getModuleDeletionImpactFromState(
  state: AppDataState,
  moduleId: string,
): ModuleDeletionImpact | null {
  const moduleRecord = state.modules.find((record) => record.id === moduleId);
  if (!moduleRecord) {
    return null;
  }

  const moduleAssessments = state.assessments.filter((assessment) => assessment.moduleId === moduleId);
  const ratedAssessmentCount = moduleAssessments.filter(
    (assessment) => assessment.rag !== null || assessment.priority !== null,
  ).length;

  return {
    moduleId,
    programmeId: moduleRecord.programmeId,
    moduleName: moduleRecord.name,
    mappedLearningOutcomeCount: state.learningOutcomes.filter((learningOutcome) => learningOutcome.moduleId === moduleId)
      .length,
    assessmentCount: moduleAssessments.length,
    ratedAssessmentCount,
    canDelete: ratedAssessmentCount === 0,
  };
}

function deleteModulesFromState(
  state: AppDataState,
  moduleIds: string[],
): { nextState: AppDataState; result: BulkModuleDeletionResult } {
  const impacts = moduleIds
    .map((moduleId) => getModuleDeletionImpactFromState(state, moduleId))
    .filter((impact): impact is ModuleDeletionImpact => Boolean(impact));
  const deletableIds = new Set(impacts.filter((impact) => impact.canDelete).map((impact) => impact.moduleId));

  if (deletableIds.size === 0) {
    return {
      nextState: state,
      result: {
        deletedCount: 0,
        skippedCount: impacts.length,
        skippedModules: impacts.filter((impact) => !impact.canDelete).map((impact) => impact.moduleName),
      },
    };
  }

  const touchedProgrammeIds = new Set(
    impacts.filter((impact) => deletableIds.has(impact.moduleId)).map((impact) => impact.programmeId),
  );
  const timestamp = new Date().toISOString();

  return {
    nextState: {
      programmes: state.programmes.map((programme) =>
        touchedProgrammeIds.has(programme.id) ? { ...programme, updatedAt: timestamp } : programme,
      ),
      modules: state.modules.filter((module) => !deletableIds.has(module.id)),
      learningOutcomes: state.learningOutcomes.map((learningOutcome) =>
        learningOutcome.moduleId && deletableIds.has(learningOutcome.moduleId)
          ? { ...learningOutcome, moduleId: null }
          : learningOutcome,
      ),
      assessments: state.assessments.filter((assessment) => !deletableIds.has(assessment.moduleId)),
    },
    result: {
      deletedCount: deletableIds.size,
      skippedCount: impacts.length - deletableIds.size,
      skippedModules: impacts.filter((impact) => !impact.canDelete).map((impact) => impact.moduleName),
    },
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(initialState);
  const [isOffline, setIsOffline] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const idbLoadedRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load from IndexedDB on mount ──────────────────────────────────────────
  useEffect(() => {
    if (idbLoadedRef.current) return;
    idbLoadedRef.current = true;

    loadAllFromIdb()
      .then(({ programmes, modules, learningOutcomes, assessments }) => {
        if (
          programmes.length > 0 ||
          modules.length > 0 ||
          learningOutcomes.length > 0 ||
          assessments.length > 0
        ) {
          setState({
            programmes: programmes.map(idbRecordToState),
            modules: modules.map(idbRecordToState),
            learningOutcomes: learningOutcomes.map(idbRecordToState),
            assessments: assessments.map(idbRecordToState),
          });
        }
      })
      .catch(() => {
        // IndexedDB not available — fall back to initial state
      });
  }, []);

  // ── Persist to IndexedDB whenever state changes ───────────────────────────
  useEffect(() => {
    const ts = new Date().toISOString();
    saveAllToIdb({
      programmes: state.programmes.map((p) => ({
        ...p,
        syncStatus: "pending" as const,
        localUpdatedAt: ts,
      })) as IdbProgramme[],
      modules: state.modules.map((m) => ({
        ...m,
        syncStatus: "pending" as const,
        localUpdatedAt: ts,
      })) as IdbModule[],
      learningOutcomes: state.learningOutcomes.map((lo) => ({
        ...lo,
        syncStatus: "pending" as const,
        localUpdatedAt: ts,
      })) as IdbLearningOutcome[],
      assessments: state.assessments.map((a) => ({
        ...a,
        syncStatus: "pending" as const,
        localUpdatedAt: ts,
      })) as IdbAssessment[],
    }).catch(() => {});
  }, [state]);

  // ── Online / offline detection ────────────────────────────────────────────
  useEffect(() => {
    const updateStatus = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      setSyncState(offline ? "offline" : "idle");
    };
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  // ── Supabase background sync ──────────────────────────────────────────────
  const doSync = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || isOffline) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setSyncState("syncing");

      // Push pending writes
      const pending = await getPendingRecords();
      const totalPending =
        pending.programmes.length +
        pending.modules.length +
        pending.learningOutcomes.length +
        pending.assessments.length;

      setPendingCount(totalPending);

      // Push programmes
      for (const programme of pending.programmes) {
        const { error } = await supabase.from("programmes").upsert({
          id: programme.id,
          name: programme.name,
          description: programme.description,
          years: programme.years,
          updated_at: programme.updatedAt,
        });
        if (!error) await markSynced("programmes", programme.id);
      }

      // Push modules
      for (const moduleRecord of pending.modules) {
        const { error } = await supabase.from("modules").upsert({
          id: moduleRecord.id,
          programme_id: moduleRecord.programmeId,
          name: moduleRecord.name,
          code: moduleRecord.code,
          year: moduleRecord.year,
          order: moduleRecord.order,
          credits: moduleRecord.credits,
          description: moduleRecord.description,
          aims: moduleRecord.aims,
          scheme: moduleRecord.scheme,
          organiser: moduleRecord.organiser,
          url: moduleRecord.url,
          is_compulsory: moduleRecord.isCompulsory,
          updated_at: moduleRecord.updatedAt,
        });
        if (!error) await markSynced("modules", moduleRecord.id);
      }

      // Push learning outcomes
      for (const lo of pending.learningOutcomes) {
        const { error } = await supabase.from("learning_outcomes").upsert({
          id: lo.id,
          programme_id: lo.programmeId,
          competency_id: lo.competencyId,
          text: lo.text,
          module_id: lo.moduleId,
          category: lo.category,
          lo_number: lo.loNumber,
          status: lo.status,
          updated_at: lo.updatedAt,
        });
        if (!error) await markSynced("learning_outcomes", lo.id);
      }

      // Push assessments
      for (const assessment of pending.assessments) {
        const { error } = await supabase.from("assessments").upsert({
          id: assessment.id,
          programme_id: assessment.programmeId,
          module_id: assessment.moduleId,
          assessment_code: assessment.assessmentCode,
          title: assessment.title,
          description: assessment.description,
          weight: assessment.weight,
          duration: assessment.duration,
          priority_rating: assessment.priority?.toLowerCase() ?? null,
          rag_status: assessment.rag?.toLowerCase() ?? null,
          status: assessment.status,
          updated_at: assessment.updatedAt,
        });
        if (!error) await markSynced("assessments", assessment.id);
      }

      // Pull latest data from Supabase
      const { data: programmes } = await supabase
        .from("programmes")
        .select("*")
        .order("updated_at", { ascending: false });

      if (programmes) {
        const mappedProgrammes: IdbProgramme[] = programmes.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          description: (p.description as string) ?? "",
          years: p.years as number,
          ownerEmail: (p.owner_email as string) ?? "",
          role: (p.role as "owner" | "editor" | "viewer") ?? "owner",
          updatedAt: p.updated_at as string,
          syncStatus: "synced" as const,
          localUpdatedAt: p.updated_at as string,
        }));

        const changed = await mergeFromSupabase({ programmes: mappedProgrammes });
        if (changed) {
          const fresh = await loadAllFromIdb();
          setState({
            programmes: fresh.programmes.map(idbRecordToState),
            modules: fresh.modules.map(idbRecordToState),
            learningOutcomes: fresh.learningOutcomes.map(idbRecordToState),
            assessments: fresh.assessments.map(idbRecordToState),
          });
        }
      }

      // Recount pending
      const stillPending = await getPendingRecords();
      const remaining =
        stillPending.programmes.length +
        stillPending.modules.length +
        stillPending.learningOutcomes.length +
        stillPending.assessments.length;
      setPendingCount(remaining);
      setSyncState("idle");
    } catch {
      setSyncState(isOffline ? "offline" : "idle");
    }
  }, [isOffline]);

  useEffect(() => {
    doSync();
    syncIntervalRef.current = setInterval(doSync, 5000);
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [doSync]);

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

  const updateProgramme = useCallback(
    (programmeId: string, patch: Partial<Pick<Programme, "name" | "description" | "years">>) => {
      setState((current) => ({
        ...current,
        programmes: current.programmes.map((programme) =>
          programme.id === programmeId
            ? { ...programme, ...patch, updatedAt: new Date().toISOString() }
            : programme,
        ),
      }));
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

  const getModuleDeletionImpact = useCallback(
    (moduleId: string) => getModuleDeletionImpactFromState(state, moduleId),
    [state],
  );

  const clearModulesForYear = useCallback((programmeId: string, year: number) => {
    let result: BulkModuleDeletionResult = {
      deletedCount: 0,
      skippedCount: 0,
      skippedModules: [],
    };

    setState((current) => {
      const moduleIds = current.modules
        .filter((module) => module.programmeId === programmeId && module.year === year)
        .map((module) => module.id);
      const deletion = deleteModulesFromState(current, moduleIds);
      result = deletion.result;
      return deletion.nextState;
    });

    return result;
  }, []);

  const resetProgrammeModules = useCallback((programmeId: string) => {
    let result: BulkModuleDeletionResult = {
      deletedCount: 0,
      skippedCount: 0,
      skippedModules: [],
    };

    setState((current) => {
      const moduleIds = current.modules
        .filter((module) => module.programmeId === programmeId)
        .map((module) => module.id);
      const deletion = deleteModulesFromState(current, moduleIds);
      result = deletion.result;
      return deletion.nextState;
    });

    return result;
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
    (moduleId: string, patch: Partial<Pick<Module, "name" | "code" | "credits" | "description" | "year" | "aims" | "scheme" | "organiser" | "url" | "isCompulsory">>) => {
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
    let impact: ModuleDeletionImpact | null = null;

    setState((current) => {
      impact = getModuleDeletionImpactFromState(current, moduleId);
      if (!impact?.canDelete) {
        return current;
      }

      return deleteModulesFromState(current, [moduleId]).nextState;
    });

    return impact;
  }, []);

  const addLearningOutcome = useCallback(
    (
      programmeId: string,
      input: { competencyId: string | null; text: string; category?: string; loNumber?: string },
    ) => {
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
            category: input.category,
            loNumber: input.loNumber,
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
      patch: Partial<Pick<LearningOutcome, "text" | "competencyId" | "moduleId" | "category" | "loNumber" | "status">>,
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
      input: {
        moduleId: string;
        assessmentCode?: string;
        title: string;
        weight?: string;
        duration?: string;
        rag: RagStatus;
        priority?: PriorityRating | null;
      },
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
            assessmentCode: input.assessmentCode ?? "",
            title: input.title,
            description: "",
            weight: input.weight ?? "",
            duration: input.duration ?? "",
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
          "assessmentCode" | "title" | "description" | "weight" | "duration" | "priority" | "rag" | "status" | "learningOutcomeIds" | "moduleId"
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

  const importCsvModules = useCallback((programmeId: string, rows: CsvModuleImportRow[]) => {
    setState((current) => {
      const existingModules = current.modules.filter((m) => m.programmeId === programmeId);
      let modules = [...current.modules];
      let learningOutcomes = [...current.learningOutcomes];
      let assessments = [...current.assessments];

      for (const row of rows) {
        const existingModule = row.code
          ? existingModules.find((m) => m.code === row.code)
          : undefined;

        let moduleId: string;
        if (existingModule) {
          moduleId = existingModule.id;
          // Upsert: update module fields
          modules = modules.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  name: row.name,
                  year: row.year,
                  isCompulsory: row.isCompulsory,
                  credits: row.credits,
                  scheme: row.scheme,
                  organiser: row.organiser,
                  aims: row.aims,
                  url: row.url,
                }
              : m,
          );
          // Remove previous imported LOs (competencyId null + category set)
          learningOutcomes = learningOutcomes.filter(
            (lo) => !(lo.moduleId === moduleId && lo.competencyId === null && lo.category),
          );
          // Remove previous unrated imported assessments
          assessments = assessments.filter(
            (a) => !(a.moduleId === moduleId && a.rag === null && a.priority === null),
          );
        } else {
          moduleId = generateId();
          const siblingsInYear = modules.filter(
            (m) => m.programmeId === programmeId && m.year === row.year,
          );
          modules.push({
            id: moduleId,
            programmeId,
            year: row.year,
            name: row.name,
            code: row.code,
            credits: row.credits,
            description: "",
            order: siblingsInYear.length,
            isCompulsory: row.isCompulsory,
            scheme: row.scheme,
            organiser: row.organiser,
            aims: row.aims,
            url: row.url,
          });
        }

        // Insert new imported LOs
        for (const lo of row.learningOutcomes) {
          learningOutcomes.push({
            id: generateId(),
            programmeId,
            competencyId: null,
            text: lo.text,
            moduleId,
            category: lo.category,
            loNumber: lo.loNumber,
          });
        }

        // Insert new imported assessments
        const moduleLoIds = learningOutcomes
          .filter((lo) => lo.moduleId === moduleId)
          .map((lo) => lo.id);
        for (const a of row.assessments) {
          assessments.push({
            id: generateId(),
            programmeId,
            moduleId,
            assessmentCode: a.assessmentCode,
            title: a.title,
            description: "",
            weight: a.weight,
            duration: a.duration,
            priority: null,
            rag: null,
            learningOutcomeIds: moduleLoIds,
          });
        }
      }

      return {
        ...current,
        programmes: touchProgramme(current.programmes, programmeId),
        modules,
        learningOutcomes,
        assessments,
      };
    });
  }, []);

  const importProgrammeLearningOutcomes = useCallback(
    (programmeId: string, rows: CsvProgrammeLearningOutcomeImportRow[]) => {
      setState((current) => ({
        ...current,
        programmes: touchProgramme(current.programmes, programmeId),
        learningOutcomes: [
          ...current.learningOutcomes,
          ...rows.map((row) => ({
            id: generateId(),
            programmeId,
            competencyId: null,
            text: row.text,
            moduleId: null,
            category: row.category,
            loNumber: row.loNumber,
          })),
        ],
      }));
    },
    [],
  );

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
      syncState,
      pendingCount,
      createProgramme,
      updateProgramme,
      renameProgramme,
      updateProgrammeYears,
      deleteProgramme,
      getModuleDeletionImpact,
      clearModulesForYear,
      resetProgrammeModules,
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
      importCsvModules,
      importProgrammeLearningOutcomes,
    }),
    [
      state,
      isOffline,
      syncState,
      pendingCount,
      createProgramme,
      updateProgramme,
      renameProgramme,
      updateProgrammeYears,
      deleteProgramme,
      getModuleDeletionImpact,
      clearModulesForYear,
      resetProgrammeModules,
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
      importCsvModules,
      importProgrammeLearningOutcomes,
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

export type {
  Programme,
  Module,
  LearningOutcome,
  Assessment,
  BackupPayload,
  CsvModuleImportRow,
  CsvProgrammeLearningOutcomeImportRow,
  ModuleDeletionImpact,
  BulkModuleDeletionResult,
};
