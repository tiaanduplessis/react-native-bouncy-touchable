<div align="center">
  <img src="example.gif" width="30%">
</div>

# react-native-bouncy-touchable
[![package version](https://img.shields.io/npm/v/react-native-bouncy-touchable.svg?style=flat-square)](https://npmjs.org/package/react-native-bouncy-touchable)
[![package downloads](https://img.shields.io/npm/dm/react-native-bouncy-touchable.svg?style=flat-square)](https://npmjs.org/package/react-native-bouncy-touchable)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/react-native-bouncy-touchable.svg?style=flat-square)](https://npmjs.org/package/react-native-bouncy-touchable)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> A bouncing touchable animated view

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Credits](#credits)
- [Contribute](#contribute)
- [License](#License)

## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com). 

```sh
$ npm install react-native-bouncy-touchable
$ # OR
$ yarn add react-native-bouncy-touchable
```

## Usage

```js
export default class Button extends Component {

    render () {
      return (
            <BouncyView 
                delay={60} // Animation delay in miliseconds
                scale={1.1} // Max scale of animation
                style={styles.button} 
                onPress={this.props.onPress}
            >
              <Text style={styles.buttonText}>
                {this.props.children}
              </Text>
            </BouncyView>
      )
    }
  }
```

## Props

Name         | Type       | Description                                      | Default |
-------------|------------|--------------------------------------------------|---------|
**onPress**  | *function* | Handler to be called when the user taps the view | noop    |
**delay**    | *number*   | The animation delay in milliseconds              | 40      |
**scale**    | *number*   | The max scale of animation                       | 1.1     |
**moveSlop** | *number*   | The size of the slop area for press              | 40      |
**style**    | *object*   | The view style                                   | none    |

## Credits

Heavily based on [react-native-bounceable](https://github.com/slavik0329/react-native-bounceable)

## Contribute

1. Fork it and create your feature branch: `git checkout -b my-new-feature`
2. Commit your changes: `git commit -am "Add some feature"`
3. Push to the branch: `git push origin my-new-feature`
4. Submit a pull request

## License

MIT
    