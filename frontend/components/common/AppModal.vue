<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <!-- Darkened backdrop -->
        <div class="absolute inset-0 bg-black/60" @click="$emit('close')"></div>
        <!-- Centered card -->
        <div
          ref="dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          tabindex="-1"
          class="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-2xl p-6 w-full max-h-[calc(100dvh-2rem)] overflow-y-auto"
          :class="width"
        >
          <!-- Title bar -->
          <div v-if="title || $slots.header" class="flex items-center justify-between mb-4">
            <h3 :id="titleId" class="text-base font-semibold text-[var(--color-text)]">{{ title }}</h3>
            <button
              type="button"
              aria-label="关闭弹窗"
              class="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors p-0.5"
              @click="$emit('close')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <!-- Content slot -->
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  visible: boolean
  title?: string
  width?: string
}>(), {
  width: 'max-w-sm',
})

const emit = defineEmits<{
  close: []
}>()
const dialog = ref<HTMLElement | null>(null)
const titleId = useId()
let previousFocus: HTMLElement | null = null
let previousOverflow = ''
let locked = false
function release() {
  document.removeEventListener('keydown', onKeydown)
  if (!locked) return
  document.body.style.overflow = previousOverflow
  locked = false
  previousFocus?.focus()
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); return }
  if (event.key !== 'Tab' || !dialog.value) return
  const elements = Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el => el.getClientRects().length)
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (!first) { event.preventDefault(); dialog.value.focus(); return }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
watch(() => props.visible, async visible => {
  if (!visible) { release(); return }
  previousFocus = document.activeElement as HTMLElement | null
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  locked = true
  document.addEventListener('keydown', onKeydown)
  await nextTick()
  if (props.visible) dialog.value?.focus()
}, { immediate: true })
onUnmounted(release)
</script>

<style>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}
.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: opacity 200ms ease, transform 200ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  opacity: 0;
  transform: scale(0.95);
}
</style>
