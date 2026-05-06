import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';

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
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg font-sans">
        <p className="text-sm font-semibold text-slate-800 mb-1">{label}</p>
        <p className="text-xs text-slate-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color || payload[0].fill }}></span>
          Quantidade: <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ projects }) => {
  
  // Memoized Calculations
  const metrics = useMemo(() => {
    const total = projects.length;
    const delivered = projects.filter(p => p.status === 'COMPLETED').length;
    const late = projects.filter(p => p.status === 'LATE').length;
    // Projects that are not completed, late or canceled are "in progress"
    const inProgress = projects.filter(p => p.status !== 'COMPLETED' && p.status !== 'LATE' && p.status !== 'CANCELED').length;

    // Department grouping
    const departments = Array.from(new Set(projects.map(p => p.department || 'Sem Depto')));
    
    const activeByDept = departments.map(dept => ({
      name: dept,
      value: projects.filter(p => p.department === dept && p.status !== 'COMPLETED' && p.status !== 'CANCELED').length
    })).sort((a, b) => b.value - a.value);

    const deliveredByDept = departments.map(dept => ({
      name: dept,
      value: projects.filter(p => p.department === dept && p.status === 'COMPLETED').length
    })).sort((a, b) => b.value - a.value);

    const lateByDept = departments.map(dept => ({
      name: dept,
      value: projects.filter(p => p.department === dept && p.status === 'LATE').length
    })).sort((a, b) => b.value - a.value);

    // Team Workload
    const teamStats: Record<string, { name: string, pending: number, late: number }> = {};
    
    projects.forEach(p => {
      p.tasks.forEach(t => {
        // Task assignees
        t.assignees.forEach(name => {
          if (!teamStats[name]) teamStats[name] = { name, pending: 0, late: 0 };
          if (t.status === 'LATE') teamStats[name].late++;
          else if (t.status !== 'COMPLETED' && t.status !== 'CANCELED') teamStats[name].pending++;
        });

        // Subtask assignees
        t.subtasks.forEach(st => {
          st.assignees.forEach(name => {
            if (!teamStats[name]) teamStats[name] = { name, pending: 0, late: 0 };
            if (st.status === 'LATE') teamStats[name].late++;
            else if (st.status !== 'COMPLETED' && st.status !== 'CANCELED') teamStats[name].pending++;
          });
        });
      });
    });

    const workload = Object.values(teamStats).sort((a, b) => (b.pending + b.late) - (a.pending + a.late));

    return { total, delivered, inProgress, late, activeByDept, deliveredByDept, lateByDept, workload };
  }, [projects]);

  return (
    <div className="flex-1 w-full bg-slate-50 p-6 overflow-y-auto font-['Montserrat']">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Painel Executivo</h1>
            <p className="text-slate-500 text-sm">Controle de Projetos Adarco - Dados Reais do Gantt</p>
          </div>
          <div className="flex gap-3">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 shadow-sm">
              <TrendingUp size={14} className="text-emerald-500" />
              <span>Eficiência: {metrics.total > 0 ? Math.round((metrics.delivered / metrics.total) * 100) : 0}% Global</span>
            </div>
          </div>
        </div>

        {/* Top Row: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:translate-y-[-2px]">
            <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total de Projetos</p>
              <h3 className="text-2xl font-bold text-slate-900">{metrics.total}</h3>
            </div>
          </div>

          {/* Entregues */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.2)] bg-emerald-50/10 flex items-center gap-4 transition-all hover:translate-y-[-2px]">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Entregues</p>
              <h3 className="text-2xl font-bold text-emerald-900">{metrics.delivered}</h3>
            </div>
          </div>

          {/* Em Progresso */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:translate-y-[-2px]">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Em Progresso</p>
              <h3 className="text-2xl font-bold text-slate-900">{metrics.inProgress}</h3>
            </div>
          </div>

          {/* Atrasados */}
          <div className="bg-red-500/10 p-5 rounded-2xl border border-red-300 shadow-[0_0_10px_rgba(248,113,113,0.3)] flex items-center gap-4 transition-all hover:translate-y-[-2px]">
            <div className="p-3 bg-red-100 rounded-xl text-red-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Atrasados</p>
              <h3 className="text-2xl font-bold text-red-900">{metrics.late}</h3>
            </div>
          </div>
        </div>

        {/* Middle Row: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Ativos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[350px]">
             <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
               <span className="w-1.5 h-6 bg-emerald-400 rounded-full"></span>
               Projetos Ativos por Departamento
             </h4>
             <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.activeByDept}>
                    <defs>
                      <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a7f3d0" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.6} />
                      </linearGradient>
                      <filter id="neonShadowGreen" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#34d399" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar 
                      dataKey="value" 
                      fill="url(#barGradientGreen)" 
                      stroke="#34d399" 
                      strokeWidth={1}
                      filter="url(#neonShadowGreen)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Chart 2: Maiores Entregas */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[350px]">
             <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
               <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
               Histórico de Entregas (Sucesso)
             </h4>
             <div className="h-[250px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.deliveredByDept}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar 
                      dataKey="value" 
                      fill="url(#barGradientGreen)" 
                      stroke="#10b981" 
                      strokeWidth={1}
                      filter="url(#neonShadowGreen)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Chart 3: Atrasados por Departamento */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[350px]">
             <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
               <span className="w-1.5 h-6 bg-red-400 rounded-full"></span>
               Inadimplência de Prazos
             </h4>
             <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.lateByDept}>
                    <defs>
                      <linearGradient id="barGradientRed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fecaca" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f87171" stopOpacity={0.5} />
                      </linearGradient>
                      <filter id="neonShadowRed" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f87171" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fff1f2' }} />
                    <Bar 
                      dataKey="value" 
                      fill="url(#barGradientRed)" 
                      stroke="#f87171" 
                      strokeWidth={1}
                      filter="url(#neonShadowRed)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

        </div>

        {/* Bottom Row: Team Workload Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Carga de Trabalho da Equipe
            </h4>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold uppercase tracking-wider">Tempo Real</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nome do Analista</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tarefas Pendentes</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tarefas Atrasadas</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status de Ocupação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.workload.map((member, i) => (
                  <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-white shadow-sm ring-1 ring-slate-100">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{member.pending} tarefas</span>
                    </td>
                    <td className="px-6 py-4">
                      {member.late > 0 ? (
                        <div className="bg-red-500/20 text-red-700 rounded-full px-3 py-1 font-semibold border border-red-200 text-xs inline-block">
                          {member.late} EM ATRASO
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-emerald-500">EM DIA</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-white shadow-sm">
                          <div 
                            className={`h-full rounded-full ${member.pending > 6 ? 'bg-orange-400' : 'bg-emerald-400'}`} 
                            style={{ width: `${Math.min(member.pending * 12, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{Math.min(member.pending * 12, 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {metrics.workload.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                      Nenhum dado de equipe encontrado nos projetos atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
