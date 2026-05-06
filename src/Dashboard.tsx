import React, { useMemo, useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Filter,
  X
} from 'lucide-react';
import { useTheme } from './theme';

// Type definitions to match App.tsx
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

interface DashboardProps {
  projects: Project[];
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl font-sans max-w-[300px]">
        <p className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">{label}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].color || payload[0].fill }}></span>
          Total: <span className="font-black text-emerald-500">{payload[0].value}</span>
        </p>
        {payload[0].payload.projects && (
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impactados:</p>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 leading-relaxed italic">
              {payload[0].payload.projects}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ projects }) => {
  const { theme } = useTheme();
  const [selectedDept, setSelectedDept] = useState<string>('TODOS');
  const [modalData, setModalData] = useState<{ title: string; projects: Project[] } | null>(null);

  const isDark = theme === 'dark';
  const chartTextColor = isDark ? '#94A3B8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0';
  
  // Available departments for filter
  const allDepts = useMemo(() => {
    const depts = new Set<string>();
    projects.forEach(p => { if (p.department) depts.add(p.department); });
    return ['TODOS', ...Array.from(depts).sort()];
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (selectedDept === 'TODOS') return projects;
    return projects.filter(p => p.department === selectedDept);
  }, [projects, selectedDept]);

  // Memoized Calculations
  const metrics = useMemo(() => {
    const total = filteredProjects.length;
    const delivered = filteredProjects.filter(p => 
      (p.status === 'COMPLETED' || p.status === 'CONCLUÍDO' || Math.round(p.progress) === 100) &&
      p.status !== 'CANCELED' && 
      p.status !== 'CANCELADO'
    ).length;
    const canceled = filteredProjects.filter(p => p.status === 'CANCELED' || p.status === 'CANCELADO').length;
    const late = filteredProjects.filter(p => 
      (p.status === 'LATE' || p.status === 'EM ATRASO') && 
      Math.round(p.progress) < 100
    ).length;
    
    const inProgress = filteredProjects.filter(p => 
      p.status !== 'COMPLETED' && 
      p.status !== 'CONCLUÍDO' && 
      p.status !== 'CANCELED' && 
      p.status !== 'CANCELADO' && 
      Math.round(p.progress) < 100
    ).length;

    const departments = Array.from(new Set(filteredProjects.map(p => (p.department || 'Sem Depto').trim())));
    
    const activeByDept = departments.map(dept => {
      const deptProjects = filteredProjects.filter(p => 
        (p.department || 'Sem Depto').trim() === dept && 
        p.status !== 'COMPLETED' && 
        p.status !== 'CONCLUÍDO' && 
        p.status !== 'CANCELED' && 
        p.status !== 'CANCELADO' && 
        Math.round(p.progress) < 100
      );
      return {
        name: dept,
        value: deptProjects.length,
        projects: deptProjects.map(p => p.title).join(', ')
      };
    }).sort((a, b) => b.value - a.value);

    const deliveredByDept = departments.map(dept => {
      const deptProjects = filteredProjects.filter(p => 
        (p.department || 'Sem Depto').trim() === dept && 
        (p.status === 'COMPLETED' || p.status === 'CONCLUÍDO' || Math.round(p.progress) === 100) &&
        p.status !== 'CANCELED' &&
        p.status !== 'CANCELADO'
      );
      return {
        name: dept,
        value: deptProjects.length,
        projects: deptProjects.map(p => p.title).join(', ')
      };
    }).sort((a, b) => b.value - a.value);

    const lateByDept = departments.map(dept => {
      const deptProjects = filteredProjects.filter(p => (p.department || 'Sem Depto').trim() === dept && p.status === 'LATE');
      return {
        name: dept,
        value: deptProjects.length,
        projects: deptProjects.map(p => p.title).join(', ')
      };
    }).sort((a, b) => b.value - a.value);

    // Team Workload
    const teamStats: Record<string, { name: string, pending: number, late: number }> = {};
    
    filteredProjects.forEach(p => {
      if (p.status === 'COMPLETED' || p.status === 'CANCELED') return;

      p.tasks.forEach(t => {
        if (t.status !== 'COMPLETED' && t.status !== 'CANCELED') {
          t.assignees.forEach(name => {
            if (!teamStats[name]) teamStats[name] = { name, pending: 0, late: 0 };
            if (t.status === 'LATE') teamStats[name].late++;
            teamStats[name].pending++;
          });
        }

        t.subtasks.forEach(st => {
          if (st.status !== 'COMPLETED' && st.status !== 'CANCELED') {
            st.assignees.forEach(name => {
              if (!teamStats[name]) teamStats[name] = { name, pending: 0, late: 0 };
              if (st.status === 'LATE') teamStats[name].late++;
              teamStats[name].pending++;
            });
          }
        });
      });
    });

    const workload = Object.values(teamStats)
      .filter(member => member.pending > 0)
      .sort((a, b) => b.pending - a.pending);

    const projectHealthData = [
      { name: 'No Prazo', value: total - late, color: '#34d399' },
      { name: 'Em Atraso', value: late, color: '#f87171' }
    ].filter(d => d.value > 0);

    let totalTasks = 0;
    let lateTasks = 0;
    filteredProjects.forEach(p => {
      p.tasks.forEach(t => {
        totalTasks++;
        if (t.status === 'LATE') lateTasks++;
        t.subtasks.forEach(st => {
          totalTasks++;
          if (st.status === 'LATE') lateTasks++;
        });
      });
    });

    const taskHealthData = [
      { name: 'Em Dia', value: totalTasks - lateTasks, color: '#10b981' },
      { name: 'Atrasadas', value: lateTasks, color: '#f43f5e' }
    ].filter(d => d.value > 0);

    return { total, delivered, canceled, inProgress, late, activeByDept, deliveredByDept, lateByDept, workload, projectHealthData, taskHealthData };
  }, [projects, filteredProjects]);

  const efficiency = metrics.total > 0 ? Math.round((metrics.delivered / metrics.total) * 100) : 0;
  const efficiencyColorClasses = useMemo(() => {
    if (efficiency < 16) {
      return isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-100 text-red-600';
    } else if (efficiency <= 70) {
      return isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-600';
    } else {
      return isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600';
    }
  }, [efficiency, isDark]);

  return (
    <div className={`flex-1 w-full p-4 md:p-8 overflow-y-auto font-['Montserrat'] scroll-smooth transition-all duration-700 ${isDark ? 'bg-[#020617]' : 'bg-[#f8fafc]'}`}>
      {/* Dynamic Background Orbs for Glassmorphism depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 animate-pulse ${isDark ? 'bg-emerald-600' : 'bg-emerald-200'}`}></div>
        <div className={`absolute bottom-[-10%] right-[10%] w-[45%] h-[45%] rounded-full blur-[140px] opacity-15 ${isDark ? 'bg-blue-600' : 'bg-blue-200'}`}></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        
        {/* Refined Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4">
          <div className="space-y-2">
            <h1 className={`text-4xl font-[900] tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-930'}`}>
              <div className="w-2 h-10 bg-emerald-500 rounded-full"></div>
              Painel <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600">Estratégico</span>
            </h1>
            <p className={`text-xs font-bold tracking-[0.2em] flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              CONTROLE DE PROJETOS ADARCO – GESTÃO PREMIUM
            </p>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Efficiency Tag */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-3xl shadow-sm transition-all duration-300 ${efficiencyColorClasses}`}>
              <TrendingUp size={12} className="opacity-70" />
              <span className="text-[10px] font-black uppercase tracking-wider">Eficiência: {efficiency}%</span>
            </div>

            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-3xl shadow-2xl transition-all duration-300 hover:shadow-emerald-500/10 ${isDark ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white/80 border-slate-200/60 shadow-slate-200/50'}`}>
              <Filter size={16} className="text-emerald-500" />
              <select 
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className={`text-[10px] font-black bg-transparent border-none focus:ring-0 outline-none cursor-pointer uppercase tracking-[0.15em] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
              >
                {allDepts.map(dept => (
                  <option key={dept} value={dept} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Premium Floating KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Total Card */}
          <div className={`group p-6 rounded-[2rem] border backdrop-blur-xl shadow-2xl flex flex-col justify-between transition-all duration-500 hover:scale-[1.05] hover:shadow-emerald-500/5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/70 border-white/40'}`}>
            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl mb-6 shadow-lg ${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700/50' : 'bg-white text-slate-500 border border-slate-200'}`}>
              <Briefcase size={20} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Volume Total</p>
              <h3 className={`text-4xl font-[900] ${isDark ? 'text-white' : 'text-slate-900'}`}>{metrics.total}</h3>
            </div>
          </div>

          {/* Delivered Card - Emerald Glow */}
          <div 
            onClick={() => setModalData({ 
              title: "Projetos Entregues", 
              projects: filteredProjects.filter(p => 
                (p.status === 'COMPLETED' || p.status === 'CONCLUÍDO' || Math.round(p.progress) === 100) &&
                p.status !== 'CANCELED' &&
                p.status !== 'CANCELADO'
              ) 
            })}
            className={`group p-6 rounded-[2rem] border backdrop-blur-xl shadow-2xl flex flex-col justify-between transition-all duration-500 hover:scale-[1.05] hover:shadow-emerald-500/20 cursor-pointer ${
              isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50/80 border-emerald-200/50'
            }`}
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl mb-6 shadow-emerald-500/20 shadow-lg transition-transform group-hover:rotate-[10deg] ${isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-500 text-white'}`}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Concluídos</p>
              <h3 className={`text-4xl font-[900] ${isDark ? 'text-emerald-400' : 'text-emerald-900'}`}>{metrics.delivered}</h3>
            </div>
          </div>

          {/* In Progress - Subtle Indigo */}
          <div 
            onClick={() => setModalData({ 
              title: "Projetos em Execução", 
              projects: filteredProjects.filter(p => 
                p.status !== 'COMPLETED' && 
                p.status !== 'CONCLUÍDO' &&
                p.status !== 'LATE' && 
                p.status !== 'EM ATRASO' &&
                p.status !== 'CANCELED' && 
                p.status !== 'CANCELADO' &&
                Math.round(p.progress) < 100
              ) 
            })}
            className={`group p-6 rounded-[2rem] border backdrop-blur-xl shadow-2xl flex flex-col justify-between transition-all duration-500 hover:scale-[1.05] cursor-pointer hover:shadow-emerald-500/5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/70 border-white/40'}`}
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl mb-6 shadow-lg ${isDark ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
              <Clock size={20} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Em Execução</p>
              <h3 className={`text-4xl font-[900] ${isDark ? 'text-white' : 'text-slate-900'}`}>{metrics.inProgress}</h3>
            </div>
          </div>

          {/* Late Card - Red Alert Glow */}
          <div 
            onClick={() => setModalData({ 
              title: "Projetos em Atraso", 
              projects: filteredProjects.filter(p => p.status === 'LATE' && Math.round(p.progress) < 100) 
            })}
            className={`group p-6 rounded-[2rem] border backdrop-blur-xl shadow-2xl flex flex-col justify-between transition-all duration-500 hover:scale-[1.05] hover:shadow-red-500/20 cursor-pointer ${
              isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50/80 border-red-200/50'
            }`}
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl mb-6 shadow-red-500/20 shadow-lg transition-transform group-hover:scale-110 ${isDark ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-500 text-white'}`}>
              <AlertCircle size={20} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 ${isDark ? 'text-red-400' : 'text-red-600'}`}>Críticos</p>
              <h3 className={`text-4xl font-[900] ${isDark ? 'text-red-400' : 'text-red-900'}`}>{metrics.late}</h3>
            </div>
          </div>

          {/* Canceled Card - Amber Alert */}
          <div 
            onClick={() => setModalData({ 
              title: "Projetos Cancelados", 
              projects: filteredProjects.filter(p => 
                p.status === 'CANCELED' || p.status === 'CANCELADO'
              ) 
            })}
            className={`group p-6 rounded-[2rem] border backdrop-blur-xl shadow-2xl flex flex-col justify-between transition-all duration-500 hover:scale-[1.05] cursor-pointer hover:shadow-amber-500/10 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/70 border-white/40'}`}
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl mb-6 shadow-lg ${isDark ? 'bg-slate-800 text-amber-500 border border-slate-700/50' : 'bg-slate-100 text-amber-600 border border-slate-200'}`}>
              <AlertCircle size={20} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Cancelados</p>
              <h3 className={`text-4xl font-[900] ${isDark ? 'text-white' : 'text-slate-900'}`}>{metrics.canceled}</h3>
            </div>
          </div>
        </div>


        {/* Optimized Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Projects Chart */}
          <div className={`p-8 rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl min-h-[420px] transition-all duration-500 hover:shadow-emerald-500/5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-white/60'}`}>
             <h4 className={`text-xs font-black uppercase tracking-[0.35em] mb-10 flex items-center gap-3 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
               Ativos por Unidade
             </h4>
             <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.activeByDept.filter(d => d.value > 0)} layout="vertical" margin={{ top: 5, right: 60, left: 40, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradientGreen" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} opacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ textAnchor: 'start', dx: -120, fontSize: 10, fill: chartTextColor, fontWeight: 800, letterSpacing: 0.5 }}
                      width={120}
                    />
                    <Tooltip 
                      content={<CustomTooltip />} 
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', radius: 10 }} 
                    />
                    <Bar 
                      dataKey="value" 
                      fill="url(#barGradientGreen)" 
                      radius={[0, 12, 12, 0]} 
                      barSize={20}
                      animationDuration={2000}
                      label={{ position: 'right', fill: chartTextColor, fontSize: 10, fontWeight: 900, dx: 10 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Delivery History Chart */}
          <div className={`p-8 rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl min-h-[420px] transition-all duration-500 hover:shadow-emerald-500/5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-white/60'}`}>
             <h4 className={`text-xs font-black uppercase tracking-[0.35em] mb-10 flex items-center gap-3 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.4)]"></div>
               Métricas de Entrega
             </h4>
             <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.deliveredByDept.filter(d => d.value > 0)} margin={{ top: 25, right: 10, left: -20, bottom: 40 }}>
                    <defs>
                      <linearGradient id="barGradientLightGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.1} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: chartTextColor, fontWeight: 800 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: chartTextColor, fontWeight: 600 }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(110,231,183,0.05)', radius: 12 }} />
                    <Bar 
                      dataKey="value" 
                      fill="url(#barGradientLightGreen)" 
                      radius={[12, 12, 0, 0]} 
                      barSize={22}
                      label={{ position: 'top', fill: chartTextColor, fontSize: 10, fontWeight: 900, dy: -10 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Late Projects Chart */}
          <div className={`p-8 rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl min-h-[420px] transition-all duration-500 hover:shadow-red-500/5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-white/60'}`}>
             <h4 className={`text-xs font-black uppercase tracking-[0.35em] mb-10 flex items-center gap-3 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
               <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]"></div>
               Gargalos Atuais
             </h4>
             <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.lateByDept.filter(d => d.value > 0)} layout="vertical" margin={{ top: 5, right: 60, left: 40, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradientRed" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} opacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ textAnchor: 'start', dx: -120, fontSize: 10, fill: chartTextColor, fontWeight: 800 }}
                      width={120}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(239,68,68,0.05)', radius: 10 }} />
                    <Bar 
                      dataKey="value" 
                      fill="url(#barGradientRed)" 
                      radius={[0, 12, 12, 0]} 
                      barSize={20}
                      label={{ position: 'right', fill: chartTextColor, fontSize: 10, fontWeight: 900, dx: 10 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Global Performance Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Project Health Pie */}
          <div className={`p-10 rounded-[3rem] border backdrop-blur-3xl shadow-2xl min-h-[450px] ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-white/60'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] mb-2 flex items-center gap-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              Saúde do Portfólio
            </h4>
            <p className={`text-xl font-[900] mb-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>Compliance de Prazos</p>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                      borderRadius: '24px', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(15px)',
                      padding: '16px'
                    }}
                    itemStyle={{ color: isDark ? '#f8fafc' : '#1e293b', fontSize: '12px', fontWeight: '800' }}
                  />
                  <Pie
                    data={metrics.projectHealthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={105}
                    paddingAngle={10}
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={1800}
                  >
                    {metrics.projectHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                    <LabelList 
                      dataKey="value" 
                      position="inside" 
                      fill="#fff" 
                      fontSize={11} 
                      fontWeight={900}
                      formatter={(val: number) => {
                        const total = metrics.projectHealthData.reduce((acc, curr) => acc + curr.value, 0) || 1;
                        return `${Math.round((val / total) * 100)}%`;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-10 mt-4">
               {metrics.projectHealthData.map((entry, i) => (
                 <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: entry.color }}></div>
                    <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{entry.name}</span>
                 </div>
               ))}
            </div>
          </div>

          {/* Task Execution Pie */}
          <div className={`p-10 rounded-[3rem] border backdrop-blur-3xl shadow-2xl min-h-[450px] ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-white/60'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] mb-2 flex items-center gap-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
              Gestão Ativa
            </h4>
            <p className={`text-xl font-[900] mb-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>Execução Operacional</p>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                      borderRadius: '24px', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(15px)',
                      padding: '16px'
                    }}
                    itemStyle={{ color: isDark ? '#f8fafc' : '#1e293b', fontSize: '12px', fontWeight: '800' }}
                  />
                  <Pie
                    data={metrics.taskHealthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={400}
                    animationDuration={2000}
                  >
                    {metrics.taskHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                    <LabelList 
                      dataKey="value" 
                      position="inside" 
                      fill="#fff" 
                      fontSize={11} 
                      fontWeight={900}
                      formatter={(val: number) => {
                        const total = metrics.taskHealthData.reduce((acc, curr) => acc + curr.value, 0) || 1;
                        return `${Math.round((val / total) * 100)}%`;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-10 mt-4">
               {metrics.taskHealthData.map((entry, i) => (
                 <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: entry.color }}></div>
                    <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{entry.name}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

         {/* Premium Workload Table Section */}
        <div className={`rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl overflow-hidden mb-12 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80 border-white/60'}`}>
          <div className={`p-8 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <h4 className={`text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              Carga de Trabalho da Equipe
            </h4>
            <span className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest ${isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-500'}`}>Cenário Atual</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Responsável</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Pendências</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Integridade</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Demanda</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {metrics.workload.map((member, i) => (
                  <tr key={i} className={`transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm ${isDark ? 'bg-slate-800 text-emerald-400 border-slate-700' : 'bg-white text-emerald-600 border-slate-200'}`}>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className={`text-sm font-bold tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{member.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className={`text-sm font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{member.pending}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {member.late > 0 ? (
                        <div className={`rounded-lg px-4 py-1.5 font-bold border text-[9px] tracking-widest inline-block ${isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-100'}`}>
                          {member.late} EM ATRASO
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider">OK</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        member.pending > 8 ? 'text-red-500' : 
                        member.pending > 4 ? 'text-amber-500' : 
                        'text-emerald-500'
                      }`}>
                         {member.pending > 8 ? 'ALTA' : member.pending > 4 ? 'RAZOÁVEL' : 'BAIXA'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

       {/* Project Selection Modal (Premium Design) */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border backdrop-blur-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/95 border-white/60'}`}>
            <div className={`p-8 border-b flex items-center justify-between ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
              <div>
                <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{modalData.title}</h3>
                <p className={`text-[10px] uppercase font-black tracking-[0.2em] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{modalData.projects.length} Registros Consolidados</p>
              </div>
              <button 
                onClick={() => setModalData(null)}
                className={`p-3 rounded-2xl transition-all active:scale-90 ${isDark ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
              {modalData.projects.length > 0 ? (
                <div className="space-y-3">
                  {modalData.projects.map(project => (
                    <div 
                      key={project.id}
                      className={`p-5 rounded-3xl transition-all duration-300 border flex items-center justify-between group hover:scale-[1.02] ${
                        isDark ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{project.title}</span>
                        <div className="flex items-center gap-3">
                           <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                             {project.department || 'Operacional'}
                           </div>
                           <span className={`text-[10px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>•</span>
                           <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{project.owner}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-xs font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{project.progress}%</span>
                        <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700" 
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="text-slate-300 dark:text-slate-600" size={32} />
                  </div>
                  <p className={`text-sm font-bold tracking-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nenhum registro identificado.</p>
                </div>
              )}
            </div>
            <div className={`p-6 flex justify-end ${isDark ? 'bg-slate-800/30' : 'bg-slate-50/50'}`}>
              <button 
                onClick={() => setModalData(null)}
                className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Encerrar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
