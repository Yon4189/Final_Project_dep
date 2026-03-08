// components/customer/ServiceSearch.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/app/constants/Colors";

interface ServiceSearchProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: () => void;
  onFilterPress: () => void;
  onVoicePress?: () => void;
  onCategorySelect?: (categoryId: string) => void;
  suggestions?: string[];
  searchResults?: any[];
  categories?: Array<{ id: string; name: string; icon?: string }>;
  placeholder?: string;
}

export const ServiceSearch: React.FC<ServiceSearchProps> = ({
  value,
  onChangeText,
  onSearch,
  onFilterPress,
  onVoicePress,
  onCategorySelect,
  suggestions = [],
  searchResults = [],
  categories = [],
  placeholder = "Search for services...",
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setShowSuggestions(value.length > 1 && suggestions.length > 0);
  }, [value, suggestions]);

  const handleSuggestionPress = (suggestion: string) => {
    onChangeText(suggestion);
    setShowSuggestions(false);
    onSearch();
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
  };

  const handleClear = () => {
    onChangeText("");
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={Colors.text.secondary}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Colors.text.secondary}
            returnKeyType="search"
            onSubmitEditing={onSearch}
            onFocus={() => setShowSuggestions(value.length > 1)}
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
        </View>

        <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
          <Ionicons name="options-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>

        {onVoicePress && (
          <TouchableOpacity style={styles.voiceButton} onPress={onVoicePress}>
            <Ionicons name="mic-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories Scroll */}
      {categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const isMatched =
                value.length > 0 &&
                item.name.toLowerCase().includes(value.toLowerCase());
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    (selectedCategory === item.id || isMatched) &&
                      styles.categoryChipSelected,
                  ]}
                  onPress={() => handleCategoryPress(item.id)}
                >
                  {item.icon && (
                    <Text style={styles.categoryIcon}>{item.icon}</Text>
                  )}
                  <Text
                    style={[
                      styles.categoryName,
                      (selectedCategory === item.id || isMatched) &&
                        styles.categoryNameSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Suggestions Modal/Dropdown */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => index.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
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
            )}
            ListHeaderComponent={
              <Text style={styles.suggestionsHeader}>Suggestions</Text>
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 8,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoriesContainer: {
    marginTop: 12,
    marginBottom: 24,
    height: 50,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 40,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryName: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  categoryNameSelected: {
    color: Colors.surface,
  },
  suggestionsContainer: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 300,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  suggestionsHeader: {
    padding: 12,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text.secondary,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 14,
    color: Colors.text.primary,
  },
});
