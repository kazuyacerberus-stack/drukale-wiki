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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase
      .from('characters')
      .insert([{ name, description }]);
    
    if (!error) {
      setName('');
      setDescription('');
      alert('Personagem adicionado!');
    } else {
      alert('Erro: ' + error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Admin - Adicionar Personagem</h1>
      
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded max-w-lg">
        <div className="mb-4">
          <label className="block mb-2">Nome:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 bg-gray-700 text-white rounded"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-2">Descrição:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 bg-gray-700 text-white rounded"
            rows="4"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 p-2 rounded font-bold hover:bg-blue-700"
        >
          {loading ? 'Adicionando...' : 'Adicionar Personagem'}
        </button>
      </form>
    </div>
  );
}