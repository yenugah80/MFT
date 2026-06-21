/**
 * HealthSyncBanner
 *
 * Shown on the profile/dashboard when health sync is available but not yet
 * connected. When HEALTH_PACKAGE_AVAILABLE is false (current state), renders
 * nothing — the banner activates automatically once the native SDK is wired.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  isHealthAvailable,
  requestHealthPermissions,
  syncHealthDataToBackend,
} from '../services/healthPlatformService';
import { TEXT, TYPOGRAPHY, BRAND } from '../constants/premiumTheme';

export default function HealthSyncBanner({ onSynced }) {
  const [status, setStatus] = useState('idle'); // idle | requesting | syncing | connected | error
  const [errorMsg, setErrorMsg] = useState('');

  if (!isHealthAvailable()) return null;

  const handleConnect = async () => {
    setStatus('requesting');
    const granted = await requestHealthPermissions();
    if (!granted) {
      setStatus('error');
      setErrorMsg('Permission denied. You can grant access in device Settings.');
      return;
    }
    setStatus('syncing');
    const result = await syncHealthDataToBackend();
    if (result.synced) {
      setStatus('connected');
      onSynced?.(result);
    } else {
      setStatus('error');
      setErrorMsg('Sync failed. Please try again.');
    }
  };

  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
  const platformIcon = Platform.OS === 'ios' ? 'heart-circle-outline' : 'fitness-outline';

  if (status === 'connected') {
    return (
      <View style={[styles.banner, styles.bannerSuccess]}>
        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        <Text style={[styles.bannerText, { color: '#10B981' }]}>
          {platformName} connected
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <Ionicons name={platformIcon} size={20} color={BRAND.primary} />
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>Connect {platformName}</Text>
        <Text style={styles.bannerSubtitle}>Sync steps and activity for smarter nutrition insights</Text>
        {status === 'error' && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.connectBtn, (status === 'requesting' || status === 'syncing') && { opacity: 0.6 }]}
        onPress={handleConnect}
        disabled={status === 'requesting' || status === 'syncing'}
      >
        {status === 'requesting' || status === 'syncing'
          ? <ActivityIndicator size="small" color="#FFF" />
          : <Text style={styles.connectBtnText}>Connect</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: BRAND.primary + '22',
  },
  bannerSuccess: { borderColor: '#10B98122' },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 14, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  bannerSubtitle: { fontSize: 12, color: TEXT.secondary, marginTop: 2 },
  errorText: { fontSize: 11, color: '#EF4444', marginTop: 3 },
  bannerText: { fontSize: 14, fontFamily: TYPOGRAPHY.family.semibold, flex: 1 },
  connectBtn: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  connectBtnText: { fontSize: 13, fontFamily: TYPOGRAPHY.family.semibold, color: '#FFF' },
});
