<script setup>
import { ref } from 'vue'

const emit = defineEmits(['loadIR'])

const irName    = ref(null)
const fileInput = ref(null)

function triggerLoad() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  irName.value = file.name.replace(/\.[^.]+$/, '')
  emit('loadIR', file)
  e.target.value = ''
}

// Allow parent to set the IR name (e.g. when loaded from library)
defineExpose({
  setIRName(name) { irName.value = name }
})
</script>

<template>
  <div class="pedal cabinet">

    <h3>Cabinet</h3>

    <div class="control">
      <div class="cabinet__display">
        <span v-if="irName" class="cabinet__ir-name">{{ irName }}</span>
        <span v-else class="cabinet__ir-empty">No IR loaded</span>
      </div>
    </div>

    <button @click="triggerLoad">
      Load IR
    </button>

    <input
      ref="fileInput"
      type="file"
      accept=".wav"
      style="display: none"
      @change="onFileChange"
    />

  </div>
</template>

<style scoped>
.cabinet__display {
  background: var(--bg-board, #0a0a0a);
  border: 1px solid var(--border, #2a2a2a);
  padding: 8px 10px;
  min-height: 36px;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.cabinet__ir-name {
  font-family: var(--font-ui, 'DM Mono', monospace);
  font-size: 0.65rem;
  color: var(--text-primary, #e8e8e8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.03em;
}

.cabinet__ir-empty {
  font-family: var(--font-ui, 'DM Mono', monospace);
  font-size: 0.62rem;
  color: var(--text-label, #444444);
  font-style: italic;
}
</style>