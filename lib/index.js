"use strict";
var xstream_adapter_1 = require("@cycle/xstream-adapter");
var xstream_1 = require('xstream');
var fromEvent_1 = require('xstream/extra/fromEvent');
var R = require('ramda');
var STATE_PROPERTIES = [
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
];
var EVENTS = [
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
];
var Sound = (function () {
    function Sound(id, src) {
        this._id = id;
        this._audio = createAudio();
        this._audio.autoplay = false;
        this._audio.preload = 'auto';
        this._audio.src = src;
    }
    Object.defineProperty(Sound.prototype, "id", {
        get: function () { return this._id; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Sound.prototype, "audio", {
        get: function () { return this._audio; },
        enumerable: true,
        configurable: true
    });
    Sound.prototype.state = function () {
        var audio = this._audio;
        var state = R.fromPairs(R.map(function (property) {
            return [property, R.prop(property, audio)];
        }, STATE_PROPERTIES));
        state.id = this.id;
        return state;
    };
    Sound.prototype.setCurrentTime = function (v) { this._audio.currentTime = v; };
    Sound.prototype.setLoop = function (v) { this._audio.loop = v; };
    Sound.prototype.setMuted = function (v) { this._audio.muted = v; };
    Sound.prototype.setPlaybackRate = function (v) { this._audio.playbackRate = v; };
    Sound.prototype.setVolume = function (v) { this._audio.volume = v; };
    Sound.prototype.pause = function () { return this._audio.pause(); };
    Sound.prototype.play = function () { return this._audio.play(); };
    Sound.prototype.unload = function () {
        this._audio.src = '';
        this._audio = null;
    };
    return Sound;
}());
var SoundManager = (function () {
    function SoundManager() {
        this._sounds = [];
    }
    Object.defineProperty(SoundManager.prototype, "sounds", {
        get: function () {
            return this._sounds.filter(Boolean);
        },
        enumerable: true,
        configurable: true
    });
    SoundManager.prototype.add = function (src) {
        var id = this._sounds.length;
        var sound = new Sound(id, src);
        this._sounds[id] = sound;
        return sound;
    };
    SoundManager.prototype.del = function (id) {
        var sound = this._sounds[id];
        if (sound) {
            sound.unload();
        }
        this._sounds[id] = null;
    };
    SoundManager.prototype.get = function (id) {
        return this._sounds[id];
    };
    SoundManager.prototype.unload = function () {
        for (var _i = 0, _a = this.sounds; _i < _a.length; _i++) {
            var sound = _a[_i];
            sound.unload();
        }
        this._sounds = [];
    };
    SoundManager.prototype.setCurrentTime = function (v) { for (var _i = 0, _a = this.sounds; _i < _a.length; _i++) {
        var sound = _a[_i];
        sound.setCurrentTime(v);
    } };
    SoundManager.prototype.setLoop = function (v) { for (var _i = 0, _a = this.sounds; _i < _a.length; _i++) {
        var sound = _a[_i];
        sound.setLoop(v);
    } };
    SoundManager.prototype.setMuted = function (v) { for (var _i = 0, _a = this.sounds; _i < _a.length; _i++) {
        var sound = _a[_i];
        sound.setMuted(v);
    } };
    SoundManager.prototype.setPlaybackRate = function (v) { for (var _i = 0, _a = this.sounds; _i < _a.length; _i++) {
        var sound = _a[_i];
        sound.setPlaybackRate(v);
    } };
    SoundManager.prototype.setVolume = function (v) { for (var _i = 0, _a = this.sounds; _i < _a.length; _i++) {
        var sound = _a[_i];
        sound.setVolume(v);
    } };
    SoundManager.prototype.pause = function () { for (var _i = 0, _a = this.sounds; _i < _a.length; _i++) {
        var sound = _a[_i];
        sound.pause();
    } };
    SoundManager.prototype.play = function () { for (var _i = 0, _a = this.sounds; _i < _a.length; _i++) {
        var sound = _a[_i];
        sound.play();
    } };
    return SoundManager;
}());
function createAudio() {
    return document.createElement('audio');
}
function audioStream(sound) {
    var id = sound.id;
    return xstream_1.default.merge.apply(xstream_1.default, EVENTS.map(function (event) { return fromEvent_1.default(sound.audio, event); }))
        .map(R.assoc('id', id))
        .map(function (evt) { return R.assoc('state', sound.state(), evt); });
}
function commandAppliesToAction(manager, cmd) {
    if (typeof cmd.id === 'number') {
        return manager.get(cmd.id);
    }
    return manager;
}
function commandFunction(action, cmd) {
    return action[cmd.cmd];
}
var AudioCmdListener = (function () {
    function AudioCmdListener(manager) {
        this.manager = manager;
    }
    AudioCmdListener.prototype.next = function (cmd) {
        var action = commandAppliesToAction(this.manager, cmd);
        if (!action) {
            return;
        }
        var fn = commandFunction(action, cmd);
        if (!fn) {
            return;
        }
        fn.call(action, cmd.data);
    };
    AudioCmdListener.prototype.complete = function () {
        this.manager.unload();
    };
    AudioCmdListener.prototype.error = function (err) {
    };
    return AudioCmdListener;
}());
var AudioSource = (function () {
    function AudioSource(manager, runSA) {
        this.manager = manager;
        this.runSA = runSA;
    }
    AudioSource.prototype.sound = function (src) {
        var manager = this.manager;
        var sound = manager.add(src);
        var id = sound.id;
        var innerStream = audioStream(sound);
        var producer = {
            start: function (l) {
                this.l = l;
                innerStream.addListener(l);
            },
            stop: function () {
                innerStream.removeListener(this.l);
                manager.del(sound.id);
            }
        };
        var stream = xstream_1.default.create(producer);
        var adaptedStream = this.runSA.adapt(stream, xstream_adapter_1.default.streamSubscribe);
        adaptedStream.id = id;
        adaptedStream.play = R.always({ id: id, cmd: 'play' });
        adaptedStream.pause = R.always({ id: id, cmd: 'pause' });
        adaptedStream.setCurrentTime = function (data) { return ({ id: id, cmd: 'setCurrentTime', data: data }); };
        adaptedStream.setLoop = function (data) { return ({ id: id, cmd: 'setLoop', data: data }); };
        adaptedStream.setMuted = function (data) { return ({ id: id, cmd: 'setMuted', data: data }); };
        adaptedStream.setPlaybackRate = function (data) { return ({ id: id, cmd: 'setPlaybackRate', data: data }); };
        adaptedStream.setVolume = function (data) { return ({ id: id, cmd: 'setVolume', data: data }); };
        return adaptedStream;
    };
    return AudioSource;
}());
function audioDriver(sink$, runSA) {
    var manager = new SoundManager();
    var cmdListener = new AudioCmdListener(manager);
    sink$.addListener(cmdListener);
    return new AudioSource(manager, runSA);
}
exports.audioDriver = audioDriver;
function makeAudioDriver() {
    return audioDriver;
}
exports.makeAudioDriver = makeAudioDriver;
