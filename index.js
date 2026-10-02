import React, { Component } from 'react'
import { Animated, PanResponder, View } from 'react-native'
import PropTypes from 'prop-types'

const truty = () => true
const noop = () => {}

class BouncyView extends Component {
  static propTypes = {
    onPress: PropTypes.func,
    scale: PropTypes.number,
    moveSlop: PropTypes.number,
    delay: PropTypes.number
  }

  static defaultProps = {
    onPress: noop,
    scale: 1.1, // Max scale of animation
    moveSlop: 15, // Slop area for press
    delay: 40 // Animation delay in miliseconds
  }

  state = {
    scale: new Animated.Value(1)
  }

  pressTimeouts = new Set()
  isPressed = false

  panResponder = PanResponder.create({
    onStartShouldSetPanResponder: truty,
    onStartShouldSetPanResponderCapture: truty,
    onMoveShouldSetPanResponder: truty,
    onMoveShouldSetPanResponderCapture: truty,
    onPanResponderTerminationRequest: truty,
    onPanResponderTerminate: () => {
      this.isPressed = false
      this.resetScale()
    },
    onPanResponderGrant: () => {
      this.isPressed = true
      Animated.timing(
        this.state.scale,
        {
          toValue: this.props.scale,
          duration: 200,
          useNativeDriver: true
        }
      ).start()
    },

    onPanResponderRelease: (evt, gestureState) => {
      const { moveSlop, delay, onPress } = this.props
      this.isPressed = false

      const isOutOfRange = gestureState.dy > moveSlop || gestureState.dy < (-moveSlop) || gestureState.dx > moveSlop || gestureState.dx < (-moveSlop)

      if (isOutOfRange) {
        this.resetScale()
        return
      }

      // React Native may pool the event before the delayed callback runs.
      if (evt && typeof evt.persist === 'function') evt.persist()

      const timeout = setTimeout(() => {
        this.pressTimeouts.delete(timeout)
        // A completed tap must not interrupt a newer gesture still being held.
        if (!this.isPressed) this.resetScale()
        onPress(evt)
      }, delay)
      this.pressTimeouts.add(timeout)
    }
  })

  resetScale () {
    Animated.spring(
      this.state.scale,
      {
        toValue: 1,
        friction: 1,
        useNativeDriver: true
      }
    ).start()
  }

  componentWillUnmount () {
    this.pressTimeouts.forEach(timeout => clearTimeout(timeout))
    this.pressTimeouts.clear()
    this.state.scale.stopAnimation()
  }

  render () {
    const { scale } = this.state
    const { children, style, ...rest } = this.props

    return (
      <Animated.View
        style={[{
          transform: [
            {
              scale
            }
          ]
        }, style
        ]} {...rest}>

        <View {...this.panResponder.panHandlers}>
          {children}
        </View>
      </Animated.View>
    )
  }
}

export default BouncyView
