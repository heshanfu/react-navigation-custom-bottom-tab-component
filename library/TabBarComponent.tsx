import * as React from 'react';
import { StyleSheet, Animated, TouchableWithoutFeedback, SafeAreaView, Easing, ViewStyle } from 'react-native';
import { screenWidth } from './Layout';
import { BackgroundContainer } from './components';

enum PressTypes {
  IN = 'in',
  OUT = 'out',
}

export interface OverwriteProps {
  activeTintColor?: string;
  inactiveTintColor?: string;
  allowFontScaling?: boolean;
  labelStyle?: any;
  adaptive?: boolean;
  style?: ViewStyle;
  backgroundViewStyle?: ViewStyle;
  tintColor?: string;
  onPressInScale?: number;
  onPressOutScale?: number;
}

interface TabBarComponentProps {
  allowFontScaling?: boolean;
  defaultFlexValue: number;
  activeFlexValue: number;
  navigation: {
    state: {
      routes: any[];
      index: number;
    };
  };
  onTabPress: ({ route }: { route: any }) => void;
  renderIcon?: any;
  getLabelText: (props: { route: any }) => any;
}

type Props = OverwriteProps & TabBarComponentProps;

const tabBarHeight = 49;
const duration = 200;

class TabBarComponent extends React.Component<Props> {
  static defaultProps = {
    onPressInScale: 1.3,
    onPressOutScale: 1,
    allowFontScaling: true,
    defaultFlexValue: 1,
    activeFlexValue: 2,
  };

  itemWidth: number;
  itemWidthAnimations: Animated.Value[];
  pressAnimation: Animated.Value[];
  currentItem: Animated.Value = new Animated.Value(0);

  constructor(props: Props) {
    super(props);

    const { navigation, activeFlexValue, defaultFlexValue } = props;
    const { state } = navigation;
    const { routes } = state;

    this.itemWidth = screenWidth / (props.navigation.state.routes.length + (activeFlexValue - defaultFlexValue));
    this.itemWidthAnimations = routes.map(
      (_route: any, index: number) => new Animated.Value(index === state.index ? activeFlexValue : defaultFlexValue),
    );
    this.pressAnimation = routes.map(() => new Animated.Value(1));
  }

  shouldComponentUpdate(nextProps: Readonly<Props>): boolean {
    return nextProps.navigation.state.index !== this.props.navigation.state.index;
  }

  componentDidUpdate(prevProps: Readonly<TabBarComponentProps>): void {
    if (prevProps.navigation.state.index !== this.props.navigation.state.index) {
      this.navigateAnimation(prevProps.navigation.state.index);
    }
  }

  navigateAnimation = (prevItemIndex: number) => {
    const { navigation, defaultFlexValue, activeFlexValue } = this.props;
    const { state } = navigation;

    Animated.parallel([
      Animated.timing(this.itemWidthAnimations[prevItemIndex], {
        toValue: defaultFlexValue,
        duration,
        easing: Easing.linear,
      }),
      Animated.timing(this.itemWidthAnimations[state.index], {
        toValue: activeFlexValue,
        duration,
        easing: Easing.linear,
      }),
    ]).start();

    Animated.spring(this.currentItem, {
      toValue: state.index,
      useNativeDriver: true,
    }).start();
  };

  renderAnimatedBackground = () => {
    const { navigation, backgroundViewStyle, activeFlexValue } = this.props;
    const { state } = navigation;
    const { routes } = state;
    const width = this.itemWidth * (activeFlexValue);

    const translateX = this.currentItem.interpolate({
      inputRange: routes.map((_route, index): number => index),
      outputRange: routes.map(
        (_route, index): number => {
          return index * this.itemWidth;
        },
      ),
    });

    return (
      <Animated.View
        style={[
          styles.animatedBackground,
          {
            width,
            transform: [
              {
                translateX,
              },
            ],
          },
        ]}
      >
        <BackgroundContainer style={backgroundViewStyle} />
      </Animated.View>
    );
  };

  renderLabel = ({ focused, route }: { focused: boolean; route: any }) => {
    const { getLabelText, navigation, activeTintColor, inactiveTintColor, allowFontScaling, labelStyle } = this.props;
    const { state } = navigation;
    const { routes } = state;

    if (!focused) {
      return null;
    }

    const color = focused ? activeTintColor : inactiveTintColor;
    const scale = this.currentItem.interpolate({
      inputRange: routes.map((_route, index): number => index),
      outputRange: routes.map((_route, index): number => (index === state.index ? 1 : 0.5)),
    });

    return (
      <Animated.Text
        allowFontScaling={allowFontScaling}
        style={[
          styles.text,
          labelStyle,
          { color },
          {
            transform: [
              {
                scale,
              },
            ],
          },
        ]}
      >
        {getLabelText({ route })}
      </Animated.Text>
    );
  };

  renderIcon = (props: { index: number; route: any; focused: boolean }): React.ReactNode => {
    const { renderIcon } = this.props;

    if (!renderIcon) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.icon,
          {
            transform: [
              {
                scale: this.pressAnimation[props.index],
              },
            ],
          },
        ]}
      >
        {renderIcon(props)}
      </Animated.View>
    );
  };

  onPress = ({ index, type }: { index: number; type: PressTypes }) => {
    const { onPressInScale, onPressOutScale, navigation } = this.props;
    const { state } = navigation;

    if (state.index === index) {
      return;
    }

    const toValue = type && type === PressTypes.IN ? onPressInScale : onPressOutScale;

    Animated.spring(this.pressAnimation[index], {
      toValue: toValue || 1,
      useNativeDriver: true,
    }).start();
  };

  render() {
    const { navigation, onTabPress, style } = this.props;
    const { state } = navigation;
    const { routes } = state;

    return (
      <SafeAreaView style={[styles.container, style]}>
        {this.renderAnimatedBackground()}
        {routes.map((route, key) => {
          const focused = key === state.index;
          return (
            <TouchableWithoutFeedback
              delayPressIn={200}
              onPressIn={() => this.onPress({ index: key, type: PressTypes.IN })}
              onPressOut={() => this.onPress({ index: key, type: PressTypes.OUT })}
              onPress={() => onTabPress({ route })}
              {...{ key }}
            >
              <Animated.View style={[styles.tabBarContainer, { flex: this.itemWidthAnimations[key] }]}>
                <Animated.View
                  style={[
                    styles.tabBarContainer,
                    {
                      transform: [
                        {
                          scale: this.currentItem.interpolate({
                            inputRange: routes.map((_route, index): number => index),
                            outputRange: routes.map((_route, index): number => (index === key ? 1 : 0.7)),
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {this.renderIcon({ index: key, route, focused })}
                  {this.renderLabel({ route, focused })}
                </Animated.View>
              </Animated.View>
            </TouchableWithoutFeedback>
          );
        })}
      </SafeAreaView>
    );
  }
}

export default TabBarComponent;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    position: 'relative',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, .3)',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tabBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: tabBarHeight,
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: tabBarHeight,
  },
  icon: {
    marginLeft: 10,
  },
  text: {
    flex: 1,
    textAlign: 'center',
  },
});
