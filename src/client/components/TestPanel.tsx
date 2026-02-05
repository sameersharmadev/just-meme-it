import { useState } from 'react';
import type { Submission } from '../../shared/types/submission';

type TestResult = {
  status: 'success' | 'error';
  message?: string;
  data?: unknown;
};

export const TestPanel = () => {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedOderId, setSelectedOderId] = useState('');

  const runTest = async (name: string, fn: () => Promise<Response>) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fn();
      const data = await res.json();
      setResult({
        status: res.ok ? 'success' : 'error',
        message: `${name}: ${res.status}`,
        data,
      });
    } catch (err) {
      setResult({ status: 'error', message: `${name}: ${String(err)}` });
    }
    setLoading(false);
  };

  const testSubmit = () =>
    runTest('Submit Meme', () =>
      fetch('/api/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://example.com/meme.jpg',
          caption: `Test meme ${Date.now()}`,
        }),
      })
    );

  const testGetSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/submissions');
      const data = await res.json();
      if (data.submissions) {
        setSubmissions(data.submissions);
      }
      setResult({
        status: res.ok ? 'success' : 'error',
        message: `Get Submissions: ${data.count} found`,
        data,
      });
    } catch (err) {
      setResult({ status: 'error', message: `Get Submissions: ${String(err)}` });
    }
    setLoading(false);
  };

  const testVote = () => {
    if (!selectedOderId) {
      setResult({ status: 'error', message: 'Select a submission first' });
      return;
    }
    runTest('Cast Vote', () =>
      fetch('/api/test/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oderId: selectedOderId }),
      })
    );
  };

  const testVoteStatus = () => {
    if (!selectedOderId) {
      setResult({ status: 'error', message: 'Select a submission first' });
      return;
    }
    runTest('Vote Status', () => fetch(`/api/test/vote-status/${selectedOderId}`));
  };

  const testUserStatus = () => runTest('User Status', () => fetch('/api/test/user-status'));

  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-white border-l border-gray-200 p-4 overflow-y-auto shadow-lg">
      <h2 className="text-lg font-bold mb-4 text-gray-900">Test Panel</h2>

      <div className="space-y-2 mb-4">
        <button
          onClick={testUserStatus}
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Get User Status
        </button>

        <button
          onClick={testSubmit}
          disabled={loading}
          className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Submit Test Meme
        </button>

        <button
          onClick={testGetSubmissions}
          disabled={loading}
          className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Get All Submissions
        </button>
      </div>

      {submissions.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Submission:</label>
          <select
            value={selectedOderId}
            onChange={(e) => setSelectedOderId(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">-- Select --</option>
            {submissions.map((s) => (
              <option key={s.oderId} value={s.oderId}>
                {s.username}: {s.caption.slice(0, 20)}...
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <button
          onClick={testVote}
          disabled={loading || !selectedOderId}
          className="w-full px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          Vote on Selected
        </button>

        <button
          onClick={testVoteStatus}
          disabled={loading || !selectedOderId}
          className="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          Check Vote Status
        </button>
      </div>

      {result && (
        <div
          className={`p-3 rounded text-sm ${result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          <div className="font-medium">{result.message}</div>
          <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
