import { Stream } from 'xstream';
export interface AudioCommand {
    id?: number;
    cmd: string;
    data?: boolean | number;
}
export interface AudioEvent extends Event {
    id: number;
}
export interface AudioEventStream extends Stream<AudioEvent>, AudioAction {
    id: number;
}
export interface KeyValuePair<K, V> extends Array<K | V> {
    0: K;
    1: V;
}
export interface AudioState {
    id: number;
    currentTime: number;
    duration: number;
    ended: boolean;
    loop: boolean;
    muted: boolean;
    paused: boolean;
    playbackRate: number;
    played: boolean;
    preload: string;
    readyState: number;
    seekable: boolean;
    seeking: boolean;
    src: string;
    volume: number;
}
export interface AudioAction {
    setCurrentTime: (v: number) => void;
    setLoop: (v: boolean) => void;
    setMuted: (v: boolean) => void;
    setPlaybackRate: (v: number) => void;
    setVolume: (v: number) => void;
    pause: () => void;
    play: () => void;
}
export interface AudioStreamFactory {
    sound: (src: string) => any;
}
