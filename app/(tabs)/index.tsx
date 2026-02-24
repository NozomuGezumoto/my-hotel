import { View, StyleSheet } from 'react-native';
import HotelMap from '../../src/components/HotelMap';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <HotelMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
