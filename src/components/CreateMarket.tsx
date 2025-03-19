"use client"

import { useState } from 'react';
import supabase from "@/lib/supabase/createClient";
import { Market, addMarket } from '@/lib/addMarket';
import { addAnswers } from '@/lib/addAnswers';

const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

export default function CreateMarketForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tokens, setTokens] = useState(100);
  const [marketMaker, setMarketMaker] = useState('CPMM');
  const [initialProbability, setInitialProbability] = useState(50);
  const [closeDate, setCloseDate] = useState('');
  const [answers, setAnswers] = useState<{ answer: string; token_pool: number }[]>([
    { answer: '', token_pool: 50 },
    { answer: '', token_pool: 50 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAnswerChange = (index: number, field: 'answer' | 'token_pool', value: string | number) => {
    const newAnswers = [...answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setAnswers(newAnswers);
    if (field === 'token_pool') {
      setTokens(newAnswers.reduce((acc, a) => acc + a.token_pool, 0));
    }
  };

  const addAnswerField = () => setAnswers([...answers, { answer: '', token_pool: 0 }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const userId = await getUserId();
    if (!userId) {
      setError('User is not logged in.');
      return;
    }

    const totalAnswerTokens = answers.reduce((acc, a) => acc + a.token_pool, 0);
    if (totalAnswerTokens !== tokens) {
      setError('The total of all answer token pools must equal the total market tokens.');
      return;
    }

    const market: Market = {
      creator_id: userId,
      name,
      description,
      token_pool: tokens,
      market_maker: marketMaker,
      close_date: closeDate,
    };

    try {
      const createdMarket = await addMarket(market);
      await addAnswers(createdMarket.id, userId, answers);
      setSuccess('Market and answers created successfully!');
      setName('');
      setDescription('');
      setTokens(0);
      setMarketMaker('CPMM');
      setInitialProbability(50);
      setCloseDate('');
      setAnswers([{ answer: '', token_pool: 0 }]);
    } catch (err) {
      setError((err as Error).message || 'Failed to create market or add answers.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 bg-gray-100 rounded-lg shadow-md">
      {/* Name */}
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Market Name:</label>
        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="text-black mt-1 block w-full px-3 py-2 border rounded-md" />
      </div>

      {/* Description */}
      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description:</label>
        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required className="text-black mt-1 block w-full px-3 py-2 border rounded-md" />
      </div>

      {/* Tokens */}
      <div className="mb-4">
        <label htmlFor="tokens" className="block text-sm font-medium text-gray-700">Total Market Tokens:</label>
        <input type="number" id="tokens" value={tokens} onChange={e => setTokens(Number(e.target.value))} required className="text-black mt-1 block w-full px-3 py-2 border rounded-md" />
      </div>

      {/* Market Maker */}
      <div className="mb-4">
        <label htmlFor="marketMaker" className="block text-sm font-medium text-gray-700">Market Maker:</label>
        <select id="marketMaker" value={marketMaker} onChange={e => setMarketMaker(e.target.value)} required className="text-black mt-1 block w-full px-3 py-2 border rounded-md">
          <option value="CPMM">CPMM</option>
          <option value="Maniswap">Maniswap</option>
        </select>
      </div>

      {marketMaker === 'Maniswap' && (
        <div className="mb-4">
          <label htmlFor="initialProbability" className="block text-sm font-medium text-gray-700">Initial Probability (%):</label>
          <input type="number" id="initialProbability" value={initialProbability} onChange={e => setInitialProbability(Number(e.target.value))} min={0} max={100} required className="text-black mt-1 block w-full px-3 py-2 border rounded-md" />
        </div>
      )}

      {/* Close Date */}
      <div className="mb-4">
        <label htmlFor="closeDate" className="block text-sm font-medium text-gray-700">Close Date:</label>
        <input type="date" id="closeDate" value={closeDate} onChange={e => setCloseDate(e.target.value)} required className="text-black mt-1 block w-full px-3 py-2 border rounded-md" />
      </div>

      {/* Answers */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Initial Answers:</label>
        {answers.map((ans, i) => (
          <div key={i} className="flex gap-4 mt-2">
            <input type="text" value={ans.answer} onChange={e => handleAnswerChange(i, 'answer', e.target.value)} required placeholder="Answer" className="text-black flex-1 px-3 py-2 border rounded-md" />
            <input type="number" value={ans.token_pool} onChange={e => handleAnswerChange(i, 'token_pool', Number(e.target.value))} required placeholder="Token Pool" className="text-black w-1/4 px-3 py-2 border rounded-md" />
          </div>
        ))}
        <button type="button" onClick={addAnswerField} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">Add Another Outcome</button>
      </div>

      <button type="submit" className="w-full py-2 bg-green-600 text-white rounded-md">Create Market</button>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {success && <p className="mt-4 text-green-600">{success}</p>}
    </form>
  );
}
