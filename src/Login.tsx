import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from './supabase';
import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useTheme } from './theme';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { width: windowWidth } = Dimensions.get('window');
  const isMobile = windowWidth < 768;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados adicionais para o fluxo de redefinição de senha
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.getModifierState && e.getModifierState('CapsLock')) {
          setCapsLockOn(true);
        } else {
          setCapsLockOn(false);
        }
      };
      
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.getModifierState && e.getModifierState('CapsLock')) {
          setCapsLockOn(true);
        } else {
          setCapsLockOn(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, []);

  const submitLogin = async () => {
    if (!email || !password) {
      setError('Preencha email e senha');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (e: any) {
      setError('Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const submitForgotPassword = async () => {
    if (!forgotEmail) {
      setForgotError('Preencha o e-mail');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar solicitação');
      }
      setForgotMessage(data.message || 'Instruções de redefinição de senha enviadas com sucesso!');
      setForgotEmail('');
    } catch (e: any) {
      setForgotError(e.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const gradientColors = theme === 'dark' 
    ? ['#000000', '#022c15', '#000000']
    : ['#002A15', '#004221', '#001a0d'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Decorative Circles Background */}
      <View style={[styles.decorativeCircle, { top: -100, right: -50, width: 300, height: 300, opacity: 0.1 }]} />
      <View style={[styles.decorativeCircle, { bottom: -150, left: -100, width: 400, height: 400, opacity: 0.05 }]} />

      <View style={[styles.contentWrapper, isMobile && { padding: 16, gap: 32 }]}>
        <View style={[styles.leftPanel, isMobile && { alignItems: 'center' }]}>
          <Text style={[styles.welcomeTitle, isMobile && { fontSize: 32, textAlign: 'center' }]}>Bem-vindo de volta.</Text>
          <Text style={[styles.welcomeSubtitle, isMobile && { fontSize: 16, textAlign: 'center' }]}>
            Acesse o sistema de Controle de Projetos Adarco para gerenciar suas tarefas e prazos com eficiência.
          </Text>
        </View>

        <View style={[styles.card, isMobile && { padding: 24, borderRadius: 16 }]}>
          {!isForgotMode ? (
            <>
              <View style={styles.cardHeader}>
                <Text style={[styles.title, isMobile && { fontSize: 24 }]}>Login</Text>
                <Text style={[styles.subtitle, isMobile && { fontSize: 14 }]}>Digite suas credenciais para continuar</Text>
              </View>
              
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail color="var(--text-muted)" size={20} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="seunome@adarco.com.br"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onFocus={(e: any) => e.target.select()}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputWrapper}>
                  <Lock color="var(--text-muted)" size={20} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onFocus={(e: any) => e.target.select()}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 12 }}>
                    {showPassword ? (
                      <EyeOff color="var(--text-muted)" size={20} />
                    ) : (
                      <Eye color="var(--text-muted)" size={20} />
                    )}
                  </TouchableOpacity>
                </View>
                {capsLockOn && (
                  <View style={styles.capsLockWarning}>
                    <AlertTriangle color="var(--warning)" size={14} />
                    <Text style={styles.capsLockText}>Caps Lock ativado</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.forgotPassword} onPress={() => {
                setIsForgotMode(true);
                setForgotError('');
                setForgotMessage('');
                setForgotEmail(email || '');
              }}>
                <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={submitLogin} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="var(--text-main)" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>Entrar no Sistema</Text>
                    <ArrowRight color="var(--text-main)" size={20} />
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.cardHeader}>
                <Text style={[styles.title, isMobile && { fontSize: 24 }]}>Recuperar Senha</Text>
                <Text style={[styles.subtitle, isMobile && { fontSize: 13, lineHeight: 18 }]}>
                  Digite seu e-mail corporativo. Apenas usuários administradores podem restaurar o acesso por conta própria.
                </Text>
              </View>
              
              {forgotError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{forgotError}</Text>
                </View>
              ) : null}

              {forgotMessage ? (
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10b981', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>{forgotMessage}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail de Trabalho</Text>
                <View style={styles.inputWrapper}>
                  <Mail color="var(--text-muted)" size={20} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="email@adarco.com.br"
                    placeholderTextColor="#94A3B8"
                    value={forgotEmail}
                    onFocus={(e: any) => e.target.select()}
                    onChangeText={setForgotEmail}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.button} onPress={submitForgotPassword} disabled={forgotLoading}>
                {forgotLoading ? (
                  <ActivityIndicator color="var(--text-main)" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>Enviar Instruções</Text>
                    <ArrowRight color="var(--text-main)" size={20} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={{ alignSelf: 'center', marginTop: 24, padding: 8 }} onPress={() => setIsForgotMode(false)}>
                <Text style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: '600' }}>Voltar para o login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    backgroundColor: 'var(--bg-card)',
    borderRadius: 9999,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    flexWrap: 'wrap',
    gap: 64,
  },
  leftPanel: {
    maxWidth: 400,
    minWidth: 300,
  },
  welcomeTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'var(--bg-card)',
    marginBottom: 16,
    letterSpacing: -1,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#D1FAE5',
    lineHeight: 28,
    opacity: 0.9,
  },
  card: {
    width: 440,
    maxWidth: '100%',
    backgroundColor: 'var(--bg-card)',
    padding: 40,
    borderRadius: 24,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    elevation: 20,
  },
  cardHeader: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'var(--text-main)',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'var(--text-muted)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'var(--border)',
    borderRadius: 12,
    backgroundColor: 'var(--table-header-bg)',
    overflow: 'hidden',
  },
  inputIcon: {
    paddingLeft: 16,
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    color: 'var(--text-main)',
    outlineStyle: 'none' as any,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordText: {
    color: 'var(--primary)',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: 'var(--primary)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: 'var(--text-main)',
    fontWeight: '700',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: 'var(--danger-bg)',
    borderLeftWidth: 4,
    borderLeftColor: 'var(--danger)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    color: 'var(--danger)',
    fontSize: 14,
    fontWeight: '500',
  },
  capsLockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  capsLockText: {
    color: 'var(--warning)',
    fontSize: 12,
    fontWeight: '500',
  }
});
