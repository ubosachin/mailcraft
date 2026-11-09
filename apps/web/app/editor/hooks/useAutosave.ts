import { useState, useEffect, useRef, useCallback } from 'react';
import { IEditorSchema } from '@mailcraft/shared-types';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface AutosavePayload {
  campaignId: string;
  campaignName: string;
  subject: string;
  preheader?: string;
  schema: IEditorSchema;
}

export function useAutosave({
  campaignId,
  campaignName,
  subject,
  preheader,
  schema,
  enabled = true,
}: AutosavePayload & { enabled?: boolean }) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastSavedPayloadRef = useRef<string>('');
  const latestPayloadRef = useRef({ campaignName, subject, preheader, schema });
  latestPayloadRef.current = { campaignName, subject, preheader, schema };

  const isInitialMount = useRef(true);
  const saveSequenceRef = useRef(0);

  // Core save function
  const performSave = useCallback(async (): Promise<boolean> => {
    if (!campaignId) return false;

    const currentSeq = ++saveSequenceRef.current;
    const currentData = latestPayloadRef.current;
    const stringified = JSON.stringify(currentData);

    // If identical to what was already saved, mark saved and exit
    if (stringified === lastSavedPayloadRef.current) {
      setSaveStatus('saved');
      return true;
    }

    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignName: currentData.campaignName,
          subject: currentData.subject,
          preheader: currentData.preheader,
          editorData: currentData.schema,
        }),
      });

      // Avoid race conditions if a newer save was initiated
      if (currentSeq !== saveSequenceRef.current) {
        return false;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      lastSavedPayloadRef.current = stringified;
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      return true;
    } catch (err: unknown) {
      if (currentSeq === saveSequenceRef.current) {
        setSaveStatus('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to save changes'
        );
      }
      return false;
    }
  }, [campaignId]);

  // Set initial baseline
  const initBaseline = useCallback((data: {
    campaignName: string;
    subject: string;
    preheader?: string;
    schema: IEditorSchema;
  }) => {
    lastSavedPayloadRef.current = JSON.stringify(data);
    setSaveStatus('saved');
  }, []);

  // Monitor changes and trigger debounced autosave
  useEffect(() => {
    if (!enabled || !campaignId) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const currentStringified = JSON.stringify(latestPayloadRef.current);
    if (currentStringified !== lastSavedPayloadRef.current) {
      setSaveStatus('unsaved');

      const timer = setTimeout(() => {
        performSave();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [campaignName, subject, preheader, schema, enabled, campaignId, performSave]);

  // Prevent leaving window when unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  return {
    saveStatus,
    lastSavedAt,
    errorMessage,
    performSave,
    initBaseline,
  };
}

