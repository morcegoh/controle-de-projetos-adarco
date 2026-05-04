import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from './supabase';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { useTheme } from './theme';

export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      <View style={styles.contentWrapper}>
        <View style={styles.leftPanel}>
          <Text style={styles.welcomeTitle}>Bem-vindo de volta.</Text>
          <Text style={styles.welcomeSubtitle}>
            Acesse o sistema de Controle de Projetos Adarco para gerenciar suas tarefas e prazos com eficiência.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Digite suas credenciais para continuar</Text>
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
                onChange={(e) => setEmail(e.nativeEvent.text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper}>
              <Lock color="var(--text-muted)" size={20} style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={password}
                onChange={(e) => setPassword(e.nativeEvent.text)}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
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
    color: '#005B2E',
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
  }
});
