import { useState, useCallback, useRef, useEffect } from 'react';
import { IEditorSchema } from '@mailcraft/shared-types';

interface HistoryState {
  past: IEditorSchema[];
  present: IEditorSchema;
  future: IEditorSchema[];
}

export function useEditorHistory(initialSchema: IEditorSchema) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialSchema,
    future: [],
  });

  const lastSnapshotRef = useRef<IEditorSchema>(initialSchema);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reset history when campaign initially loads
  const resetHistory = useCallback((schema: IEditorSchema) => {
    setHistory({
      past: [],
      present: schema,
      future: [],
    });
    lastSnapshotRef.current = schema;
  }, []);

  const updateSchema = useCallback(
    (
      newSchemaOrUpdater:
        | IEditorSchema
        | ((prev: IEditorSchema) => IEditorSchema),
      options: { debounce?: boolean; skipHistory?: boolean } = {}
    ) => {
      setHistory((curr) => {
        const nextPresent =
          typeof newSchemaOrUpdater === 'function'
            ? newSchemaOrUpdater(curr.present)
            : newSchemaOrUpdater;

        if (options.skipHistory) {
          return {
            ...curr,
            present: nextPresent,
          };
        }

        if (options.debounce) {
          // Keep updating present immediately for responsive UI, but delay committing past snapshot
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          debounceTimerRef.current = setTimeout(() => {
            setHistory((latest) => {
              // Only push to past if different from last snapshot
              if (
                JSON.stringify(lastSnapshotRef.current) !==
                JSON.stringify(latest.present)
              ) {
                const newPast = [...latest.past, lastSnapshotRef.current].slice(
                  -30
                ); // keep max 30 snapshots
                lastSnapshotRef.current = latest.present;
                return {
                  past: newPast,
                  present: latest.present,
                  future: [],
                };
              }
              return latest;
            });
          }, 600);

          return {
            ...curr,
            present: nextPresent,
          };
        }

        // Immediate snapshot commit for discrete actions (add, delete, reorder)
        const newPast = [...curr.past, curr.present].slice(-30);
        lastSnapshotRef.current = nextPresent;
        return {
          past: newPast,
          present: nextPresent,
          future: [],
        };
      });
    },
    []
  );

  const undo = useCallback(() => {
    setHistory((curr) => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);
      lastSnapshotRef.current = previous;
      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((curr) => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      lastSnapshotRef.current = next;
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    schema: history.present,
    updateSchema,
    resetHistory,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}

