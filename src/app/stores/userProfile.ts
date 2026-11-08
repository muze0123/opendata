import { ref } from 'vue';
import { defineStore } from 'pinia';

export interface UserCenterProfile {
  displayName: string;
  avatarUrl: string | null;
}

export const useUserProfileStore = defineStore('user-profile', () => {
  // 本地演示数据；接入用户中心后由其响应替换此值。
  // 与用户管理的主管理员（张明）保持一致，避免外壳与成员列表出现两套演示账号。
  const profile = ref<UserCenterProfile>({ displayName: '张明', avatarUrl: null });

  function setUserCenterProfile(next: UserCenterProfile) {
    profile.value = next;
  }

  return { profile, setUserCenterProfile };
});
