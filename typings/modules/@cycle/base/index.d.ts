// Generated by typings
// Source: node_modules/@cycle/base/lib/index.d.ts
declare module '@cycle/base' {
export interface Observer<T> {
    next: (x: T) => void;
    error: (e: any) => void;
    complete: (c?: T) => void;
}
export interface Subject<T> {
    stream: any;
    observer: Observer<T>;
}
export interface SinkProxies {
    [driverName: string]: Subject<any>;
}
export type DisposeFunction = () => void;
export type StreamSubscribe = <T>(stream: any, observer: Observer<T>) => DisposeFunction | void;
export interface DevToolEnabledSource {
    _isCycleSource: string;
}
export interface StreamAdapter {
    adapt: <T>(originStream: any, originStreamSubscribe: StreamSubscribe) => any;
    remember: <T>(stream: any) => any;
    makeSubject: <T>() => Subject<T>;
    isValidStream: (stream: any) => boolean;
    streamSubscribe: StreamSubscribe;
}
export interface DriverFunction {
    (stream: any, adapter: StreamAdapter, driverName: string): any;
    streamAdapter?: StreamAdapter;
}
export interface DriversDefinition {
    [driverName: string]: DriverFunction;
}
export interface CycleOptions {
    streamAdapter: StreamAdapter;
}
export interface CycleExecution<Sources, Sinks> {
    sources: Sources;
    sinks: Sinks;
    run: () => DisposeFunction;
}
export interface CycleSetup {
    (main: (sources: any) => any, drivers: {
        [name: string]: Function;
    }): CycleExecution<any, any>;
    run: (main: (sources: any) => any, drivers: {
        [name: string]: Function;
    }) => DisposeFunction;
}
function Cycle<Sources, Sinks>(main: (sources: Sources) => Sinks, drivers: {
    [name: string]: Function;
}, options: CycleOptions): CycleExecution<Sources, Sinks>;
export default Cycle;
}
