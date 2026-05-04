import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export default function AdminScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!fullName || !email || !role || !phone) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          role,
          phone,
          password: '123456' // senha padrão
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }
      setMessage('Usuário criado com sucesso!');
      setFullName('');
      setEmail('');
      setRole('');
      setPhone('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'var(--bg-app)' }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Painel Admin - Criar Usuário</Text>
      
      <View style={styles.card}>
        <Text style={styles.description}>
          Preencha os dados abaixo para gerar um novo acesso. A senha padrão do usuário será 123456. Ele deverá trocá-la no primeiro acesso.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.successText}>{message}</Text> : null}

        <Text style={styles.label}>Nome Completo</Text>
        <TextInput 
          style={styles.input}
          value={fullName}
          onChange={(e) => setFullName(e.nativeEvent.text)}
        />

        <Text style={styles.label}>E-mail</Text>
        <TextInput 
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.nativeEvent.text)}
        />

        <Text style={styles.label}>Cargo</Text>
        <TextInput 
          style={styles.input}
          value={role}
          onChange={(e) => setRole(e.nativeEvent.text)}
        />

        <Text style={styles.label}>Telefone</Text>
        <TextInput 
          style={styles.input}
          keyboardType="phone-pad"
          value={phone}
          onChange={(e) => setPhone(e.nativeEvent.text)}
        />

        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gerar Acesso</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'var(--bg-app)'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'var(--text-main)',
    marginBottom: 24,
  },
  card: {
    width: 500,
    maxWidth: '100%',
    backgroundColor: 'var(--bg-card)',
    padding: 32,
    borderRadius: 8,
    boxShadow: '0 4px 6px -1px var(--glass-border)',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'var(--border)',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    outlineStyle: 'none' as any,
  },
  button: {
    backgroundColor: 'var(--text-main)',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'var(--bg-card)',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: '#DC2626',
    backgroundColor: 'var(--danger-bg)',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  successText: {
    color: '#059669',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  }
});
