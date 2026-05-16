import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, FlatList,
  TouchableOpacity, Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import { getItems, createItem, deleteItem, Item } from './src/api/items';

export default function App() {
  const [items, setItems]         = useState<Item[]>([]);
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
exp://192.168.0.11:8081
  // Load items on first render
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getItems();
      setItems(data);
    } catch (error) {
      Alert.alert('Error', 'Could not load items. Is your API running?');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    setAdding(true);
    try {
      const newItem = await createItem(name.trim(), description.trim());
      setItems(prev => [newItem, ...prev]);  // Add to top of list
      setName('');
      setDesc('');
    } catch (error) {
      Alert.alert('Error', 'Could not create item');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (item: Item) => {
    Alert.alert(
      'Delete Item',
      `Delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item.id);
              setItems(prev => prev.filter(i => i.id !== item.id));
            } catch {
              Alert.alert('Error', 'Could not delete item');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Items</Text>

      {/* Add form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Item name *"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDesc}
        />
        <Button
          title={adding ? 'Adding...' : 'Add Item'}
          onPress={handleAdd}
          disabled={adding}
        />
      </View>

      {/* Items list */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          refreshing={loading}
          onRefresh={loadItems}
          ListEmptyComponent={
            <Text style={styles.empty}>No items yet. Add one above.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.cardDesc}>{item.description}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 },
  title:      { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  form:       { marginBottom: 20, gap: 10 },
  input:      { borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
                padding: 10, fontSize: 16 },
  empty:      { textAlign: 'center', color: '#999', marginTop: 40 },
  card:       { flexDirection: 'row', alignItems: 'center', padding: 16,
                borderWidth: 1, borderColor: '#eee', borderRadius: 8,
                marginBottom: 10 },
  cardTitle:  { fontSize: 16, fontWeight: '600' },
  cardDesc:   { fontSize: 14, color: '#666', marginTop: 4 },
  deleteBtn:  { color: 'red', fontWeight: '600', paddingLeft: 10 },
});