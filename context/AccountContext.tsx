'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SocialAccount } from '@/lib/types';

interface AccountContextType {
  accounts: SocialAccount[];
  selectedAccountId: string;
  selectedAccount: SocialAccount | null;
  setSelectedAccountId: (id: string) => void;
  reloadAccounts: () => Promise<SocialAccount[]>;
  loading: boolean;
}

const STORAGE_KEY = 'pea_selected_account_id';

const AccountContext = createContext<AccountContextType>({
  accounts: [],
  selectedAccountId: '',
  selectedAccount: null,
  setSelectedAccountId: () => {},
  reloadAccounts: async () => [],
  loading: true,
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountIdState] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Inicializa o id a partir do localStorage logo no cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        setSelectedAccountIdState(savedId);
      }
    }
  }, []);

  const fetchAccounts = useCallback(async (): Promise<SocialAccount[]> => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAccounts(data);

        const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

        setSelectedAccountIdState((current) => {
          // 1. Se já há um perfil selecionado válido na lista atual, mantém ele
          if (current && data.some((a) => a.id === current)) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY, current);
            }
            return current;
          }
          // 2. Se há um perfil salvo no localStorage que existe na lista, recupera ele
          if (savedId && data.some((a) => a.id === savedId)) {
            return savedId;
          }
          // 3. Fallback: se houver contas, seleciona a primeira
          if (data.length > 0) {
            const defaultId = data[0].id;
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY, defaultId);
            }
            return defaultId;
          }
          return '';
        });

        return data;
      }
      return [];
    } catch (err) {
      console.error('Erro ao carregar contas no AccountContext:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();

    // Sincronizar caso mude em outra aba/janela
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setSelectedAccountIdState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchAccounts]);

  const setSelectedAccountId = (id: string) => {
    setSelectedAccountIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) ||
    accounts[0] ||
    null;

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccountId,
        selectedAccount,
        setSelectedAccountId,
        reloadAccounts: fetchAccounts,
        loading,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}
