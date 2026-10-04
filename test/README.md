# Regression tests

From the repository root:

```sh
npm --prefix test ci --ignore-scripts
npm test
```

The test package is intentionally separate from the published package. Its
exact development dependencies and lockfile avoid installing an arbitrary
React Native version from the package's wildcard peer dependency. A root
`npm install` alone does not install the test dependencies. Node.js 18 or newer
is recommended for this development-only harness; no consumer engine or peer
requirements are changed.

The tests transpile the real `index.js` with Babel and mount it using React
16.14 and `react-test-renderer`. Only the React Native host views, PanResponder
boundary, animation methods, and timers are mocked. They check:

- First-render responder availability, stable handlers, and prop updates
- Native-driver timing and spring configuration on the same scale value
- Default/custom delay, scale and movement boundaries
- Cancelled gestures, repeated taps, and animation interruption
- Retention of pooled events for delayed callbacks
- Unmount cancellation of every pending callback and active animation
- Wrapper structure, style precedence, children, and forwarded props
- The README usage example's imports, rendering, styles, and forwarded props

These tests do not run an iOS or Android native UI or measure frame rates.
Native-device validation should also exercise quick taps, dragging outside the
press area, responder cancellation, prop changes, and navigation/unmounting
during the release delay. Both press-in and reset animate only the scale
transform with the native driver; gestures remain normal JS PanResponder
callbacks rather than native-driven `Animated.event` mappings.
