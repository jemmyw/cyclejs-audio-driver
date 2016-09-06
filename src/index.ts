import {StreamAdapter} from '@cycle/base';
import XStreamAdapter from "@cycle/xstream-adapter";
import xs, {Stream, Listener} from 'xstream';
import fromEvent from 'xstream/extra/fromEvent';
import {always, assoc, fromPairs, prop, map} from 'ramda'

interface AudioCommand {
  id:number
  cmd:string
  data?:boolean|number
}

interface AudioEvent extends Event {
  id:number
}

interface AudioEventStream extends Stream<AudioEvent>, AudioAction {
  id:number
}

interface KeyValuePair<K, V> extends Array<K | V> { 0 : K; 1 : V; }

interface AudioState {
  id:number
  currentTime:number
  duration:number
  ended:boolean
  loop:boolean
  muted:boolean
  paused:boolean
  playbackRate:number
  played:boolean
  preload:string
  readyState:number
  seekable:boolean
  seeking:boolean
  src:string
  volume:number
}

interface AudioAction {
  setCurrentTime:(v:number) => void
  setLoop:(v:boolean) => void
  setMuted:(v:boolean) => void
  setPlaybackRate:(v:number) => void
  setVolume:(v:number) => void
  pause:() => void
  play:() => void
}

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
    const state = fromPairs<any>(
      map<string, KeyValuePair<string, any>>(property =>
        [property, prop(property, audio)],
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
    delete this._audio
  }
}

class SoundManager {
  private sounds:Sound[]

  constructor() {
    this.sounds = []
  }

  add(src:string):Sound {
    const id = this.sounds.length
    const sound = new Sound(id, src)
    this.sounds[id] = sound
    return sound
  }

  del(id:number):void {
    const sound = this.sounds[id]
    sound.unload()
    delete this.sounds[id]
  }

  get(id:number):Sound {
    return this.sounds[id]
  }

  unload():void {
    for (let sound of this.sounds) {
      sound.unload()
    }

    this.sounds = []
  }
}

function createAudio() {
  return document.createElement('audio')
}

function audioStream(sound:Sound) {
  const id = sound.id

  const stream$ = xs.merge(...EVENTS.map(event => fromEvent(sound.audio, event)))
    .map(assoc('id', id))
    .map(evt => assoc('state', sound.state(), evt)) as AudioEventStream

  stream$.id = id
  stream$.play = always({id, cmd: 'play'})
  stream$.pause = always({id, cmd: 'pause'})
  stream$.setCurrentTime = data => ({id, cmd:'setCurrentTime', data})
  stream$.setLoop = data => ({id, cmd:'setLoop', data})
  stream$.setMuted = data => ({id, cmd:'setMuted', data})
  stream$.setPlaybackRate = data => ({id, cmd:'setPlaybackRate', data})
  stream$.setVolume = data => ({id, cmd:'setVolume', data})

  return stream$
}

class AudioCmdListener implements Listener<AudioCommand> {
  private manager:SoundManager

  constructor(manager:SoundManager) {
    this.manager = manager
  }

  next(cmd:AudioCommand) {
    const sound:any = this.manager.get(cmd.id)
    const fn = sound[cmd.cmd] as Function

    if (cmd.data) {
      fn.call(sound, cmd.data)
    } else {
      fn.call(sound)
    }
  }

  complete() {
    this.manager.unload()
  }

  error(err:any) {

  }
}

class AudioSource {
  private manager:SoundManager
  private runSA:StreamAdapter

  constructor(manager:SoundManager, runSA:StreamAdapter) {
    this.manager = manager
    this.runSA = runSA
  }

  sound(src:string) {
    const sound = this.manager.add(src)
    const stream = audioStream(sound)
    return this.runSA.adapt(stream, XStreamAdapter.streamSubscribe)
  }
}

function audioDriver(sink$: Stream<AudioCommand>, runSA:StreamAdapter):AudioSource {
  const manager = new SoundManager()
  const cmdListener = new AudioCmdListener(manager)
  sink$.addListener(cmdListener)

  return new AudioSource(manager, runSA)
}

function makeAudioDriver():Function {
  return audioDriver
}

export {makeAudioDriver}