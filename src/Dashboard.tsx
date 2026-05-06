import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';

// Mock Data
const kpiData = {
  total: 42,
  delivered: 18,
  inProgress: 15,
  late: 9
};

const departmentActiveData = [
  { name: 'Tecnologia', value: 12 },
  { name: 'Vendas', value: 8 },
  { name: 'MKT', value: 7 },
  { name: 'CS / Eventos', value: 15 },
];

const departmentDeliveredData = [
  { name: 'Tecnologia', value: 25 },
  { name: 'Vendas', value: 18 },
  { name: 'MKT', value: 12 },
  { name: 'CS / Eventos', value: 10 },
];

const departmentLateData = [
  { name: 'Tecnologia', value: 3 },
  { name: 'Vendas', value: 1 },
  { name: 'MKT', value: 4 },
  { name: 'CS / Eventos', value: 1 },
];

const teamWorkload = [
  { name: 'André Silva', pending: 5, late: 2 },
  { name: 'Beatriz Costa', pending: 3, late: 0 },
  { name: 'Carlos Oliveira', pending: 8, late: 4 },
  { name: 'Daniela Lima', pending: 4, late: 1 },
  { name: 'Eduardo Santos', pending: 6, late: 0 },
];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg font-sans">
        <p className="text-sm font-semibold text-slate-800 mb-1">{label}</p>
        <p className="text-xs text-slate-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color }}></span>
          Quantidade: <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  return (
    <div className="flex-1 w-full bg-slate-50 p-6 overflow-y-auto font-['Montserrat']">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Painel Executivo</h1>
            <p className="text-slate-500 text-sm">Controle de Projetos Adarco - Visão Geral</p>
          </div>
          <div className="flex gap-3">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 shadow-sm">
              <TrendingUp size={14} className="text-emerald-500" />
              <span>Eficiência Operacional: +12%</span>
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
              <h3 className="text-2xl font-bold text-slate-900">{kpiData.total}</h3>
            </div>
          </div>

          {/* Entregues */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.2)] bg-emerald-50/10 flex items-center gap-4 transition-all hover:translate-y-[-2px]">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Entregues</p>
              <h3 className="text-2xl font-bold text-emerald-900">{kpiData.delivered}</h3>
            </div>
          </div>

          {/* Em Progresso */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:translate-y-[-2px]">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Em Progresso</p>
              <h3 className="text-2xl font-bold text-slate-900">{kpiData.inProgress}</h3>
            </div>
          </div>

          {/* Atrasados */}
          <div className="bg-red-500/10 p-5 rounded-2xl border border-red-300 shadow-[0_0_10px_rgba(248,113,113,0.3)] flex items-center gap-4 transition-all hover:translate-y-[-2px]">
            <div className="p-3 bg-red-100 rounded-xl text-red-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Atrasados</p>
              <h3 className="text-2xl font-bold text-red-900">{kpiData.late}</h3>
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
                  <BarChart data={departmentActiveData}>
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
                  <BarChart data={departmentDeliveredData}>
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
                  <BarChart data={departmentLateData}>
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
                {teamWorkload.map((member, i) => (
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
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
