import { create } from 'zustand';
import type { Report } from '@diary-quest/core/types';
import { reportRepository } from '@/repositories';

interface ReportState {
  // State
  reports: Report[];
  currentReport: Report | null;
  isLoading: boolean;
  error: string | null;

  // Basic Actions (state only)
  setReports: (reports: Report[]) => void;
  setCurrentReport: (report: Report | null) => void;
  addReport: (report: Report) => void;
  deleteReport: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Repository Actions (DB + state)
  loadReport: (id: string) => Promise<void>;
  loadReportsByCharacter: (characterId: string) => Promise<void>;
  createReport: (report: Report) => Promise<void>;
  removeReport: (id: string) => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  // Initial state
  reports: [],
  currentReport: null,
  isLoading: false,
  error: null,

  // Actions
  setReports: (reports) => set({ reports }),

  setCurrentReport: (report) => set({ currentReport: report }),

  addReport: (report) =>
    set((state) => ({
      reports: [...state.reports, report],
    })),

  deleteReport: (id) =>
    set((state) => ({
      reports: state.reports.filter((r) => r.id !== id),
      currentReport: state.currentReport?.id === id ? null : state.currentReport,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Repository actions
  loadReport: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const report = await reportRepository.findById(id);
      set({ currentReport: report, isLoading: false });
    } catch (error) {
      console.error('Failed to load report:', error);
      set({ error: 'レポートの読み込みに失敗しました', isLoading: false });
    }
  },

  loadReportsByCharacter: async (characterId: string) => {
    set({ isLoading: true, error: null });
    try {
      const reports = await reportRepository.findByCharacterId(characterId);
      set({ reports, isLoading: false });
    } catch (error) {
      console.error('Failed to load reports:', error);
      set({ error: 'レポートの読み込みに失敗しました', isLoading: false });
    }
  },

  createReport: async (report: Report) => {
    set({ isLoading: true, error: null });
    try {
      await reportRepository.create(report);
      get().addReport(report);
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to create report:', error);
      set({ error: 'レポートの保存に失敗しました', isLoading: false });
      throw error;
    }
  },

  removeReport: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await reportRepository.delete(id);
      get().deleteReport(id);
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to delete report:', error);
      set({ error: 'レポートの削除に失敗しました', isLoading: false });
      throw error;
    }
  },
}));
