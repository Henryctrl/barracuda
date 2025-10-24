'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'

export default function MainHeader() {
  const styles = {
    header: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px',
      backgroundColor: 'rgba(10, 10, 30, 0.85)',
      borderBottom: '2px solid #00ffff',
      boxShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
      gap: '15px',
    },
    logo: {
      fontSize: '1.75rem',
      fontWeight: 'bold',
      color: '#ff00ff',
      textShadow: '0 0 10px #ff00ff',
    },
    nav: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      alignItems: 'center',
      gap: '20px',
      justifyContent: 'center',
    },
    navLink: {
      color: '#00ffff',
      textDecoration: 'none',
      fontWeight: 'bold',
      fontSize: '1rem',
      transition: 'text-shadow 0.3s ease',
    },
    searchBar: {
      display: 'flex',
      alignItems: 'center',
      border: '1px solid #ff00ff',
      borderRadius: '5px',
      padding: '5px 10px',
      backgroundColor: 'rgba(10, 10, 30, 0.9)',
    },
    searchInput: {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#ff00ff',
      outline: 'none',
      fontFamily: "'Orbitron', sans-serif",
      '::placeholder': {
        color: '#ff00ff',
        opacity: 0.7,
      },
    },
  };

  // A simple hover effect can be managed with onMouseEnter/onMouseLeave
  // but for maintainability, CSS classes or a styled-components approach is better.
  // For this inline-style approach, direct manipulation is shown.

  return (
    <header style={styles.header}>
      <div style={styles.logo}>BARRACUDA</div>
      <nav style={styles.nav}>
        <Link href="/" style={styles.navLink}>HOME</Link>
        <Link href="/gatherer/properties" style={styles.navLink}>PROPERTIES</Link>
        <Link href="/gatherer/buyers" style={styles.navLink}>BUYERS</Link>
        <Link href="/gatherer/tools" style={styles.navLink}>TOOLS</Link>
        <Link href="/gatherer/mandates" style={styles.navLink}>MANDATES</Link>
      </nav>
      <div style={styles.searchBar}>
        <input type="text" placeholder="Search Protocol..." style={styles.searchInput} />
        <Search size={18} color="#ff00ff" />
      </div>
    </header>
  )
}
