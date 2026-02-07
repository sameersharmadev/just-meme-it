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

  const testUpdateStreak = () =>
    runTest('Update Streak', () =>
      fetch('/api/test/update-streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

  const testRecordWin = () =>
    runTest('Record Win (+100 pts)', () =>
      fetch('/api/test/record-win', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: 100 }),
      })
    );

  const testAddLifetimeScore = () =>
    runTest('Add Lifetime Score (+10)', () =>
      fetch('/api/test/add-lifetime-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: 10 }),
      })
    );

  const testDailyLeaderboard = () =>
    runTest('Daily Leaderboard', () => fetch('/api/test/leaderboard/daily?limit=10'));

  const testLifetimeLeaderboard = () =>
    runTest('Lifetime Leaderboard', () => fetch('/api/test/leaderboard/lifetime?limit=10'));

  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-white border-l border-gray-200 p-4 overflow-y-auto shadow-lg">
      <h2 className="text-lg font-bold mb-4 text-gray-900">Test Panel</h2>

      <h3 className="text-sm font-semibold text-gray-700 mb-2">User & Submissions</h3>
      <div className="space-y-2 mb-4">
        <button
          onClick={testUserStatus}
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          Get User Status
        </button>

        <button
          onClick={testSubmit}
          disabled={loading}
          className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
        >
          Submit Test Meme
        </button>

        <button
          onClick={testGetSubmissions}
          disabled={loading}
          className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
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

      <h3 className="text-sm font-semibold text-gray-700 mb-2">Voting</h3>
      <div className="space-y-2 mb-4">
        <button
          onClick={testVote}
          disabled={loading || !selectedOderId}
          className="w-full px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
        >
          Vote on Selected
        </button>

        <button
          onClick={() => {
            if (!selectedOderId) {
              setResult({ status: 'error', message: 'Select a submission first' });
              return;
            }
            runTest('Simulate Vote (+5)', () =>
              fetch('/api/test/simulate-vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oderId: selectedOderId, votes: 5 }),
              })
            );
          }}
          disabled={loading || !selectedOderId}
          className="w-full px-3 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 text-sm"
        >
          Simulate Votes (+5)
        </button>

        <button
          onClick={testVoteStatus}
          disabled={loading || !selectedOderId}
          className="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
        >
          Check Vote Status
        </button>
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mb-2">Streak & Wins</h3>
      <div className="space-y-2 mb-4">
        <button
          onClick={testUpdateStreak}
          disabled={loading}
          className="w-full px-3 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:opacity-50 text-sm"
        >
          Update Streak
        </button>

        <button
          onClick={testRecordWin}
          disabled={loading}
          className="w-full px-3 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:opacity-50 text-sm"
        >
          Record Win (+100 pts)
        </button>

        <button
          onClick={testAddLifetimeScore}
          disabled={loading}
          className="w-full px-3 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 disabled:opacity-50 text-sm"
        >
          Add Lifetime Score (+10)
        </button>
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mb-2">Leaderboards</h3>
      <div className="space-y-2 mb-4">
        <button
          onClick={testDailyLeaderboard}
          disabled={loading}
          className="w-full px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 text-sm"
        >
          Daily Leaderboard
        </button>

        <button
          onClick={testLifetimeLeaderboard}
          disabled={loading}
          className="w-full px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50 text-sm"
        >
          Lifetime Leaderboard
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
