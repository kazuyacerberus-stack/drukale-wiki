'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function Admin() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let imageUrl = null;
    
    if (image) {
      const fileName = `${Date.now()}-${image.name}`;
      await supabase.storage.from('characters').upload(fileName, image);
      const { data } = supabase.storage.from('characters').getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    }
    
    await supabase.from('characters').insert([{ name, description, image_url: imageUrl }]);
    
    setName('');
    setDescription('');
    setImage(null);
    alert('Personagem adicionado!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Admin</h1>
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded max-w-lg">
        <div className="mb-4">
          <label className="block mb-2">Nome:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 bg-gray-700 text-white rounded" required />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Descrição:</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 bg-gray-700 text-white rounded" rows="4" required />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Imagem:</label>
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} className="w-full p-2 bg-gray-700 text-white rounded" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 p-2 rounded font-bold hover:bg-blue-700">
          {loading ? 'Adicionando...' : 'Adicionar'}
        </button>
      </form>
    </div>
  );
}