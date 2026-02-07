import { accessor as neko } from './store'
import { PluginObject } from 'vue'

// Plugins
import Logger from './plugins/log'
import Client from './plugins/neko'
import Axios from './plugins/axios'
import Anime from './plugins/anime'
import { i18n } from './plugins/i18n'

// Components (lite)
import Connect from '~/components/connect.vue'
import Video from '~/components/video.vue'
import Clipboard from '~/components/clipboard.vue'
import Resolution from '~/components/resolution.vue'
import Settings from '~/components/settings.vue'
import Context from '~/components/context.vue'
import Avatar from '~/components/avatar.vue'
import Unsupported from '~/components/unsupported.vue'

// Vue
import Vue from 'vue'
import ToolTip from 'v-tooltip'

Vue.use(ToolTip)

const exportMixin = {
  computed: {
    $accessor() {
      return neko
    },
    $client() {
      return window.$client
    },
  },
}

const plugini18n: PluginObject<undefined> = {
  install(Vue) {
    Vue.prototype.i18n = i18n
    Vue.prototype.$t = i18n.t.bind(i18n)
    Vue.prototype.$te = i18n.te.bind(i18n)
  },
}

function extend(component: any) {
  return component.use(plugini18n).use(Logger).use(Axios).use(Anime).use(Client).extend(exportMixin)
}

export const NekoConnect = extend(Connect)
export const NekoVideo = extend(Video)
export const NekoClipboard = extend(Clipboard)
export const NekoResolution = extend(Resolution)
export const NekoSettings = extend(Settings)
export const NekoContext = extend(Context)
export const NekoAvatar = extend(Avatar)
export const NekoUnsupported = extend(Unsupported)

neko.initialise()
export default neko
