import client from './client';

export type Item = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export const getItems = async (): Promise<Item[]> => {
  const response = await client.get('/items');
  return response.data.data;
};

export const createItem = async (name: string, description: string): Promise<Item> => {
  const response = await client.post('/items', { name, description });
  return response.data.data;
};

export const deleteItem = async (id: string): Promise<void> => {
  await client.delete(`/items/${id}`);
};