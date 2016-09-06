import { StreamAdapter } from '@cycle/base';
import { Stream } from 'xstream';
import { AudioCommand, AudioStreamFactory } from './interfaces';
export declare function audioDriver(sink$: Stream<AudioCommand>, runSA: StreamAdapter): AudioStreamFactory;
export declare function makeAudioDriver(): typeof audioDriver;
