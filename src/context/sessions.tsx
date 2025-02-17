"use client";

import {
  TChatMessage,
  TChatSession,
  useChatSession,
} from "@/hooks/use-chat-session";
import { useParams, useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useState } from "react";

export type TSessionsContext = {
  sessions: TChatSession[];
  refetchSessions?: () => void;
  isGenerating: boolean;
  setGenerating: (value: boolean) => void;
  isAllSessionLoading: boolean;
  isCurrentSessionLoading: boolean;
  currentSession?: TChatSession;
  createSession: (props: { redirect?: boolean }) => void;
  setCurrentSession?: React.Dispatch<React.SetStateAction<TChatSession | undefined>>;
  removeMessage: (messageId: string) => void;
  refetchCurrentSession?: () => void;
  addMessageToSession: (sessionId: string, message: TChatMessage) => void;
  getSessionById: (id: string) => Promise<TChatSession | undefined>;
} & ReturnType<typeof useChatSession>;

export const SessionContext = createContext<TSessionsContext | undefined>(undefined);

export const useSessionsContext = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionsContext must be used within a SessionsProvider");
  }
  return context;
};

export type TSessionsProvider = {
  children: React.ReactNode;
};

export const SessionsProvider = ({ children }: TSessionsProvider) => {
  const { sessionId } = useParams();
  const [sessions, setSessions] = useState<TChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<TChatSession | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);

  // Hook that manages IDB storage: fetch, create, etc.
  const props = useChatSession(sessionId?.toString());
  const {
    sessionsQuery,
    createNewSessionMutation,
    removeMessageByIdMutation,
    addMessageToSessionMutation,
    getSessionByIdMutation,
    getSessionByIdQuery,
    addSessionsMutation,
  } = props;

  const currentSessionQuery = getSessionByIdQuery;

  const { push, refresh } = useRouter();

  // 1. Keep local `sessions[]` in sync with the query result
  useEffect(() => {
    if (sessionsQuery?.data) {
      setSessions(sessionsQuery.data || []);
    }
  }, [sessionsQuery?.data]);

  // 2. Keep `currentSession` in sync with the `getSessionByIdQuery`
  useEffect(() => {
    if (currentSessionQuery?.data) {
      setCurrentSession(currentSessionQuery.data || []);
    }
  }, [currentSessionQuery?.data]);

  // 3. If the user tries to load a sessionId that doesn't exist → create a new session
  useEffect(() => {
    if (currentSessionQuery?.error) {
      console.log("Session not found or error => create new session");
      createSession({ redirect: true });
    }
  }, [currentSessionQuery?.error]);

  // 4. If sessionId is missing, create a brand-new session
  //    or if sessionId is present but no data returned, also create.
  useEffect(() => {
    if (!sessionId && !currentSessionQuery?.isLoading && !currentSessionQuery?.data) {
      console.log("No sessionId => create brand-new session");
      createSession({ redirect: true });
    } else if (sessionId && !currentSessionQuery?.isLoading && !currentSessionQuery?.data) {
      console.log("SessionId is present but no data => create brand-new session anyway");
      createSession({ redirect: true });
    }
  }, [sessionId, currentSessionQuery?.isLoading, currentSessionQuery?.data]);

  const createSession = async (props: { redirect?: boolean }) => {
    const { redirect } = props;
    await createNewSessionMutation.mutateAsync(undefined, {
      onSuccess: (data) => {
        console.log("Created new session =>", data.id);
        if (redirect) {
          // We can either do a router push or window open.
          // push(`/chat/${data.id}`);
          window.open(`/chat/${data.id}`, "_self");
        }
      },
    });
  };

  const removeMessage = (messageId: string) => {
    if (!currentSession?.id) return;
    removeMessageByIdMutation.mutate(
      {
        sessionId: currentSession.id,
        messageId,
      },
      {
        onSuccess: () => {
          currentSessionQuery?.refetch();
        },
      }
    );
  };

  const addMessageToSession = async (sessionId: string, message: TChatMessage) => {
    await addMessageToSessionMutation.mutateAsync({
      sessionId,
      message,
    });
  };

  const getSessionById = async (id: string) => {
    return await getSessionByIdMutation.mutateAsync(id);
  };

  return (
    <SessionContext.Provider
      value={{
        sessions,
        isAllSessionLoading: sessionsQuery?.isLoading,
        isCurrentSessionLoading: currentSessionQuery.isLoading,
        createSession,
        setCurrentSession,
        currentSession,
        removeMessage,
        refetchSessions: sessionsQuery.refetch,
        refetchCurrentSession: currentSessionQuery.refetch,
        addMessageToSession,
        getSessionById,
        isGenerating,
        setGenerating: setIsGenerating,
        ...props,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};
