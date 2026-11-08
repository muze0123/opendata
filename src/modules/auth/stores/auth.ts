import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

const TOKEN_KEY = 'opendata-token';

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

  async function login(username: string, password: string, remember: boolean) {
    await new Promise((resolve) => window.setTimeout(resolve, 420));

    if (username !== 'admin' || password !== 'admin') {
      throw new Error('用户名或密码错误');
    }

    token.value = `mock-token-${Date.now()}`;
    currentUser.value = mockCurrentUser();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token.value);
  }

  async function loginEmail(email: string, remember: boolean) {
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    token.value = `mock-token-${Date.now()}`;
    currentUser.value = { ...mockCurrentUser(), username: email };
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token.value);
  }

  function logout() {
    token.value = '';
    currentUser.value = null;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  return { token, isAuthenticated, currentUser, login, loginEmail, logout };
});
