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

// Forgot Password - Apenas para usuários administradores
app.post("/api/auth/forgot-password", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "O servidor não foi configurado com SUPABASE_SERVICE_ROLE_KEY." });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail é obrigatório." });
  }

  try {
    // 1. Listar usuários cadastrados no Supabase Auth para verificar o e-mail informado
    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const usersList = (data?.users || []) as any[];
    const user = usersList.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      return res.status(404).json({ error: "Este e-mail não pertence a nenhum usuário cadastrado no sistema." });
    }

    // 2. Verificar se o usuário possui cargo ou e-mail de administrador
    const userRole = (user.user_metadata?.role || '').toLowerCase();
    const isAdmin = 
      userRole.includes('admin') || 
      userRole.includes('administrador') || 
      user.email?.toLowerCase() === 'heder.santos@adarco.com.br';

    if (!isAdmin) {
      return res.status(403).json({ 
        error: "Seu perfil não possui permissão para redefinir a própria senha diretamente. Por favor, procure um administrador do sistema." 
      });
    }

    // 3. Usuário é administrador. Disparar o fluxo oficial de redefinição de senha do Supabase
    const targetOrigin = req.headers.origin || "http://localhost:3000";
    const redirectTo = `${targetOrigin}/?recovery=true`;

    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectTo
    });

    if (resetError) throw resetError;

    // Gerar um link administrativo de contingência que é impresso no console do servidor
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email.trim(),
        options: { redirectTo }
      });
      if (!linkError && linkData?.properties?.action_link) {
        console.log(`\n======================================`);
        console.log(`[CONTINGÊNCIA ADMIN] Link de recuperação gerado para ${email}:`);
        console.log(linkData.properties.action_link);
        console.log(`======================================\n`);
      }
    } catch (e) {
      // Falha silenciosa no link de contingência se houver algum erro de permissão interno
    }

    res.json({ 
      success: true, 
      message: "Instruções de redefinição de senha enviadas com sucesso no seu e-mail cadastrado no Supabase!" 
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default app;
