import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { withLayoutContext } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from '../../hooks/use-color-scheme';

import MiniPlayer from '@/components/MiniPlayer';

// Create Swipeable Tab Navigator
const { Navigator } = createMaterialTopTabNavigator();

// Export as a Layout Component for Expo Router to use
export const MaterialTopTabs = withLayoutContext(Navigator);

import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TabItem = ({ route, index, state, descriptors, navigation, showAndAutoHide, isDark }: any) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;

    const onPress = () => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
        }
        showAndAutoHide();
    };

    let iconName: keyof typeof Ionicons.glyphMap;
    let label = options.title || route.name;
    
    if (route.name === 'index') { iconName = isFocused ? 'home' : 'home-outline'; label = 'HOME'; }
    else if (route.name === 'search') { iconName = isFocused ? 'search' : 'search-outline'; label = 'SEARCH'; }
    else if (route.name === 'cross-vibe') { iconName = isFocused ? 'flash' : 'flash-outline'; label = 'VIBE'; }
    else if (route.name === 'profile') { iconName = isFocused ? 'person' : 'person-outline'; label = 'ME'; }
    else { iconName = 'alert-circle-outline'; }

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            activeOpacity={0.8}
            style={styles.touchableArea}
        >
            <View 
                style={[
                    styles.tabItem, 
                    isFocused ? styles.tabItemFocused : styles.tabItemUnfocused
                ]}
            >
                {isFocused ? (
                    <LinearGradient
                        colors={['#FA8BFF', '#2BD2FF']} 
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.activeTabGradient}
                    >
                         <Ionicons
                            name={iconName}
                            size={20}
                            color="#fff"
                            style={{ marginRight: 4 }}
                        />
                        <Text numberOfLines={1} style={styles.activeLabel}>
                            {label}
                        </Text>
                    </LinearGradient>
                ) : (
                    <Ionicons
                        name={iconName}
                        size={24}
                        color={isDark ? '#fff' : '#000'}
                        style={{ opacity: 0.7 }}
                    />
                )}
            </View>
        </TouchableOpacity>
    );
};

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <View 
        style={[
            styles.tabContainerWrapper, 
            { top: insets.top + 10 } 
        ]} 
        pointerEvents="box-none"
    >
        {/* Static Island Container */}
        <LinearGradient
            colors={['#FA8BFF', '#2BD2FF', '#2BFF88']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBorder}
        >
            {Platform.OS === 'android' ? (
                <View 
                    style={[
                        styles.blurView, 
                        { backgroundColor: isDark ? 'rgba(10,10,20,0.95)' : 'rgba(255,255,255,0.95)' }
                    ]}
                >
                     <View style={styles.tabItems}>
                       {state.routes.map((route: any, index: number) => (
                            <TabItem 
                                key={index} 
                                route={route} 
                                index={index} 
                                state={state} 
                                descriptors={descriptors} 
                                navigation={navigation} 
                                showAndAutoHide={() => {}} // No-op
                                isDark={isDark}
                            />
                       ))}
                    </View>
                </View>
            ) : (
                <BlurView 
                    intensity={90} 
                    tint={isDark ? "dark" : "light"} 
                    style={[styles.blurView, { backgroundColor: isDark ? 'rgba(10,10,20,0.5)' : 'rgba(255,255,255,0.5)' }]}
                >
                     <View style={styles.tabItems}>
                       {state.routes.map((route: any, index: number) => (
                            <TabItem 
                                key={index} 
                                route={route} 
                                index={index} 
                                state={state} 
                                descriptors={descriptors} 
                                navigation={navigation} 
                                showAndAutoHide={() => {}} // No-op
                                isDark={isDark}
                            />
                       ))}
                    </View>
                </BlurView>
            )}
        </LinearGradient>
    </View>
  );
}

const TabLayout = () => {
  return (
    <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <MaterialTopTabs
            tabBar={(props: any) => <FloatingTabBar {...props} />}
            tabBarPosition="bottom"
            screenOptions={{
                tabBarActiveTintColor: '#FF4E00',
                tabBarStyle: {
                    backgroundColor: 'transparent',
                },
                sceneStyle: { backgroundColor: 'transparent' }, // Reveal global background
                // Enhance Swipe Smoothness
                animationEnabled: true,
                swipeEnabled: true,
                lazy: true, // Only render the focused tab
                lazyPreloadDistance: 1, // Preload neighbor to avoid black screen
            }}>
            <MaterialTopTabs.Screen name="index" options={{ title: 'Home' }} />
            <MaterialTopTabs.Screen name="search" options={{ title: 'Search' }} />
            <MaterialTopTabs.Screen name="cross-vibe" options={{ title: 'Cross Vibe' }} />
            <MaterialTopTabs.Screen name="profile" options={{ title: 'Profile' }} />
            </MaterialTopTabs>
            
            <MiniPlayer />
        </View>
    </SafeAreaProvider>
  );
}

export default TabLayout;


const styles = StyleSheet.create({
  tabContainerWrapper: {
    position: 'absolute',
    top: 40, // Moved to top
    width: '100%',
    alignItems: 'center',
    zIndex: 200, // Ensure it's on top of everything
  },
  gradientBorder: {
    height: 52,
    width: '90%', // Static width
    maxWidth: 400,
    borderRadius: 26,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 50,
  },
  blurView: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  tabItems: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    justifyContent: 'space-evenly',
  },
  touchableArea: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    flex: 1,
  },
  tabItem: {
    height: 40, // Smaller items
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  tabItemFocused: {
    minWidth: 90,
    paddingHorizontal: 4,
  },
  tabItemUnfocused: {
    width: 40,
  },
  activeTabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#2BD2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  activeLabel: {
    color: '#fff',
    fontWeight: '800', // Extra Bold for legibility
    fontSize: 10, // Smaller text
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
