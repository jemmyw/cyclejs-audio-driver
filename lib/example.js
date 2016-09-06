import xs from 'xstream'
import isolate from '@cycle/isolate'
import {makeDOMDriver, div, button} from '@cycle/dom'
import {makeAudioDriver} from '../lib'
import {run} from '@cycle/xstream-run'
import {propEq, not, merge} from 'ramda'
import '../lib'

function Sound(sources) {
  const play$ = sources.DOM.select('.play')
    .events('click')
  const pause$ = sources.DOM.select('.pause')
    .events('click')

  const sound$ = sources.audio.sound(sources.src)

  const canPlay$ = sound$
    .filter(propEq('type', 'canplay'))
    .mapTo(true)
    .startWith(false)

  const buttonsDOM = canPlay$
    .debug('sound event')
    .map(canPlay => div([
        button('.play', {attrs: {disabled: not(canPlay)}}, 'Play'),
        button('.pause', {attrs: {disabled: not(canPlay)}}, 'Pause')
      ])
    )

  const progressDOM = sound$
    .map(({state}) => div({style: {width: '500px', height: '10px', backgroundColor: '#cecece'}}, [
      div({
        style: {height: '10px', width: ((state.currentTime / state.duration) * 500) + 'px', backgroundColor: '#00FF00'}
      })
    ]))

  const audio = xs.merge(
    play$.map(() => sound$.play()),
    pause$.map(() => sound$.pause())
  )

  const DOM = xs.combine(buttonsDOM, progressDOM)
    .map(([buttons, progress]) => div([
      div('Play example sound'),
      buttons,
      div([progress])
    ]))

  return {DOM, audio}
}

function main(sources) {
  const sound1 = isolate(Sound)(merge(
    sources,
    {src: 'https://freemusicarchive.org/music/download/618840942efe5632cf4bcfeb89e12c9abac86ee9'}
  ))

  const sound2 = isolate(Sound)(merge(
    sources,
    {src: 'https://freemusicarchive.org/music/download/6a27c7ee97db9936d941b69d1ed575ed66f57613'}
  ))

  const DOM = xs.combine(sound1.DOM, sound2.DOM)
    .map(div)

  const audio = xs.merge(sound1.audio, sound2.audio)

  return { DOM, audio }
}

run(main, {
  DOM: makeDOMDriver('#app'),
  audio: makeAudioDriver()
})
