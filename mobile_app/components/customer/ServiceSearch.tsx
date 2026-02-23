// components/customer/ServiceSearch.tsx
import { Colors } from "@/app/constants/Colors";
import { SERVICE_CATEGORIES } from "@/app/constants/Services";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface ServiceSearchProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: (query: string) => void;
  onFilterPress: () => void;
  onVoicePress?: () => void;
  onCategorySelect?: (categoryId: string) => void;
  suggestions?: string[];
  recentSearches?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  showRecent?: boolean;
}

export const ServiceSearch: React.FC<ServiceSearchProps> = ({
  value,
  onChangeText,
  onSearch,
  onFilterPress,
  onVoicePress,
  onCategorySelect,
  suggestions = [],
  recentSearches = [],
  placeholder = "Search for plumbing, electrical...",
  autoFocus = false,
  showRecent = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused && (suggestions.length > 0 || recentSearches.length > 0)) {
      setShowSuggestions(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!isFocused) setShowSuggestions(false);
      });
    }
  }, [isFocused, suggestions.length, recentSearches.length]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleClear = () => {
    onChangeText("");
    inputRef.current?.focus();
  };

  const handleSuggestionPress = (suggestion: string) => {
    onChangeText(suggestion);
    onSearch(suggestion);
    setIsFocused(false);
  };

  const handleCategoryPress = (categoryId: string) => {
    onCategorySelect?.(categoryId);
    setIsFocused(false);
  };

  const renderCategorySuggestions = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.suggestionsTitle}>Popular Categories</Text>
      <View style={styles.categoriesGrid}>
        {SERVICE_CATEGORIES.slice(0, 6).map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryChip}
            onPress={() => handleCategoryPress(category.id.toString())}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={styles.categoryName}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRecentSearches = () => {
    if (!showRecent || recentSearches.length === 0) return null;

    return (
      <View style={styles.recentContainer}>
        <Text style={styles.suggestionsTitle}>Recent Searches</Text>
        {recentSearches.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionItem}
            onPress={() => handleSuggestionPress(item)}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={Colors.text.secondary}
            />
            <Text style={styles.suggestionText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Suggestions</Text>
        {suggestions.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionItem}
            onPress={() => handleSuggestionPress(item)}
          >
            <Ionicons
              name="search-outline"
              size={16}
              color={Colors.text.secondary}
            />
            <Text style={styles.suggestionText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <BlurView
          intensity={90}
          tint="light"
          style={[
            styles.searchContainer,
            isFocused && styles.searchContainerFocused,
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={Colors.text.secondary}
            style={styles.searchIcon}
          />

          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={Colors.text.secondary}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={() => onSearch(value)}
            returnKeyType="search"
            autoFocus={autoFocus}
            clearButtonMode="never"
          />

          {value.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.text.secondary}
              />
            </TouchableOpacity>
          )}

          {onVoicePress && (
            <TouchableOpacity onPress={onVoicePress} style={styles.voiceButton}>
              <Ionicons name="mic" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
            <Ionicons name="options-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </BlurView>
      </View>

      {showSuggestions && (
        <Animated.View
          style={[
            styles.suggestionsOverlay,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <BlurView
            intensity={100}
            tint="light"
            style={styles.suggestionsContent}
          >
            <FlatList
              data={[1]} // Dummy data to make FlatList render
              renderItem={() => null}
              ListHeaderComponent={
                <>
                  {renderCategorySuggestions()}
                  {renderRecentSearches()}
                  {renderSuggestions()}
                </>
              }
              keyExtractor={(_, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 1000,
  },
  searchWrapper: {
    zIndex: 1001,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 16,
    backgroundColor: Platform.OS === "ios" ? "transparent" : Colors.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchContainerFocused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
    marginRight: 4,
  },
  voiceButton: {
    padding: 8,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  filterButton: {
    padding: 8,
  },
  suggestionsOverlay: {
    position: "absolute",
    top: 58,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  suggestionsContent: {
    backgroundColor: Platform.OS === "ios" ? "transparent" : Colors.surface,
    padding: 16,
    maxHeight: 400,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  categoryChip: {
    width: "33.33%",
    padding: 4,
    alignItems: "center",
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  recentContainer: {
    marginBottom: 20,
  },
  suggestionsContainer: {
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "40",
  },
  suggestionText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.text.primary,
  },
});
