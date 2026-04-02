'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ScoringResult {
  ok: boolean; scored?: number; timestamp?: string
  stdout?: string; stderr?: string; error?: string
}

export default function ScoringPage() {
  const [result, setResult] = useState<ScoringResult | null>(null)
  const [running, setRunning] = useState(false)

  async function runScoring() {
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch('/api/run-scoring', { method: 'POST' })
      setResult(await res.json())
    } catch {
      setResult({ ok: false, error: 'Network error — could not reach server.' })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-xl">
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-medium">ML Pipeline</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Run Scoring</h1>
      <p className="text-slate-400 text-sm mb-4">
        Executes <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 text-xs">jobs/run_inference.py</code> and
        writes predictions into <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 text-xs">order_predictions</code>.
      </p>
      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl mb-6 text-xs">
        <span className="font-semibold">Production note:</span> Vercel has no Python runtime.
        Run the scoring job locally with <code className="bg-amber-100 px-1 rounded">DATABASE_URL</code> set to your Supabase connection string.
        <pre className="mt-1.5 text-amber-700">DATABASE_URL=postgresql://... python jobs/run_inference.py</pre>
      </div>

      <button
        onClick={runScoring}
        disabled={running}
        className="w-full bg-slate-900 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed mb-6"
      >
        {running ? 'Running...' : 'Run Scoring Job'}
      </button>

      {result && (
        <div className={`border rounded-xl p-5 text-sm ${result.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`font-semibold mb-3 ${result.ok ? 'text-emerald-700' : 'text-red-700'}`}>
            {result.ok ? 'Complete' : 'Failed'}
          </p>

          <div className="space-y-1 text-xs text-slate-600 mb-3">
            {result.scored != null && (
              <div className="flex gap-2">
                <span className="text-slate-400 w-28">Orders scored</span>
                <span className="mono font-semibold text-slate-800">{result.scored}</span>
              </div>
            )}
            {result.timestamp && (
              <div className="flex gap-2">
                <span className="text-slate-400 w-28">Completed at</span>
                <span className="mono text-slate-500">{result.timestamp}</span>
              </div>
            )}
          </div>

          {result.error && (
            <p className="text-red-600 text-xs mb-3 font-medium">{result.error}</p>
          )}

          {result.ok && (
            <Link href="/warehouse/priority" className="inline-block bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              View Priority Queue →
            </Link>
          )}

          {result.stdout && (
            <details className="mt-4">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 uppercase tracking-wide font-medium">stdout</summary>
              <pre className="mt-2 bg-slate-900 text-emerald-400 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">{result.stdout}</pre>
            </details>
          )}
          {result.stderr && (
            <details className="mt-2">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 uppercase tracking-wide font-medium">stderr</summary>
              <pre className="mt-2 bg-slate-900 text-amber-300 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">{result.stderr}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
