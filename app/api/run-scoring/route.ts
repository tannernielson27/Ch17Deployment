import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST() {
  const scriptPath = path.join(process.cwd(), 'jobs', 'run_inference.py')

  return new Promise<NextResponse>((resolve) => {
    const proc = spawn('python', [scriptPath], {
      timeout: 120_000,
      cwd: process.cwd(),
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString() })
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    proc.on('close', (code) => {
      const timestamp = new Date().toISOString()

      // Try to parse a scored count from stdout like "Scored: 42 orders"
      const match = stdout.match(/scored[:\s]+(\d+)/i)
      const scored = match ? Number(match[1]) : null

      if (code === 0) {
        resolve(NextResponse.json({ ok: true, scored, timestamp, stdout, stderr }))
      } else {
        resolve(
          NextResponse.json(
            { ok: false, error: `Script exited with code ${code}`, stdout, stderr, timestamp },
            { status: 500 }
          )
        )
      }
    })

    proc.on('error', (err) => {
      resolve(
        NextResponse.json(
          { ok: false, error: err.message, timestamp: new Date().toISOString() },
          { status: 500 }
        )
      )
    })
  })
}
