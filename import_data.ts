import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase vars missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const data1 = JSON.parse(fs.readFileSync('./data1.json', 'utf8'));
const data2 = JSON.parse(fs.readFileSync('./data2.json', 'utf8'));

const allData = [...data1, ...data2];

function mapStatus(ptStatus) {
  if (ptStatus === 'Em Andamento') return 'IN_PROGRESS';
  if (ptStatus === 'Concluído') return 'COMPLETED';
  if (ptStatus === 'Não Iniciado') return 'NOT_STARTED';
  return 'NOT_STARTED';
}

function normalizeDate(str) {
  if (!str || str === '-' || str === 'Cancelado' || str === 'Suspenso') return null;
  // If format is DD/MM, guess year as 2026
  if (str.includes('/')) {
     const parts = str.split('/');
     if (parts.length === 2) {
        return `2026-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
     }
  }
  return str; // YYYY-MM-DD
}

async function main() {
  const userId = '7302a7ea-cbc2-4167-b9ed-2bef912392de'; // Heder
  
  let currentProject = null;

  let projCount = 0;
  let taskCount = 0;

  for (const item of allData) {
    if (item.Hierarchy === 'Projeto' || item.Hierarchy === 'Projetos') {
      const { data: proj, error: projErr } = await supabase.from('projects').insert({
        title: item.Title,
        user_id: userId,
        department: item.Assignees?.[0] || 'Geral',
        owner: 'Sistema',
        start_date: normalizeDate(item.Start_Date) || new Date().toISOString().substring(0, 10),
        forecast_date: normalizeDate(item.Forecast_Date) || normalizeDate(item.End_Date) || new Date().toISOString().substring(0, 10),
        end_date: normalizeDate(item.End_Date) || null,
        status: mapStatus(item.Status)
      }).select().single();

      if (projErr) {
        console.error('Erro criar projeto:', item.Title, projErr);
      } else {
        currentProject = proj;
        projCount++;
      }
    } else if ((item.Hierarchy === 'Tarefas' || item.Hierarchy === 'Tarefa') && currentProject) {
      const { data: task, error: taskErr } = await supabase.from('tasks').insert({
        project_id: currentProject.id,
        title: item.Title,
        assignees: item.Assignees || [],
        progress: item.Progress || 0,
        start_date: normalizeDate(item.Start_Date) || new Date().toISOString().substring(0, 10),
        forecast_date: normalizeDate(item.Forecast_Date) || normalizeDate(item.End_Date) || new Date().toISOString().substring(0, 10),
        end_date: normalizeDate(item.End_Date) || null,
        status: mapStatus(item.Status),
        risk_level: 'LOW'
      }).select().single();

      if (taskErr) {
        console.error('Erro criar tarefa:', item.Title, taskErr);
      } else {
        taskCount++;
      }
    }
  }

  console.log(`Sucesso: ${projCount} projetos e ${taskCount} tarefas importados para o usuário logado.`);
}

main();
