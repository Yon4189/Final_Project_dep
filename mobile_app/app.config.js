const os = require('os');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

module.exports = ({ config }) => {
  return {
    ...config,
    name: "mobile_app",
    slug: "mobile_app",
    version: "1.0.0",
    scheme: "mobileapp",
    orientation: "portrait",
    icon: "./assets/homescreen.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/homescreen.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: [
          "location",
          "fetch"
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/homescreen.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/homescreen.png",
      bundler: "metro"
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "@react-native-community/datetimepicker",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow this app to use your location in the background to provide live tracking.",
          "isAndroidBackgroundLocationEnabled": true
        }
      ]
    ],
    extra: {
      ...config.extra,
      apiIp: localIp,
    },
  };
};
