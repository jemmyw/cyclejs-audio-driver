import {StreamAdapter} from '@cycle/base';
import XStreamAdapter from "@cycle/xstream-adapter";
import xs, {Stream, Listener} from 'xstream';
import fromEvent from 'xstream/extra/fromEvent';
import * as R from 'ramda'
import {
  AudioAction, KeyValuePair, AudioEventStream, AudioState, AudioCommand,
  AudioStreamFactory, AudioEvent
} from './interfaces'

const STATE_PROPERTIES:string[] = [
  'currentTime',
  'duration',
  'ended',
  'loop',
  'muted',
  'paused',
  'playbackRate',
  'played',
  'preload',
  'readyState',
  'seekable',
  'seeking',
  'src',
  'volume'
]

const EVENTS = [
  'abort',
  'canplay',
  'canplaythrough',
  'durationchange',
  'emptied',
  'ended',
  'error',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'pause',
  'play',
  'playing',
  'progress',
  'ratechange',
  'seeked',
  'seeking',
  'stalled',
  'suspend',
  'timeupdate',
  'volumechange',
  'waiting'
]

class Sound implements AudioAction {
  private _id:number
  get id():number { return this._id }

  private _audio:HTMLAudioElement
  get audio():HTMLAudioElement { return this._audio }

  constructor(id:number, src:string) {
    this._id = id
    this._audio = createAudio()
    this._audio.autoplay = false
    this._audio.preload = 'auto'
    this._audio.src = src
  }

  state():AudioState {
    const audio = this._audio
    const state = R.fromPairs<any>(
      R.map<string, KeyValuePair<string, any>>(property =>
        [property, R.prop(property, audio)],
        STATE_PROPERTIES
      )
    ) as AudioState
    state.id = this.id
    return state
  }

  setCurrentTime(v:number) { this._audio.currentTime = v }
  setLoop(v:boolean) { this._audio.loop = v }
  setMuted(v:boolean) { this._audio.muted = v }
  setPlaybackRate(v:number) { this._audio.playbackRate = v }
  setVolume(v:number) { this._audio.volume = v }
  pause() { return this._audio.pause() }
  play() { return this._audio.play() }

  unload() {
    this._audio.src = ''
    this._audio = null as any
  }
}

class SoundManager implements AudioAction {
  private _sounds:Array<Sound | null>

  get sounds():Sound[] {
    return this._sounds.filter(Boolean) as Sound[]
  }

  constructor() {
    this._sounds = []
  }

  add(src:string):Sound {
    const id = this._sounds.length
    const sound = new Sound(id, src)
    this._sounds[id] = sound
    return sound
  }

  del(id:number):void {
    const sound = this._sounds[id]
    if (sound) { sound.unload() }
    this._sounds[id] = null
  }

  get(id:number):Sound {
    return this._sounds[id] as Sound
  }

  unload():void {
    for (let sound of this.sounds) {
      sound.unload()
    }

    this._sounds = []
  }

  setCurrentTime(v:number) { for(let sound of this.sounds) { sound.setCurrentTime(v) }}
  setLoop(v:boolean) { for(let sound of this.sounds) { sound.setLoop(v) }}
  setMuted(v:boolean) { for(let sound of this.sounds) { sound.setMuted(v) }}
  setPlaybackRate(v:number) { for (let sound of this.sounds) { sound.setPlaybackRate(v) }}
  setVolume(v:number) { for (let sound of this.sounds) { sound.setVolume(v) }}
  pause() { for (let sound of this.sounds) { sound.pause() }}
  play() { for (let sound of this.sounds) { sound.play() }}
}

function createAudio() {
  return document.createElement('audio')
}

function audioStream(sound:Sound) {
  const id = sound.id

  return xs.merge(...EVENTS.map(event => fromEvent(sound.audio, event)))
    .map(R.assoc('id', id))
    .map(evt => R.assoc('state', sound.state(), evt)) as AudioEventStream
}

function commandAppliesToAction(manager:SoundManager, cmd:AudioCommand):AudioAction {
  if (typeof cmd.id === 'number') { return manager.get(cmd.id) }
  return manager
}

function commandFunction(action:AudioAction, cmd:AudioCommand) {
  return (action as any)[cmd.cmd] as Function
}

class AudioCmdListener implements Listener<AudioCommand> {
  private manager:SoundManager

  constructor(manager:SoundManager) {
    this.manager = manager
  }

  next(cmd:AudioCommand) {
    const action:AudioAction = commandAppliesToAction(this.manager, cmd)
    if (!action) { return }

    const fn = commandFunction(action, cmd)
    if (!fn) { return }

    fn.call(action, cmd.data)
  }

  complete() {
    this.manager.unload()
  }

  error(err:any) {

  }
}

class AudioSource implements AudioStreamFactory {
  private manager:SoundManager
  private runSA:StreamAdapter

  constructor(manager:SoundManager, runSA:StreamAdapter) {
    this.manager = manager
    this.runSA = runSA
  }

  sound(src:string) {
    const manager = this.manager
    const sound = manager.add(src)
    const id = sound.id
    const innerStream = audioStream(sound)

    const producer = {
      start: function(l:Listener<AudioEvent>) {
        this.l = l
        innerStream.addListener(l)
      },
      stop: function() {
        innerStream.removeListener(this.l)
        manager.del(sound.id)
      }
    }

    const stream = xs.create(producer)
    const adaptedStream = this.runSA.adapt(stream, XStreamAdapter.streamSubscribe) as AudioEventStream

    adaptedStream.id = id
    adaptedStream.play = R.always({id, cmd: 'play'})
    adaptedStream.pause = R.always({id, cmd: 'pause'})
    adaptedStream.setCurrentTime = data => ({id, cmd:'setCurrentTime', data})
    adaptedStream.setLoop = data => ({id, cmd:'setLoop', data})
    adaptedStream.setMuted = data => ({id, cmd:'setMuted', data})
    adaptedStream.setPlaybackRate = data => ({id, cmd:'setPlaybackRate', data})
    adaptedStream.setVolume = data => ({id, cmd:'setVolume', data})

    return adaptedStream
  }
}

export function audioDriver(sink$: Stream<AudioCommand>, runSA:StreamAdapter):AudioStreamFactory {
  const manager = new SoundManager()
  const cmdListener = new AudioCmdListener(manager)
  sink$.addListener(cmdListener)

  return new AudioSource(manager, runSA)
}

function makeAudioDriver() {
  return audioDriver
}

export {makeAudioDriver}