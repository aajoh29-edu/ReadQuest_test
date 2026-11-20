import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AuthenticatedUser,
  AuthServiceStatus,
  AuthSessionResponse,
  ChildProfileInput,
  Learner,
} from '../types';
import { ApiClientError } from '../services/apiConfig';
import { authService, LoginCredentials, RegisterPayload } from '../services/authService';
import { questRepository } from '../services/repository';

export interface AuthContextValue {
  status: AuthServiceStatus;
  user: AuthenticatedUser | null;
  childProfiles: Learner[];
  activeChild: Learner | null;
  errorMessage: string | null;
  refreshAuth: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<AuthSessionResponse>;
  register: (payload: RegisterPayload) => Promise<AuthSessionResponse>;
  logout: () => Promise<void>;
  selectChildProfile: (childId: string) => Promise<Learner>;
  createChildProfile: (input: ChildProfileInput) => Promise<Learner>;
  updateChildProfile: (childId: string, updates: Partial<ChildProfileInput>) => Promise<Learner>;
  deleteChildProfile: (childId: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthServiceStatus>('loading');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [childProfiles, setChildProfiles] = useState<Learner[]>([]);
  const [activeChild, setActiveChild] = useState<Learner | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncChildrenState = useCallback((profiles: Learner[], preferredId?: string) => {
    setChildProfiles(profiles);
    if (profiles.length === 0) {
      setActiveChild(null);
      questRepository.setActiveChildCache(null);
      return;
    }
    const chosen =
      (preferredId ? profiles.find((c) => c.id === preferredId) : undefined) || profiles[0];
    setActiveChild(chosen);
    questRepository.setActiveChildCache(chosen);
  }, []);

  const refreshAuth = useCallback(async () => {
    setErrorMessage(null);
    try {
      const session = await authService.getCurrentUser();
      setUser(session.user);
      setStatus('authenticated');
      syncChildrenState(session.childProfiles, activeChild?.id);
    } catch (err) {
      setUser(null);
      setChildProfiles([]);
      setActiveChild(null);
      questRepository.setActiveChildCache(null);

      if (
        err instanceof ApiClientError &&
        (err.code === 'SERVICE_UNAVAILABLE' || err.code === 'NETWORK_ERROR')
      ) {
        setStatus('unavailable');
        setErrorMessage(err.message);
      } else {
        setStatus('unauthenticated');
      }
    }
  }, [activeChild?.id, syncChildrenState]);

  useEffect(() => {
    refreshAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthSessionResponse> => {
    const response = await authService.login(credentials);
    setUser(response.user);
    setStatus('authenticated');
    setErrorMessage(null);
    const profiles = response.childProfiles || (await authService.listChildProfiles().catch(() => []));
    syncChildrenState(profiles);
    return response;
  };

  const register = async (payload: RegisterPayload): Promise<AuthSessionResponse> => {
    const response = await authService.register(payload);
    if (response.user && !response.requiresEmailVerification) {
      setUser(response.user);
      setStatus('authenticated');
      syncChildrenState(response.childProfiles || []);
    }
    return response;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setChildProfiles([]);
      setActiveChild(null);
      setStatus('unauthenticated');
      questRepository.setActiveChildCache(null);
    }
  };

  const selectChildProfile = async (childId: string): Promise<Learner> => {
    const chosen = await questRepository.selectActiveLearner(childId);
    setActiveChild(chosen);
    setChildProfiles((prev) => prev.map((c) => (c.id === chosen.id ? chosen : c)));
    return chosen;
  };

  const createChildProfile = async (input: ChildProfileInput): Promise<Learner> => {
    const created = await authService.createChildProfile(input);
    const nextProfiles = [...childProfiles, created];
    syncChildrenState(nextProfiles, created.id);
    return created;
  };

  const updateChildProfile = async (
    childId: string,
    updates: Partial<ChildProfileInput>
  ): Promise<Learner> => {
    const updated = await authService.updateChildProfile(childId, updates);
    const nextProfiles = childProfiles.map((c) => (c.id === childId ? updated : c));
    syncChildrenState(nextProfiles, activeChild?.id === childId ? childId : activeChild?.id);
    return updated;
  };

  const deleteChildProfile = async (childId: string, password: string): Promise<void> => {
    await authService.deleteChildProfile(childId, password);
    const remaining = childProfiles.filter((c) => c.id !== childId);
    syncChildrenState(remaining);
  };

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        childProfiles,
        activeChild,
        errorMessage,
        refreshAuth,
        login,
        register,
        logout,
        selectChildProfile,
        createChildProfile,
        updateChildProfile,
        deleteChildProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
