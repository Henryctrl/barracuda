'use client';

import React, { useState, useEffect, CSSProperties } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Edit, Trash2, Loader2, User, MapPin, TrendingUp } from 'lucide-react';
import MainHeader from '../../../components/MainHeader';
import EditClientPopup from '../../../components/popups/EditClientPopup';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ClientSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  client_search_criteria: {
    min_budget: number;
    max_budget: number;
    locations: string;
  }[];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select(`
        id, first_name, last_name, email, mobile,
        client_search_criteria (min_budget, max_budget, locations)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching clients:', error);
    else setClients((data as unknown as ClientSummary[]) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client and all associated data?')) return;
    
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      alert('Error deleting client');
    } else {
      setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  // Filter clients based on search
  const filteredClients = clients.filter(c => 
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- STYLES ---
  const styles: { [key: string]: CSSProperties } = {
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: '#0d0d21',
      fontFamily: "'Orbitron', sans-serif",
      color: '#00ffff',
      backgroundImage: `linear-gradient(rgba(13, 13, 33, 0.97), rgba(13, 13, 33, 0.97)), repeating-linear-gradient(45deg, rgba(255, 0, 255, 0.05), rgba(255, 0, 255, 0.05) 1px, transparent 1px, transparent 10px)`,
    },
    mainContent: { padding: '30px 20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #ff00ff', paddingBottom: '15px' },
    title: { fontSize: '1.8rem', color: '#ff00ff', textTransform: 'uppercase', textShadow: '0 0 8px rgba(255, 0, 255, 0.7)' },
    searchContainer: { position: 'relative', width: '300px' },
    searchInput: { width: '100%', padding: '10px 10px 10px 40px', backgroundColor: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00ffff', borderRadius: '5px', color: '#fff', outline: 'none' },
    searchIcon: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#00ffff' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
    card: { backgroundColor: 'rgba(0, 255, 255, 0.05)', border: '1px solid #00ffff', borderRadius: '8px', padding: '20px', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' },
    clientName: { fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' },
    clientEmail: { fontSize: '0.85rem', color: '#00ffff', opacity: 0.8 },
    cardBody: { display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' },
    infoRow: { display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc' },
    budget: { color: '#ff00ff', fontWeight: 'bold' },
    actions: { display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed rgba(0, 255, 255, 0.3)' },
    actionBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold', fontSize: '0.8rem' },
    editBtn: { backgroundColor: 'rgba(0, 255, 255, 0.2)', color: '#00ffff', border: '1px solid #00ffff' },
    deleteBtn: { backgroundColor: 'rgba(255, 0, 80, 0.2)', color: '#ff4545', border: '1px solid #ff4545' },
  };

  return (
    <div style={styles.pageContainer}>
      <MainHeader />
      <main style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.title}>// CLIENT DATABASE</h1>
          <div style={styles.searchContainer}>
            <Search size={18} style={styles.searchIcon} />
            <input 
              style={styles.searchInput} 
              placeholder="Search clients..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', color: '#00ffff' }}>
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredClients.map(client => {
              const criteria = client.client_search_criteria?.[0];
              return (
                <div key={client.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <div style={styles.clientName}>{client.first_name} {client.last_name}</div>
                      <div style={styles.clientEmail}>{client.email}</div>
                    </div>
                    <User size={20} color="#ff00ff" />
                  </div>
                  
                  <div style={styles.cardBody}>
                    <div style={styles.infoRow}>
                      <MapPin size={14} />
                      <span>{criteria?.locations || 'No location set'}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <TrendingUp size={14} />
                      <span>Budget: <span style={styles.budget}>
                        {criteria ? `€${(criteria.min_budget/1000).toFixed(0)}k - €${(criteria.max_budget/1000).toFixed(0)}k` : 'N/A'}
                      </span></span>
                    </div>
                  </div>

                  <div style={styles.actions}>
                    <button style={{...styles.actionBtn, ...styles.editBtn}} onClick={() => setEditingClientId(client.id)}>
                      <Edit size={14} /> EDIT
                    </button>
                    <button style={{...styles.actionBtn, ...styles.deleteBtn}} onClick={() => handleDelete(client.id)}>
                      <Trash2 size={14} /> DELETE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {editingClientId && (
        <EditClientPopup 
          isOpen={!!editingClientId} 
          onClose={() => {
            setEditingClientId(null);
            fetchClients(); // Refresh list after edit
          }} 
          clientId={editingClientId}
        />
      )}
    </div>
  );
}
