import Vue from 'vue'
import EventEmitter from 'eventemitter3'
import { BaseClient, BaseEvents } from './base'
import { Member } from './types'
import { EVENT } from './events'
import { accessor } from '~/store'

import {
  SystemMessagePayload,
  MemberListPayload,
  MemberDisconnectPayload,
  MemberPayload,
  ControlPayload,
  ControlTargetPayload,
  ControlClipboardPayload,
  ScreenConfigurationsPayload,
  ScreenResolutionPayload,
  AdminTargetPayload,
  AdminLockMessage,
  SystemInitPayload,
  AdminLockResource,
} from './messages'

interface NekoEvents extends BaseEvents {}

export class NekoClient extends BaseClient implements EventEmitter<NekoEvents> {
  private $vue!: Vue
  private $accessor!: typeof accessor
  private url!: string

  init(vue: Vue) {
    const url =
      process.env.NODE_ENV === 'development'
        ? `ws://${location.host.split(':')[0]}:${process.env.VUE_APP_SERVER_PORT}/ws`
        : location.protocol.replace(/^http/, 'ws') + '//' + location.host + location.pathname.replace(/\/$/, '') + '/ws'

    this.initWithURL(vue, url)
  }

  initWithURL(vue: Vue, url: string) {
    this.$vue = vue
    this.$accessor = vue.$accessor
    this.url = url
    // convert ws url to http url
    this.$vue.$http.defaults.baseURL = url.replace(/^ws/, 'http').replace(/\/ws$/, '')
  }

  private cleanup() {
    this.$accessor.setConnected(false)
    this.$accessor.remote.reset()
    this.$accessor.user.reset()
    this.$accessor.video.reset()
  }

  login(password: string, displayname: string) {
    this.connect(this.url, password, displayname)
  }

  logout() {
    this.disconnect()
    this.cleanup()
    console.warn('[neko-lite] logged out')
  }

  /////////////////////////////
  // Internal Events
  /////////////////////////////
  protected [EVENT.RECONNECTING]() {
    console.warn('[neko-lite] reconnecting…')
  }

  protected [EVENT.CONNECTING]() {
    this.$accessor.setConnnecting()
  }

  protected [EVENT.CONNECTED]() {
    this.$accessor.user.setMember(this.id)
    this.$accessor.setConnected(true)
  }

  protected [EVENT.DISCONNECTED](reason?: Error) {
    this.cleanup()
    if (reason) {
      console.warn('[neko-lite] disconnected:', reason.message)
    } else {
      console.warn('[neko-lite] disconnected')
    }
  }

  protected [EVENT.TRACK](event: RTCTrackEvent) {
    const { track, streams } = event
    if (track.kind === 'audio') {
      return
    }

    this.$accessor.video.addTrack([track, streams[0]])
    this.$accessor.video.setStream(0)
  }

  protected [EVENT.DATA]() {}

  /////////////////////////////
  // System Events
  /////////////////////////////
  protected [EVENT.SYSTEM.INIT]({ implicit_hosting, locks, file_transfer, heartbeat_interval }: SystemInitPayload) {
    this.$accessor.remote.setImplicitHosting(implicit_hosting)
    this.$accessor.remote.setFileTransfer(file_transfer)

    for (const resource in locks) {
      this[EVENT.ADMIN.LOCK]({
        event: EVENT.ADMIN.LOCK,
        resource: resource as AdminLockResource,
        id: locks[resource],
      })
    }

    if (heartbeat_interval > 0) {
      if (this._ws_heartbeat) clearInterval(this._ws_heartbeat)
      this._ws_heartbeat = window.setInterval(() => this.sendMessage(EVENT.CLIENT.HEARTBEAT), heartbeat_interval * 1000)
    }
  }

  protected [EVENT.SYSTEM.DISCONNECT]({ message }: SystemMessagePayload) {
    if (message === 'kicked') {
      this.$accessor.logout()
    }

    this.onDisconnected(new Error(message))
    console.warn('[neko-lite] server disconnected:', message)
  }

  protected [EVENT.SYSTEM.ERROR]({ title, message }: SystemMessagePayload) {
    console.warn('[neko-lite] server error:', title, message)
  }

  /////////////////////////////
  // Member Events
  /////////////////////////////
  protected [EVENT.MEMBER.LIST]({ members }: MemberListPayload) {
    this.$accessor.user.setMembers(members)
  }

  protected [EVENT.MEMBER.CONNECTED](member: MemberPayload) {
    this.$accessor.user.addMember(member)
  }

  protected [EVENT.MEMBER.DISCONNECTED]({ id }: MemberDisconnectPayload) {
    this.$accessor.user.delMember(id)
  }

  /////////////////////////////
  // Control Events
  /////////////////////////////
  protected [EVENT.CONTROL.LOCKED]({ id }: ControlPayload) {
    this.$accessor.remote.setHost(id)
    this.$accessor.remote.changeKeyboard()
  }

  protected [EVENT.CONTROL.RELEASE]({ id }: ControlPayload) {
    this.$accessor.remote.reset()
  }

  protected [EVENT.CONTROL.REQUEST]({ id }: ControlPayload) {
    // stripped UI: no notifications
  }

  protected [EVENT.CONTROL.REQUESTING]({ id }: ControlPayload) {
    // stripped UI: no notifications
  }

  protected [EVENT.CONTROL.GIVE]({ id, target }: ControlTargetPayload) {
    const member = this.member(target)
    if (!member) {
      return
    }

    this.$accessor.remote.setHost(member)
    this.$accessor.remote.changeKeyboard()
  }

  protected [EVENT.CONTROL.CLIPBOARD]({ text }: ControlClipboardPayload) {
    this.$accessor.remote.setClipboard(text)
  }

  /////////////////////////////
  // Screen Events
  /////////////////////////////
  protected [EVENT.SCREEN.CONFIGURATIONS]({ configurations }: ScreenConfigurationsPayload) {
    this.$accessor.video.setConfigurations(configurations)
  }

  protected [EVENT.SCREEN.RESOLUTION]({ id, width, height, rate }: ScreenResolutionPayload) {
    this.$accessor.video.setResolution({ width, height, rate })
  }

  /////////////////////////////
  // Admin Events
  /////////////////////////////
  protected [EVENT.ADMIN.BAN]({ id, target }: AdminTargetPayload) {
    // stripped UI
  }

  protected [EVENT.ADMIN.KICK]({ id, target }: AdminTargetPayload) {
    // stripped UI
  }

  protected [EVENT.ADMIN.MUTE]({ id, target }: AdminTargetPayload) {
    if (!target) {
      return
    }

    this.$accessor.user.setMuted({ id: target, muted: true })
  }

  protected [EVENT.ADMIN.UNMUTE]({ id, target }: AdminTargetPayload) {
    if (!target) {
      return
    }

    this.$accessor.user.setMuted({ id: target, muted: false })
  }

  protected [EVENT.ADMIN.LOCK]({ id, resource }: AdminLockMessage) {
    this.$accessor.setLocked(resource)
  }

  protected [EVENT.ADMIN.UNLOCK]({ id, resource }: AdminLockMessage) {
    this.$accessor.setUnlocked(resource)
  }

  protected [EVENT.ADMIN.CONTROL]({ id, target }: AdminTargetPayload) {
    this.$accessor.remote.setHost(id)
    this.$accessor.remote.changeKeyboard()
  }

  protected [EVENT.ADMIN.RELEASE]({ id, target }: AdminTargetPayload) {
    this.$accessor.remote.reset()
  }

  protected [EVENT.ADMIN.GIVE]({ id, target }: AdminTargetPayload) {
    if (!target) {
      return
    }

    const member = this.member(target)
    if (!member) {
      return
    }

    this.$accessor.remote.setHost(member)
    this.$accessor.remote.changeKeyboard()
  }

  // Utilities
  protected member(id: string): Member | undefined {
    return this.$accessor.user.members[id]
  }
}
