import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');

let cachedAccessToken: string | null = null;
const ACCESS_TOKEN_KEY = 'google_calendar_access_token';

export const googleSignIn = async (): Promise<void> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google');
    }
    cachedAccessToken = credential.accessToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, credential.accessToken);
  } catch (error) {
    console.error('Erro no login Google:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export async function createGoogleCalendarEvent(task: {
  title: string;
  startDate: string;
  forecastDate: string;
  objective?: string;
}) {
  const token = await getAccessToken();
  if (!token) return;

  try {
    // Definir as datas no formato ISO que o Google Calendar espera (YYYY-MM-DD ou data/hora completa)
    // Para tarefas de dia inteiro, usamos o formato 'date'
    const event = {
      summary: task.title,
      description: task.objective || 'Tarefa criada pelo Sistema Adarco',
      start: {
        date: task.startDate,
      },
      end: {
        date: task.forecastDate || task.startDate,
      },
      reminders: {
        useDefault: true,
      },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao criar evento no Google Calendar:', errorData);
      throw new Error('Falha ao sincronizar com Google Agenda');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro na API do Google Calendar:', error);
    throw error;
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
});
