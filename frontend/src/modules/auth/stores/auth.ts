import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

const TOKEN_KEY = 'opendata-token';

/** 演示账号 admin 绑定的邮箱；接入账号中心后由真实用户档案替换。 */
const MOCK_BOUND_EMAIL = 'admin@opendata.com';

/** 本地模拟的一次性重置验证码，与登录页演示码一致。 */
const RESET_DEMO_CODE = '123456';

/** 记住的登录凭证（本地模拟）：勾选“记住我”后持久化账号与密码，退出后仍可回显。生产环境建议改用刷新令牌等更安全方案。 */
const REMEMBERED_KEY = 'opendata-remembered';

interface RememberedCredential {
  username: string;
  password: string;
}

function readRemembered(): RememberedCredential | null {
  try {
    const raw = localStorage.getItem(REMEMBERED_KEY);
    return raw ? (JSON.parse(raw) as RememberedCredential) : null;
  } catch {
    return null;
  }
}

interface CurrentUser {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

/** 演示用当前用户；接入用户中心后由其响应替换此值。 */
function mockCurrentUser(): CurrentUser {
  return { id: 'u-admin', username: 'admin', name: '管理员', avatarUrl: null };
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(
    localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''
  );
  const isAuthenticated = computed(() => Boolean(token.value));
  const currentUser = ref<CurrentUser | null>(token.value ? mockCurrentUser() : null);

  /** 账号自身锁定（如多次密码错误）的状态；管理员冻结属于另一类，不在此处自动解冻。 */
  const accountLocked = ref(false);

  /** 记住的登录凭证（账号 + 密码）；退出登录不清空，登录页据此回显。 */
  const rememberedCredential = ref<RememberedCredential | null>(readRemembered());

  async function login(username: string, password: string, remember: boolean) {
    await new Promise((resolve) => window.setTimeout(resolve, 420));

    if (username !== 'admin' || password !== 'admin') {
      throw new Error('用户名或密码错误');
    }

    token.value = `mock-token-${Date.now()}`;
    currentUser.value = mockCurrentUser();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token.value);
    if (remember) {
      localStorage.setItem(REMEMBERED_KEY, JSON.stringify({ username, password }));
    } else {
      localStorage.removeItem(REMEMBERED_KEY);
    }
  }

  async function loginEmail(email: string, remember: boolean) {
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    token.value = `mock-token-${Date.now()}`;
    currentUser.value = { ...mockCurrentUser(), username: email };
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token.value);
  }

  /** 申请发送重置验证码（本地模拟：无真实邮件，仅作流程占位）。 */
  async function sendResetCode(email: string) {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    if (!email) throw new Error('邮箱不能为空');
  }

  /**
   * 重置密码（本地模拟）：成功后若该账号处于自身锁定状态则自动解锁，
   * 用户即可用新密码登录；管理员主动冻结的账号不在此自动解冻。
   */
  async function resetPassword(email: string) {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    if (email !== MOCK_BOUND_EMAIL) throw new Error('邮箱未绑定账号');
    accountLocked.value = false;
  }

  function logout() {
    token.value = '';
    currentUser.value = null;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  return {
    token,
    isAuthenticated,
    currentUser,
    accountLocked,
    rememberedCredential,
    boundEmail: MOCK_BOUND_EMAIL,
    resetCode: RESET_DEMO_CODE,
    login,
    loginEmail,
    sendResetCode,
    resetPassword,
    logout,
  };
});
