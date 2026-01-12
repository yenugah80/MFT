import React from 'react';
import { TEXT } from '../constants/premiumTheme';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Stat card for displaying metrics
 */
const StatCard = ({ label, value, subtitle, icon, color = '#4f46e5' }) => {
  return (
    <View style={styles.card}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.icon, { color }]}>{icon}</Text>
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: TEXT.secondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
});

export default StatCard;
