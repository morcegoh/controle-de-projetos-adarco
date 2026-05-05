import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, TextInput, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { addDays, format, differenceInDays, parseISO, startOfDay, isValid, getISOWeek, getYear, setISOWeek, setYear, startOfISOWeek, setWeek, startOfWeek } from 'date-fns';

import { Download, User as UserIcon, Settings, LogOut, Moon, CornerDownRight, Search, ChevronDown, ChevronRight } from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './theme';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import LoginScreen from './Login';
import ProfileScreen from './Profile';
import AdminScreen from './Admin';

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
  const [activeTab, setActiveTab] = useState<'GANTT' | 'BOARD' | 'PROFILE' | 'ADMIN'>('GANTT');

  useEffect(() => {
    const updateUpwebData = async () => {
      if (!user?.id) return;
      try {
        // Update specific tasks from the latest image
        const imageTasks = [
          { title: 'NPS Recepção', assignees: ['CS'], progress: 100, end_date: '2026-05-04', status: 'COMPLETED' },
          { title: 'NPS RECEPÇÃO', assignees: ['CS'], progress: 100, end_date: '2026-05-04', status: 'COMPLETED' },
          { title: 'Compra do Material', assignees: ['Theresa'], progress: 100, end_date: '2026-04-09', status: 'COMPLETED' },
          { title: 'Disponibilização do Material', assignees: ['Theresa'], progress: 100, end_date: '2026-04-20', status: 'COMPLETED' },
          { title: 'Envio para as Unidades', assignees: ['Jessyka'], progress: 100, end_date: '2026-05-04', status: 'COMPLETED' }
        ];

        for (const t of imageTasks) {
          // Update project end_date if it's the project
          await supabase.from('projects').update({
            progress: 100,
            end_date: t.end_date,
            status: t.status
          }).ilike('title', t.title);

          await supabase.from('tasks').update({
            assignees: t.assignees,
            progress: t.progress,
            end_date: t.end_date,
            status: t.status
          }).eq('title', t.title);

          await supabase.from('subtasks').update({
            assignees: t.assignees,
            progress: t.progress,
            end_date: t.end_date,
            status: t.status
          }).eq('title', t.title);
        }

        // Search case-insensitive for Upweb or UPWEB
        const { data: projects } = await supabase.from('projects').select('id').ilike('title', 'Upweb');
        if (!projects || projects.length === 0) return;
        const projectId = projects[0].id;

        await supabase.from('projects').update({
          status: 'CANCELED',
          progress: 100,
          end_date: '2026-04-22',
          department: 'EVENTOS'
        }).eq('id', projectId);

        // Cascade cancel all tasks that are not completed
        await supabase.from('tasks')
          .update({ 
            status: 'CANCELED', 
            end_date: '2026-04-22',
            progress: 100
          })
          .eq('project_id', projectId)
          .neq('status', 'COMPLETED');

        // Get tasks to update subtasks
        const { data: allTasks } = await supabase.from('tasks').select('id').eq('project_id', projectId);
        if (allTasks && allTasks.length > 0) {
          const taskIds = allTasks.map(t => t.id);
          await supabase.from('subtasks')
            .update({ 
              status: 'CANCELED', 
              end_date: '2026-04-22',
              progress: 100
            })
            .in('task_id', taskIds)
            .neq('status', 'COMPLETED');
        }
        fetchProjects();
      } catch (err) {
        console.error('Error auto-updating Upweb:', err);
      }
    };
    
    // Check if we already did this to avoid loops, though it's idempotent
    updateUpwebData();
  }, [user?.id]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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

  const handleTabChange = async (tab: 'GANTT' | 'BOARD' | 'PROFILE' | 'ADMIN') => {
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

  const handleSaveTask = async (projectId: string, taskData: Partial<Task>) => {
    try {
      const payload = {
        project_id: projectId,
        title: taskData.title,
        assignees: taskData.assignees,
        start_date: taskData.startDate,
        forecast_date: taskData.forecastDate,
        end_date: (taskData.progress === 100 || taskData.status === 'CANCELED') ? (taskData.endDate || new Date().toISOString().split('T')[0]) : null,
        status: taskData.status,
        risk_level: taskData.riskLevel,
        updates: taskData.updates,
        objective: taskData.objective,
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

  const handleSaveSubtask = async (taskId: string, subtaskData: Partial<Subtask>) => {
    try {
      const payload = {
        task_id: taskId,
        title: subtaskData.title,
        assignees: subtaskData.assignees,
        start_date: subtaskData.startDate,
        forecast_date: subtaskData.forecastDate,
        end_date: (subtaskData.progress === 100 || subtaskData.status === 'CANCELED') ? (subtaskData.endDate || new Date().toISOString().split('T')[0]) : null,
        status: subtaskData.status,
        risk_level: subtaskData.riskLevel,
        updates: subtaskData.updates,
        objective: subtaskData.objective,
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
    let status = p.status;
    const targetDate = p.forecastDate;
    
    const isProjectLate = p.progress < 100 && p.status !== 'COMPLETED' && p.status !== 'CANCELED' && targetDate && today > startOfDay(parseISO(targetDate));
    if (isProjectLate) status = 'LATE';
    else if (p.progress === 100) status = p.status === 'CANCELED' ? 'CANCELED' : 'COMPLETED';
    
    const tasks = p.tasks.map(t => {
       let tStatus = t.status;
       const tTargetDate = t.forecastDate;
       const isTaskLate = t.progress < 100 && t.status !== 'COMPLETED' && t.status !== 'CANCELED' && tTargetDate && today > startOfDay(parseISO(tTargetDate));
       if (isTaskLate) tStatus = 'LATE';
       else if (t.progress === 100) tStatus = t.status === 'CANCELED' ? 'CANCELED' : 'COMPLETED';

       const subtasks = t.subtasks.map(st => {
           let stStatus = st.status;
           const stTargetDate = st.forecastDate;
           const isSubtaskLate = st.progress < 100 && st.status !== 'COMPLETED' && st.status !== 'CANCELED' && stTargetDate && today > startOfDay(parseISO(stTargetDate));
           if (isSubtaskLate) stStatus = 'LATE';
           else if (st.progress === 100) stStatus = st.status === 'CANCELED' ? 'CANCELED' : 'COMPLETED';
           return { ...st, status: stStatus };
       });

       return { ...t, status: tStatus, subtasks };
    });

    return { ...p, status, tasks };
  });

  // Flatten tasks for board view
  const allTasks = processedProjects.flatMap(p => p.tasks.map(t => ({ ...t, projectName: p.title, projectId: p.id })));

  return (
    <View style={styles.container}>
      {/* Header - Glassmorphism */}
      <View style={[styles.header, isMobile && { paddingHorizontal: 16, flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {activeTab === 'BOARD' && (
              <TouchableOpacity 
                onPress={() => { handleTabChange('GANTT'); setHighlightedTaskId(null); }} 
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { handleTabChange('GANTT'); setHighlightedTaskId(null); }}>
              <Text style={[styles.appName, isMobile && { fontSize: 16 }]}>{isSmallMobile ? 'Adarco' : 'Controle Adarco'}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ position: 'relative', zIndex: 110 }}>
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

        <View style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 12, flexWrap: 'wrap' }}>
          {activeTab === 'GANTT' && (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Text style={{color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: 12}}>Timeline:</Text>
              <select 
                style={{ ...webInputDOMStyle, marginBottom: 0, paddingTop: '4px', paddingBottom: '4px', paddingLeft: '8px', paddingRight: '8px', width: 'auto', backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', fontSize: '12px' }}
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
              >
                {[2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                style={{ ...webInputDOMStyle, marginBottom: 0, paddingTop: '4px', paddingBottom: '4px', paddingLeft: '8px', paddingRight: '8px', width: 'auto', backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', fontSize: '12px' }}
                value={filterWeek}
                onChange={(e) => setFilterWeek(Number(e.target.value))}
              >
                {Array.from({length: 53}).map((_, i) => <option key={i+1} value={i+1}>{isMobile ? `S${i+1}` : `Semana ${i+1}`}</option>)}
              </select>
            </View>
          )}

          <View style={[styles.tabsContainer, isMobile && { width: '100%', justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {activeTab === 'BOARD' && (
                <TouchableOpacity style={{ paddingHorizontal: 8, paddingVertical: 8, marginRight: 8, borderRadius: 6, borderWidth: 1, borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', justifyContent: 'center', alignItems: 'center' }} onPress={handleExportReport}>
                  <Download size={18} color="var(--text-secondary)" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.addButton, isMobile && { marginRight: 8 }]} onPress={() => setEditingItem({ type: 'project', isNew: true })}>
                <Text style={styles.addButtonText}>+ Projeto</Text>
              </TouchableOpacity>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'GANTT' && styles.activeTab, isSmallMobile && { paddingHorizontal: 8 }]}
                onPress={() => handleTabChange('GANTT')}
              >
                <Text style={[styles.tabText, activeTab === 'GANTT' && styles.activeTabText, isSmallMobile && { fontSize: 12 }]}>{isSmallMobile ? 'Gantt' : 'Timeline'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'BOARD' && styles.activeTab, isSmallMobile && { paddingHorizontal: 8 }]}
                onPress={() => handleTabChange('BOARD')}
              >
                <Text style={[styles.tabText, activeTab === 'BOARD' && styles.activeTabText, isSmallMobile && { fontSize: 12 }]}>{isSmallMobile ? 'Kanban' : 'Board'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={{flex: 1}}>
        {activeTab === 'ADMIN' ? (
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
            projects={processedProjects} 
            timelineStart={timelineStart}
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
  const [newUpdateUser, setNewUpdateUser] = useState('Heder Santos');
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
      onSaveProject({ id: data.id, title, department, owner, startDate, forecastDate, endDate, status, progress });
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
          <Text style={styles.label}>Título</Text>
          <TouchableOpacity style={{backgroundColor: 'transparent'}}>
             <input 
               style={webInputDOMStyle} 
               value={title} 
               onChange={(e) => setTitle(e.target.value)} 
               placeholder={`Nome d${isProject ? 'o projeto' : isTask ? 'a tarefa' : 'a subtarefa'}`} 
             />
          </TouchableOpacity>

          {isProject && (
            <>
              <View style={{flexDirection: 'row', gap: 16, marginTop: 10, marginBottom: 10}}>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Departamento</Text>
                  <TouchableOpacity style={{backgroundColor: 'transparent'}}>
                     <input 
                       style={webInputDOMStyle} 
                       value={department} 
                       onChange={(e) => setDepartment(e.target.value)} 
                       placeholder="Ex: Comercial, TI..." 
                     />
                  </TouchableOpacity>
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Responsável</Text>
                  <TouchableOpacity style={{backgroundColor: 'transparent'}}>
                     <input 
                       style={webInputDOMStyle} 
                       value={owner} 
                       onChange={(e) => setOwner(e.target.value)} 
                       placeholder="Nome do Responsável..." 
                     />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>Status do Projeto</Text>
              <TouchableOpacity style={{backgroundColor: 'transparent'}}>
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
              </TouchableOpacity>
            </>
          )}

          {!isProject && (
            <>
              {item.isNew && isTask && projects?.length > 0 && (
                <>
                  <Text style={styles.label}>Projeto</Text>
                  <TouchableOpacity style={{backgroundColor: 'transparent'}}>
                    <select 
                      style={webInputDOMStyle} 
                      value={selectedProjectId} 
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                      {projects.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.label}>Atribuído Para (Separado por vírgula)</Text>
              <TouchableOpacity style={{backgroundColor: 'transparent'}}>
                 <input 
                   style={webInputDOMStyle} 
                   value={assigneesStr} 
                   onChange={(e) => setAssigneesStr(e.target.value)} 
                   placeholder="João, Maria" 
                 />
              </TouchableOpacity>
              
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
                <TouchableOpacity style={{backgroundColor: 'transparent', flex: 1}}>
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
                </TouchableOpacity>
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

              <Text style={styles.label}>Objetivo da Tarefa</Text>
              <TouchableOpacity style={{backgroundColor: 'transparent', height: 80, marginBottom: 12}}>
                 <textarea 
                   style={{ ...webInputDOMStyle, height: '100%', resize: 'none' }} 
                   value={objective} 
                   onChange={(e) => setObjective(e.target.value)} 
                   placeholder="Descreva o que a tarefa deve resolver..." 
                 />
              </TouchableOpacity>

              <Text style={styles.label}>Anotações Gerais</Text>
              <TouchableOpacity style={{backgroundColor: 'transparent', height: 80, marginBottom: 20}}>
                 <textarea 
                   style={{ ...webInputDOMStyle, height: '100%', resize: 'none' }} 
                   value={updates} 
                   onChange={(e) => setUpdates(e.target.value)} 
                   placeholder="Destaques, bloqueios ou informações..." 
                 />
              </TouchableOpacity>

              <Text style={[styles.label, { color: 'var(--primary)', marginTop: 10 }]}>Adicionar ao Histórico</Text>
              
              <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
                <View style={{flex: 1}}>
                  <Text style={[styles.label, { fontSize: 12}]}>Seu Nome</Text>
                  <TouchableOpacity style={{backgroundColor: 'transparent'}}>
                    <input 
                      style={{ ...webInputDOMStyle, paddingTop: '8px', paddingBottom: '8px', fontSize: '12px' }} 
                      value={newUpdateUser} 
                      onChange={(e) => setNewUpdateUser(e.target.value)} 
                      placeholder="Nome..." 
                    />
                  </TouchableOpacity>
                </View>
                <View style={{flex: 2}}>
                  <Text style={[styles.label, { fontSize: 12}]}>Nova Atualização</Text>
                  <TouchableOpacity style={{backgroundColor: 'transparent', height: 40}}>
                    <input 
                      style={{ ...webInputDOMStyle, paddingTop: '8px', paddingBottom: '8px', fontSize: '12px' }} 
                      value={newUpdateContent} 
                      onChange={(e) => setNewUpdateContent(e.target.value)} 
                      placeholder="Descreva o que mudou..." 
                    />
                  </TouchableOpacity>
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
// GANTT VIEW COMPONENT
// -------------------------------------------------------------
const GanttView = ({ projects, timelineStart, onUpdateProgress, onUpdateSubtaskProgress, onEditRequest, onTaskPress }: { projects: Project[], timelineStart: Date, onUpdateProgress: (id: string, p: number) => void, onUpdateSubtaskProgress: (id: string, p: number) => void, onEditRequest: any, onTaskPress: (id: string) => void }) => {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  // Generate Days Header
  const daysArray = Array.from({ length: TIMELINE_DAYS }).map((_, i) => addDays(timelineStart, i));

  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(() => new Set(projects.map(p => p.id)));

  const toggleProjectCollapse = (projectId: string) => {
    const newCollapsed = new Set(collapsedProjects);
    if (newCollapsed.has(projectId)) {
      newCollapsed.delete(projectId);
    } else {
      newCollapsed.add(projectId);
    }
    setCollapsedProjects(newCollapsed);
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
    const isFinished = p.status === 'COMPLETED' || p.progress === 100 || p.status === 'CANCELED';
    const finishDate = p.endDate ? (typeof p.endDate === 'string' ? parseISO(p.endDate) : p.endDate) : (p.forecastDate ? (typeof p.forecastDate === 'string' ? parseISO(p.forecastDate) : p.forecastDate) : null);
    
    // Timeline window ends at timelineStart + TIMELINE_DAYS
    const timelineEnd = addDays(timelineStart, TIMELINE_DAYS);
    
    // Only hide if it finished BEFORE the current viewable window starts
    if (isFinished && finishDate && isValid(finishDate) && finishDate < timelineStart) {
      return; // Skip this project
    }

    rows.push({ type: 'project', data: p });
    if (!collapsedProjects.has(p.id)) {
      p.tasks.forEach(t => {
        rows.push({ type: 'task', data: t });
        if (t.subtasks && t.subtasks.length > 0) {
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
          <Text style={[styles.headerCell, { flex: isMobile ? 5 : 3 }]}>{isMobile ? 'ITEM' : 'PROJETO / TAREFA'}</Text>
          {!isMobile && <Text style={[styles.headerCell, { flex: 1.5 }]}>ATRIBUÍDO</Text>}
          <Text style={[styles.headerCell, { flex: isMobile ? 1.5 : 0.8, textAlign: 'center' }]}>%</Text>
          {!isMobile && (
            <>
              <Text style={[styles.headerCell, { flex: 1 }]}>INÍCIO</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>PREVISÃO</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>TÉRMINO</Text>
            </>
          )}
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
                isToday && { backgroundColor: 'rgba(11, 253, 113, 0.1)', borderBottomWidth: 2, borderBottomColor: '#0BFD71' }
              ]}>
                <Text style={[styles.dayHeaderText, isToday && { color: '#0BFD71', fontWeight: 'bold' }]}>{format(day, 'dd')}</Text>
                <Text style={[styles.daySubText, isToday && { color: '#0BFD71', fontWeight: 'bold' }]}>{format(day, 'MMM')}</Text>
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
                <View key={`lp-${p.id}`} style={[styles.rowBase, styles.projectRow, isLate && { borderLeftWidth: 3, borderLeftColor: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                  <View style={{ flex: isMobile ? 5 : 3, flexDirection: 'row', alignItems: 'center' }}>
                    {p.tasks && p.tasks.length > 0 && (
                      <TouchableOpacity onPress={() => toggleProjectCollapse(p.id)} style={{ marginRight: 4, padding: 4 }}>
                        {collapsedProjects.has(p.id) ? (
                          <ChevronRight size={16} color="var(--text-main)" />
                        ) : (
                          <ChevronDown size={16} color="var(--text-main)" />
                        )}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={{ flex: 1, justifyContent: 'center', marginLeft: p.tasks && p.tasks.length > 0 ? 0 : 24 }} onPress={() => onEditRequest({ type: 'project', isNew: false, projectData: p })} title={p.title}>
                      <Text style={[styles.cellText, styles.projectTitleText, isMobile && { fontSize: 10 }]} title={p.title}>{p.title}</Text>
                      {!isMobile && (p.department || p.owner) && (
                        <Text style={{color: 'var(--text-muted)', fontSize: 10, marginTop: 2}} title={[p.department, p.owner].filter(Boolean).join(' • ')}>
                          {[p.department, p.owner].filter(Boolean).join(' • ')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {!isMobile && (
                    <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center' }}>
                       <TouchableOpacity style={styles.iconButton} onPress={() => onEditRequest({ type: 'task', isNew: true, parentProjectId: p.id })}>
                         <Text style={styles.iconButtonText}>+ Add Tarefa</Text>
                       </TouchableOpacity>
                    </View>
                  )}
                  <View style={{ flex: isMobile ? 1.5 : 0.8, alignItems: 'center' }}>
                    <Text style={[styles.projectProgressText, isMobile && { fontSize: 11 }]}>{p.progress}%</Text>
                  </View>
                  {!isMobile && (
                    <>
                      <Text style={[styles.cellText, styles.projectDateText, { flex: 1 }]} numberOfLines={1} title={safeFormatDate(p.startDate)}>
                        {safeFormatDate(p.startDate)}
                      </Text>
                      <Text style={[styles.cellText, styles.projectDateText, { flex: 1, color: p.status === 'LATE' ? 'var(--danger)' : 'var(--text-main)' }]} numberOfLines={1} title={safeFormatDate(p.forecastDate)}>
                        {safeFormatDate(p.forecastDate)}
                      </Text>
                      <Text style={[styles.cellText, styles.projectDateText, { flex: 1, color: (p.status === 'LATE' || (p.endDate && p.forecastDate && new Date(p.endDate) > new Date(p.forecastDate))) ? 'var(--danger)' : 'var(--primary)' }]} numberOfLines={1} title={p.progress === 100 ? safeFormatDate(p.endDate) : '--/--/--'}>
                        {p.progress === 100 ? safeFormatDate(p.endDate) : '--/--/--'}
                      </Text>
                    </>
                  )}
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
                  <TouchableOpacity style={{ flex: isMobile ? 5 : 3, paddingLeft: 24, flexDirection: 'row', alignItems: 'center' }} onPress={() => onEditRequest({ type: 'task', isNew: false, taskData: task, parentProjectId: parentProject?.id })} title={task.title}>
                    <CornerDownRight size={14} color="var(--border)" style={{ marginRight: 6, marginTop: -2 }} />
                    <View style={[styles.inlineRiskDot, { backgroundColor: riskColor }]} />
                    <Text style={[styles.cellText, styles.titleText, { marginRight: 8 }, isMobile && { fontSize: 11 }]} title={task.title}>{task.title}</Text>
                    {!isMobile && (
                      <TouchableOpacity onPress={() => onEditRequest({ type: 'subtask', isNew: true, parentTaskId: task.id })} style={{ padding: 2, backgroundColor: 'var(--bg-card)', borderRadius: 4, borderWidth: 1, borderColor: 'var(--border)' }}>
                        <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}>+ Sub</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                  {!isMobile && <Text style={[styles.cellText, styles.mutedText, { flex: 1.5 }]}>{task.assignees.join(', ')}</Text>}
                  
                  <TouchableOpacity style={{ flex: isMobile ? 1.5 : 0.8, alignItems: 'center' }} onPress={() => onUpdateProgress(task.id, task.progress >= 100 ? 0 : task.progress + 25)}>
                    <View style={[styles.progressBadge, isMobile && { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }]}>
                      <Text style={[styles.progressText, isMobile && { fontSize: 10 }]}>{task.progress}%</Text>
                    </View>
                  </TouchableOpacity>

                  {!isMobile && (
                    <>
                      <Text style={[styles.cellText, { flex: 1 }]} numberOfLines={1}>
                        {safeFormatDate(task.startDate)}
                      </Text>
                      <Text style={[styles.cellText, { flex: 1, color: task.status === 'LATE' ? 'var(--danger)' : 'var(--text-main)' }]} numberOfLines={1}>
                        {safeFormatDate(task.forecastDate)}
                      </Text>
                      <Text style={[styles.cellText, { flex: 1, color: (task.status === 'LATE' || (task.endDate && task.forecastDate && new Date(task.endDate) > new Date(task.forecastDate))) ? 'var(--danger)' : 'var(--text-muted)' }]} numberOfLines={1}>
                        {task.progress === 100 ? safeFormatDate(task.endDate) : '--/--/--'}
                      </Text>
                    </>
                  )}
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
                  <TouchableOpacity style={{ flex: isMobile ? 5 : 3, paddingLeft: isMobile ? 32 : 56, flexDirection: 'row', alignItems: 'center' }} onPress={() => onEditRequest({ type: 'subtask', isNew: false, subtaskData: subtask, parentTaskId })} title={subtask.title}>
                    <CornerDownRight size={12} color="var(--border)" style={{ marginRight: 6, marginTop: -2 }} />
                    <View style={[styles.inlineRiskDot, { backgroundColor: riskColor, width: 6, height: 6, opacity: 0.7 }]} />
                    <Text style={[styles.cellText, styles.titleText, { fontSize: isMobile ? 10 : 12, color: 'var(--text-secondary)' }]} title={subtask.title}>{subtask.title}</Text>
                  </TouchableOpacity>
                  {!isMobile && <Text style={[styles.cellText, styles.mutedText, { flex: 1.5, fontSize: 11 }]}>{subtask.assignees.join(', ')}</Text>}
                  
                  <TouchableOpacity style={{ flex: isMobile ? 1.5 : 0.8, alignItems: 'center' }} onPress={() => onUpdateSubtaskProgress(subtask.id, subtask.progress >= 100 ? 0 : subtask.progress + 25)}>
                    <View style={[styles.progressBadge, { paddingHorizontal: 4, paddingVertical: 1 }]}>
                      <Text style={[styles.progressText, { fontSize: 9 }]}>{subtask.progress}%</Text>
                    </View>
                  </TouchableOpacity>

                  {!isMobile && (
                    <>
                      <Text style={[styles.cellText, { flex: 1, fontSize: 11, color: 'var(--text-secondary)' }]} numberOfLines={1}>
                        {safeFormatDate(subtask.startDate)}
                      </Text>
                      <Text style={[styles.cellText, { flex: 1, fontSize: 11, color: subtask.status === 'LATE' ? 'var(--danger)' : 'var(--text-secondary)' }]} numberOfLines={1}>
                        {safeFormatDate(subtask.forecastDate)}
                      </Text>
                      <Text style={[styles.cellText, { flex: 1, fontSize: 11, color: (subtask.status === 'LATE' || (subtask.endDate && subtask.forecastDate && new Date(subtask.endDate) > new Date(subtask.forecastDate))) ? 'var(--danger)' : 'var(--text-muted)' }]} numberOfLines={1}>
                        {subtask.progress === 100 ? safeFormatDate(subtask.endDate) : '--/--/--'}
                      </Text>
                    </>
                  )}
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
              const rawStartOffset = safeDifferenceInDays(data.startDate, timelineStart);
              
              const isFinishedRow = data.status === 'COMPLETED' || data.progress === 100 || data.status === 'CANCELED';
              
              // Explicitly use endDate if finished, otherwise use forecastDate. 
              // Fallback to startDate if others are missing to prevent bar stretching to 'today' by accident.
              let boundaryDate: string | Date = data.startDate;
              if (isFinishedRow && data.endDate) {
                boundaryDate = data.endDate;
              } else if (data.forecastDate) {
                boundaryDate = data.forecastDate;
              } else if (data.endDate) {
                boundaryDate = data.endDate;
              }

              const rawEndOffset = safeDifferenceInDays(boundaryDate, timelineStart);
              
              const isVisibleInTimeline = rawEndOffset >= 0 && rawStartOffset < TIMELINE_DAYS;
              
              const startInTimeline = Math.max(0, rawStartOffset);
              const endInTimeline = Math.min(TIMELINE_DAYS - 1, rawEndOffset);
              const visibleDuration = Math.max(0, endInTimeline - startInTimeline + 1);
              
              const safeOffset = startInTimeline;
              const safeDuration = visibleDuration;

              // Colors based on project vs task and progress
              let isLateItem = false;
              let blockStyle: any = {};
              
              if (row.type === 'project') {
                isLateItem = data.status === 'LATE' && data.progress < 100;
                const isCanceled = data.status === 'CANCELED';
                blockStyle = {
                  backgroundColor: isCanceled ? 'rgba(239, 68, 68, 0.15)' : (isLateItem ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                  borderColor: (isLateItem || isCanceled) ? 'var(--danger)' : 'var(--primary)',
                  borderWidth: 1,
                  shadowColor: isLateItem ? 'var(--danger)' : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isLateItem ? 0.6 : 0,
                  shadowRadius: isLateItem ? 8 : 0,
                  elevation: isLateItem ? 4 : 0,
                  barColor: isCanceled ? 'var(--danger)' : (isLateItem ? 'var(--text-muted)' : 'var(--text-muted)'),
                  displayProgress: isCanceled ? 100 : data.progress
                };
              } else {
                isLateItem = data.status === 'LATE' && data.progress < 100;
                const isCanceled = data.status === 'CANCELED';
                let barColor = row.type === 'subtask' ? '#6EE7B7' : '#0BFD71'; 
                let areaColor = row.type === 'subtask' ? 'rgba(110, 231, 183, 0.15)' : 'rgba(11, 253, 113, 0.2)';
                let useGradient = true;
                
                if (isCanceled) {
                  barColor = 'var(--danger)';
                  areaColor = 'rgba(239, 68, 68, 0.2)';
                  useGradient = false;
                } else if (isLateItem) {
                  // Keep normal green/subtask colors, but maybe a slight area tint
                  areaColor = 'rgba(239, 68, 68, 0.1)';
                } else if (data.progress === 100) {
                   barColor = 'var(--primary)'; // Solido
                   areaColor = 'rgba(16, 185, 129, 0.2)';
                   useGradient = false;
                } else if (data.progress === 0) {
                   barColor = 'var(--text-muted)'; // Slate (Not Started)
                   areaColor = 'rgba(100, 116, 139, 0.2)';
                   useGradient = false;
                }

                blockStyle = {
                   areaColor,
                   barColor,
                   useGradient,
                   borderColor: (isLateItem || isCanceled) ? 'var(--danger)' : 'rgba(0,0,0,0.05)',
                   borderWidth: (isLateItem || isCanceled) ? 1 : 0,
                   shadowColor: isLateItem ? 'var(--danger)' : 'transparent',
                   shadowOffset: { width: 0, height: 0 },
                   shadowOpacity: isLateItem ? 0.7 : 0,
                   shadowRadius: isLateItem ? 10 : 0,
                   elevation: isLateItem ? 5 : 0,
                   displayProgress: isCanceled ? 100 : data.progress
                };
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
                         {
                           shadowColor: blockStyle.shadowColor,
                           shadowOffset: blockStyle.shadowOffset,
                           shadowOpacity: blockStyle.shadowOpacity,
                           shadowRadius: blockStyle.shadowRadius,
                           elevation: blockStyle.elevation
                         }
                       ]}
                     >
                       {row.type === 'project' ? (
                          <View style={[styles.taskBlockArea, blockStyle]}>
                             <View style={[{ width: `${blockStyle.displayProgress}%`, backgroundColor: blockStyle.barColor, height: '100%', opacity: 0.5 }]} />
                          </View>
                       ) : (
                          <View style={[styles.taskBlockArea, { 
                             backgroundColor: blockStyle.areaColor, 
                             borderColor: blockStyle.borderColor, 
                             borderWidth: blockStyle.borderWidth,
                             borderRadius: 4
                          }]}>
                             {blockStyle.useGradient ? (
                                <LinearGradient 
                                   colors={row.type === 'subtask' ? ['#059669', '#047857'] : ['#008744', '#005B2E']} 
                                   start={{x: 0, y: 0}} 
                                   end={{x: 1, y: 0}} 
                                   style={[styles.taskBlockProgress, { width: `${blockStyle.displayProgress}%` }]} 
                                />
                             ) : (
                               <View style={[styles.taskBlockProgress, { width: `${blockStyle.displayProgress}%`, backgroundColor: blockStyle.barColor }]} />
                             )}
                          </View>
                       )}
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
// BOARD VIEW (KANBAN) COMPONENT
// -------------------------------------------------------------
const BoardView = ({ tasks, onEditRequest, highlightedTaskId }: { tasks: any[], onEditRequest: any, highlightedTaskId?: string | null }) => {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <View style={[styles.boardContainer, { padding: windowWidth < 768 ? 16 : 32 }]}>
      <View style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center', backgroundColor: 'var(--bg-card)', paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: 'var(--border)' }}>
        <Search size={18} color="var(--text-muted)" style={{ marginRight: 8 }} />
        <TextInput
          style={[{ flex: 1, borderWidth: 0, marginBottom: 0, backgroundColor: 'transparent', paddingHorizontal: 0, color: 'var(--text-main)', height: 40, outlineStyle: 'none' } as any]}
          placeholder="Pesquisar tarefas..."
          placeholderTextColor="var(--text-muted)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <ScrollView horizontal style={{ flex: 1, overflow: 'visible' }}>
        {columns.map(col => {
          const colTasks = tasks.filter(t => 
            (t.status === col.id || (col.id === 'IN_PROGRESS' && t.status === 'IN_PROGRESS')) &&
            t.title.toLowerCase().includes(searchQuery.toLowerCase())
          );
          return (
          <div 
            key={col.id} 
            style={{
              flex: 1, 
              minWidth: 320, 
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: dragOverCol === col.id ? 'rgba(0, 91, 46, 0.05)' : 'transparent',
              borderRadius: 8,
              border: dragOverCol === col.id ? '2px dashed rgba(0, 91, 46, 0.4)' : '2px solid transparent',
              transition: 'all 0.2s ease',
              marginRight: 16, // reset margin right after if it was overwritten
            }}
            onDragOver={(e: any) => handleDragOver(e, col.id)}
            onDrop={(e: any) => handleDrop(e, col.id)}
            onDragLeave={handleDragLeave}
          >
            <View style={[styles.columnHeader, { borderTopColor: col.color }]}>
               <Text style={styles.columnTitle}>{col.title}</Text>
               <View style={styles.badge}><Text style={styles.badgeText}>{colTasks.length}</Text></View>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {colTasks.map(task => {
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
                    style={{ cursor: 'grab' }}
                  >
                    <TouchableOpacity 
                      style={[
                        styles.kanbanCard, 
                        { borderLeftWidth: 3, borderLeftColor: riskColor, padding: isMobile ? 12 : 16 },
                        isHighlighted ? { borderColor: 'var(--primary)', borderWidth: 2, backgroundColor: 'var(--bg-app)', transform: [{scale: 1.02}] } as any : {}
                      ]} 
                      onPress={() => {
                        onEditRequest({ type: 'task', isNew: false, taskData: task, parentProjectId: task.projectId });
                      }}
                      title={task.title}
                    >
                      <Text style={styles.cardProjectTag} title={task.projectName}>{task.projectName}</Text>
                      <Text style={styles.cardTitle} title={task.title}>{task.title}</Text>
                      <Text style={styles.cardAssignee} title={task.assignees.join(', ')}>{task.assignees.join(', ')}</Text>
                      {task.updates ? <Text style={styles.cardUpdates} numberOfLines={2} title={task.updates}>{task.updates}</Text> : null}
                      <View style={styles.cardFooter}>
                        <Text style={[styles.cardDate, task.status === 'LATE' && { color: 'var(--danger)', opacity: 1 }]}>
                          {safeFormatDate(task.startDate, 'dd/MM')} - {safeFormatDate(task.forecastDate, 'dd/MM', 'TBD')}
                        </Text>
                        <Text style={[styles.cardProgress, { color: col.color }]}>{task.progress}%</Text>
                      </View>
                    </TouchableOpacity>
                  </div>
                )
              })}
            </ScrollView>
          </div>
        );
      })}
      </ScrollView>
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
  ganttContainer: {
    flex: 1,
  },
  ganttHeaderRow: {
    flexDirection: 'row',
    backgroundColor: 'var(--bg-card)FFF',
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
    backgroundColor: 'var(--bg-card)FFF',
  },
  rightPanelHeader: {
    flex: 1,
    backgroundColor: 'var(--bg-card)FFF',
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
    color: 'var(--text-main)',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Inter, sans-serif',
    letterSpacing: 1,
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
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
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
    borderRightColor: 'var(--border)',
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
    marginBottom: 12,
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
  cardUpdates: {
    color: 'var(--text-secondary)',
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
    fontFamily: 'Inter, sans-serif',
    backgroundColor: 'var(--shadow)',
    padding: 8,
    borderRadius: 4,
  },
  inlineRiskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  }
});
