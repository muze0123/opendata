import { onUnmounted, ref } from 'vue';

/**
 * 验证码倒计时（获取验证码按钮 60s 冷却）。
 * 仅负责计时与禁用态，发送前的「目标手机号 / 邮箱是否合法」由调用方校验后调用 start()。
 */
export function useCodeSender(seconds = 60) {
  const remaining = ref(0);
  let timer: number | undefined;

  function clear() {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  }

  function start() {
    clear();
    remaining.value = seconds;
    timer = window.setInterval(() => {
      remaining.value -= 1;
      if (remaining.value <= 0) clear();
    }, 1000);
  }

  onUnmounted(clear);

  return { remaining, start };
}
