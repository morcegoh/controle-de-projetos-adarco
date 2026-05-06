import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, TextInput, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { addDays, format, differenceInDays, parseISO, startOfDay, isValid, getISOWeek, getYear, setISOWeek, setYear, startOfISOWeek, setWeek, startOfWeek } from 'date-fns';

import { Download, User as UserIcon, Settings, LogOut, Moon, CornerDownRight, Search, ChevronDown, ChevronRight, Info, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './theme';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import LoginScreen from './Login';
import ProfileScreen from './Profile';
import AdminScreen from './Admin';
import Dashboard from './Dashboard';

const safeFormatDate = (dateStr?: string, fmt: string = 'dd/MM/yy', fallback = '--/--') => {
  if (!dateStr) return fallback;
  try {
    const parsed = parseISO(dateStr);
    if (!isValid(parsed)) return fallback;
    return format(parsed, fmt);
  } catch (e) {
    return fallback;
  }
};

const safeDifferenceInDays = (dateLeft?: string | Date, dateRight?: string | Date, fallback = 0) => {
  if (!dateLeft || !dateRight) return fallback;
  try {
    const left = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft;
    const right = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight;
    if (!isValid(left) || !isValid(right)) return fallback;
    return differenceInDays(left, right);
  } catch (e) {
    return fallback;
  }
};

const shadeColor = (color: string, percent: number) => {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = Math.round(R * (100 + percent) / 100);
  G = Math.round(G * (100 + percent) / 100);
  B = Math.round(B * (100 + percent) / 100);

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
  const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
  const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

  return "#" + RR + GG + BB;
};

const { width } = Dimensions.get('window');

type Subtask = {
  id: string;
  title: string;
  assignees: string[];
  progress: number;
  startDate: string;
  forecastDate: string;
  endDate?: string;
  status: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  updates: string;
  objective?: string;
};

type Task = {
  id: string;
  title: string;
  assignees: string[];
  progress: number;
  startDate: string;
  forecastDate: string;
  endDate?: string;
  status: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  updates: string;
  objective?: string;
  subtasks: Subtask[];
};

type Project = {
  id: string;
  title: string;
  department?: string;
  owner?: string;
  progress: number;
  startDate: string;
  forecastDate: string;
  endDate?: string;
  status: string;
  objective?: string;
  tasks: Task[];
};

// Global Timeline Config
const TIMELINE_DAYS = 90; // 3 months View
const DAY_WIDTH = 40; 
const LEFT_PANEL_WIDTH = 550;

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: 'var(--text-main)', padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: 'var(--danger)', fontSize: 18, fontWeight: 'bold' }}>Algo deu errado!</Text>
          <Text style={{ color: 'var(--bg-card)', marginTop: 10 }}>{String(this.state.error)}</Text>
        </View>
      );
    }
    return (this as any).props.children;
  }
}

function ForcePasswordChange({ user, onComplete }: { user: User, onComplete: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitPasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword,
        data: { needs_password_change: false }
      });
      if (updateError) throw updateError;
      onComplete();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'var(--bg-app)', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 400, maxWidth: '90%', backgroundColor: 'var(--bg-card)', padding: 32, borderRadius: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-main)', marginBottom: 24, textAlign: 'center' }}>Troca de Senha Obrigatória</Text>
        <Text style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>Você está usando a senha padrão. Por favor, cadastre uma nova senha.</Text>
        
        {error ? <Text style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>{error}</Text> : null}

        <Text style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: '500' }}>Nova Senha</Text>
        <TextInput 
          style={{ borderWidth: 1, borderColor: 'var(--border)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, outlineStyle: 'none' as any }}
          secureTextEntry
          value={newPassword}
          onChange={(e) => setNewPassword(e.nativeEvent.text)}
        />

        <Text style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: '500' }}>Confirmar Nova Senha</Text>
        <TextInput 
          style={{ borderWidth: 1, borderColor: 'var(--border)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, outlineStyle: 'none' as any }}
          secureTextEntry
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.nativeEvent.text)}
        />

        <TouchableOpacity 
          style={{ backgroundColor: 'var(--text-main)', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 }} 
          onPress={submitPasswordChange} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="var(--bg-card)" /> : <Text style={{ color: 'var(--bg-card)', fontWeight: '600', fontSize: 16 }}>Atualizar Senha</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoadingApp(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loadingApp) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: 'var(--bg-app)' }} color="var(--primary)" size="large" />;
  }

  // Handle force password change outside the main app framework
  if (user && user.user_metadata?.needs_password_change) {
    return (
      <ErrorBoundary>
        <ForcePasswordChange 
          user={user} 
          onComplete={() => {
            // Optimistic update of local user state to dismiss the screen immediately
            setUser({
              ...user,
              user_metadata: { ...user.user_metadata, needs_password_change: false }
            });
          }} 
        />
      </ErrorBoundary>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        {user ? <App user={user} /> : <LoginScreen />}
      </ErrorBoundary>
    </ThemeProvider>
  );
}



function App({ user }: { user: User }) {
  const { theme, toggleTheme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const isSmallMobile = windowWidth < 480;

  const [projects, setProjects] = useState<Project[]>([]);

  // Monitoramento de inatividade para logout automático (5 minutos)
  useEffect(() => {
    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // 5 minutos = 300.000 milissegundos
      timeoutId = setTimeout(() => {
        supabase.auth.signOut();
      }, 300000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer(); // Inicia o timer

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GANTT' | 'BOARD' | 'PROFILE' | 'ADMIN'>('DASHBOARD');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [user?.id]);

  useEffect(() => {
    const loadTab = async () => {
      try {
        const savedTab = await AsyncStorage.getItem('activeTab');
        if (savedTab && ['GANTT', 'BOARD', 'PROFILE', 'ADMIN'].includes(savedTab)) {
          setActiveTab(savedTab as any);
        }
      } catch (e) {
        console.error('Failed to load active tab', e);
      }
    };
    loadTab();
  }, []);

  const handleTabChange = async (tab: 'DASHBOARD' | 'GANTT' | 'BOARD' | 'PROFILE' | 'ADMIN') => {
    // Sempre que a Timeline for acessada (mesmo se já estiver nela), minimiza tudo automaticamente
    if (tab === 'GANTT') {
      setExpandedProjects(new Set());
      setExpandedTasks(new Set());
    }
    setActiveTab(tab);
    try {
      await AsyncStorage.setItem('activeTab', tab);
    } catch (e) {
      console.error('Failed to save active tab', e);
    }
  };

  const now = new Date();
  const [filterYear, setFilterYear] = useState(getYear(now));
  const [filterWeek, setFilterWeek] = useState(getISOWeek(now));
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  const getTimelineStart = () => {
    let d = new Date(filterYear, 0, 4); // Jan 4th is always in week 1
    d = startOfISOWeek(d);
    return addDays(d, (filterWeek - 1) * 7);
  };
  const timelineStart = getTimelineStart();

  const fetchProjects = async () => {
    try {
      if (!user?.id) return;
      const { data: projData, error: projErr } = await supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (projErr) throw projErr;
      
      const { data: taskData, error: taskErr } = await supabase.from('tasks').select('*').order('created_at', { ascending: true });
      if (taskErr) throw taskErr;
      
      const { data: subtaskData, error: subtaskErr } = await supabase.from('subtasks').select('*').order('created_at', { ascending: true });
      if (subtaskErr) throw subtaskErr;

      const today = startOfDay(new Date());

      const formattedProjects = (projData || []).map(p => {
        const projectTasks = (taskData || []).filter(t => t.project_id === p.id);
        
        const tasksWithSubtasks = projectTasks.map(t => {
          const taskSubtasks = (subtaskData || []).filter(st => st.task_id === t.id);
          const totalSubProgress = taskSubtasks.reduce((sum, st) => sum + (st.progress || 0), 0);
          const computedProgress = taskSubtasks.length > 0 ? Math.round(totalSubProgress / taskSubtasks.length) : (t.progress || 0);
          
          let computedEndDate = t.end_date;
          if (taskSubtasks.length > 0 && !computedEndDate) {
            const validEndDates = taskSubtasks.map(st => st.end_date).filter(Boolean);
            if (validEndDates.length > 0) {
              validEndDates.sort();
              computedEndDate = validEndDates[validEndDates.length - 1];
            }
          }

          const isLate = computedProgress < 100 && t.status !== 'COMPLETED' && t.status !== 'CANCELED' && t.forecast_date && today > startOfDay(parseISO(t.forecast_date));
          const finalStatus = isLate ? 'LATE' : t.status;

          return {
            id: t.id,
            projectId: t.project_id,
            title: t.title,
            assignees: t.assignees || [],
            progress: computedProgress,
            startDate: t.start_date,
            forecastDate: t.forecast_date,
            endDate: computedProgress === 100 ? computedEndDate : undefined,
            status: finalStatus,
            riskLevel: t.risk_level,
            updates: t.updates,
            objective: t.objective,
            subtasks: taskSubtasks.map(st => {
              const isSubtaskLate = (st.progress || 0) < 100 && st.status !== 'COMPLETED' && st.status !== 'CANCELED' && st.forecast_date && today > startOfDay(parseISO(st.forecast_date));
              const finalSubStatus = isSubtaskLate ? 'LATE' : st.status;
              
              return {
                id: st.id,
                taskId: st.task_id,
                title: st.title,
                assignees: st.assignees || [],
                progress: st.progress || 0,
                startDate: st.start_date,
                forecastDate: st.forecast_date,
                endDate: (st.progress || 0) === 100 ? st.end_date : undefined,
                status: finalSubStatus,
                riskLevel: st.risk_level,
                updates: st.updates,
                objective: st.objective,
              };
            })
          };
        });

        const totalProgress = tasksWithSubtasks.reduce((sum, t) => sum + t.progress, 0);
        const avgProgress = tasksWithSubtasks.length > 0 ? Math.round(totalProgress / tasksWithSubtasks.length) : (p.progress || 0);
        
        let computedProjectEndDate = p.end_date;
        if (tasksWithSubtasks.length > 0 && !computedProjectEndDate) {
          const validEndDates = tasksWithSubtasks.map(t => t.endDate).filter(Boolean);
          if (validEndDates.length > 0) {
            validEndDates.sort();
            computedProjectEndDate = validEndDates[validEndDates.length - 1];
          }
        }

        const isProjectLate = avgProgress < 100 && p.status !== 'COMPLETED' && p.status !== 'CANCELED' && p.forecast_date && today > startOfDay(parseISO(p.forecast_date));
        const finalProjectStatus = isProjectLate ? 'LATE' : p.status;

        return {
          id: p.id,
          title: p.title,
          department: p.department,
          owner: p.owner,
          progress: avgProgress,
          startDate: p.start_date,
          forecastDate: p.forecast_date,
          endDate: (avgProgress === 100 || p.status === 'COMPLETED' || p.status === 'CANCELED') ? (p.end_date || computedProjectEndDate) : undefined,
          status: finalProjectStatus,
          objective: p.objective,
          tasks: tasksWithSubtasks
        };
      });
      setProjects(formattedProjects);
    } catch (e) {
      console.error('Error loading data from Supabase:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ type: 'project' | 'task' | 'subtask', isNew: boolean, projectData?: Project, taskData?: Task, subtaskData?: Subtask, parentProjectId?: string, parentTaskId?: string } | null>(null);

  const handleTaskClickGantt = (taskId: string) => {
    setHighlightedTaskId(taskId);
    handleTabChange('BOARD');
  };

  const handleSaveProject = async (projectData: Partial<Project>) => {
    try {
      const payload = {
        title: projectData.title,
        department: projectData.department,
        owner: projectData.owner,
        start_date: projectData.startDate,
        forecast_date: projectData.forecastDate,
        end_date: (projectData.progress === 100 || projectData.status === 'CANCELED') ? (projectData.endDate || new Date().toISOString().split('T')[0]) : null,
        status: projectData.status,
        // objective: projectData.objective, // Removido temporariamente pois a coluna não existe no Supabase
        user_id: user.id
      };
      
      if (editingItem?.isNew) {
        const { error } = await supabase.from('projects').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('projects').update(payload).eq('id', projectData.id);
        if (error) throw error;

        // Cascade cancel if project is canceled
        if (projectData.status === 'CANCELED') {
          // Update all tasks of this project to CANCELED
          await supabase
            .from('tasks')
            .update({ 
              status: 'CANCELED', 
              progress: 100,
              end_date: payload.end_date || new Date().toISOString().split('T')[0] 
            })
            .eq('project_id', projectData.id)
            .neq('status', 'COMPLETED');
            
          // Get tasks to update subtasks
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('project_id', projectData.id);
            
          if (tasks && tasks.length > 0) {
            const taskIds = tasks.map(t => t.id);
            await supabase
              .from('subtasks')
              .update({ 
                status: 'CANCELED', 
                progress: 100,
                end_date: payload.end_date || new Date().toISOString().split('T')[0] 
              })
              .in('task_id', taskIds)
              .neq('status', 'COMPLETED');
          }
        }
      }
      setEditingItem(null);
      fetchProjects();
    } catch (e) { console.error('Save project error:', e); }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setEditingItem(null);
      fetchProjects();
    } catch (e) { console.error('Delete project error:', e); }
  };

  const handleSaveTask = async (projectId: string, taskData: any) => {
    try {
      let finalUpdates = taskData.updates || '';
      if (taskData.newHistoryEntry) {
        const now = new Date();
        const timestamp = format(now, 'dd/MM/yy HH:mm');
        const newEntry = `[${timestamp}] ${taskData.newHistoryEntry.user}: ${taskData.newHistoryEntry.content}`;
        finalUpdates = finalUpdates ? `${finalUpdates}\n${newEntry}` : newEntry;
      }

      const payload = {
        project_id: projectId,
        title: taskData.title,
        assignees: taskData.assignees,
        start_date: taskData.startDate,
        forecast_date: taskData.forecastDate,
        end_date: (taskData.progress === 100 || taskData.status === 'CANCELED') ? (taskData.endDate || new Date().toISOString().split('T')[0]) : null,
        status: taskData.status,
        risk_level: taskData.riskLevel,
        updates: finalUpdates,
        progress: (taskData.status === 'CANCELED') ? 100 : (taskData.progress || 0)
      };

      if (editingItem?.isNew) {
        const { error } = await supabase.from('tasks').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tasks').update(payload).eq('id', taskData.id);
        if (error) throw error;

        // Cascade cancel subtasks if task is canceled
        if (taskData.status === 'CANCELED') {
          await supabase
            .from('subtasks')
            .update({ 
               status: 'CANCELED', 
               progress: 100,
               end_date: payload.end_date || new Date().toISOString().split('T')[0] 
            })
            .eq('task_id', taskData.id)
            .neq('status', 'COMPLETED');
        }
      }
      setEditingItem(null);
      fetchProjects();
    } catch (e) { console.error('Save task error:', e); }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setEditingItem(null);
      fetchProjects();
    } catch (e) { console.error('Delete task error:', e); }
  };

  const handleSaveSubtask = async (taskId: string, subtaskData: any) => {
    try {
      let finalUpdates = subtaskData.updates || '';
      if (subtaskData.newHistoryEntry) {
        const now = new Date();
        const timestamp = format(now, 'dd/MM/yy HH:mm');
        const newEntry = `[${timestamp}] ${subtaskData.newHistoryEntry.user}: ${subtaskData.newHistoryEntry.content}`;
        finalUpdates = finalUpdates ? `${finalUpdates}\n${newEntry}` : newEntry;
      }

      const payload = {
        task_id: taskId,
        title: subtaskData.title,
        assignees: subtaskData.assignees,
        start_date: subtaskData.startDate,
        forecast_date: subtaskData.forecastDate,
        end_date: (subtaskData.progress === 100 || subtaskData.status === 'CANCELED') ? (subtaskData.endDate || new Date().toISOString().split('T')[0]) : null,
        status: subtaskData.status,
        risk_level: subtaskData.riskLevel,
        updates: finalUpdates,
        progress: (subtaskData.status === 'CANCELED') ? 100 : (subtaskData.progress || 0)
      };

      if (editingItem?.isNew) {
        const { error } = await supabase.from('subtasks').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subtasks').update(payload).eq('id', subtaskData.id);
        if (error) throw error;
      }
      setEditingItem(null);
      fetchProjects();
    } catch (e) { console.error('Save subtask error:', e); }
  };

  const handleDeleteSubtask = async (id: string) => {
    try {
      const { error } = await supabase.from('subtasks').delete().eq('id', id);
      if (error) throw error;
      setEditingItem(null);
      fetchProjects();
    } catch (e) { console.error('Delete subtask error:', e); }
  };

  const handleConvertTaskToSubtask = async (taskId: string, parentTaskId: string) => {
    try {
      const { count: subtasksCount, error: countErr } = await supabase.from('subtasks').select('*', { count: 'exact', head: true }).eq('task_id', taskId);
      if (countErr) throw countErr;
      if (subtasksCount !== null && subtasksCount > 0) {
        alert('Não é possível converter esta tarefa porque ela já possui subtarefas. Exclua ou mova as subtarefas primeiro.');
        return;
      }

      const { data: taskData, error: fetchError } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (fetchError) throw fetchError;
      
      const subtaskPayload = {
        task_id: parentTaskId,
        title: taskData.title,
        assignees: taskData.assignees,
        start_date: taskData.start_date,
        forecast_date: taskData.forecast_date,
        end_date: taskData.end_date,
        status: taskData.status,
        risk_level: taskData.risk_level,
        updates: taskData.updates,
        objective: taskData.objective,
        progress: taskData.progress
      };
      
      const { error: insertError } = await supabase.from('subtasks').insert([subtaskPayload]);
      if (insertError) throw insertError;
      
      const { error: deleteError } = await supabase.from('tasks').delete().eq('id', taskId);
      if (deleteError) throw deleteError;
      
      setEditingItem(null);
      fetchProjects();
    } catch (e: any) { 
        console.error('Convert task error:', e); 
        alert('Erro ao converter: ' + JSON.stringify(e));
    }
  };

  const handleConvertSubtaskToTask = async (subtaskId: string, parentProjectId: string) => {
    try {
      const { data: subtaskData, error: fetchError } = await supabase.from('subtasks').select('*').eq('id', subtaskId).single();
      if (fetchError) throw fetchError;
      
      const taskPayload = {
        project_id: parentProjectId,
        title: subtaskData.title,
        assignees: subtaskData.assignees,
        start_date: subtaskData.start_date,
        forecast_date: subtaskData.forecast_date,
        end_date: subtaskData.end_date,
        status: subtaskData.status,
        risk_level: subtaskData.risk_level,
        updates: subtaskData.updates,
        objective: subtaskData.objective,
        progress: subtaskData.progress
      };
      
      const { error: insertError } = await supabase.from('tasks').insert([taskPayload]);
      if (insertError) throw insertError;
      
      const { error: deleteError } = await supabase.from('subtasks').delete().eq('id', subtaskId);
      if (deleteError) throw deleteError;
      
      setEditingItem(null);
      fetchProjects();
    } catch (e: any) { 
        console.error('Convert subtask error:', e); 
        alert('Erro ao converter: ' + JSON.stringify(e));
    }
  };

  const handleUpdateSubtaskProgress = async (subtaskId: string, newProgress: number) => {
    try {
      const updateData: any = { progress: newProgress };
      if (newProgress === 100) {
        updateData.status = 'COMPLETED';
        updateData.end_date = new Date().toISOString().substring(0, 10);
      } else {
        updateData.end_date = null;
        if (newProgress > 0) {
          updateData.status = 'IN_PROGRESS';
        } else {
          updateData.status = 'NOT_STARTED';
        }
      }

      const { error } = await supabase.from('subtasks').update(updateData).eq('id', subtaskId);
      if (error) throw error;
      
      fetchProjects();
    } catch (e) {
      console.error('Failed to update progress', e);
    }
  };

  const handleUpdateProgress = async (taskId: string, newProgress: number) => {
    // Optimistic update
    setProjects(prevProjects => prevProjects.map(p => {
      let updatedTask = false;
      const newTasks = p.tasks.map(t => {
        if (t.id === taskId) {
          updatedTask = true;
          return { ...t, progress: newProgress };
        }
        return t;
      });
      
      if (updatedTask) {
        const avg = Math.round(newTasks.reduce((s, t) => s + t.progress, 0) / newTasks.length);
        return { ...p, tasks: newTasks, progress: avg };
      }
      return p;
    }));

    try {
      let status = 'IN_PROGRESS';
      if (newProgress === 0) status = 'NOT_STARTED';
      if (newProgress === 100) {
        status = 'COMPLETED';
      }
      
      const updateData: any = { progress: newProgress, status };
      if (newProgress === 100) {
        updateData.end_date = new Date().toISOString().substring(0, 10);
      } else {
        updateData.end_date = null;
      }

      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) throw error;
      
      fetchProjects();
    } catch (e) {
      console.error('Failed to update progress', e);
    }
  };

  const handleExportReport = () => {
    const csvRows = [];
    csvRows.push(['Nome do Projeto', 'Setor (Departamento)', 'Responsável', 'Data Início', 'Data Previsão', 'Data Concluído', 'Status', 'Atrasado', 'Progresso'].join(','));

    const getStatusText = (status: string) => {
      switch (status) {
        case 'NOT_STARTED': return 'Não Iniciado';
        case 'IN_PROGRESS': return 'Em Andamento';
        case 'COMPLETED': return 'Concluído';
        case 'LATE': return 'Atrasado';
        case 'CANCELED': return 'Cancelado';
        default: return status;
      }
    };

    processedProjects.forEach(p => {
      const isLate = p.status === 'LATE';
      csvRows.push([
        p.title,
        p.department || '',
        p.owner || '',
        safeFormatDate(p.startDate, 'dd/MM/yyyy', ''),
        safeFormatDate(p.forecastDate, 'dd/MM/yyyy', ''),
        safeFormatDate(p.endDate, 'dd/MM/yyyy', ''),
        getStatusText(p.status),
        isLate ? 'Sim' : 'Não',
        `${p.progress}%`
      ].map(str => `"${String(str).replace(/"/g, '""')}"`).join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_projetos_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="var(--primary)" />
      </View>
    );
  }

  const processedProjects = projects.map(p => {
    const today = startOfDay(new Date());
    const roundedProgress = Math.round(p.progress || 0);
    let status = p.status;
    const targetDate = p.forecastDate;
    
    const isProjectLate = roundedProgress < 100 && p.status !== 'COMPLETED' && p.status !== 'CANCELED' && targetDate && today > startOfDay(parseISO(targetDate));
    if (isProjectLate) status = 'LATE';
    else if (roundedProgress >= 100) status = p.status === 'CANCELED' ? 'CANCELED' : 'COMPLETED';
    
    const tasks = p.tasks.map(t => {
       const roundedTProgress = Math.round(t.progress || 0);
       let tStatus = t.status;
       const tTargetDate = t.forecastDate;
       const isTaskLate = roundedTProgress < 100 && t.status !== 'COMPLETED' && t.status !== 'CANCELED' && tTargetDate && today > startOfDay(parseISO(tTargetDate));
       if (isTaskLate) tStatus = 'LATE';
       else if (roundedTProgress >= 100) tStatus = t.status === 'CANCELED' ? 'CANCELED' : 'COMPLETED';

       const subtasks = t.subtasks.map(st => {
           const roundedSTProgress = Math.round(st.progress || 0);
           let stStatus = st.status;
           const stTargetDate = st.forecastDate;
           const isSubtaskLate = roundedSTProgress < 100 && st.status !== 'COMPLETED' && st.status !== 'CANCELED' && stTargetDate && today > startOfDay(parseISO(stTargetDate));
           if (isSubtaskLate) stStatus = 'LATE';
           else if (roundedSTProgress >= 100) stStatus = st.status === 'CANCELED' ? 'CANCELED' : 'COMPLETED';
           return { ...st, status: stStatus, progress: roundedSTProgress };
       });

       return { ...t, status: tStatus, progress: roundedTProgress, subtasks };
    });

    return { ...p, status, progress: roundedProgress, tasks };
  });

  const timelineProjects = processedProjects.filter(p => 
    p.title.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  // Flatten tasks for board view
  const allTasks = processedProjects.flatMap(p => p.tasks.map(t => ({ ...t, projectName: p.title, projectId: p.id })));

  return (
    <View style={styles.container}>
      {/* Header - Glassmorphism */}
      <View style={[styles.header, isMobile && { paddingHorizontal: 16 }]}>
        <View style={{ flex: 1, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16 }}>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {activeTab === 'BOARD' && (
              <TouchableOpacity 
                onPress={() => { handleTabChange('GANTT'); setHighlightedTaskId(null); }} 
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { handleTabChange('GANTT'); setHighlightedTaskId(null); }}>
              <Text style={[styles.appName, isMobile && { fontSize: 16 }]}>Controle de Projetos Adarco</Text>
            </TouchableOpacity>

            {!isMobile && activeTab === 'GANTT' && (
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 24}}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'var(--input-bg)', paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: 'var(--border)', height: 32, width: 220 }}>
                  <Search size={14} color="var(--text-muted)" style={{ marginRight: 6 }} />
                  <TextInput
                    style={[{ flex: 1, borderWidth: 0, marginBottom: 0, backgroundColor: 'transparent', paddingHorizontal: 0, color: 'var(--text-main)', fontSize: 13, height: '100%', outlineStyle: 'none' } as any]}
                    placeholder="Pesquisar projetos..."
                    placeholderTextColor="var(--text-muted)"
                    value={projectSearchQuery}
                    onFocus={(e: any) => e.target.select()}
                    onChangeText={setProjectSearchQuery}
                  />
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <Text style={{color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: 13}}>Ano:</Text>
                  <select 
                    style={{ ...webInputDOMStyle, marginBottom: 0, paddingLeft: '8px', paddingRight: '20px', paddingTop: '4px', paddingBottom: '4px', width: 'auto', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border)', borderRadius: '6px', fontSize: '13px', appearance: 'auto' as any }}
                    value={filterYear}
                    onChange={(e) => setFilterYear(Number(e.target.value))}
                  >
                    {[2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <Text style={{color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: 13}}>Semana:</Text>
                  <select
                    style={{ ...webInputDOMStyle, marginBottom: 0, paddingLeft: '8px', paddingRight: '20px', paddingTop: '4px', paddingBottom: '4px', width: 'auto', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border)', borderRadius: '6px', fontSize: '13px', appearance: 'auto' as any }}
                    value={filterWeek}
                    onChange={(e) => setFilterWeek(Number(e.target.value))}
                  >
                    {Array.from({length: 53}).map((_, i) => <option key={i+1} value={i+1}>{isMobile ? `S${i+1}` : `${i+1}`}</option>)}
                  </select>
                </View>
              </View>
            )}
          </View>

          {isMobile && activeTab === 'GANTT' && (
            <View style={{flexDirection: 'column', gap: 8, marginTop: 8, width: '100%'}}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'var(--input-bg)', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'var(--border)', height: 36 }}>
                <Search size={16} color="var(--text-muted)" style={{ marginRight: 8 }} />
                <TextInput
                  style={[{ flex: 1, borderWidth: 0, marginBottom: 0, backgroundColor: 'transparent', paddingHorizontal: 0, color: 'var(--text-main)', fontSize: 14, height: '100%', outlineStyle: 'none' } as any]}
                  placeholder="Pesquisar projetos..."
                  placeholderTextColor="var(--text-muted)"
                  value={projectSearchQuery}
                  onFocus={(e: any) => e.target.select()}
                  onChangeText={setProjectSearchQuery}
                />
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Text style={{color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: 12}}>Ano:</Text>
                <select 
                  style={{ ...webInputDOMStyle, marginBottom: 0, paddingLeft: '12px', paddingRight: '24px', paddingTop: '6px', paddingBottom: '6px', width: 'auto', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border)', borderRadius: '6px', fontSize: '12px', appearance: 'auto' as any }}
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                >
                  {[2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <Text style={{color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: 12, marginLeft: 8}}>Sem/S:</Text>
                <select
                  style={{ ...webInputDOMStyle, marginBottom: 0, paddingLeft: '12px', paddingRight: '24px', paddingTop: '6px', paddingBottom: '6px', width: 'auto', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', borderColor: 'var(--border)', borderRadius: '6px', fontSize: '12px', appearance: 'auto' as any }}
                  value={filterWeek}
                  onChange={(e) => setFilterWeek(Number(e.target.value))}
                >
                  {Array.from({length: 53}).map((_, i) => <option key={i+1} value={i+1}>{`S${i+1}`}</option>)}
                </select>
              </View>
            </View>
          )}

          <View style={[styles.tabsContainer, isMobile && { width: '100%', justifyContent: 'space-between' }, { marginRight: isMobile ? 0 : 40 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.addButton} onPress={() => setEditingItem({ type: 'project', isNew: true })}>
                <Text style={styles.addButtonText}>+ Projeto</Text>
              </TouchableOpacity>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'DASHBOARD' && styles.activeTab]}
                onPress={() => handleTabChange('DASHBOARD')}
              >
                <Text style={[styles.tabText, activeTab === 'DASHBOARD' && styles.activeTabText, isMobile && { fontSize: 12 }]}>{isMobile ? 'Painel' : 'Dashboard'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'GANTT' && styles.activeTab]}
                onPress={() => handleTabChange('GANTT')}
              >
                <Text style={[styles.tabText, activeTab === 'GANTT' && styles.activeTabText, isMobile && { fontSize: 12 }]}>{isMobile ? 'Gantt' : 'Timeline View'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'BOARD' && styles.activeTab]}
                onPress={() => handleTabChange('BOARD')}
              >
                <Text style={[styles.tabText, activeTab === 'BOARD' && styles.activeTabText, isMobile && { fontSize: 12 }]}>{isMobile ? 'Kanban' : 'Board View'}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* Profile Icon - Fixed Top Right */}
        <View style={{ position: 'absolute', top: 16, right: isMobile ? 12 : 16, zIndex: 110 }}>
          <TouchableOpacity style={{
            width: 32, height: 32, borderRadius: 16, backgroundColor: 'var(--text-main)', 
            justifyContent: 'center', alignItems: 'center'
          }} onPress={() => setProfileMenuOpen(!profileMenuOpen)}>
            <Text style={{color: 'var(--bg-card)', fontWeight: 'bold', fontSize: 14}}>
              {(user?.user_metadata?.full_name?.[0] || user?.user_metadata?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()}
            </Text>
          </TouchableOpacity>
          
          {profileMenuOpen && (
            <View style={{
              position: 'absolute', top: 40, right: 0, width: 180, 
              backgroundColor: 'var(--bg-card)', borderRadius: 8, padding: 8,
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, borderWidth: 1, borderColor: 'var(--border)'
            }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6, marginBottom: 4 }} onPress={() => { handleTabChange('PROFILE'); setProfileMenuOpen(false); }}>
                <UserIcon size={16} color="var(--text-secondary)" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: '500' }}>Editar perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6, marginBottom: 4 }} onPress={() => { toggleTheme(); setProfileMenuOpen(false); }}>
                <Moon size={16} color="var(--text-secondary)" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: '500' }}>{theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6 }} onPress={() => { handleTabChange('ADMIN'); setProfileMenuOpen(false); }}>
                <Settings size={16} color="var(--text-secondary)" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: '500' }}>Configuração</Text>
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: 'var(--border)', marginVertical: 4 }} />
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6 }} onPress={() => { supabase.auth.signOut(); }}>
                <LogOut size={16} color="var(--danger)" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 14, color: 'var(--danger)', fontWeight: '500' }}>Sair</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Main Content */}
      <View style={{flex: 1}}>
        {activeTab === 'DASHBOARD' ? (
          <Dashboard projects={projects} />
        ) : activeTab === 'ADMIN' ? (
          <AdminScreen />
        ) : activeTab === 'PROFILE' ? (
          <ProfileScreen goBack={() => handleTabChange('GANTT')} user={user} />
        ) : projects.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIconWrapper}>
              <Text style={{fontSize: 48}}>🚀</Text>
            </View>
            <Text style={styles.emptyStateTitle}>Nenhum projeto encontrado</Text>
            <Text style={styles.emptyStateText}>
              Comece criando seu primeiro projeto para organizar sua equipe e suas tarefas.
            </Text>
            <TouchableOpacity 
              style={[styles.addButton, { paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 }]} 
              onPress={() => setEditingItem({ type: 'project', isNew: true })}
            >
              <Text style={styles.addButtonText}>Criar Primeiro Projeto</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === 'GANTT' ? (
          <GanttView 
            projects={timelineProjects} 
            timelineStart={timelineStart}
            expandedProjects={expandedProjects}
            setExpandedProjects={setExpandedProjects}
            expandedTasks={expandedTasks}
            setExpandedTasks={setExpandedTasks}
            onUpdateProgress={handleUpdateProgress} 
            onUpdateSubtaskProgress={handleUpdateSubtaskProgress}
            onEditRequest={setEditingItem}
            onTaskPress={handleTaskClickGantt}
          />
        ) : (
          <BoardView 
            tasks={allTasks} 
            onEditRequest={setEditingItem} 
            highlightedTaskId={highlightedTaskId} 
          />
        )}
      </View>

      {/* Editor Modal */}
      {editingItem && (
        <EditorModal 
          item={editingItem} 
          projects={projects}
          userEmail={user?.email}
          onClose={() => setEditingItem(null)} 
          onSaveProject={handleSaveProject}
          onSaveTask={handleSaveTask}
          onSaveSubtask={handleSaveSubtask}
          onDeleteProject={handleDeleteProject}
          onDeleteTask={handleDeleteTask}
          onDeleteSubtask={handleDeleteSubtask}
          onConvertTaskToSubtask={handleConvertTaskToSubtask}
          onConvertSubtaskToTask={handleConvertSubtaskToTask}
        />
      )}
    </View>
  );
}

// -------------------------------------------------------------
// EDITOR MODAL COMPONENT
// -------------------------------------------------------------
const webInputDOMStyle = {
  width: '100%',
  backgroundColor: 'var(--table-header-bg)',
  borderColor: 'var(--border)',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderRadius: '8px',
  paddingLeft: '16px',
  paddingRight: '16px',
  paddingTop: '12px',
  paddingBottom: '12px',
  color: 'var(--text-main)',
  fontSize: '14px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const EditorModal = ({ item, projects, userEmail, onClose, onSaveProject, onSaveTask, onSaveSubtask, onDeleteProject, onDeleteTask, onDeleteSubtask, onConvertTaskToSubtask, onConvertSubtaskToTask }: any) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const isSmallMobile = windowWidth < 480;
  const isMasterUser = userEmail === 'heder.santos@adarco.com.br';
  const isProject = item.type === 'project';
  const isTask = item.type === 'task';
  const isSubtask = item.type === 'subtask';
  const data = isProject ? (item.projectData || {}) : isTask ? (item.taskData || {}) : (item.subtaskData || {});
  
  const [title, setTitle] = useState(data.title || '');
  const [department, setDepartment] = useState(data.department || '');
  const [owner, setOwner] = useState(data.owner || '');
  const [startDate, setStartDate] = useState(data.startDate || new Date().toISOString().substring(0, 10));
  const [forecastDate, setForecastDate] = useState(data.forecastDate || '');
  const [endDate, setEndDate] = useState(data.endDate || '');
  const [assigneesStr, setAssigneesStr] = useState(data.assignees ? data.assignees.join(', ') : '');
  const [riskLevel, setRiskLevel] = useState(data.riskLevel || 'LOW');
  const [status, setStatus] = useState(data.status || 'NOT_STARTED');
  const [progress, setProgress] = useState(data.progress || 0);
  const [updates, setUpdates] = useState(data.updates || '');
  const [objective, setObjective] = useState(data.objective || '');
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [newUpdateUser, setNewUpdateUser] = useState(userEmail || 'Usuário');
  const [selectedProjectId, setSelectedProjectId] = useState(item.parentProjectId || (projects?.length > 0 ? projects[0].id : ''));
  const [selectedTaskId, setSelectedTaskId] = useState(item.parentTaskId || '');
  const [selectedConvertParentId, setSelectedConvertParentId] = useState('');
  const [selectedConvertProjectId, setSelectedConvertProjectId] = useState(projects?.length > 0 ? projects[0].id : '');
  const [notifyAssignees, setNotifyAssignees] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    setErrorMessage('');
    
    if (isProject) {
      if (!title.trim()) {
        setErrorMessage('O título do projeto é obrigatório.');
        return;
      }
      
      // Validação de Duplicidade
      const isDuplicate = projects.some((p: any) => 
        p.title.trim().toLowerCase() === title.trim().toLowerCase() && 
        p.id !== data.id &&
        p.status !== 'COMPLETED' && p.status !== 'CANCELED'
      );

      if (isDuplicate) {
        setErrorMessage('Já existe um projeto ativo com este nome. Por favor, utilize um título diferente.');
        return;
      }

      if (!owner.trim()) {
        setErrorMessage('O responsável pelo projeto é obrigatório.');
        return;
      }
      if (!department.trim()) {
        setErrorMessage('O departamento do projeto é obrigatório.');
        return;
      }
      if (!startDate) {
        setErrorMessage('A data de início do projeto é obrigatória.');
        return;
      }
      if (!forecastDate) {
        setErrorMessage('A previsão de término do projeto é obrigatória.');
        return;
      }
      if (!objective.trim()) {
        setErrorMessage('O objetivo do projeto é obrigatório.');
        return;
      }
      onSaveProject({ id: data.id, title, department, owner, startDate, forecastDate, endDate, status, progress, objective });
    } else {
      const assignees = assigneesStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      
      if (!title.trim()) {
        setErrorMessage(`O título da ${isSubtask ? 'subtarefa' : 'tarefa'} é obrigatório.`);
        return;
      }
      
      if (assignees.length === 0) {
        setErrorMessage(`A ${isSubtask ? 'subtarefa' : 'tarefa'} deve ter pelo menos um responsável atribuído.`);
        return;
      }
      
      if (!forecastDate) {
        setErrorMessage(`A ${isSubtask ? 'subtarefa' : 'tarefa'} deve ter uma data de previsão (Previsão Entrega).`);
        return;
      }
      
      if (!objective.trim()) {
        setErrorMessage(`O objetivo da ${isSubtask ? 'subtarefa' : 'tarefa'} deve ser descrito.`);
        return;
      }

      const newHistoryEntry = newUpdateContent ? { user: newUpdateUser, content: newUpdateContent } : undefined;
      
      if (isSubtask) {
        onSaveSubtask(selectedTaskId || data.taskId, { 
          id: data.id, title, startDate, forecastDate, 
          endDate: (status === 'COMPLETED' || progress === 100) ? endDate : null, 
          assignees, riskLevel, updates, objective, status, progress, newHistoryEntry 
        });
      } else {
        onSaveTask(selectedProjectId, { 
          id: data.id, title, startDate, forecastDate, 
          endDate: (status === 'COMPLETED' || progress === 100) ? endDate : null, 
          assignees, riskLevel, updates, objective, status, progress, newHistoryEntry 
        });
      }
      
      if (notifyAssignees && !isSubtask) {
        const project = projects.find((p: any) => p.id === selectedProjectId);
        const projectName = project ? project.title : 'Projeto';
        const targetDate = endDate || forecastDate;
        const formattedDate = targetDate ? new Date(targetDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A';
        
        let statusLabel = status;
        if (status === 'NOT_STARTED') statusLabel = 'Não Iniciado';
        if (status === 'IN_PROGRESS') statusLabel = 'Em Andamento';
        if (status === 'COMPLETED') statusLabel = 'Concluído';
        if (status === 'LATE') statusLabel = 'Atrasado';
        if (status === 'CANCELED') statusLabel = 'Cancelado';

        const subject = encodeURIComponent(`Nova Tarefa Atribuída: ${title}`);
        const body = encodeURIComponent(`Olá,

Foi definida a tarefa ${title} referente ao projeto ${projectName}.

Detalhes da tarefa:

- ${objective ? objective : 'Descrever aqui o que a tarefa deve resolver'}
- Prazo Limite de conclusão: ${formattedDate}
- Status atual: ${statusLabel}

Por favor, em caso de dúvidas fale comigo.`);
        
        const emails = assignees.filter((a: string) => a.includes('@')).join(',');
        window.open(`mailto:${emails}?subject=${subject}&body=${body}`, '_blank');
      }
    }
  };

  const titleInputRef = useRef<any>(null);

  useEffect(() => {
    if (titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }, 100);
    }
  }, [item.id]); // Trigger when item changes (modal opens or item switches)

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, isMobile && { width: '95%', padding: 20, borderRadius: 16 }]}>
        <Text style={[styles.modalHeader, isMobile && { fontSize: 20, marginBottom: 16 }]}>{item.isNew ? 'Criar' : 'Editar'} {isProject ? 'Projeto' : isTask ? 'Tarefa' : 'Subtarefa'}</Text>
        
        {errorMessage ? (
          <View style={{backgroundColor: 'var(--danger-bg)', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: 'var(--danger)'}}>
            <Text style={{color: 'var(--danger)', fontSize: 13, fontWeight: '500', fontFamily: 'Inter, sans-serif'}}>{errorMessage}</Text>
          </View>
        ) : null}

        <ScrollView style={{maxHeight: windowHeight * 0.75}}>
          <Text style={styles.label}>Título {!item.isNew && !isProject && <Text style={{fontSize: 10, color: 'var(--text-muted)'}}>(Bloqueado)</Text>}</Text>
          <input 
            ref={titleInputRef}
            style={{ ...webInputDOMStyle, ...(!item.isNew && !isProject ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} 
            value={title} 
            onFocus={(e) => !item.isNew && !isProject ? null : e.target.select()}
            onChange={(e) => setTitle(e.target.value)} 
            disabled={!item.isNew && !isProject}
            placeholder={`Nome d${isProject ? 'o projeto' : isTask ? 'a tarefa' : 'a subtarefa'}`} 
          />

          {isProject && (
            <>
              <View style={{flexDirection: 'row', gap: 16, marginTop: 10, marginBottom: 10}}>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Departamento</Text>
                  <input 
                    style={webInputDOMStyle} 
                    value={department} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDepartment(e.target.value)} 
                    placeholder="Ex: Comercial, TI..." 
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Responsável</Text>
                  <input 
                    style={webInputDOMStyle} 
                    value={owner} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setOwner(e.target.value)} 
                    placeholder="Nome do Responsável..." 
                  />
                </View>
              </View>

              <Text style={styles.label}>Status do Projeto</Text>
              <select 
                style={webInputDOMStyle} 
                value={status} 
                onChange={(e) => {
                  const newStatus = e.target.value;
                  setStatus(newStatus);
                  if (newStatus === 'COMPLETED' || newStatus === 'CANCELED') {
                    setProgress(100);
                    if (!endDate) setEndDate(new Date().toISOString().split('T')[0]);
                  } else {
                    if (newStatus === 'NOT_STARTED') setProgress(0);
                    setEndDate('');
                  }
                }}
              >
                <option value="NOT_STARTED">NÃO INICIADO</option>
                <option value="IN_PROGRESS">EM ANDAMENTO</option>
                <option value="COMPLETED">CONCLUÍDO</option>
                <option value="CANCELED">CANCELADO</option>
              </select>

              <View style={{marginTop: 10}}>
                <Text style={styles.label}>Objetivo do Projeto (Obrigatório)</Text>
                <textarea 
                  style={{ ...webInputDOMStyle, height: 80, resize: 'none' }} 
                  value={objective} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setObjective(e.target.value)} 
                  placeholder="Descreva o objetivo macro deste projeto..." 
                />
              </View>
            </>
          )}

          {!isProject && (
            <>
              {item.isNew && isTask && projects?.length > 0 && (
                <>
                  <Text style={styles.label}>Projeto</Text>
                  <select 
                    style={webInputDOMStyle} 
                    value={selectedProjectId} 
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </>
              )}

              <Text style={styles.label}>Atribuído Para {!item.isNew && <Text style={{fontSize: 10, color: 'var(--text-muted)'}}>(Bloqueado)</Text>}</Text>
              <input 
                 style={{ ...webInputDOMStyle, ...(!item.isNew ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} 
                 value={assigneesStr} 
                 onFocus={(e) => !item.isNew ? null : e.target.select()}
                 onChange={(e) => setAssigneesStr(e.target.value)} 
                 disabled={!item.isNew}
                 placeholder="João, Maria" 
               />
              
              <Text style={styles.label}>Nível de Risco</Text>
              <View style={styles.riskSelectorContainer}>
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map(level => {
                   let color = 'var(--primary)'; // Green
                   let label = 'Verde';
                   if (level === 'MEDIUM') { color = '#F59E0B'; label = 'Amarelo'; } // Yellow
                   else if (level === 'HIGH') { color = 'var(--danger)'; label = 'Vermelho'; } // Red
                   
                   const isSelected = riskLevel === level;
                   
                   return (
                     <TouchableOpacity 
                       key={level} 
                       style={[
                         styles.riskOption, 
                         { borderColor: isSelected ? color : 'var(--border)', backgroundColor: isSelected ? `${color}20` : 'transparent' }
                       ]}
                       onPress={() => setRiskLevel(level)}
                     >
                       <View style={[styles.riskDot, { backgroundColor: color }]} />
                       <Text style={[styles.riskText, { color: isSelected ? color : 'var(--text-secondary)' }]}>{label}</Text>
                     </TouchableOpacity>
                   )
                })}
              </View>

              <Text style={styles.label}>Status ({progress}%)</Text>
              <View style={{flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12}}>
                <View style={{backgroundColor: 'transparent', flex: 1}}>
                  <select 
                    style={{ ...webInputDOMStyle, marginBottom: 0 }} 
                    value={status} 
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setStatus(newStatus);
                      if (newStatus === 'COMPLETED' || newStatus === 'CANCELED') {
                        setProgress(100);
                        if (!endDate) setEndDate(new Date().toISOString().split('T')[0]);
                      } else {
                        if (newStatus === 'NOT_STARTED') setProgress(0);
                        else if (progress === 100 || progress === 0) setProgress(50);
                        setEndDate('');
                      }
                    }}
                  >
                    <option value="NOT_STARTED">NÃO INICIADO</option>
                    <option value="IN_PROGRESS">EM ANDAMENTO</option>
                    <option value="COMPLETED">CONCLUÍDO</option>
                    <option value="CANCELED">CANCELADO</option>
                  </select>
                </View>
                <input 
                  type="range" 
                  min="0" max="100" step="5"
                  value={progress}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setProgress(val);
                    if (val === 100) setStatus('COMPLETED');
                    else if (val === 0) setStatus('NOT_STARTED');
                    else setStatus('IN_PROGRESS');
                  }}
                  style={{flex: 1, accentColor: 'var(--primary)', height: 38}}
                />
              </View>

              <Text style={styles.label}>Objetivo da Tarefa {!item.isNew && <Text style={{fontSize: 10, color: 'var(--text-muted)'}}>(Não editável após criação)</Text>}</Text>
              <textarea 
                style={{ ...webInputDOMStyle, height: 80, resize: 'none', marginBottom: 12, opacity: item.isNew ? 1 : 0.6, cursor: item.isNew ? 'text' : 'not-allowed' }} 
                value={objective} 
                onFocus={(e) => e.target.select()}
                onChange={(e) => setObjective(e.target.value)} 
                disabled={!item.isNew}
                placeholder="Descreva o que a tarefa deve resolver..." 
              />

              <Text style={styles.label}>Anotações Gerais {!item.isNew && <Text style={{fontSize: 10, color: 'var(--text-muted)'}}>(Não editável após criação)</Text>}</Text>
              <textarea 
                style={{ ...webInputDOMStyle, height: 80, resize: 'none', marginBottom: 20, opacity: item.isNew ? 1 : 0.6, cursor: item.isNew ? 'text' : 'not-allowed' }} 
                value={updates} 
                onFocus={(e) => e.target.select()}
                onChange={(e) => setUpdates(e.target.value)} 
                disabled={!item.isNew}
                placeholder="Destaques, bloqueios ou informações..." 
              />

              <Text style={[styles.label, { color: 'var(--primary)', marginTop: 10 }]}>Adicionar ao Histórico</Text>
              
              <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
                <View style={{flex: 1}}>
                  <Text style={[styles.label, { fontSize: 12}]}>Nova Atualização</Text>
                  <input 
                    style={{ ...webInputDOMStyle, paddingTop: '8px', paddingBottom: '8px', fontSize: '12px', height: 38 }} 
                    value={newUpdateContent} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewUpdateContent(e.target.value)} 
                    placeholder="Descreva o que mudou..." 
                  />
                </View>
              </View>

              {data.history && data.history.length > 0 && (
                 <View style={{marginTop: 10, padding: 12, backgroundColor: 'rgba(0, 91, 46, 0.05)', borderRadius: 8, marginBottom: 20}}>
                   <Text style={[styles.label, { marginBottom: 12 }]}>Histórico de Atualizações</Text>
                   {[...data.history].reverse().map((h: any) => (
                     <View key={h.id} style={{marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 42, 21, 0.1)', paddingBottom: 8}}>
                       <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                         <Text style={{color: 'var(--text-main)', fontWeight: 'bold', fontSize: 12}}>{h.user}</Text>
                         <Text style={{color: 'var(--text-secondary)', fontSize: 10}}>{new Date(h.date).toLocaleString('pt-BR')}</Text>
                       </View>
                       <Text style={{color: 'var(--text-secondary)', fontSize: 12}}>{h.content}</Text>
                     </View>
                   ))}
                 </View>
              )}
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
            {isProject && (
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Data de Início</Text>
                <TouchableOpacity style={{backgroundColor: 'transparent'}}>
                   <input 
                     type="date"
                     style={webInputDOMStyle} 
                     value={startDate} 
                     onChange={(e) => setStartDate(e.target.value)} 
                   />
                </TouchableOpacity>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Previsão Final</Text>
              <TouchableOpacity style={{backgroundColor: 'transparent'}}>
                 <input 
                   type="date"
                   style={webInputDOMStyle} 
                   value={forecastDate} 
                   onChange={(e) => setForecastDate(e.target.value)} 
                 />
              </TouchableOpacity>
            </View>
            {(isProject || isMasterUser) && (
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Data Término</Text>
                <TouchableOpacity style={{backgroundColor: 'transparent'}}>
                   <input 
                     type="date"
                     style={{...webInputDOMStyle, ...((progress < 100 && status !== 'COMPLETED' && status !== 'CANCELED') ? { opacity: 0.5, backgroundColor: 'var(--bg-hover)' } : {})}} 
                     value={(progress === 100 || status === 'COMPLETED' || status === 'CANCELED') ? endDate : ''} 
                     disabled={(progress < 100 && status !== 'COMPLETED' && status !== 'CANCELED')}
                     onChange={(e) => setEndDate(e.target.value)} 
                   />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!isProject && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 12, backgroundColor: 'rgba(0, 91, 46, 0.05)', borderRadius: 8}}>
              <TouchableOpacity onPress={() => setNotifyAssignees(!notifyAssignees)} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <View style={{width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: 'var(--primary)', alignItems: 'center', justifyContent: 'center', backgroundColor: notifyAssignees ? 'var(--primary)' : 'transparent'}}>
                  {notifyAssignees && <View style={{width: 10, height: 10, backgroundColor: 'var(--bg-card)', borderRadius: 2}} />}
                </View>
                <Text style={{color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: '600'}}>Notificar responsáveis por e-mail após salvar</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isProject && !item.isNew && (
              <View style={{ marginTop: 24, padding: 16, backgroundColor: 'var(--bg-hover)', borderRadius: 8, borderWidth: 1, borderColor: 'var(--border)' }}>
                <Text style={[styles.label, { marginBottom: 12, color: 'var(--text-main)' }]}>Configurações de Hierarquia</Text>
                
                {isTask && (
                  <View>
                    <Text style={[styles.label, { fontSize: 12 }]}>Transformar em Subtarefa de:</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                       <select 
                         style={{ ...webInputDOMStyle, flex: 1, marginBottom: 0, padding: '8px' }} 
                         value={selectedConvertParentId} 
                         onChange={(e) => setSelectedConvertParentId(e.target.value)}
                       >
                         <option value="">Selecione a Tarefa Pai...</option>
                         {(projects.find((p: any) => p.id === data.projectId)?.tasks || []).filter((t: any) => t.id !== data.id).map((t: any) => (
                           <option key={t.id} value={t.id}>{t.title}</option>
                         ))}
                       </select>
                       <TouchableOpacity 
                         style={[styles.saveButton, { paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'stretch', justifyContent: 'center', opacity: selectedConvertParentId ? 1 : 0.5 }]} 
                         onPress={() => {
                           if (selectedConvertParentId && onConvertTaskToSubtask) {
                             onConvertTaskToSubtask(data.id, selectedConvertParentId);
                           }
                         }}
                         disabled={!selectedConvertParentId}
                       >
                         <Text style={styles.saveButtonText}>Mover</Text>
                       </TouchableOpacity>
                    </View>
                  </View>
                )}

                {isSubtask && (
                  <View>
                    <Text style={[styles.label, { fontSize: 12 }]}>Transformar em Tarefa Principal de:</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                       <select 
                         style={{ ...webInputDOMStyle, flex: 1, marginBottom: 0, padding: '8px' }} 
                         value={selectedConvertProjectId} 
                         onChange={(e) => setSelectedConvertProjectId(e.target.value)}
                       >
                         <option value="">Selecione o Projeto...</option>
                         {projects.map((p: any) => (
                           <option key={p.id} value={p.id}>{p.title}</option>
                         ))}
                       </select>
                       <TouchableOpacity 
                         style={[styles.saveButton, { paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'stretch', justifyContent: 'center', opacity: selectedConvertProjectId ? 1 : 0.5 }]} 
                         onPress={() => {
                           if (selectedConvertProjectId && onConvertSubtaskToTask) {
                             onConvertSubtaskToTask(data.id, selectedConvertProjectId);
                           }
                         }}
                         disabled={!selectedConvertProjectId}
                       >
                         <Text style={styles.saveButtonText}>Converter</Text>
                       </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
        </ScrollView>

        <View style={styles.modalFooter}>
           {showDeleteConfirm ? (
             <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
               <Text style={{ color: 'var(--danger)', fontSize: 13, fontWeight: '600', flex: 1, minWidth: 200 }}>
                 Tem certeza? Esta ação não pode ser desfeita.
               </Text>
               <View style={{ flexDirection: 'row', gap: 12 }}>
                 <TouchableOpacity style={styles.cancelButton} onPress={() => setShowDeleteConfirm(false)}>
                   <Text style={styles.cancelButtonText}>Manter</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   style={[styles.deleteButton, { backgroundColor: 'var(--danger-bg)' }]} 
                   onPress={() => isProject ? onDeleteProject(data.id) : isTask ? onDeleteTask(data.id) : onDeleteSubtask(data.id)}
                 >
                   <Text style={[styles.deleteButtonText, { color: 'var(--danger)' }]}>Sim, Excluir</Text>
                 </TouchableOpacity>
               </View>
             </View>
           ) : (
             <>
               {(!item.isNew) && (
                 <TouchableOpacity 
                   style={styles.deleteButton} 
                   onPress={() => setShowDeleteConfirm(true)}
                 >
                   <Text style={styles.deleteButtonText}>Excluir</Text>
                 </TouchableOpacity>
               )}
               <View style={{ flex: 1 }} />
               <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                 <Text style={styles.cancelButtonText}>Cancelar</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                 <Text style={styles.saveButtonText}>Salvar</Text>
               </TouchableOpacity>
             </>
           )}
        </View>
      </View>
    </View>
  );
};

// -------------------------------------------------------------
// GANTT BAR COMPONENT
// -------------------------------------------------------------
const GanttBar = ({ progress, status }: { progress: number; status: 'em_dia' | 'atrasado' | 'cancelado' }) => {
  let areaClasses = "";
  let barClasses = "";
  let shadowColor = "";

  if (status === 'em_dia') {
    areaClasses = "border-emerald-400 bg-emerald-500/5";
    barClasses = "from-emerald-400/40 to-emerald-500/60";
    shadowColor = "rgba(16, 185, 129, 0.4)";
  } else if (status === 'atrasado') {
    areaClasses = "border-red-400 bg-red-500/5";
    barClasses = "from-emerald-400/30 to-emerald-500/50";
    shadowColor = "rgba(239, 68, 68, 0.5)";
  } else if (status === 'cancelado') {
    areaClasses = "border-red-400 bg-red-500/10";
    barClasses = "from-red-400/40 to-red-500/60";
    shadowColor = "rgba(239, 68, 68, 0.4)";
  }

  // Neon glow effect adapted for both modes
  const glowStyle = {
    boxShadow: `0 0 12px ${shadowColor}`,
  };

  return (
    <div 
      className={`relative h-full w-full rounded-md border-[1px] overflow-hidden ${areaClasses}`}
      style={glowStyle}
    >
      <div 
        className={`h-full bg-gradient-to-r ${barClasses} transition-all duration-500 shadow-inner`} 
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// -------------------------------------------------------------
// GANTT VIEW COMPONENT
// -------------------------------------------------------------
const GanttView = ({ projects, timelineStart, expandedProjects, setExpandedProjects, expandedTasks, setExpandedTasks, onUpdateProgress, onUpdateSubtaskProgress, onEditRequest, onTaskPress }: { projects: Project[], timelineStart: Date, expandedProjects: Set<string>, setExpandedProjects: any, expandedTasks: Set<string>, setExpandedTasks: any, onUpdateProgress: (id: string, p: number) => void, onUpdateSubtaskProgress: (id: string, p: number) => void, onEditRequest: any, onTaskPress: (id: string) => void }) => {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  // Generate Days Header
  const daysArray = Array.from({ length: TIMELINE_DAYS }).map((_, i) => addDays(timelineStart, i));

  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const [leftWidth, setLeftWidth] = useState(isMobile ? 250 : 550);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing.current) {
        setLeftWidth(Math.max(200, Math.min(1200, e.clientX - 20)));
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const headerScrollRef = useRef<ScrollView>(null);
  
  const handleBodyScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    headerScrollRef.current?.scrollTo({ x: offsetX, animated: false });
  };

  // Flatten rendering rows so left and right render identically
  type RenderRow = { type: 'project', data: Project } | { type: 'task', data: Task } | { type: 'subtask', data: Subtask, parentTaskId: string };
  const rows: RenderRow[] = [];
  
  projects.forEach(p => {
    // Hidden concluded/closed projects if they finished before the Monday of the current week (meaning they were finished in a previous week)
    const roundedPProgress = Math.round(p.progress || 0);
    const isFinished = p.status === 'COMPLETED' || roundedPProgress >= 100 || p.status === 'CANCELED';
    const finishDate = p.endDate ? (typeof p.endDate === 'string' ? parseISO(p.endDate) : p.endDate) : (p.forecastDate ? (typeof p.forecastDate === 'string' ? parseISO(p.forecastDate) : p.forecastDate) : null);
    
    // Timeline window ends at timelineStart + TIMELINE_DAYS
    const timelineEnd = addDays(timelineStart, TIMELINE_DAYS);
    
    // Only hide if it finished BEFORE the current viewable window starts
    if (isFinished && finishDate && isValid(finishDate) && finishDate < timelineStart) {
      return; // Skip this project
    }

    rows.push({ type: 'project', data: p });
    if (expandedProjects.has(p.id)) {
      p.tasks.forEach(t => {
        rows.push({ type: 'task', data: t });
        if (expandedTasks.has(t.id) && t.subtasks && t.subtasks.length > 0) {
          t.subtasks.forEach(st => rows.push({ type: 'subtask', data: st, parentTaskId: t.id }));
        }
      });
    }
  });

  return (
    <ScrollView style={styles.ganttContainer} stickyHeaderIndices={[0]}>
      
      {/* Pinned Headers Container */}
      <View style={styles.ganttHeaderRow}>
        <View style={[styles.leftPanel, styles.tableHeader, { width: leftWidth }]}>
          <Text style={[styles.headerCell, { flex: 3 }]}>PROJETO / TAREFA</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>ATRIBUÍDO</Text>
          <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>%</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>INÍCIO</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>PREVISÃO</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>TÉRMINO</Text>
        </View>

        {/* Resize Handle */}
        <div 
          onMouseDown={() => { isResizing.current = true; document.body.style.cursor = 'col-resize'; }}
          style={{
            width: 4,
            cursor: 'col-resize',
            zIndex: 100,
            backgroundColor: 'var(--border)',
            position: 'absolute',
            left: leftWidth - 2,
            top: 0,
            bottom: 0,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e: any) => e.target.style.backgroundColor = 'var(--primary)'}
          onMouseLeave={(e: any) => !isResizing.current && (e.target.style.backgroundColor = 'var(--border)')}
        />

        <ScrollView 
          ref={headerScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          scrollEnabled={false} // Only body dictates scrolling
          style={styles.rightPanelHeader}
        >
          {daysArray.map((day, i) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            return (
              <View key={i} style={[
                styles.dayHeader,
                isToday && { backgroundColor: 'rgba(16, 185, 129, 0.1)' }
              ]}>
                <Text style={[styles.dayHeaderText, isToday && { color: 'var(--primary)', fontWeight: 'bold' }]}>{format(day, 'dd')}</Text>
                <Text style={[styles.daySubText, isToday && { color: 'var(--primary)', fontWeight: 'bold' }]}>{format(day, 'MMM')}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Body Container */}
      <View style={styles.ganttBodyRow}>
        
        {/* Left Panel - Fixed Row Info */}
        <View style={[styles.leftPanelBody, { width: leftWidth }]}>
          {rows.map((row, idx) => {
            if (row.type === 'project') {
              const p = row.data as Project;
              const isLate = p.status === 'LATE';
              return (
                <View key={`lp-${p.id}`} style={[styles.rowBase, styles.projectRow]}>
                  <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => toggleProjectExpansion(p.id)} style={{ marginRight: 8 }}>
                      {expandedProjects.has(p.id) ? (
                        <ChevronDown size={18} color="var(--text-main)" />
                      ) : (
                        <ChevronRight size={18} color="var(--text-main)" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, justifyContent: 'center' }} onPress={() => onEditRequest({ type: 'project', isNew: false, projectData: p })} title={p.title}>
                      <Text style={[styles.cellText, styles.projectTitleText]} title={p.title}>{p.title}</Text>
                      {(p.department || p.owner) && (
                        <Text style={{color: 'var(--text-muted)', fontSize: 11, marginTop: 1}} title={[p.department, p.owner].filter(Boolean).join(' • ')}>
                          {[p.department, p.owner].filter(Boolean).join(' • ')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center' }}>
                     <TouchableOpacity style={styles.addTarefaBtn} onPress={() => onEditRequest({ type: 'task', isNew: true, parentProjectId: p.id })}>
                       <Text style={styles.addTarefaBtnText}>+ Add Tarefa</Text>
                     </TouchableOpacity>
                  </View>
                  <View style={{ flex: 0.8, alignItems: 'center' }}>
                    <Text style={styles.projectProgressText}>{p.progress}%</Text>
                  </View>
                  <Text style={[styles.cellText, styles.projectDateText, { flex: 1 }]} numberOfLines={1}>
                    {safeFormatDate(p.startDate)}
                  </Text>
                  <Text style={[styles.cellText, styles.projectDateText, { flex: 1, color: isLate ? 'var(--danger)' : 'var(--text-secondary)' }]} numberOfLines={1}>
                    {safeFormatDate(p.forecastDate)}
                  </Text>
                  <Text style={[styles.cellText, styles.projectDateText, { flex: 1, color: isLate ? 'var(--danger)' : 'var(--primary)' }]} numberOfLines={1}>
                    {p.progress === 100 ? safeFormatDate(p.endDate) : '--/--/--'}
                  </Text>
                </View>
              );
            } else if (row.type === 'task') {
              const task = row.data as Task;
              const parentProject = projects.find(prj => prj.tasks.some(t => t.id === task.id));
              
              let riskColor = 'var(--primary)';
              if (task.riskLevel === 'MEDIUM') riskColor = '#F59E0B';
              if (task.riskLevel === 'HIGH') riskColor = 'var(--danger)';

              return (
                <View key={`lt-${task.id}`} style={[styles.rowBase, styles.taskRow]}>
                  <View style={{ flex: 3, paddingLeft: 24, flexDirection: 'row', alignItems: 'center' }}>
                    {task.subtasks && task.subtasks.length > 0 ? (
                      <TouchableOpacity onPress={() => toggleTaskExpansion(task.id)} style={{ padding: 4 }}>
                        {expandedTasks.has(task.id) ? <ChevronDown size={14} color="var(--text-secondary)" /> : <ChevronRight size={14} color="var(--text-secondary)" />}
                      </TouchableOpacity>
                    ) : (
                      <CornerDownRight size={14} color="var(--border)" style={{ marginRight: 6, marginLeft: 6, marginTop: -2 }} />
                    )}
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => onEditRequest({ type: 'task', isNew: false, taskData: task, parentProjectId: parentProject?.id })} title={task.title}>
                      <View style={[styles.inlineRiskDot, { backgroundColor: riskColor }]} />
                      <Text style={[styles.cellText, styles.titleText, { marginRight: 8 }]} title={task.title}>{task.title}</Text>
                      {!isMobile && (
                        <TouchableOpacity onPress={() => onEditRequest({ type: 'subtask', isNew: true, parentTaskId: task.id })} style={{ padding: 2, backgroundColor: 'var(--bg-card)', borderRadius: 4, borderWidth: 1, borderColor: 'var(--border)' }}>
                          <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}>+ Sub</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.cellText, styles.mutedText, { flex: 1.5 }]}>{task.assignees.join(', ')}</Text>
                  
                  <TouchableOpacity style={{ flex: 0.8, alignItems: 'center' }} onPress={() => onUpdateProgress(task.id, task.progress >= 100 ? 0 : task.progress + 25)}>
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressText}>{task.progress}%</Text>
                    </View>
                  </TouchableOpacity>

                  <Text style={[styles.cellText, { flex: 1 }]} numberOfLines={1}>
                    {safeFormatDate(task.startDate)}
                  </Text>
                  <Text style={[styles.cellText, { flex: 1, color: task.status === 'LATE' ? 'var(--danger)' : 'var(--text-main)' }]} numberOfLines={1}>
                    {safeFormatDate(task.forecastDate)}
                  </Text>
                  <Text style={[styles.cellText, { flex: 1, color: (task.status === 'LATE' || (task.endDate && task.forecastDate && new Date(task.endDate) > new Date(task.forecastDate))) ? 'var(--danger)' : 'var(--text-muted)' }]} numberOfLines={1}>
                    {task.progress === 100 ? safeFormatDate(task.endDate) : '--/--/--'}
                  </Text>
                </View>
              );
            } else {
              const subtask = row.data as Subtask;
              const parentTaskId = (row as any).parentTaskId;
              
              let riskColor = 'var(--primary)';
              if (subtask.riskLevel === 'MEDIUM') riskColor = '#F59E0B';
              if (subtask.riskLevel === 'HIGH') riskColor = 'var(--danger)';

              return (
                <View key={`lst-${subtask.id}`} style={[styles.rowBase, styles.taskRow, { backgroundColor: 'var(--bg-card)' }]}>
                  <TouchableOpacity style={{ flex: 3, paddingLeft: 56, flexDirection: 'row', alignItems: 'center' }} onPress={() => onEditRequest({ type: 'subtask', isNew: false, subtaskData: subtask, parentTaskId })} title={subtask.title}>
                    <CornerDownRight size={12} color="var(--border)" style={{ marginRight: 6, marginTop: -2 }} />
                    <View style={[styles.inlineRiskDot, { backgroundColor: riskColor, width: 6, height: 6, opacity: 0.7 }]} />
                    <Text style={[styles.cellText, styles.titleText, { fontSize: 12, color: 'var(--text-secondary)' }]} title={subtask.title}>{subtask.title}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.cellText, styles.mutedText, { flex: 1.5, fontSize: 11 }]}>{subtask.assignees.join(', ')}</Text>
                  
                  <TouchableOpacity style={{ flex: 0.8, alignItems: 'center' }} onPress={() => onUpdateSubtaskProgress(subtask.id, subtask.progress >= 100 ? 0 : subtask.progress + 25)}>
                    <View style={[styles.progressBadge, { paddingHorizontal: 4, paddingVertical: 1 }]}>
                      <Text style={[styles.progressText, { fontSize: 9 }]}>{subtask.progress}%</Text>
                    </View>
                  </TouchableOpacity>

                  <Text style={[styles.cellText, { flex: 1, fontSize: 11, color: 'var(--text-secondary)' }]} numberOfLines={1}>
                    {safeFormatDate(subtask.startDate)}
                  </Text>
                  <Text style={[styles.cellText, { flex: 1, fontSize: 11, color: subtask.status === 'LATE' ? 'var(--danger)' : 'var(--text-secondary)' }]} numberOfLines={1}>
                    {safeFormatDate(subtask.forecastDate)}
                  </Text>
                  <Text style={[styles.cellText, { flex: 1, fontSize: 11, color: (subtask.status === 'LATE' || (subtask.endDate && subtask.forecastDate && new Date(subtask.endDate) > new Date(subtask.forecastDate))) ? 'var(--danger)' : 'var(--text-muted)' }]} numberOfLines={1}>
                    {subtask.progress === 100 ? safeFormatDate(subtask.endDate) : '--/--/--'}
                  </Text>
                </View>
              );
            }
          })}
        </View>

        {/* Right Panel - Timeline Scroll */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true} 
          scrollEventThrottle={16}
          onScroll={handleBodyScroll}
          style={styles.rightPanelBody}
        >
          <View style={{ flexDirection: 'column' }}>
            {rows.map((row, idx) => {
              const data = row.data;
              const roundedProgress = Math.round(data.progress || 0);
              const isCanceled = data.status === 'CANCELED';
              
              // Nova lógica: Atrasado se status for LATE OU se terminou depois do previsto
              const finishedLate = data.endDate && data.forecastDate && new Date(data.endDate) > new Date(data.forecastDate);
              const isLateItem = (data.status === 'LATE' || finishedLate);
              
              const rawStartOffset = safeDifferenceInDays(data.startDate, timelineStart);
              
              const isFinishedRow = data.status === 'COMPLETED' || roundedProgress >= 100 || isCanceled;
              const today = startOfDay(new Date());

              // Determine the logical end of the bar
              let boundaryDate: string | Date = data.startDate;
              if (isFinishedRow) {
                // If finished, strictly use endDate or forecastDate
                boundaryDate = data.endDate || data.forecastDate || data.startDate;
              } else {
                // If in progress
                boundaryDate = data.forecastDate || data.startDate;
                // If late and not finished, stretch bar to today
                if (data.status === 'LATE' && today > parseISO(String(boundaryDate))) {
                  boundaryDate = today;
                }
              }

              const rawEndOffset = safeDifferenceInDays(boundaryDate, timelineStart);
              
              const isVisibleInTimeline = rawEndOffset >= 0 && rawStartOffset < TIMELINE_DAYS;
              
              const startInTimeline = Math.max(0, rawStartOffset);
              const endInTimeline = Math.min(TIMELINE_DAYS - 1, rawEndOffset);
              const visibleDuration = Math.max(0, endInTimeline - startInTimeline + 1);
              
              const safeOffset = startInTimeline;
              const safeDuration = visibleDuration;

              // Determinar status para o componente GanttBar
              let ganttStatus: 'em_dia' | 'atrasado' | 'cancelado' = 'em_dia';
              if (isCanceled) {
                ganttStatus = 'cancelado';
              } else if (isLateItem) {
                ganttStatus = 'atrasado';
              }

              return (
                <View key={`rt-${row.type}-${data.id}`} style={[
                  styles.rowBase, 
                  styles.timelineRow, 
                  row.type === 'project' && styles.projectTimelineRow,
                  isLateItem && { backgroundColor: 'rgba(239, 68, 68, 0.05)' },
                  row.type === 'subtask' && !isLateItem && { backgroundColor: 'var(--bg-card)' }
                ]}>
                  {/* Background Grid Lines */}
                  <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
                     {daysArray.map((day, i) => {
                       const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                       return (
                         <View key={i} style={[
                           styles.gridLine,
                           isToday && { 
                             borderRightColor: '#0BFD71', 
                             borderLeftColor: '#0BFD71', 
                             borderRightWidth: 1, 
                             borderLeftWidth: 1, 
                             backgroundColor: 'rgba(11, 253, 113, 0.05)',
                             zIndex: 10
                           }
                         ]} />
                       );
                     })}
                  </View>

                  {/* Task/Project Block */}
                  {isVisibleInTimeline && visibleDuration > 0 && (
                     <View 
                       style={[
                         styles.taskBlockContainer, 
                         { left: safeOffset * DAY_WIDTH, width: safeDuration * DAY_WIDTH },
                         row.type === 'project' ? { top: 8, height: 24 } : {},
                         row.type === 'subtask' ? { top: 12, height: 16 } : {},
                       ]}
                     >
                        <GanttBar progress={isCanceled ? 100 : roundedProgress} status={ganttStatus} />
                     </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

      </View>
    </ScrollView>
  );
};

// -------------------------------------------------------------
// TASK INFO MODAL COMPONENT
// -------------------------------------------------------------
const TaskInfoModal = ({ task, onClose }: { task: any, onClose: () => void }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  if (!task) return null;

  const updatesList = task.updates ? task.updates.split('\n').filter(Boolean).reverse() : [];

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { width: isMobile ? '95%' : 600, padding: 0, borderRadius: 24, overflow: 'hidden', backgroundColor: 'var(--bg-card)' }]}>
        <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'var(--border)', backgroundColor: 'var(--bg-card)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: 'var(--text-main)' }}>{task.title}</Text>
            <Text style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Informações e Histórico</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <X size={24} color="var(--text-muted)" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ padding: 24, maxHeight: windowHeight * 0.7 }}>
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Objetivo</Text>
            <Text style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 22 }}>{task.objective || 'Nenhum objetivo descrito.'}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 24, marginBottom: 24 }}>
             <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Status</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                   <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: task.status === 'COMPLETED' ? 'var(--primary)' : task.status === 'LATE' ? 'var(--danger)' : '#0BFD71' }} />
                   <Text style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-main)' }}>{task.status} ({task.progress}%)</Text>
                </View>
             </View>
             <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Responsáveis</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-main)' }}>{task.assignees.join(', ')}</Text>
             </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Histórico de Atualizações</Text>
            {updatesList.length === 0 ? (
              <View style={{ padding: 20, backgroundColor: 'var(--bg-app)', borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma atualização registrada.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {updatesList.map((update, idx) => {
                  const dateMatch = update.match(/^\[(.*?)\]/);
                  const dateStr = dateMatch ? dateMatch[1] : '';
                  const content = dateMatch ? update.replace(dateMatch[0], '').trim() : update;
                  
                  return (
                    <View key={idx} style={{ padding: 14, backgroundColor: 'var(--bg-app)', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: idx === 0 ? 'var(--primary)' : 'var(--border)' }}>
                      {dateStr && (
                        <Text style={{ fontSize: 10, fontWeight: '700', color: 'var(--primary)', marginBottom: 4 }}>{dateStr}</Text>
                      )}
                      <Text style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 18 }}>{content}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={{ padding: 20, backgroundColor: 'var(--bg-app)', borderTopWidth: 1, borderTopColor: 'var(--border)', alignItems: 'flex-end' }}>
          <TouchableOpacity 
            onPress={onClose}
            style={{ backgroundColor: 'var(--primary)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, shadowColor: 'var(--primary)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// -------------------------------------------------------------
// BOARD VIEW (KANBAN) COMPONENT
// -------------------------------------------------------------
const BoardView = ({ tasks, onEditRequest, highlightedTaskId }: { tasks: any[], onEditRequest: any, highlightedTaskId?: string | null }) => {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [infoTask, setInfoTask] = useState<any>(null);

  const columns = [
    { id: 'NOT_STARTED', title: 'NÃO INICIADO', color: 'var(--text-secondary)' },
    { id: 'IN_PROGRESS', title: 'EM ANDAMENTO', color: '#0BFD71' },
    { id: 'COMPLETED', title: 'CONCLUÍDO', color: 'var(--primary)' },
    { id: 'LATE', title: 'ATRASADO', color: 'var(--danger)' },
    { id: 'CANCELED', title: 'CANCELADO', color: 'var(--danger)' }
  ];

  const handleDragOver = (e: any, colId: string) => {
    e.preventDefault();
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDrop = (e: any, colId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onEditRequest) {
      const taskInCol = tasks.find(t => t.id === taskId);
      if (taskInCol && taskInCol.status !== colId) {
        onEditRequest({ 
          type: 'task', 
          isNew: false, 
          taskData: { ...taskInCol, status: colId }, 
          parentProjectId: taskInCol.projectId 
        });
      }
    }
  };

  const handleDragLeave = (e: any) => {
    e.preventDefault();
    setDragOverCol(null);
  };

  const searchInputRef = useRef<any>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  return (
    <View style={[styles.boardContainer, { padding: 0 }]}>
      <View style={{ margin: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'var(--input-bg)', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: 'var(--border)', height: 48 }}>
        <Search size={20} color="var(--text-muted)" style={{ marginRight: 10 }} />
        <TextInput
          ref={searchInputRef}
          style={[{ flex: 1, borderWidth: 0, marginBottom: 0, backgroundColor: 'transparent', paddingHorizontal: 0, color: 'var(--text-main)', fontSize: 15, fontWeight: '500', height: '100%', outlineStyle: 'none' } as any]}
          placeholder="Pesquisar tarefas..."
          placeholderTextColor="var(--text-muted)"
          value={searchQuery}
          onFocus={(e: any) => e.target.select()}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
      >
        {columns.map(col => {
          const colTasks = tasks.filter(t => 
            (t.status === col.id || (col.id === 'IN_PROGRESS' && t.status === 'IN_PROGRESS')) &&
            t.title.toLowerCase().includes(searchQuery.toLowerCase())
          );
          return (
            <View 
              key={col.id} 
              style={{
                width: 320,
                marginRight: 20,
                backgroundColor: dragOverCol === col.id ? 'rgba(0, 155, 114, 0.05)' : 'var(--bg-app)',
                borderRadius: 16,
                borderWidth: dragOverCol === col.id ? 2 : 1,
                borderColor: dragOverCol === col.id ? 'var(--primary)' : 'var(--border)',
                borderStyle: dragOverCol === col.id ? 'dashed' : 'solid',
                overflow: 'hidden',
                display: 'flex',
                height: '100%',
              } as any}
              // @ts-ignore
              onDragOver={(e: any) => handleDragOver(e, col.id)}
              // @ts-ignore
              onDrop={(e: any) => handleDrop(e, col.id)}
              // @ts-ignore
              onDragLeave={handleDragLeave}
            >
              <View style={[styles.columnHeader, { borderTopWidth: 4, borderTopColor: col.color, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'var(--bg-card)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.columnTitle, { fontSize: 13, letterSpacing: 0.5 }]}>{col.title}</Text>
                  <View style={[styles.badge, { backgroundColor: 'var(--border)', minWidth: 24 }]}>
                    <Text style={[styles.badgeText, { fontSize: 11 }]}>{colTasks.length}</Text>
                  </View>
                </View>
              </View>
              
              <ScrollView 
                style={{ flex: 1, padding: 12 }} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {colTasks.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center', opacity: 0.5 }}>
                    <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>Arraste tarefas aqui</Text>
                  </View>
                ) : (
                  colTasks.map(task => {
                    let riskColor = 'var(--primary)';
                    if (task.riskLevel === 'MEDIUM') riskColor = '#F59E0B';
                    if (task.riskLevel === 'HIGH') riskColor = 'var(--danger)';
                    
                    const isHighlighted = highlightedTaskId === task.id;

                    return (
                      <div 
                        key={task.id} 
                        draggable
                        onDragStart={(e: any) => {
                          e.dataTransfer.setData('taskId', task.id);
                          e.currentTarget.style.opacity = '0.5';
                        }}
                        onDragEnd={(e: any) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                        style={{ cursor: 'grab', marginBottom: 12 }}
                      >
                        <TouchableOpacity 
                          style={[
                            styles.kanbanCard, 
                            { 
                              borderLeftWidth: 4, 
                              borderLeftColor: riskColor, 
                              padding: 16,
                              borderRadius: 12,
                              backgroundColor: 'var(--bg-card)',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 4,
                              elevation: 2,
                            },
                            isHighlighted && { 
                              borderColor: 'var(--primary)', 
                              borderWidth: 2, 
                              transform: [{scale: 1.02}] 
                            } as any
                          ]} 
                          onPress={() => {
                            onEditRequest({ type: 'task', isNew: false, taskData: task, parentProjectId: task.projectId });
                          }}
                          title={task.title}
                        >
                          <Text style={[styles.cardProjectTag, { fontSize: 10, marginBottom: 4, opacity: 0.7 }]} title={task.projectName}>{task.projectName}</Text>
                          <Text style={[styles.cardTitle, { fontSize: 14, fontWeight: '600', marginBottom: 8 }]} title={task.title}>{task.title}</Text>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <UserIcon size={12} color="var(--text-muted)" style={{ marginRight: 6 }} />
                            <Text style={[styles.cardAssignee, { fontSize: 12, marginBottom: 0, flex: 1 }]} numberOfLines={1} title={task.assignees.join(', ')}>{task.assignees.join(', ')}</Text>
                            <TouchableOpacity 
                              onPress={(e) => {
                                e.stopPropagation();
                                setInfoTask(task);
                              }}
                              style={{ 
                                padding: 6, 
                                backgroundColor: 'var(--bg-app)', 
                                borderRadius: 8, 
                                borderWidth: 1, 
                                borderColor: 'var(--primary-light)',
                                marginLeft: 8
                              }}
                            >
                               <Info size={14} color="var(--primary)" />
                            </TouchableOpacity>
                          </View>

                          {task.updates ? (
                            <View style={{ backgroundColor: 'var(--bg-app)', padding: 8, borderRadius: 6, marginBottom: 12 }}>
                              <Text style={[styles.cardUpdates, { fontSize: 11, fontStyle: 'italic' }]} numberOfLines={2} title={task.updates}>
                                "{task.updates.split('\n').filter(Boolean).pop()}"
                              </Text>
                            </View>
                          ) : null}

                          <View style={[styles.cardFooter, { borderTopWidth: 1, borderTopColor: 'var(--border)', paddingTop: 10, marginTop: 4 }]}>
                            <Text style={[styles.cardDate, { fontSize: 11 }, task.status === 'LATE' && { color: 'var(--danger)', fontWeight: 'bold' }]}>
                              {safeFormatDate(task.startDate, 'dd/MM')} - {safeFormatDate(task.forecastDate, 'dd/MM', 'TBD')}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <View style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                                <View style={{ width: `${task.progress}%`, height: '100%', backgroundColor: col.color }} />
                              </View>
                              <Text style={[styles.cardProgress, { color: col.color, fontSize: 11, fontWeight: '700' }]}>{task.progress}%</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </div>
                    )
                  })
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {infoTask && <TaskInfoModal task={infoTask} onClose={() => setInfoTask(null)} />}
    </View>
  );
};

// -------------------------------------------------------------
// STYLES
// -------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'var(--bg-app)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: 'var(--bg-card)',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--border)',
    zIndex: 100,
    elevation: 100,
  },
  appName: {
    color: 'var(--text-main)',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Inter, sans-serif',
    letterSpacing: -0.5,
  },
  backButton: {
    paddingRight: 16,
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: 'var(--border)',
  },
  backButtonText: {
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'var(--border-light)',
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'var(--border)',
  },
  addButton: {
    backgroundColor: 'var(--primary)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 16,
  },
  addButtonText: {
    color: 'var(--bg-card)',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: 'var(--bg-card)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabText: {
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
  },
  activeTabText: {
    color: 'var(--text-main)',
    fontWeight: '700',
  },
  
  // Gantt Layout
  iconButton: {
    backgroundColor: 'rgba(0, 91, 46, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 91, 46, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconButtonText: {
    color: 'var(--text-secondary)',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter, sans-serif',
  },
  addTarefaBtn: {
    backgroundColor: 'rgba(0, 155, 114, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 155, 114, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addTarefaBtnText: {
    color: 'var(--primary)',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter, sans-serif',
  },
  ganttContainer: {
    flex: 1,
  },
  ganttHeaderRow: {
    flexDirection: 'row',
    backgroundColor: 'var(--bg-card)',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'var(--border)',
  },
  ganttBodyRow: {
    flexDirection: 'row',
  },
  leftPanel: {
    width: LEFT_PANEL_WIDTH,
    borderRightWidth: 1,
    borderRightColor: 'var(--border)',
    backgroundColor: 'var(--table-header-bg)',
  },
  leftPanelBody: {
    width: LEFT_PANEL_WIDTH,
    borderRightWidth: 1,
    borderRightColor: 'var(--border)',
    backgroundColor: 'var(--bg-card)',
  },
  rightPanelHeader: {
    flex: 1,
    backgroundColor: 'var(--bg-card)',
  },
  rightPanelBody: {
    flex: 1,
  },
  
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerCell: {
    color: 'var(--text-secondary)',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter, sans-serif',
    letterSpacing: 0.5,
  },
  
  // Rows
  rowBase: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'var(--border)',
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'var(--border-light)',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'var(--bg-card)',
  },
  
  cellText: {
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontFamily: 'Inter, sans-serif',
  },
  projectTitleText: {
    fontWeight: '700',
    color: 'var(--text-main)',
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
  },
  projectDateText: {
    color: 'var(--text-secondary)',
    opacity: 0.8,
    fontSize: 12,
  },
  projectProgressText: {
    color: 'var(--text-main)',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'Inter, sans-serif',
  },
  titleText: {
    fontWeight: '600',
    color: 'var(--text-secondary)',
    fontFamily: 'Inter, sans-serif',
  },
  mutedText: {
    color: 'var(--text-secondary)',
    opacity: 0.7,
  },
  progressBadge: {
    backgroundColor: 'var(--shadow)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'var(--glass-border)',
  },
  progressText: {
    color: 'var(--text-main)',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter, sans-serif',
  },
  
  // Timeline Header / Blocks
  dayHeader: {
    width: DAY_WIDTH,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'var(--border)',
  },
  dayHeaderText: {
    color: 'var(--text-main)',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
  },
  daySubText: {
    color: 'var(--text-secondary)',
    opacity: 0.8,
    fontSize: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: 'var(--bg-card)',
  },
  projectTimelineRow: {
    backgroundColor: 'var(--border-light)',
  },
  gridLine: {
    width: DAY_WIDTH,
    borderRightWidth: 1,
    borderRightColor: 'var(--border-light)',
  },
  taskBlockContainer: {
    position: 'absolute',
    height: 24,
    top: 12, // Center vertically
    paddingHorizontal: 2,
  },
  taskBlockArea: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  taskBlockProgress: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Board (Kanban)
  boardContainer: {
    flex: 1,
  },
  kanbanColumn: {
    width: 320,
    marginRight: 24,
    backgroundColor: 'var(--border-light)', 
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'var(--border)',
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderTopWidth: 4,
    paddingTop: 8,
  },
  columnTitle: {
    color: 'var(--text-main)',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
  },
  badge: {
    backgroundColor: 'var(--border)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
  },
  kanbanCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'var(--border)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardProjectTag: {
    fontSize: 10,
    color: 'var(--text-main)',
    fontWeight: '700',
    fontFamily: 'Inter, sans-serif',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardTitle: {
    color: 'var(--text-secondary)',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    marginBottom: 8,
    fontSize: 14,
  },
  cardAssignee: {
    color: 'var(--text-secondary)',
    opacity: 0.8,
    fontSize: 12,
    marginBottom: 8,
  },
  cardUpdates: {
    color: 'var(--text-secondary)',
    fontSize: 11,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    color: 'var(--text-secondary)',
    opacity: 0.8,
    fontSize: 12,
  },
  cardProgress: {
    fontWeight: '700',
    fontSize: 12,
    color: 'var(--text-main)',
    fontFamily: 'Inter, sans-serif',
  },
  
  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'var(--border-light)', 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'var(--text-main)',
    fontFamily: 'Inter, sans-serif',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: 'var(--text-secondary)', 
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 24,
    fontFamily: 'Inter, sans-serif',
    marginBottom: 24,
  },
 
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--modal-overlay)', 
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: 480,
    maxWidth: '95%',
    backgroundColor: 'var(--bg-card)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'var(--border)',
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    color: 'var(--text-main)',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Inter, sans-serif',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  label: {
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  webInput: {
    width: '100%',
    backgroundColor: 'var(--table-header-bg)',
    borderColor: 'var(--border)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'var(--text-main)',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    marginBottom: 20,
    outlineStyle: 'none',
  } as any,
  modalFooter: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: 'var(--text-secondary)',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
  },
  saveButton: {
    backgroundColor: 'var(--primary)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'var(--bg-card)',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'var(--danger)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: 'var(--danger)',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
  },
  riskSelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  riskOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  riskText: {
    fontWeight: '600',
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
  },
  inlineRiskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  }
});
