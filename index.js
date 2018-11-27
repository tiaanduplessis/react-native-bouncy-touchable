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

    componentWillMount () {
      this.panResponder = PanResponder.create({
        onStartShouldSetPanResponder: truty,
        onStartShouldSetPanResponderCapture: truty,
        onMoveShouldSetPanResponder: truty,
        onMoveShouldSetPanResponderCapture: truty,
        onPanResponderTerminationRequest: truty,
        onPanResponderTerminate: noop,
        onPanResponderGrant: () => {
          Animated.timing(
            this.state.scale,
            {
              toValue: this.props.scale,
              friction: 1,
              duration: 200
            }
          ).start()
        },

        onPanResponderRelease: (evt, gestureState) => {
          const { moveSlop, delay, onPress } = this.props

          const isOutOfRange = gestureState.dy > moveSlop || gestureState.dy < (-moveSlop) || gestureState.dx > moveSlop || gestureState.dx < (-moveSlop)

          if (!isOutOfRange) {
            setTimeout(() => {
              Animated.spring(
                this.state.scale,
                {
                  toValue: 1,
                  friction: 1,
                  duration: 200
                }
              ).start()

              onPress(evt)
            }, delay)
          }
        }
      })
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
