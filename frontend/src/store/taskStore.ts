import { create } from 'zustand';
import { MicroTask, ContextQuestion } from '../types';
import { TaskStartResponse, TaskCompleteResponse, Verification } from '../types/character';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface ActiveTask {
  taskId: string;
  startedAt: string;
  verification: Verification | null;
  minCompletionTime: number;
}

interface TaskState {
  tasks: MicroTask[];
  contextQuestion: ContextQuestion | null;
  activeTask: ActiveTask | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  fetchTasks: (userId: string) => Promise<void>;
  fetchContextQuestion: (userId: string) => Promise<void>;
  generateTasks: (userId: string, contextAnswer?: { question: string; answer: string }) => Promise<void>;
  startTask: (taskId: string) => Promise<TaskStartResponse | null>;
  completeTask: (taskId: string, verificationResponse?: any, reflectionText?: string) => Promise<TaskCompleteResponse | null>;
  skipTask: (taskId: string) => Promise<void>;
  clearActiveTask: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  contextQuestion: null,
  activeTask: null,
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

  startTask: async (taskId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });

      if (!response.ok) throw new Error('Failed to start task');

      const result: TaskStartResponse = await response.json();

      // Store active task info for anti-cheat tracking
      set({
        activeTask: {
          taskId,
          startedAt: result.started_at,
          verification: result.verification,
          minCompletionTime: result.min_completion_time,
        },
      });

      return result;
    } catch (error) {
      console.error('Error starting task:', error);
      return null;
    }
  },

  completeTask: async (taskId: string, verificationResponse?: any, reflectionText?: string) => {
    try {
      const body: any = { task_id: taskId };

      // Add verification response if provided
      if (verificationResponse) {
        body.verification_response = verificationResponse;
      }

      // Add reflection text if provided
      if (reflectionText) {
        body.reflection_text = reflectionText;
      }

      const response = await fetch(`${API_URL}/api/tasks/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to complete task');
      }
      
      const result: TaskCompleteResponse = await response.json();
      
      // Remove task from list and clear active task
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId),
        activeTask: null,
      }));
      
      return result;
    } catch (error: any) {
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
      
      // Remove task from list and clear active task
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId),
        activeTask: null,
      }));
    } catch (error) {
      console.error('Error skipping task:', error);
    }
  },

  clearActiveTask: () => {
    set({ activeTask: null });
  },
}));
