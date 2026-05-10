import type { Directive, DirectiveBinding } from "vue";
import { useUserStore } from "../stores/user";

function checkPermission(
  el: HTMLElement,
  binding: DirectiveBinding<string | string[]>,
) {
  const userStore = useUserStore();
  const value = binding.value;

  if (!value) return;

  let hasPermission: boolean;

  if (Array.isArray(value)) {
    hasPermission = userStore.hasAnyButtonPermission(value);
  } else {
    hasPermission = userStore.hasButtonPermission(value);
  }

  if (!hasPermission) {
    el.style.display = "none";
  } else {
    el.style.display = "";
  }
}

export const vPermission: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    checkPermission(el, binding);
  },
  updated(el, binding) {
    checkPermission(el, binding);
  },
};
