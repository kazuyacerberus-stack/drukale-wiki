'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function Home() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase.from('characters').select('*');
      setCharacters(data || []);
      setLoading(false);
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Wiki Drukale</h1>
      {loading ? <p>Carregando...</p> : <div className="grid grid-cols-3 gap-6">{characters.map(c => <div key={c.id} className="bg-gray-800 p-6 rounded"><h2 className="text-xl font-bold">{c.name}</h2><p className="text-gray-400">{c.description}</p></div>)}</div>}
    </div>
  );
}