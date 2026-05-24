const os = require('os');

const PREFERRED_INTERFACES = ['wi-fi', 'wifi', 'wlan', 'ethernet'];
const SKIPPED_INTERFACES = ['loopback', 'virtual', 'vmware', 'vbox', 'hyper-v', 'bluetooth', 'docker'];

function isPrivateIpv4(address) {
  return (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [interfaceName, addresses] of Object.entries(interfaces)) {
    const lowerName = interfaceName.toLowerCase();

    for (const addr of addresses || []) {
      if (addr.family !== 'IPv4' || addr.internal) {
        continue;
      }

      if (addr.address.startsWith('169.254.')) {
        continue;
      }

      if (!isPrivateIpv4(addr.address)) {
        continue;
      }

      const isSkipped = SKIPPED_INTERFACES.some((item) => lowerName.includes(item));
      const isPreferred = PREFERRED_INTERFACES.some((item) => lowerName.includes(item));

      candidates.push({
        address: addr.address,
        score: isSkipped ? -1 : isPreferred ? 2 : 1,
      });
    }
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.address || 'localhost';
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
      bundleIdentifier: "com.hbservicefinder.app",
      infoPlist: {
        UIBackgroundModes: [
          "location",
          "fetch"
        ]
      }
    },
    android: {
      package: "com.hbservicefinder.app",
      adaptiveIcon: {
        foregroundImage: "./assets/homescreen.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "RECORD_AUDIO",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    web: {
      favicon: "./assets/homescreen.png",
      bundler: "metro"
    },
    plugins: [
      "expo-router",
      "expo-localization",
      "expo-secure-store",
      "expo-web-browser",
      "@react-native-community/datetimepicker",
      [
        "expo-image-picker",
        {
          "cameraPermission": "Allow HomeLink to access your camera to photograph your ID card for identity verification.",
          "microphonePermission": false,
          "photosPermission": "Allow HomeLink to access your photo library to upload profile pictures and documents."
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow this app to use your location in the background to provide live tracking.",
          "isAndroidBackgroundLocationEnabled": true
        }
      ],
      "expo-font"
    ],
    extra: {
      ...config.extra,
      apiIp: "https://pushchair-improve-valium.ngrok-free.dev",
      eas: {
        projectId: "4de687ab-28f0-43b3-bba9-8964a02bc7c2"
      }
    }
  };
};
