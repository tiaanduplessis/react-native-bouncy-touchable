const assert = require('assert')
const path = require('path')
const babel = require('@babel/core')
const React = require('react')
const TestRenderer = require('react-test-renderer')

// Exercise the public package entry point using real React rendering. Only the
// React Native host/animation boundary and timers are mocked, without a device.
const source = process.env.BOUNCY_SOURCE || path.join(__dirname, '..', 'index.js')
const { code } = babel.transformFileSync(source, {
  babelrc: false,
  configFile: false,
  plugins: [
    require.resolve('@babel/plugin-transform-modules-commonjs'),
    require.resolve('@babel/plugin-transform-react-jsx')
  ]
})

function setup (props = {}) {
  const animations = []
  const responders = []
  const timers = new Map()
  let nextTimer = 0
  let now = 0

  class Value {
    constructor (value) {
      this.value = value
      this.active = null
      this.stops = 0
    }

    stopAnimation () {
      this.stops++
      if (this.active) this.active.stopped = true
      this.active = null
    }
  }

  function animate (type, value, config) {
    const animation = {
      type,
      value,
      config,
      started: false,
      stopped: false,
      start () {
        if (value.active) value.active.stopped = true
        this.started = true
        value.active = this
      }
    }
    animations.push(animation)
    return animation
  }

  const native = {
    View: 'View',
    Animated: {
      View: 'Animated.View',
      Value,
      timing: (value, config) => animate('timing', value, config),
      spring: (value, config) => animate('spring', value, config)
    },
    PanResponder: {
      create (handlers) {
        responders.push(handlers)
        return {
          panHandlers: {
            onStartShouldSetResponder: handlers.onStartShouldSetPanResponder,
            onStartShouldSetResponderCapture: handlers.onStartShouldSetPanResponderCapture,
            onMoveShouldSetResponder: handlers.onMoveShouldSetPanResponder,
            onMoveShouldSetResponderCapture: handlers.onMoveShouldSetPanResponderCapture,
            onResponderTerminationRequest: handlers.onPanResponderTerminationRequest,
            onResponderGrant: handlers.onPanResponderGrant,
            onResponderRelease: handlers.onPanResponderRelease,
            onResponderTerminate: handlers.onPanResponderTerminate
          }
        }
      }
    }
  }
  const module = { exports: {} }
  const load = new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', code) // eslint-disable-line no-new-func
  load(
    name => name === 'react-native' ? native : require(name),
    module,
    module.exports,
    (callback, delay) => {
      const id = nextTimer++
      timers.set(id, { callback, time: now + delay })
      return id
    },
    id => timers.delete(id)
  )
  const BouncyView = module.exports.default
  const renderer = TestRenderer.create(React.createElement(BouncyView, props))
  const instance = renderer.getInstance()

  return {
    animations,
    responders,
    timers,
    BouncyView,
    renderer,
    instance,
    get handlers () { return renderer.root.findByType('View').props },
    grant () { this.handlers.onResponderGrant() },
    release (event = {}, dx = 0, dy = 0) {
      this.handlers.onResponderRelease(event, { dx, dy })
    },
    tick (milliseconds) {
      const end = now + milliseconds
      while (true) {
        const next = Array.from(timers.entries())
          .filter(([, timer]) => timer.time <= end)
          .sort((a, b) => a[1].time - b[1].time)[0]
        if (!next) break
        const [id, timer] = next
        timers.delete(id)
        now = timer.time
        timer.callback()
      }
      now = end
    },
    update (nextProps) { renderer.update(React.createElement(BouncyView, nextProps)) },
    unmount () { renderer.unmount() }
  }
}

const tests = []
function test (name, run) { tests.push({ name, run }) }

function assertAnimation (animation, type, scale, toValue) {
  assert.strictEqual(animation.type, type)
  assert.strictEqual(animation.value, scale)
  assert.strictEqual(animation.config.toValue, toValue)
  assert.strictEqual(animation.config.useNativeDriver, true)
  assert.strictEqual(animation.started, true)
}

test('creates one responder per instance before the first render without legacy lifecycle methods', () => {
  const app = setup()
  try {
    assert.strictEqual(app.BouncyView.prototype.componentWillMount, undefined)
    assert.strictEqual(app.BouncyView.prototype.UNSAFE_componentWillMount, undefined)
    const fresh = new app.BouncyView(app.BouncyView.defaultProps)
    assert.ok(fresh.panResponder)
    assert.doesNotThrow(() => fresh.render())
    assert.notStrictEqual(fresh.panResponder, app.instance.panResponder)
    const responder = app.instance.panResponder
    const scale = app.instance.state.scale
    app.update({ scale: 1.5 })
    assert.strictEqual(app.responders.length, 2)
    assert.strictEqual(app.instance.panResponder, responder)
    assert.strictEqual(app.instance.state.scale, scale)
  } finally { app.unmount() }
})

test('keeps the wrapper, style precedence, children and forwarded props', () => {
  const style = { backgroundColor: 'red' }
  const child = React.createElement('Text', null, 'Press')
  const app = setup({ style, children: child, testID: 'button', accessibilityLabel: 'Press' })
  try {
    const outer = app.renderer.root.findByType('Animated.View')
    assert.strictEqual(outer.props.style[0].transform[0].scale, app.instance.state.scale)
    assert.strictEqual(outer.props.style[1], style)
    assert.strictEqual(outer.props.testID, 'button')
    assert.strictEqual(outer.props.accessibilityLabel, 'Press')
    assert.strictEqual(app.renderer.root.findByType('Text').props.children, 'Press')
    assert.strictEqual(app.handlers.onResponderTerminationRequest(), true)
    assert.strictEqual(app.handlers.onStartShouldSetResponder(), true)
    assert.strictEqual(app.handlers.onStartShouldSetResponderCapture(), true)
    assert.strictEqual(app.handlers.onMoveShouldSetResponder(), true)
    assert.strictEqual(app.handlers.onMoveShouldSetResponderCapture(), true)
  } finally { app.unmount() }
})

test('uses the native driver for press-in timing and delayed release spring', () => {
  const events = []
  const app = setup({ onPress: event => events.push(event) })
  try {
    const event = { nativeEvent: { target: 7 } }
    app.grant()
    assertAnimation(app.animations[0], 'timing', app.instance.state.scale, 1.1)
    assert.strictEqual(app.animations[0].config.duration, 200)
    app.release(event)
    app.tick(39)
    assert.strictEqual(app.animations.length, 1)
    assert.deepStrictEqual(events, [])
    app.tick(1)
    assertAnimation(app.animations[1], 'spring', app.instance.state.scale, 1)
    assert.strictEqual(app.animations[1].config.friction, 1)
    assert.strictEqual(app.animations[0].stopped, true)
    assert.deepStrictEqual(events, [event])
    assert.strictEqual(app.timers.size, 0)
  } finally { app.unmount() }
})

test('reads updated scale, slop, delay and callback props from stable handlers', () => {
  let initial = 0
  let updated = 0
  const app = setup({ onPress: () => initial++ })
  try {
    const grant = app.handlers.onResponderGrant
    app.update({ scale: 1.4, moveSlop: 30, delay: 80, onPress: () => updated++ })
    assert.strictEqual(app.handlers.onResponderGrant, grant)
    app.grant()
    assertAnimation(app.animations[0], 'timing', app.instance.state.scale, 1.4)
    app.release({}, 20, -20)
    app.tick(79)
    assert.strictEqual(updated, 0)
    app.tick(1)
    assert.strictEqual(updated, 1)
    assert.strictEqual(initial, 0)
  } finally { app.unmount() }
})

for (const [dx, dy] of [[15, 0], [-15, 0], [0, 15], [0, -15]]) {
  test(`accepts the inclusive moveSlop boundary (${dx}, ${dy})`, () => {
    let calls = 0
    const app = setup({ onPress: () => calls++ })
    try {
      app.grant()
      app.release({}, dx, dy)
      app.tick(40)
      assert.strictEqual(calls, 1)
    } finally { app.unmount() }
  })
}

for (const [dx, dy] of [[16, 0], [-16, 0], [0, 16], [0, -16]]) {
  test(`resets an out-of-range gesture (${dx}, ${dy}) without pressing`, () => {
    let calls = 0
    const app = setup({ onPress: () => calls++ })
    try {
      app.grant()
      app.release({}, dx, dy)
      assertAnimation(app.animations[1], 'spring', app.instance.state.scale, 1)
      app.tick(1000)
      assert.strictEqual(calls, 0)
      assert.strictEqual(app.timers.size, 0)
    } finally { app.unmount() }
  })
}

test('resets a terminated gesture and still handles the next tap', () => {
  let calls = 0
  const app = setup({ onPress: () => calls++ })
  try {
    app.grant()
    app.handlers.onResponderTerminate()
    assertAnimation(app.animations[1], 'spring', app.instance.state.scale, 1)
    app.tick(1000)
    assert.strictEqual(calls, 0)
    app.grant()
    assert.strictEqual(app.animations[1].stopped, true)
    app.release()
    app.tick(40)
    assert.strictEqual(calls, 1)
  } finally { app.unmount() }
})

test('persists pooled events before the delayed press callback', () => {
  let received
  let persisted = false
  const event = { nativeEvent: { target: 3 }, persist: () => { persisted = true } }
  const app = setup({ onPress: value => { received = value } })
  try {
    app.grant()
    app.release(event)
    if (!persisted) event.nativeEvent = null
    app.tick(40)
    assert.strictEqual(persisted, true)
    assert.strictEqual(received.nativeEvent.target, 3)
    assert.strictEqual(received, event)
  } finally { app.unmount() }
})

test('keeps every completed quick tap without shrinking a new held gesture', () => {
  const received = []
  const app = setup({ onPress: event => received.push(event) })
  try {
    const first = { tap: 1 }
    const second = { tap: 2 }
    app.grant()
    app.release(first)
    app.tick(10)
    app.grant()
    app.tick(30)
    assert.deepStrictEqual(received, [first])
    assert.strictEqual(app.animations.length, 2)
    app.release(second)
    app.tick(40)
    assert.deepStrictEqual(received, [first, second])
    assertAnimation(app.animations[2], 'spring', app.instance.state.scale, 1)
  } finally { app.unmount() }
})

test('preserves the callback captured for a completed press across prop updates', () => {
  let initial = 0
  let updated = 0
  const app = setup({ onPress: () => initial++ })
  try {
    app.grant()
    app.release()
    app.update({ onPress: () => updated++ })
    app.tick(40)
    assert.strictEqual(initial, 1)
    assert.strictEqual(updated, 0)
  } finally { app.unmount() }
})

test('cancels every pending press and stops animation on unmount', () => {
  let calls = 0
  const app = setup({ onPress: () => calls++ })
  app.grant()
  app.release()
  app.grant()
  app.release()
  assert.strictEqual(app.timers.size, 2)
  app.unmount()
  assert.strictEqual(app.timers.size, 0)
  assert.strictEqual(app.instance.state.scale.stops, 1)
  assert.strictEqual(app.animations[1].stopped, true)
  app.tick(1000)
  assert.strictEqual(calls, 0)
  assert.strictEqual(app.animations.length, 2)
})

test('stops an active release spring when unmounted by onPress', () => {
  let app
  app = setup({ onPress: () => app.unmount() })
  app.grant()
  app.release()
  app.tick(40)
  assert.strictEqual(app.animations[1].stopped, true)
  assert.strictEqual(app.timers.size, 0)
})

test('supports zero delay, zero moveSlop and the default no-op callback', () => {
  const app = setup({ delay: 0, moveSlop: 0, scale: 0.95 })
  try {
    app.grant()
    app.release()
    app.tick(0)
    assertAnimation(app.animations[0], 'timing', app.instance.state.scale, 0.95)
    assertAnimation(app.animations[1], 'spring', app.instance.state.scale, 1)
  } finally { app.unmount() }
})

test('isolates timers and animated values across simultaneous instances', () => {
  const first = setup()
  let calls = 0
  const second = setup({ onPress: () => calls++ })
  try {
    assert.notStrictEqual(first.instance.state.scale, second.instance.state.scale)
    first.grant()
    first.release()
    second.grant()
    second.release()
    first.unmount()
    second.tick(40)
    assert.strictEqual(calls, 1)
    assert.strictEqual(second.instance.state.scale.stops, 0)
  } finally { second.unmount() }
})

let failures = 0
for (const { name, run } of tests) {
  try {
    run()
    console.log(`PASS ${name}`)
  } catch (error) {
    failures++
    console.error(`FAIL ${name}\n${error.stack}`)
  }
}
console.log(`${tests.length - failures}/${tests.length} tests passed (React ${React.version}, mocked React Native)`)
process.exitCode = failures ? 1 : 0
