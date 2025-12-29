import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LogInputSection({
  styles,
  inputMode,
  setInputMode,
  setAnalysisSource,
  foodAnalysis,
  isAnalyzing,
  isTextFocused,
  setIsTextFocused,
  selectedImage,
  setSelectedImage,
  setAnalyzedFood,
  setShowCameraModal,
  setShowBarcodeScannerModal,
  setShowVoiceModal,
  handlePhotoFromLibrary,
}) {
  return (
    <>
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[
            styles.modeTab,
            inputMode === 'text' ? styles.modeTabActive : styles.modeTabInactive,
          ]}
          onPress={() => {
            setInputMode('text');
            setAnalysisSource('text');
          }}
          activeOpacity={0.7}
          accessibilityLabel="Text input mode"
        >
          {inputMode === 'text' ? (
            <LinearGradient
              colors={['#6B4EFF', '#8B6EFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modeTabGradient}
            >
              <Ionicons name="create" size={22} color="#FFFFFF" />
              <Text style={styles.modeTextActive}>Text</Text>
            </LinearGradient>
          ) : (
            <View style={styles.modeTabGradient}>
              <Ionicons name="create-outline" size={22} color="#6B7280" />
              <Text style={styles.modeText}>Text</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeTab,
            inputMode === 'photo' ? styles.modeTabActive : styles.modeTabInactive,
          ]}
          onPress={() => {
            setInputMode('photo');
            setAnalysisSource('photo');
          }}
          activeOpacity={0.7}
          accessibilityLabel="Photo input mode"
        >
          {inputMode === 'photo' ? (
            <LinearGradient
              colors={['#6B4EFF', '#8B6EFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modeTabGradient}
            >
              <Ionicons name="camera" size={22} color="#FFFFFF" />
              <Text style={styles.modeTextActive}>Photo</Text>
            </LinearGradient>
          ) : (
            <View style={styles.modeTabGradient}>
              <Ionicons name="camera-outline" size={22} color="#6B7280" />
              <Text style={styles.modeText}>Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeTab,
            inputMode === 'voice' ? styles.modeTabActive : styles.modeTabInactive,
          ]}
          onPress={() => {
            setInputMode('voice');
            setAnalysisSource('voice');
          }}
          activeOpacity={0.7}
          accessibilityLabel="Voice input mode"
        >
          {inputMode === 'voice' ? (
            <LinearGradient
              colors={['#6B4EFF', '#8B6EFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modeTabGradient}
            >
              <Ionicons name="mic" size={22} color="#FFFFFF" />
              <Text style={styles.modeTextActive}>Voice</Text>
            </LinearGradient>
          ) : (
            <View style={styles.modeTabGradient}>
              <Ionicons name="mic-outline" size={22} color="#6B7280" />
              <Text style={styles.modeText}>Voice</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {inputMode === 'text' && (
        <View style={styles.inputSection}>
          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Ionicons name="text" size={24} color="#6B4EFF" />
              <Text style={styles.inputLabel}>Describe your meal</Text>
            </View>

            <TextInput
              style={[styles.textInputLarge, isTextFocused && styles.textInputFocused]}
              placeholder="Describe your meal — anything you savored"
              placeholderTextColor="#6B7280"
              value={foodAnalysis.inputText}
              onChangeText={foodAnalysis.setInputText}
              multiline
              numberOfLines={4}
              editable={!isAnalyzing}
              autoFocus={false}
              onFocus={() => setIsTextFocused(true)}
              onBlur={() => setIsTextFocused(false)}
              accessibilityLabel="Describe your meal"
            />

            {!foodAnalysis.inputText && !isAnalyzing && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#6B4EFF" />
                <Text style={styles.infoText}>
                  Type your food and pause - AI analyzes automatically
                </Text>
              </View>
            )}

            {isAnalyzing && (
              <View style={styles.analysisStatus}>
                <ActivityIndicator size="small" color="#6B4EFF" />
                <Text style={styles.analysisStatusText}>
                  Analyzing nutrition... {Math.round(foodAnalysis.progress)}%
                </Text>
              </View>
            )}

            {foodAnalysis.inputText && !isAnalyzing && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  foodAnalysis.setInputText('');
                  foodAnalysis.setAnalysisResult(null);
                }}
                accessibilityLabel="Clear meal description"
              >
                <Ionicons name="close-circle" size={18} color="#DC2626" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.analyzeButton,
                isAnalyzing && styles.analyzeButtonDisabled,
              ]}
              onPress={foodAnalysis.runAnalysis}
              disabled={isAnalyzing}
              accessibilityLabel={isAnalyzing ? 'Analyzing meal' : 'Analyze meal'}
            >
              <LinearGradient
                colors={['#6B4EFF', '#8B6EFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.analyzeGradient}
              >
                {isAnalyzing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.analyzeText}>
                  {isAnalyzing ? 'Analyzing...' : 'Analyze / Retry'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {inputMode === 'photo' && (
        <View style={styles.inputSection}>
          {selectedImage ? (
            <View style={styles.photoPreviewCard}>
              <Image source={{ uri: selectedImage }} style={styles.photoPreview} />
              <TouchableOpacity
                style={styles.photoRemoveButton}
                onPress={() => {
                  setSelectedImage(null);
                  setAnalyzedFood(null);
                  setAnalysisSource('text');
                }}
                accessibilityLabel="Remove selected photo"
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              {isAnalyzing && (
                <View style={styles.photoAnalyzing}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.photoAnalyzingText}>Analyzing photo...</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.photoEmptyCard}>
              <View style={styles.photoIconContainer}>
                <Ionicons name="camera" size={64} color="#6B4EFF" />
              </View>
              <Text style={styles.photoEmptyTitle}>Camera-first logging</Text>
              <Text style={styles.photoEmptySubtitle}>
                Snap fresh meals, scan packaged foods, or pull from your gallery.
              </Text>

              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.photoPrimaryCard}
                  onPress={() => setShowCameraModal(true)}
                  disabled={isAnalyzing}
                  activeOpacity={0.9}
                  accessibilityLabel="Take a new meal photo"
                >
                  <LinearGradient
                    colors={['#6B4EFF', '#8B6EFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.photoPrimaryGradient}
                  >
                    <Ionicons name="camera" size={24} color="#FFFFFF" />
                    <View style={styles.photoPrimaryCopy}>
                      <Text style={styles.photoButtonText}>Take Photo</Text>
                      <Text style={styles.photoButtonSub}>Best for cooked meals</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.photoSecondaryStack}>
                  <TouchableOpacity
                    style={styles.photoSecondaryCard}
                    onPress={() => setShowBarcodeScannerModal(true)}
                    disabled={isAnalyzing}
                    activeOpacity={0.85}
                    accessibilityLabel="Scan a product barcode"
                  >
                    <Ionicons name="barcode-outline" size={22} color="#6B4EFF" />
                    <View>
                      <Text style={styles.photoSecondaryText}>Scan Barcode</Text>
                      <Text style={styles.photoSecondarySub}>Packaged foods</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoSecondaryCard}
                    onPress={handlePhotoFromLibrary}
                    disabled={isAnalyzing}
                    activeOpacity={0.85}
                    accessibilityLabel="Choose a meal photo from gallery"
                  >
                    <Ionicons name="images-outline" size={22} color="#6B4EFF" />
                    <View>
                      <Text style={styles.photoSecondaryText}>Choose from Gallery</Text>
                      <Text style={styles.photoSecondarySub}>Use an existing shot</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {inputMode === 'voice' && (
        <View style={styles.inputSection}>
          <View style={styles.voiceEmptyCard}>
            <View style={styles.voiceIconContainer}>
              <Ionicons name="mic" size={64} color="#6B4EFF" />
            </View>
            <Text style={styles.voiceEmptyTitle}>Voice Logging</Text>
            <Text style={styles.voiceEmptySubtitle}>
              Speak naturally - we&apos;ll transcribe and analyze your meal
            </Text>

            <TouchableOpacity
              style={styles.voicePrimaryButton}
              onPress={() => setShowVoiceModal(true)}
              disabled={isAnalyzing}
              activeOpacity={0.8}
              accessibilityLabel="Start voice meal logging"
            >
              <LinearGradient
                colors={['#6B4EFF', '#8B6EFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.voiceButtonGradient}
              >
                <View style={styles.voicePulse}>
                  <Ionicons name="mic" size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.voiceButtonText}>Start Recording</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.voiceExamples}>
              <Ionicons name="bulb-outline" size={18} color="#6B7280" />
              <Text style={styles.voiceExamplesTitle}>Try saying:</Text>
            </View>
            <View style={styles.voiceExamplesList}>
              <Text style={styles.voiceExample}>&quot;I had two eggs and whole wheat toast&quot;</Text>
              <Text style={styles.voiceExample}>&quot;200 grams of grilled chicken with rice&quot;</Text>
              <Text style={styles.voiceExample}>&quot;Large coffee with almond milk&quot;</Text>
            </View>
          </View>
        </View>
      )}
    </>
  );
}
