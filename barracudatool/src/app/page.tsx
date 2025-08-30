'use client'

import Link from 'next/link';

export default function HomePage() {
return (
  <main style={{ padding: '1rem' }}>
    <h1>Barracuda Tool</h1>
    <p>Welcome to the Barracuda Tool application!</p>
    <nav>
      <ul>
        <li>
          <Link href="/main">Go to Main Page</Link>
        </li>
        <li>
          <Link href="/test-dpe">Go to DPE Test Page</Link>
        </li>
        <li>
          <Link href="/test">Go to Test Page</Link>
        </li>
        </ul>
    </nav>
  </main>
)};