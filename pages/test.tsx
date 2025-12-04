export default function TestPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Test Page</h1>
      <p>This is a simple test page.</p>
      <p>If you can see this, Next.js routing is working.</p>
      <h2>Environment Variables:</h2>
      <ul>
        <li>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not Set'}</li>
        <li>SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set'}</li>
      </ul>
    </div>
  )
}
