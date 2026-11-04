export interface User {
  id: string;
  googleId?: string | null;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  slackIntegration?: {
    id: string;
    isConnected: boolean;
    teamId?: string | null;
  } | null;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => void;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (email: string, password: string, name?: string) => Promise<void>;
  devLogin: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
