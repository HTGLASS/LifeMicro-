import { create } from 'zustand';
import { MicroTask, ContextQuestion } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface TaskState {
  tasks: MicroTask[];
  contextQuestion: ContextQuestion | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  fetchTasks: (userId: string) => Promise<void>;
  fetchContextQuestion: (userId: string) => Promise<void>;
  generateTasks: (userId: string, contextAnswer?: { question: string; answer: string }) => Promise<void>;
  completeTask: (taskId: string) => Promise<{ tokens_earned: number; streak_bonus: number; new_balance: number } | null>;
  skipTask: (taskId: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  contextQuestion: null,
  isLoading: false,
  isGenerating: false,
  error: null,

  fetchTasks: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/tasks/${userId}?status=pending`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      set({ tasks: data.tasks || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      set({ error: 'Failed to fetch tasks', isLoading: false });
    }
  },

  fetchContextQuestion: async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${userId}/context-question`);
      if (!response.ok) throw new Error('Failed to fetch context question');
      const data = await response.json();
      set({ contextQuestion: data });
    } catch (error) {
      console.error('Error fetching context question:', error);
    }
  },

  generateTasks: async (userId: string, contextAnswer?: { question: string; answer: string }) => {
    try {
      set({ isGenerating: true, error: null });
      const body = contextAnswer ? { user_id: userId, ...contextAnswer } : null;
      
      const response = await fetch(`${API_URL}/api/tasks/${userId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate tasks');
      }
      
      const data = await response.json();
      set({ tasks: data.tasks || [], isGenerating: false, contextQuestion: null });
    } catch (error: any) {
      console.error('Error generating tasks:', error);
      set({ error: error.message || 'Failed to generate tasks', isGenerating: false });
    }
  },

  completeTask: async (taskId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });
      
      if (!response.ok) throw new Error('Failed to complete task');
      
      const result = await response.json();
      
      // Remove task from list
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
      }));
      
      return result;
    } catch (error) {
      console.error('Error completing task:', error);
      return null;
    }
  },

  skipTask: async (taskId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });
      
      if (!response.ok) throw new Error('Failed to skip task');
      
      // Remove task from list
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
      }));
    } catch (error) {
      console.error('Error skipping task:', error);
    }
  },
}));
