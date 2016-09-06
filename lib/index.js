(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", "@cycle/xstream-adapter", 'xstream', 'xstream/extra/fromEvent', 'ramda'], factory);
    }
})(function (require, exports) {
    "use strict";
    var xstream_adapter_1 = require("@cycle/xstream-adapter");
    var xstream_1 = require('xstream');
    var fromEvent_1 = require('xstream/extra/fromEvent');
    var ramda_1 = require('ramda');
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
            var state = ramda_1.fromPairs(ramda_1.map(function (property) {
                return [property, ramda_1.prop(property, audio)];
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
            delete this._audio;
        };
        return Sound;
    }());
    var SoundManager = (function () {
        function SoundManager() {
            this.sounds = [];
        }
        SoundManager.prototype.add = function (src) {
            var id = this.sounds.length;
            var sound = new Sound(id, src);
            this.sounds[id] = sound;
            return sound;
        };
        SoundManager.prototype.del = function (id) {
            var sound = this.sounds[id];
            sound.unload();
            delete this.sounds[id];
        };
        SoundManager.prototype.get = function (id) {
            return this.sounds[id];
        };
        SoundManager.prototype.unload = function () {
            for (var _i = 0, _a = this.sounds; _i < _a.length; _i++) {
                var sound = _a[_i];
                sound.unload();
            }
            this.sounds = [];
        };
        return SoundManager;
    }());
    function createAudio() {
        return document.createElement('audio');
    }
    function audioStream(sound) {
        var id = sound.id;
        var stream$ = xstream_1.default.merge.apply(xstream_1.default, EVENTS.map(function (event) { return fromEvent_1.default(sound.audio, event); }))
            .map(ramda_1.assoc('id', id))
            .map(function (evt) { return ramda_1.assoc('state', sound.state(), evt); });
        stream$.id = id;
        stream$.play = ramda_1.always({ id: id, cmd: 'play' });
        stream$.pause = ramda_1.always({ id: id, cmd: 'pause' });
        stream$.setCurrentTime = function (data) { return ({ id: id, cmd: 'setCurrentTime', data: data }); };
        stream$.setLoop = function (data) { return ({ id: id, cmd: 'setLoop', data: data }); };
        stream$.setMuted = function (data) { return ({ id: id, cmd: 'setMuted', data: data }); };
        stream$.setPlaybackRate = function (data) { return ({ id: id, cmd: 'setPlaybackRate', data: data }); };
        stream$.setVolume = function (data) { return ({ id: id, cmd: 'setVolume', data: data }); };
        return stream$;
    }
    var AudioCmdListener = (function () {
        function AudioCmdListener(manager) {
            this.manager = manager;
        }
        AudioCmdListener.prototype.next = function (cmd) {
            var sound = this.manager.get(cmd.id);
            var fn = sound[cmd.cmd];
            if (cmd.data) {
                fn.call(sound, cmd.data);
            }
            else {
                fn.call(sound);
            }
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
            var sound = this.manager.add(src);
            var stream = audioStream(sound);
            return this.runSA.adapt(stream, xstream_adapter_1.default.streamSubscribe);
        };
        return AudioSource;
    }());
    function audioDriver(sink$, runSA) {
        var manager = new SoundManager();
        var cmdListener = new AudioCmdListener(manager);
        sink$.addListener(cmdListener);
        return new AudioSource(manager, runSA);
    }
    function makeAudioDriver() {
        return audioDriver;
    }
    exports.makeAudioDriver = makeAudioDriver;
});
