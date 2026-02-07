<template>
  <div id="neko-lite" @mousemove="onMouseMove">
    <template v-if="!$client.supported">
      <neko-unsupported />
    </template>

    <template v-else>
      <div class="viewport">
        <neko-video ref="video" :hideControls="true" :extraControls="false" />

        <transition name="toolbar-fade">
          <div
            v-show="toolbarVisible && connected"
            class="toolbar"
            :class="{ hidden: !toolbarShown }"
            @mousemove.stop
          >
            <button
              class="btn"
              :class="{ active: hosting || controlling }"
              :disabled="controlLocked"
              title="Control"
              @click.stop.prevent="toggleControl"
            >
              <i class="fas fa-computer-mouse" />
            </button>

            <button class="btn" :disabled="!hosting" title="Clipboard" @click.stop.prevent="openClipboard">
              <i class="fas fa-clipboard" />
            </button>

            <button class="btn" :disabled="!admin" title="Resolution" @click.stop.prevent="openResolution">
              <i class="fas fa-desktop" />
            </button>

            <div class="dropdown">
              <button class="btn" title="Settings" @click.stop.prevent="toggleSettings">
                <i class="fas fa-gear" />
              </button>
              <transition name="dropdown-fade">
                <div v-if="settingsOpen" class="dropdown-panel" @click.stop>
                  <neko-settings />
                </div>
              </transition>
            </div>

            <button class="btn" title="Fullscreen" @click.stop.prevent="fullscreen">
              <i class="fas fa-expand" />
            </button>
          </div>
        </transition>

        <neko-resolution ref="resolution" v-if="admin" />
        <neko-clipboard ref="clipboard" v-if="hosting" />
      </div>

      <neko-connect v-if="!connected" />
    </template>
  </div>
</template>

<script lang="ts">
  import { Component, Ref, Vue } from 'vue-property-decorator'

  import Video from '~/components/video.vue'
  import Connect from '~/components/connect.vue'
  import Unsupported from '~/components/unsupported.vue'
  import Clipboard from '~/components/clipboard.vue'
  import Resolution from '~/components/resolution.vue'
  import Settings from '~/components/settings.vue'

  @Component({
    name: 'neko-lite',
    components: {
      'neko-video': Video,
      'neko-connect': Connect,
      'neko-unsupported': Unsupported,
      'neko-clipboard': Clipboard,
      'neko-resolution': Resolution,
      'neko-settings': Settings,
    },
  })
  export default class extends Vue {
    @Ref('video') readonly video!: Video
    @Ref('clipboard') readonly clipboard!: Clipboard
    @Ref('resolution') readonly resolution!: Resolution

    private toolbarShown = true
    private toolbarTimer?: number
    private settingsOpen = false

    get connected() {
      return this.$accessor.connected
    }

    get admin() {
      return this.$accessor.user.admin
    }

    get hosting() {
      return this.$accessor.remote.hosting
    }

    get controlling() {
      return this.$accessor.remote.controlling
    }

    get controlLocked() {
      return 'control' in this.$accessor.locked && this.$accessor.locked['control'] && !this.$accessor.user.admin
    }

    get toolbarVisible() {
      // still render the toolbar container only after connection
      return true
    }

    mounted() {
      this.resetToolbarTimer()
      window.addEventListener('keydown', this.onKeyDown)
      document.addEventListener('click', this.onGlobalClick)
    }

    beforeDestroy() {
      window.removeEventListener('keydown', this.onKeyDown)
      document.removeEventListener('click', this.onGlobalClick)
      if (this.toolbarTimer) {
        clearTimeout(this.toolbarTimer)
        this.toolbarTimer = undefined
      }
    }

    onMouseMove() {
      this.toolbarShown = true
      this.resetToolbarTimer()
    }

    resetToolbarTimer() {
      if (this.toolbarTimer) {
        clearTimeout(this.toolbarTimer)
      }
      this.toolbarTimer = window.setTimeout(() => {
        this.toolbarShown = false
        this.settingsOpen = false
      }, 3000)
    }

    onGlobalClick() {
      this.settingsOpen = false
    }

    onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        this.settingsOpen = false
      }
    }

    toggleControl() {
      this.$accessor.remote.toggle()
    }

    openClipboard() {
      if (!this.hosting) return
      this.clipboard?.open()
    }

    openResolution(e: MouseEvent) {
      if (!this.admin) return
      this.resolution?.open(e)
    }

    toggleSettings() {
      this.settingsOpen = !this.settingsOpen
    }

    fullscreen() {
      this.video?.requestFullscreen()
    }
  }
</script>

<style lang="scss">
  #neko-lite {
    position: absolute;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
    overflow: hidden;
    font-family: inherit;
  }

  #neko-lite .viewport {
    position: absolute;
    inset: 0;
  }

  #neko-lite .toolbar {
    position: absolute;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 999px;
    background: rgba(10, 10, 10, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.35);
    transition: opacity 180ms ease, transform 180ms ease;
  }

  #neko-lite .toolbar.hidden {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
    pointer-events: none;
  }

  #neko-lite .toolbar .btn {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 150ms ease, transform 150ms ease, opacity 150ms ease;
  }

  #neko-lite .toolbar .btn:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
  }

  #neko-lite .toolbar .btn:disabled {
    opacity: 0.35;
    cursor: default;
    transform: none;
  }

  #neko-lite .toolbar .btn.active {
    background: rgba(88, 101, 242, 0.35);
    border-color: rgba(88, 101, 242, 0.45);
  }

  #neko-lite .dropdown {
    position: relative;
  }

  #neko-lite .dropdown-panel {
    position: absolute;
    left: 50%;
    bottom: 56px;
    transform: translateX(-50%);
    min-width: 320px;
    max-width: min(92vw, 380px);
    background: rgba(20, 20, 20, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
    padding: 10px;
  }

  .toolbar-fade-enter-active,
  .toolbar-fade-leave-active {
    transition: opacity 160ms ease;
  }

  .toolbar-fade-enter,
  .toolbar-fade-leave-to {
    opacity: 0;
  }

  .dropdown-fade-enter-active,
  .dropdown-fade-leave-active {
    transition: opacity 120ms ease, transform 120ms ease;
  }

  .dropdown-fade-enter,
  .dropdown-fade-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(6px);
  }
</style>
