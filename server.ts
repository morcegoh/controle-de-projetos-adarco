import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Setup admin supabase client for server-side auth creation
const supabaseAdmin = process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Mock Database with Project -> Task hierarchy
let mockProjects = [
  {
    id: 'p1',
    title: 'Adarco - Implantação Core',
    startDate: '2026-03-01',
    forecastDate: '2026-05-18',
    tasks: [
      { id: 't1', title: 'CSM / Ouvidoria', assignees: ['CS / EVENTOS'], progress: 25, startDate: '2026-03-20', forecastDate: '2026-04-20', status: 'IN_PROGRESS', riskLevel: 'MEDIUM', updates: 'Aguardando retorno do cliente.' },
      { id: 't2', title: 'Kit NPS', assignees: ['Jessyka', 'Fernando', 'MKT'], progress: 60, startDate: '2026-03-01', forecastDate: '2026-04-25', status: 'IN_PROGRESS', riskLevel: 'LOW', updates: 'Material em produção.' },
      { id: 't3', title: 'E-mail Ouvidoria', assignees: ['Jessyka'], progress: 0, startDate: '2026-04-01', forecastDate: '2026-04-05', status: 'NOT_STARTED', riskLevel: 'LOW', updates: '' },
    ]
  },
  {
    id: 'p2',
    title: 'Estruturação RH e TI',
    startDate: '2026-03-30',
    forecastDate: '2026-05-04',
    tasks: [
      { id: 't4', title: 'Contratação', assignees: ['Jessyka', 'Grazy'], progress: 75, startDate: '2026-04-01', forecastDate: '2026-04-17', status: 'IN_PROGRESS', riskLevel: 'HIGH', updates: 'Falta assinar o contrato final.' },
      { id: 't5', title: 'Acessos Google | R.A', assignees: ['Jessyka'], progress: 100, startDate: '2026-04-13', forecastDate: '2026-04-14', endDate: '2026-04-14', status: 'COMPLETED', riskLevel: 'LOW', updates: 'Acessos criados.' },
      { id: 't6', title: 'Formulário NC', assignees: ['Jessyka', 'Heder'], progress: 50, startDate: '2026-04-01', forecastDate: '2026-04-15', status: 'IN_PROGRESS', riskLevel: 'MEDIUM', updates: 'Draft em revisão.' },
    ]
  },
  {
    id: 'p3',
    title: 'Operação de Suporte',
    startDate: '2026-03-30',
    forecastDate: '2026-04-22',
    tasks: [
      { id: 't7', title: 'Octadesk 24H', assignees: ['24 HORAS'], progress: 100, startDate: '2026-03-30', forecastDate: '2026-04-22', endDate: '2026-04-22', status: 'COMPLETED', riskLevel: 'LOW', updates: 'Configurado com sucesso.' },
      { id: 't8', title: 'Aster', assignees: ['24 HORAS'], progress: 100, startDate: '2026-03-30', forecastDate: '2026-04-17', endDate: '2026-04-20', status: 'COMPLETED', riskLevel: 'LOW', updates: 'Testado.' },
    ]
  }
];

function enrichProject(prj: any) {
  let totalProgress = 0;
  
  if (prj.status === 'CANCELED') {
     return { ...prj, progress: 0, status: 'CANCELED' };
  }
  
  if (prj.tasks && prj.tasks.length > 0) {
    totalProgress = prj.tasks.reduce((sum: number, t: any) => sum + t.progress, 0);
    const avgProgress = Math.round(totalProgress / prj.tasks.length);
    let status = prj.status;
    if (status !== 'CANCELED') {
       if (avgProgress === 100) status = 'COMPLETED';
       else if (avgProgress > 0) status = 'IN_PROGRESS';
       else status = 'NOT_STARTED';
    }
    
    let endDate = prj.endDate;
    if (avgProgress === 100) {
       const endDates = prj.tasks.map((t: any) => t.endDate).filter(Boolean).sort();
       if (endDates.length > 0) endDate = endDates[endDates.length - 1];
    } else {
       endDate = undefined;
    }
    
    return { ...prj, progress: avgProgress, status, endDate };
  }
  
  return { ...prj, progress: 0, status: 'NOT_STARTED', endDate: prj.endDate };
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // -------------------------------------------------------------
  // BOOTSTRAP DEFAULT ADMIN
  // -------------------------------------------------------------
  if (supabaseAdmin) {
    try {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const adminExists = listData?.users?.find(u => u.email === 'heder.santos@adarco.com.br');
      
      if (!adminExists) {
        await supabaseAdmin.auth.admin.createUser({
          email: 'heder.santos@adarco.com.br',
          password: '123456',
          email_confirm: true,
          user_metadata: {
            full_name: 'Heder Santos (Admin)',
            role: 'Admin',
            needs_password_change: true
          }
        });
        console.log("Usuário admin heder.santos@adarco.com.br criado com sucesso.");
      }
    } catch(e) {
      console.error("Falha ao inicializar usuário admin: ", e);
    }
  }

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------
  
  // List Users (Admin Only)
  app.get("/api/admin/users", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "O servidor não foi configurado com SUPABASE_SERVICE_ROLE_KEY." });
    }
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      res.json(data.users);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Create User (Admin Only)
  app.post("/api/admin/users", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "O servidor não foi configurado com SUPABASE_SERVICE_ROLE_KEY." });
    }

    const { email, password, fullName, role, phone } = req.body;

    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
          phone,
          needs_password_change: true
        }
      });

      if (error) throw error;
      res.json(data.user);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Update User (Admin Only)
  app.put("/api/admin/users/:id", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurado." });
    const { fullName, role, phone } = req.body;
    try {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, {
        user_metadata: { full_name: fullName, role, phone }
      });
      if (error) throw error;
      res.json(data.user);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Delete User (Admin Only)
  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurado." });
    try {
      const { data, error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Reset Password (Admin Only)
  app.post("/api/admin/users/:id/reset", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurado." });
    try {
      const newPassword = "udarco" + Math.floor(Math.random() * 1000);
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, {
        password: newPassword,
        user_metadata: { needs_password_change: true }
      });
      if (error) throw error;
      res.json({ newPassword });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/projects", (req, res) => {
    const enriched = mockProjects.map(enrichProject);
    res.json(enriched);
  });

  // Create Project
  app.post("/api/projects", (req, res) => {
    const newProject = {
      id: `p${Date.now()}`,
      title: req.body.title || 'Novo Projeto',
      startDate: req.body.startDate || new Date().toISOString().substring(0, 10),
      forecastDate: req.body.forecastDate || '',
      tasks: []
    };
    mockProjects.push(newProject);
    res.json(enrichProject(newProject));
  });

  // Update Project
  app.put("/api/projects/:id", (req, res) => {
    const projectId = req.params.id;
    const projectIndex = mockProjects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return res.status(404).json({ error: "Project not found" });

    mockProjects[projectIndex] = { ...mockProjects[projectIndex], ...req.body, tasks: mockProjects[projectIndex].tasks };
    
    // If project is canceled, cancel all tasks
    if (req.body.status === 'CANCELED') {
       mockProjects[projectIndex].tasks.forEach(t => {
          t.status = 'CANCELED';
          t.progress = 0;
       });
    }

    res.json(enrichProject(mockProjects[projectIndex]));
  });

  // Delete Project
  app.delete("/api/projects/:id", (req, res) => {
    const projectId = req.params.id;
    mockProjects = mockProjects.filter(p => p.id !== projectId);
    res.json({ success: true });
  });

  // Create Task
  app.post("/api/projects/:id/tasks", (req, res) => {
    const projectId = req.params.id;
    const project = mockProjects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const newTask = {
      id: `t${Date.now()}`,
      title: req.body.title || 'Nova Tarefa',
      assignees: req.body.assignees || [],
      progress: 0,
      startDate: req.body.startDate || new Date().toISOString().substring(0, 10),
      forecastDate: req.body.forecastDate || '',
      status: 'NOT_STARTED',
      endDate: req.body.endDate || undefined,
      riskLevel: req.body.riskLevel || 'LOW',
      updates: req.body.updates || ''
    };

    project.tasks.push(newTask);
    res.json(enrichProject(project));
  });

  // Update Task (Full Update)
  app.put("/api/tasks/:id", (req, res) => {
    let foundTask = null;
    let foundProject = null;

    for (const prj of mockProjects) {
       const taskIndex = prj.tasks.findIndex(t => t.id === req.params.id);
       if (taskIndex !== -1) {
          foundProject = prj;
          
          let oldStatus = prj.tasks[taskIndex].status;
          
          prj.tasks[taskIndex] = { ...prj.tasks[taskIndex], ...req.body };
          foundTask = prj.tasks[taskIndex];
          
          if (!foundTask.history) foundTask.history = [];

          // If body contains a new history entry, push it
          if (req.body.newHistoryEntry) {
             foundTask.history.push({
               ...req.body.newHistoryEntry,
               id: Date.now().toString(),
               date: new Date().toISOString()
             });
          }

          // Handle manual progress update or status update
          if (req.body.status && req.body.status !== oldStatus && !req.body.progress) {
             if (req.body.status === 'COMPLETED') foundTask.progress = 100;
             else if (req.body.status === 'CANCELED') foundTask.progress = 0;
             else if (req.body.status === 'IN_PROGRESS' && foundTask.progress === 0) foundTask.progress = 50;
             else if (req.body.status === 'NOT_STARTED') foundTask.progress = 0;
             else foundTask.status = req.body.status;
          }

          if (foundTask.status === 'CANCELED') {
             // keep it canceled
          } else if (foundTask.progress >= 100) {
             foundTask.progress = 100;
             foundTask.status = 'COMPLETED';
             if (!foundTask.endDate) foundTask.endDate = new Date().toISOString().substring(0, 10);
          } else if (foundTask.progress > 0) {
             foundTask.status = 'IN_PROGRESS';
             foundTask.endDate = undefined;
          } else {
             foundTask.progress = 0;
             foundTask.status = 'NOT_STARTED';
             foundTask.endDate = undefined;
          }
          break;
       }
    }
    if (!foundTask) return res.status(404).json({ error: "Task not found" });
    res.json(enrichProject(foundProject));
  });

  // Delete Task
  app.delete("/api/tasks/:id", (req, res) => {
    for (const prj of mockProjects) {
      const initialLength = prj.tasks.length;
      prj.tasks = prj.tasks.filter(t => t.id !== req.params.id);
      if (prj.tasks.length < initialLength) {
        return res.json(enrichProject(prj));
      }
    }
    res.status(404).json({ error: "Task not found" });
  });
  
  // Patch Task Progress (Existing)
  app.patch("/api/tasks/:id", (req, res) => {
    const taskId = req.params.id;
    const { progress } = req.body;
    
    let foundTask = null;
    let foundProject = null;

    for (const prj of mockProjects) {
      const task = prj.tasks.find(t => t.id === taskId);
      if (task) {
        foundTask = task;
        foundProject = prj;
        break;
      }
    }

    if (!foundTask) return res.status(404).json({ error: "Task not found" });
    
    // Update task progress and infer task status
    if (progress !== undefined) {
      foundTask.progress = progress;
      if (progress >= 100) {
        foundTask.progress = 100;
        foundTask.status = 'COMPLETED';
        // Mock end date if completed today
        foundTask.endDate = new Date().toISOString().substring(0, 10);
      }
      else if (progress > 0) {
        foundTask.status = 'IN_PROGRESS';
        foundTask.endDate = undefined;
      }
      else {
        foundTask.progress = 0;
        foundTask.status = 'NOT_STARTED';
        foundTask.endDate = undefined;
      }
    }
    
    res.json(enrichProject(foundProject));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
