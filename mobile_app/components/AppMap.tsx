import { Platform } from "react-native";
import MobileMap from "./Map/index.native";
import WebMap from "./Map/index.web";

export default function AppMap() {
  if (Platform.OS === "web") {
    return <WebMap />;
  }

  return <MobileMap />;
}
