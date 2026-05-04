import express from "express";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const app = express();

app.use(express.json());

// List Users
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

// Create User
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

// Update User
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

// Delete User
app.delete("/api/admin/users/:id", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurado." });
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(req.params.id);
    if (user && user.email === 'heder.santos@adarco.com.br') {
      return res.status(403).json({ error: "O usuário administrador principal não pode ser excluído." });
    }

    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Reset Password
app.post("/api/admin/users/:id/reset", async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurado." });
  try {
    const newPassword = "123456";
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, {
      password: newPassword,
      user_metadata: { needs_password_change: true }
    });
    if (error) throw error;

    console.log(`\n======================================`);
    console.log(`[SIMULAÇÃO DE EMAIL] Enviando e-mail...`);
    console.log(`Para: ${data.user.email}`);
    console.log(`Assunto: Redefinição de Senha - Sistema Adarco`);
    console.log(`Mensagem: Olá, sua senha foi resetada. Sua nova senha de acesso é: 123456. No seu primeiro acesso, será obrigatório realizar a troca da senha para uma de sua preferência.`);
    console.log(`======================================\n`);

    res.json({ newPassword });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default app;
