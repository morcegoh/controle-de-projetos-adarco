import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { addDays, format, differenceInDays, parseISO, startOfDay, isValid, getISOWeek, getYear, setISOWeek, setYear, startOfISOWeek, setWeek } from 'date-fns';

import { Download, User as UserIcon, Settings, LogOut, Moon, CornerDownRight } from 'lucide-react';
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
        
        {error ? <Text style={{ color: '#DC2626', backgroundColor: 'var(--danger-bg)', padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>{error}</Text> : null}

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
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: 'var(--bg-card)', fontWeight: '600', fontSize: 16 }}>Atualizar Senha</Text>}
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'GANTT' | 'BOARD' | 'PROFILE' | 'ADMIN'>('GANTT');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
      const { data: projData, error: projErr } = await supabase.from('projects').select('*').eq('user_id', user.id);
      if (projErr) throw projErr;
      
      const { data: taskData, error: taskErr } = await supabase.from('tasks').select('*');
      if (taskErr) throw taskErr;
      
      const { data: subtaskData, error: subtaskErr } = await supabase.from('subtasks').select('*');
      if (subtaskErr) throw subtaskErr;

      const formattedProjects = (projData || []).map(p => {
        const projectTasks = (taskData || []).filter(t => t.project_id === p.id);
        
        const tasksWithSubtasks = projectTasks.map(t => {
          const taskSubtasks = (subtaskData || []).filter(st => st.task_id === t.id);
          const totalSubProgress = taskSubtasks.reduce((sum, st) => sum + (st.progress || 0), 0);
          const computedProgress = taskSubtasks.length > 0 ? Math.round(totalSubProgress / taskSubtasks.length) : (t.progress || 0);
          
          let computedEndDate = t.end_date;
          if (taskSubtasks.length > 0) {
            const validEndDates = taskSubtasks.map(st => st.end_date).filter(Boolean);
            if (validEndDates.length > 0) {
              validEndDates.sort();
              computedEndDate = validEndDates[validEndDates.length - 1];
            } else {
              computedEndDate = t.end_date;
            }
          }

          return {
            id: t.id,
            projectId: t.project_id,
            title: t.title,
            assignees: t.assignees || [],
            progress: computedProgress,
            startDate: t.start_date,
            forecastDate: t.forecast_date,
            endDate: computedEndDate,
            status: t.status,
            riskLevel: t.risk_level,
            updates: t.updates,
            objective: t.objective,
            subtasks: taskSubtasks.map(st => ({
              id: st.id,
              taskId: st.task_id,
              title: st.title,
              assignees: st.assignees || [],
              progress: st.progress || 0,
              startDate: st.start_date,
              forecastDate: st.forecast_date,
              endDate: st.end_date,
              status: st.status,
              riskLevel: st.risk_level,
              updates: st.updates,
              objective: st.objective,
            }))
          };
        });

        const totalProgress = tasksWithSubtasks.reduce((sum, t) => sum + t.progress, 0);
        const avgProgress = tasksWithSubtasks.length > 0 ? Math.round(totalProgress / tasksWithSubtasks.length) : (p.progress || 0);
        
        let computedProjectEndDate = p.end_date;
        if (tasksWithSubtasks.length > 0) {
          const validEndDates = tasksWithSubtasks.map(t => t.endDate).filter(Boolean);
          if (validEndDates.length > 0) {
            validEndDates.sort();
            computedProjectEndDate = validEndDates[validEndDates.length - 1];
          } else {
            computedProjectEndDate = p.end_date;
          }
        }

        return {
          id: p.id,
          title: p.title,
          department: p.department,
          owner: p.owner,
          progress: avgProgress,
          startDate: p.start_date,
          forecastDate: p.forecast_date,
          endDate: computedProjectEndDate,
          status: p.status,
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
    setActiveTab('BOARD');
  };

  const handleSaveProject = async (projectData: Partial<Project>) => {
    try {
      const payload = {
        title: projectData.title,
        department: projectData.department,
        owner: projectData.owner,
        start_date: projectData.startDate,
        forecast_date: projectData.forecastDate,
        end_date: projectData.endDate || null,
        status: projectData.status,
        user_id: user.id
      };
      
      if (editingItem?.isNew) {
        const { error } = await supabase.from('projects').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('projects').update(payload).eq('id', projectData.id);
        if (error) throw error;
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
        end_date: taskData.endDate || null,
        status: taskData.status,
        risk_level: taskData.riskLevel,
        updates: taskData.updates,
        objective: taskData.objective,
        progress: taskData.progress || 0
      };

      if (editingItem?.isNew) {
        const { error } = await supabase.from('tasks').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tasks').update(payload).eq('id', taskData.id);
        if (error) throw error;
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
        end_date: subtaskData.endDate || null,
        status: subtaskData.status,
        risk_level: subtaskData.riskLevel,
        updates: subtaskData.updates,
        objective: subtaskData.objective,
        progress: subtaskData.progress || 0
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
      } else if (newProgress > 0) {
        updateData.status = 'IN_PROGRESS';
        updateData.end_date = null;
      } else updateData.end_date = null;

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
      if (newProgress === 100) status = 'COMPLETED';

      const updateData: any = { progress: newProgress, status };
      if (newProgress === 100) updateData.end_date = new Date().toISOString().substring(0, 10);
      else updateData.end_date = null;

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
        <ActivityIndicator size="large" color="#00f0ff" />
      </View>
    );
  }

  const processedProjects = projects.map(p => {
    let status = p.status;
    const targetDate = p.forecastDate;
    if (targetDate && p.status !== 'COMPLETED' && p.status !== 'CANCELED') {
      const isPast = new Date() > new Date(targetDate + 'T23:59:59');
      if (isPast) status = 'LATE';
    }
    
    const tasks = p.tasks.map(t => {
       let tStatus = t.status;
       const tTargetDate = t.forecastDate;
       if (tTargetDate && t.status !== 'COMPLETED' && t.status !== 'CANCELED') {
         const tPast = new Date() > new Date(tTargetDate + 'T23:59:59');
         if (tPast) tStatus = 'LATE';
       }

       const subtasks = t.subtasks.map(st => {
           let stStatus = st.status;
           const stTargetDate = st.forecastDate;
           if (stTargetDate && st.status !== 'COMPLETED' && st.status !== 'CANCELED') {
             const stPast = new Date() > new Date(stTargetDate + 'T23:59:59');
             if (stPast) stStatus = 'LATE';
           }
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
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {activeTab === 'BOARD' && (
            <TouchableOpacity 
              onPress={() => { setActiveTab('GANTT'); setHighlightedTaskId(null); }} 
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Voltar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setActiveTab('GANTT'); setHighlightedTaskId(null); }}>
            <Text style={styles.appName}>Controle de Projetos Adarco</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'GANTT' && (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <Text style={{color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', fontWeight: 'bold', fontSize: 14}}>Timeline:</Text>
            <select 
              style={{ ...webInputDOMStyle, marginBottom: 0, paddingTop: '6px', paddingBottom: '6px', width: 'auto', backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
            >
              {[2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              style={{ ...webInputDOMStyle, marginBottom: 0, paddingTop: '6px', paddingBottom: '6px', width: 'auto', backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
              value={filterWeek}
              onChange={(e) => setFilterWeek(Number(e.target.value))}
            >
              {Array.from({length: 53}).map((_, i) => <option key={i+1} value={i+1}>Semana {i+1}</option>)}
            </select>
          </View>
        )}

        <View style={styles.tabsContainer}>
          {activeTab === 'BOARD' && (
            <TouchableOpacity style={{ paddingHorizontal: 8, paddingVertical: 8, marginRight: 8, borderRadius: 6, borderWidth: 1, borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', justifyContent: 'center', alignItems: 'center' }} onPress={handleExportReport}>
              <Download size={18} color="var(--text-secondary)" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addButton} onPress={() => setEditingItem({ type: 'project', isNew: true })}>
            <Text style={styles.addButtonText}>+ Projeto</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'GANTT' && styles.activeTab]}
            onPress={() => setActiveTab('GANTT')}
          >
            <Text style={[styles.tabText, activeTab === 'GANTT' && styles.activeTabText]}>Timeline View</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'BOARD' && styles.activeTab]}
            onPress={() => setActiveTab('BOARD')}
          >
            <Text style={[styles.tabText, activeTab === 'BOARD' && styles.activeTabText]}>Board View</Text>
          </TouchableOpacity>
          
          <View style={{ position: 'relative', zIndex: 100 }}>
            <TouchableOpacity style={{
              width: 36, height: 36, borderRadius: 18, backgroundColor: '#005B2E', 
              justifyContent: 'center', alignItems: 'center', marginLeft: 16
            }} onPress={() => setProfileMenuOpen(!profileMenuOpen)}>
              <Text style={{color: 'var(--bg-card)', fontWeight: 'bold', fontSize: 16}}>
                {(user?.user_metadata?.full_name?.[0] || user?.user_metadata?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()}
              </Text>
            </TouchableOpacity>
            
            {profileMenuOpen && (
              <View style={{
                position: 'absolute', top: 44, right: 0, width: 180, 
                backgroundColor: 'var(--bg-card)', borderRadius: 8, padding: 8,
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, borderWidth: 1, borderColor: 'var(--border)'
              }}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6, marginBottom: 4 }} onPress={() => { setActiveTab('PROFILE'); setProfileMenuOpen(false); }}>
                  <UserIcon size={16} color="var(--text-secondary)" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: '500' }}>Editar perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6, marginBottom: 4 }} onPress={() => { toggleTheme(); setProfileMenuOpen(false); }}>
                  <Moon size={16} color="var(--text-secondary)" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: '500' }}>{theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6 }} onPress={() => { setActiveTab('ADMIN'); setProfileMenuOpen(false); }}>
                  <Settings size={16} color="var(--text-secondary)" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: '500' }}>Configuração</Text>
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: 'var(--border)', marginVertical: 4 }} />
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6 }} onPress={() => { supabase.auth.signOut(); }}>
                  <LogOut size={16} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, color: '#DC2626', fontWeight: '500' }}>Sair</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={{flex: 1}}>
        {activeTab === 'ADMIN' ? (
          <AdminScreen />
        ) : activeTab === 'PROFILE' ? (
          <ProfileScreen goBack={() => setActiveTab('GANTT')} user={user} />
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

const EditorModal = ({ item, projects, onClose, onSaveProject, onSaveTask, onSaveSubtask, onDeleteProject, onDeleteTask, onDeleteSubtask, onConvertTaskToSubtask, onConvertSubtaskToTask }: any) => {
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
      onSaveProject({ id: data.id, title, department, owner, startDate, forecastDate, endDate, status });
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
        onSaveSubtask(selectedTaskId || data.taskId, { id: data.id, title, startDate, forecastDate, endDate, assignees, riskLevel, updates, objective, status, newHistoryEntry });
      } else {
        onSaveTask(selectedProjectId, { id: data.id, title, startDate, forecastDate, endDate, assignees, riskLevel, updates, objective, status, newHistoryEntry });
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
      <View style={styles.modalContent}>
        <Text style={styles.modalHeader}>{item.isNew ? 'Criar' : 'Editar'} {isProject ? 'Projeto' : isTask ? 'Tarefa' : 'Subtarefa'}</Text>
        
        {errorMessage ? (
          <View style={{backgroundColor: 'var(--danger-bg)', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: 'var(--danger)'}}>
            <Text style={{color: '#B91C1C', fontSize: 13, fontWeight: '500', fontFamily: 'Inter, sans-serif'}}>{errorMessage}</Text>
          </View>
        ) : null}

        <ScrollView style={{maxHeight: Dimensions.get('window').height * 0.7}}>
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
                   onChange={(e) => setStatus(e.target.value)}
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

              <Text style={styles.label}>Status</Text>
              <TouchableOpacity style={{backgroundColor: 'transparent'}}>
                 <select 
                   style={webInputDOMStyle} 
                   value={status} 
                   onChange={(e) => setStatus(e.target.value)}
                 >
                   <option value="NOT_STARTED">NÃO INICIADO</option>
                   <option value="IN_PROGRESS">EM ANDAMENTO</option>
                   <option value="COMPLETED">CONCLUÍDO</option>
                   <option value="CANCELED">CANCELADO</option>
                 </select>
              </TouchableOpacity>

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
            {isProject && (
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Data Término</Text>
                <TouchableOpacity style={{backgroundColor: 'transparent'}}>
                   <input 
                     type="date"
                     style={webInputDOMStyle} 
                     value={endDate} 
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
  // Generate Days Header
  const daysArray = Array.from({ length: TIMELINE_DAYS }).map((_, i) => addDays(timelineStart, i));

  const headerScrollRef = useRef<ScrollView>(null);
  
  const handleBodyScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    headerScrollRef.current?.scrollTo({ x: offsetX, animated: false });
  };

  // Flatten rendering rows so left and right render identically
  type RenderRow = { type: 'project', data: Project } | { type: 'task', data: Task } | { type: 'subtask', data: Subtask, parentTaskId: string };
  const rows: RenderRow[] = [];
  projects.forEach(p => {
    rows.push({ type: 'project', data: p });
    p.tasks.forEach(t => {
      rows.push({ type: 'task', data: t });
      if (t.subtasks && t.subtasks.length > 0) {
        t.subtasks.forEach(st => rows.push({ type: 'subtask', data: st, parentTaskId: t.id }));
      }
    });
  });

  return (
    <ScrollView style={styles.ganttContainer} stickyHeaderIndices={[0]}>
      
      {/* Pinned Headers Container */}
      <View style={styles.ganttHeaderRow}>
        <View style={[styles.leftPanel, styles.tableHeader]}>
          <Text style={[styles.headerCell, { flex: 2 }]}>PROJETO / TAREFA</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>ATRIBUÍDO</Text>
          <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>%</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>INÍCIO</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>PREVISÃO</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>TÉRMINO</Text>
        </View>

        <ScrollView 
          ref={headerScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          scrollEnabled={false} // Only body dictates scrolling
          style={styles.rightPanelHeader}
        >
          {daysArray.map((day, i) => (
            <View key={i} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{format(day, 'dd')}</Text>
              <Text style={styles.daySubText}>{format(day, 'MMM')}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Body Container */}
      <View style={styles.ganttBodyRow}>
        
        {/* Left Panel - Fixed Row Info */}
        <View style={styles.leftPanelBody}>
          {rows.map((row, idx) => {
            if (row.type === 'project') {
              const p = row.data as Project;
              const isLate = p.status === 'LATE';
              return (
                <View key={`lp-${p.id}`} style={[styles.rowBase, styles.projectRow, isLate && { borderLeftWidth: 3, borderLeftColor: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                  <TouchableOpacity style={{ flex: 2, justifyContent: 'center' }} onPress={() => onEditRequest({ type: 'project', isNew: false, projectData: p })}>
                    <Text style={[styles.cellText, styles.projectTitleText]} numberOfLines={1}>{p.title}</Text>
                    {(p.department || p.owner) && (
                      <Text style={{color: 'var(--text-muted)', fontSize: 10, marginTop: 2}} numberOfLines={1}>
                        {[p.department, p.owner].filter(Boolean).join(' • ')}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center' }}>
                     <TouchableOpacity style={styles.iconButton} onPress={() => onEditRequest({ type: 'task', isNew: true, parentProjectId: p.id })}>
                       <Text style={styles.iconButtonText}>+ Add Tarefa</Text>
                     </TouchableOpacity>
                  </View>
                  <View style={{ flex: 0.8, alignItems: 'center' }}>
                    <Text style={styles.projectProgressText}>{p.progress}%</Text>
                  </View>
                  <Text style={[styles.cellText, styles.projectDateText, { flex: 1 }]} numberOfLines={1}>
                    {safeFormatDate(p.startDate)}
                  </Text>
                  <Text style={[styles.cellText, styles.projectDateText, { flex: 1 }]} numberOfLines={1}>
                    {safeFormatDate(p.forecastDate)}
                  </Text>
                  <Text style={[styles.cellText, styles.projectDateText, { flex: 1, color: (p.endDate && p.forecastDate && new Date(p.endDate) > new Date(p.forecastDate)) ? 'var(--danger)' : 'var(--primary)' }]} numberOfLines={1}>
                    {safeFormatDate(p.endDate)}
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
                  <TouchableOpacity style={{ flex: 2, paddingLeft: 24, flexDirection: 'row', alignItems: 'center' }} onPress={() => onTaskPress(task.id)}>
                    <CornerDownRight size={14} color="var(--border)" style={{ marginRight: 6, marginTop: -2 }} />
                    <View style={[styles.inlineRiskDot, { backgroundColor: riskColor }]} />
                    <Text style={[styles.cellText, styles.titleText, { marginRight: 8 }]} numberOfLines={1}>{task.title}</Text>
                    <TouchableOpacity onPress={() => onEditRequest({ type: 'subtask', isNew: true, parentTaskId: task.id })} style={{ padding: 2, backgroundColor: 'var(--bg-card)', borderRadius: 4, borderWidth: 1, borderColor: 'var(--border)' }}>
                      <Text style={{ fontSize: 10, color: 'var(--text-secondary)' }}>+ Sub</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                  <Text style={[styles.cellText, styles.mutedText, { flex: 1.5 }]} numberOfLines={1}>{task.assignees.join(', ')}</Text>
                  
                  <TouchableOpacity style={{ flex: 0.8, alignItems: 'center' }} onPress={() => onUpdateProgress(task.id, task.progress >= 100 ? 0 : task.progress + 25)}>
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressText}>{task.progress}%</Text>
                    </View>
                  </TouchableOpacity>

                  <Text style={[styles.cellText, { flex: 1 }]} numberOfLines={1}>
                    {safeFormatDate(task.startDate)}
                  </Text>
                  <Text style={[styles.cellText, { flex: 1 }]} numberOfLines={1}>
                    {safeFormatDate(task.forecastDate)}
                  </Text>
                  <Text style={[styles.cellText, { flex: 1, color: (task.endDate && task.forecastDate && new Date(task.endDate) > new Date(task.forecastDate)) ? 'var(--danger)' : 'var(--text-muted)' }]} numberOfLines={1}>
                    {safeFormatDate(task.endDate)}
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
                  <TouchableOpacity style={{ flex: 2, paddingLeft: 56, flexDirection: 'row', alignItems: 'center' }} onPress={() => onEditRequest({ type: 'subtask', isNew: false, subtaskData: subtask, parentTaskId })}>
                    <CornerDownRight size={12} color="var(--border)" style={{ marginRight: 6, marginTop: -2 }} />
                    <View style={[styles.inlineRiskDot, { backgroundColor: riskColor, width: 6, height: 6, opacity: 0.7 }]} />
                    <Text style={[styles.cellText, styles.titleText, { fontSize: 12, color: 'var(--text-secondary)' }]} numberOfLines={1}>{subtask.title}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.cellText, styles.mutedText, { flex: 1.5, fontSize: 11 }]} numberOfLines={1}>{subtask.assignees.join(', ')}</Text>
                  
                  <TouchableOpacity style={{ flex: 0.8, alignItems: 'center' }} onPress={() => onUpdateSubtaskProgress(subtask.id, subtask.progress >= 100 ? 0 : subtask.progress + 25)}>
                    <View style={[styles.progressBadge, { paddingHorizontal: 4, paddingVertical: 1 }]}>
                      <Text style={[styles.progressText, { fontSize: 9 }]}>{subtask.progress}%</Text>
                    </View>
                  </TouchableOpacity>

                  <Text style={[styles.cellText, { flex: 1, fontSize: 11, color: 'var(--text-secondary)' }]} numberOfLines={1}>
                    {safeFormatDate(subtask.startDate)}
                  </Text>
                  <Text style={[styles.cellText, { flex: 1, fontSize: 11, color: 'var(--text-secondary)' }]} numberOfLines={1}>
                    {safeFormatDate(subtask.forecastDate)}
                  </Text>
                  <Text style={[styles.cellText, { flex: 1, fontSize: 11, color: (subtask.endDate && subtask.forecastDate && new Date(subtask.endDate) > new Date(subtask.forecastDate)) ? 'var(--danger)' : 'var(--text-muted)' }]} numberOfLines={1}>
                    {safeFormatDate(subtask.endDate)}
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
              const startOffset = Math.max(0, safeDifferenceInDays(data.startDate, timelineStart));
              let duration = 0;
              if (data.forecastDate) {
                 duration = safeDifferenceInDays(data.forecastDate, data.startDate) + 1;
              } else {
                 duration = 3; 
              }
              
              const safeOffset = Math.max(0, startOffset);
              const safeDuration = Math.max(1, duration);

              // Colors based on project vs task and progress
              let blockStyle: any = null;
              
              let isLateItem = false;
              if (row.type === 'project') {
                isLateItem = data.status === 'LATE';
                blockStyle = {
                  backgroundColor: isLateItem ? 'rgba(239, 68, 68, 0.2)' : 'var(--text-secondary)', // Red tint or Slate 700
                  borderColor: isLateItem ? 'var(--danger)' : 'var(--text-secondary)',
                  borderWidth: 1,
                };
              } else {
                isLateItem = data.status === 'LATE';
                let barColor = row.type === 'subtask' ? '#6EE7B7' : '#0BFD71'; // Green fallback (lighter for subtask)
                let areaColor = row.type === 'subtask' ? 'rgba(110, 231, 183, 0.15)' : 'rgba(11, 253, 113, 0.2)';
                let useGradient = true;
                
                if (data.progress === 100) {
                   barColor = 'var(--primary)'; // Solido
                   areaColor = 'rgba(16, 185, 129, 0.2)';
                   useGradient = false;
                } else if (data.progress === 0) {
                   barColor = 'var(--text-muted)'; // Slate (Not Started)
                   areaColor = 'rgba(100, 116, 139, 0.2)';
                   useGradient = false;
                }
                
                if (isLateItem) {
                   areaColor = 'rgba(239, 68, 68, 0.15)'; // Red area for late items
                }

                blockStyle = {
                   areaColor,
                   barColor,
                   useGradient,
                   borderColor: isLateItem ? 'var(--danger)' : 'transparent',
                   borderWidth: isLateItem ? 1 : 0,
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
                     {daysArray.map((_, i) => (
                       <View key={i} style={styles.gridLine} />
                     ))}
                  </View>

                  {/* Task/Project Block */}
                  {startOffset >= 0 && (
                     <View 
                       style={[
                         styles.taskBlockContainer, 
                         { left: safeOffset * DAY_WIDTH, width: safeDuration * DAY_WIDTH },
                         row.type === 'project' ? { top: 8, height: 24 } : {},
                         row.type === 'subtask' ? { top: 12, height: 16 } : {}
                       ]}
                     >
                       {row.type === 'project' ? (
                          <View style={[styles.taskBlockArea, blockStyle]}>
                             <View style={[{ width: `${data.progress}%`, backgroundColor: isLateItem ? 'var(--danger)' : 'var(--text-muted)', height: '100%', opacity: 0.5 }]} />
                          </View>
                       ) : (
                          <View style={[styles.taskBlockArea, { backgroundColor: blockStyle.areaColor, borderColor: blockStyle.borderColor, borderWidth: blockStyle.borderWidth }]}>
                             {blockStyle.useGradient ? (
                               <LinearGradient 
                                  colors={row.type === 'subtask' ? ['#059669', '#047857'] : ['#008744', '#005B2E']} 
                                  start={{x: 0, y: 0}} 
                                  end={{x: 1, y: 0}} 
                                  style={[styles.taskBlockProgress, { width: `${data.progress}%` }]} 
                               />
                             ) : (
                               <View style={[styles.taskBlockProgress, { width: `${data.progress}%`, backgroundColor: blockStyle.barColor }]} />
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
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const columns = [
    { id: 'NOT_STARTED', title: 'NÃO INICIADO', color: 'var(--text-secondary)' },
    { id: 'IN_PROGRESS', title: 'EM ANDAMENTO', color: '#0BFD71' },
    { id: 'COMPLETED', title: 'CONCLUÍDO', color: 'var(--primary)' },
    { id: 'LATE', title: 'ATRASADO', color: 'var(--danger)' },
    { id: 'CANCELED', title: 'CANCELADO', color: '#F97316' } // Orange
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
    <ScrollView horizontal style={styles.boardContainer}>
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id || (col.id === 'IN_PROGRESS' && t.status === 'IN_PROGRESS'));
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
                        { borderLeftWidth: 3, borderLeftColor: riskColor },
                        isHighlighted ? { borderColor: 'var(--primary)', borderWidth: 2, backgroundColor: 'var(--bg-app)', transform: [{scale: 1.02}] } as any : {}
                      ]} 
                      onPress={() => {
                        onEditRequest({ type: 'task', isNew: false, taskData: task, parentProjectId: task.projectId });
                      }}>
                      <Text style={styles.cardProjectTag}>{task.projectName}</Text>
                      <Text style={styles.cardTitle}>{task.title}</Text>
                      <Text style={styles.cardAssignee}>{task.assignees.join(', ')}</Text>
                      {task.updates ? <Text style={styles.cardUpdates} numberOfLines={2}>{task.updates}</Text> : null}
                      <View style={styles.cardFooter}>
                        <Text style={styles.cardDate}>{safeFormatDate(task.startDate, 'dd/MM')} - {safeFormatDate(task.forecastDate, 'dd/MM', 'TBD')}</Text>
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
    height: 48,
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
    padding: 32,
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
    padding: 16,
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
