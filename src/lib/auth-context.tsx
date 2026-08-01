import * as React from 'react';
import { UserAccount } from './auth-data';

// --- Types ---
export interface LoginHistoryEntry {
  phone: string;
  name: string;
  lastLoginTime: number;
}

export interface UserSubscription {
  phone: string;
  plan_code: string;
  plan_name: string;
  price_monthly: number;
  ai_daily_limit: number;
  ai_used_today: number;
  features: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'expired';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserAccount | null;
  loginTime: number | null;
}

// --- Storage Keys ---
const AUTH_STATE_KEY = 'v_auth_state_v1';
const LOGIN_HISTORY_KEY = 'v_login_history_v1';
const MAX_HISTORY_COUNT = 5;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const LOCAL_ACCOUNTS_KEY = 'v_local_accounts_v1';
const DEVICE_MAC_KEY = 'v_device_mac_address';

function getDeviceMacAddress(): string {
  if (typeof window === 'undefined') return 'SERVER';
  
  let mac = localStorage.getItem(DEVICE_MAC_KEY);
  
  if ((window as any).electronHardware) {
    const realMac = (window as any).electronHardware.getMacAddress();
    if (realMac && realMac !== 'UNKNOWN-MAC') {
      if (mac !== realMac) {
        localStorage.setItem(DEVICE_MAC_KEY, realMac);
      }
      return realMac;
    }
  }

  if (mac && (mac.startsWith('HWID-') || mac.startsWith('MAC-WEB-'))) {
    return mac;
  }

  const components = [
    window.screen.width,
    window.screen.height,
    window.screen.colorDepth,
    navigator.hardwareConcurrency,
    (navigator as any).deviceMemory,
    navigator.platform,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  
  const rawString = components.join('|');
  
  let hash = 2166136261;
  for (let i = 0; i < rawString.length; i++) {
    hash ^= rawString.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const stableHash = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const stableMac = `MAC-WEB-${stableHash}`;

  localStorage.setItem(DEVICE_MAC_KEY, stableMac);
  return stableMac;
}

// --- Internal Hook Logic ---
function useAuthImpl() {
  const [authState, setAuthState] = React.useState<AuthState>(() => {
    if (typeof window === 'undefined') return { isAuthenticated: false, user: null, loginTime: null };
    try {
      const stored = localStorage.getItem(AUTH_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthState;
        if (parsed.isAuthenticated) {
          const now = Date.now();
          if (parsed.loginTime && now - parsed.loginTime > SESSION_DURATION_MS) {
            return { isAuthenticated: false, user: null, loginTime: null };
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading auth state', e);
    }
    return { isAuthenticated: false, user: null, loginTime: null };
  });

  const [loginHistory, setLoginHistory] = React.useState<LoginHistoryEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(LOGIN_HISTORY_KEY);
      if (stored) {
        return JSON.parse(stored) as LoginHistoryEntry[];
      }
    } catch (e) {
      console.error('Error reading login history', e);
    }
    return [];
  });

  const [dbStatus, setDbStatus] = React.useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [subscription, setSubscription] = React.useState<UserSubscription | null>(null);

  const refreshSubscription = React.useCallback(async () => {
    if (!authState.user?.phone) return;
    try {
      const res = await fetch(`/api/billing/status?phone=${authState.user.phone}`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (e) {
      console.error('Failed to load subscription status:', e);
    }
  }, [authState.user?.phone]);

  React.useEffect(() => {
    if (authState.isAuthenticated && authState.user?.phone) {
      refreshSubscription();
    } else {
      setSubscription(null);
    }
  }, [authState.isAuthenticated, authState.user?.phone, refreshSubscription]);

  React.useEffect(() => {
    try {
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
    } catch (e) {
      console.error('Error saving auth state', e);
    }
  }, [authState]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(loginHistory));
    } catch (e) {
      console.error('Error saving login history', e);
    }
  }, [loginHistory]);

  const login = React.useCallback(async (phone: string, passwordInput: string, isSmsLogin: boolean = false): Promise<{ success: boolean; message?: string }> => {
    try {
      const macAddress = getDeviceMacAddress();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password: passwordInput, code: passwordInput, isSmsLogin, macAddress })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch(e) {
        throw new Error('返回了非预期数据: ' + text.substring(0, 100));
      }
      
      if (!res.ok && data.error === 'DB not connected') {
        setDbStatus('disconnected');
        try {
           const accountsStr = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
           if (accountsStr) {
             const accounts = JSON.parse(accountsStr);
             const cachedUser = accounts[phone];
             if (cachedUser && cachedUser.password === passwordInput) {
                const now = Date.now();
                setAuthState({
                  isAuthenticated: true,
                  user: cachedUser.userAccount,
                  loginTime: now,
                });
                return { success: true, message: '数据库连接失败，已启用离线缓存模式登录。部分功能可能受限。' };
             }
           }
        } catch (e) {
           console.error('Offline login failed', e);
        }
        return { success: false, message: '数据库连接失败，且未找到此账号的本地缓存信息。' };
      }

      if (!res.ok) {
        setDbStatus('connected');
        return { success: false, message: data.error || '登录失败' };
      }

      setDbStatus('connected');
      const user = data.user;
      let permissions: string[] = [];
      const permissionDetails: Record<string, string> = {
        '范围检索权限': user['范围检索权限'],
        '项目评审权限': user['项目评审权限'],
        '排程权限': user['排程权限'],
        '审核策划权限': user['审核策划权限'],
        'AI引擎配置权限': user['AI引擎配置权限'],
      };

      if (user['范围检索权限'] === '读写' || user['范围检索权限'] === '只读') permissions.push('范围检索权限');
      if (user['项目评审权限'] === '读写' || user['项目评审权限'] === '只读') permissions.push('项目评审权限');
      if (user['排程权限'] === '读写' || user['排程权限'] === '只读') permissions.push('排程权限');
      if (user['审核策划权限'] === '读写' || user['审核策划权限'] === '只读') permissions.push('审核策划权限');
      if (user['AI引擎配置权限'] === '读写' || user['AI引擎配置权限'] === '只读') permissions.push('AI引擎配置权限');

      const account: UserAccount = {
        id: user['序号']?.toString() || Date.now().toString(),
        name: user['姓名'],
        phone: user['手机号'],
        permissions: permissions,
        permissionDetails: permissionDetails,
      };

      try {
        const accountsStr = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
        const accounts = accountsStr ? JSON.parse(accountsStr) : {};
        accounts[phone] = { password: passwordInput, userAccount: account };
        localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
      } catch (e) {
        console.error('Failed to cache user offline', e);
      }

      const now = Date.now();
      setAuthState({
        isAuthenticated: true,
        user: account,
        loginTime: now,
      });

      setLoginHistory(prev => {
        const filtered = prev.filter(entry => entry.phone !== phone);
        const newHistory = [{ phone: account.phone, name: account.name, lastLoginTime: now }, ...filtered];
        return newHistory.slice(0, MAX_HISTORY_COUNT);
      });

      return { success: true };
    } catch (err: any) {
      console.error('Login error detailed:', err);
      return { success: false, message: err.message || '网络错误，无法连接到服务器' };
    }
  }, []);

  const logout = React.useCallback(() => {
    setAuthState({ isAuthenticated: false, user: null, loginTime: null });
  }, []);

  React.useEffect(() => {
    if (!authState.isAuthenticated) return;

    const intervalId = setInterval(() => {
       if (authState.loginTime) {
           const now = Date.now();
           if (now - authState.loginTime > SESSION_DURATION_MS) {
               logout();
               alert("登录信息已过期，请重新登录。");
           }
       }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [authState.isAuthenticated, authState.loginTime, logout]);

  return {
    authState,
    loginHistory,
    login,
    logout,
    dbStatus,
    subscription,
    refreshSubscription
  };
}

// --- Context ---
type AuthContextType = ReturnType<typeof useAuthImpl>;

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthImpl();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
