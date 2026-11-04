export interface User {
  id: string;
  googleId: string;
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
  devLogin: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

