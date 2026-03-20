import { useState, useEffect } from 'react';
import api from '../../lib/api';

const TYPE_LABELS = {
  username_color: '🎨 Username Colors',
  profile_border: '🖼️ Profile Borders',
  badge: '🏅 Badges',
};

export default function ShopPage({ onClose }) {
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tickets, setTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('shop');

  const load = () => {
    api.get('/api/shop').then(({ data }) => {
      setItems(data.items);
      setInventory(data.inventory);
      setTickets(data.tickets);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const isOwned = (itemId) => inventory.some(i => i.item_id === itemId);
  const isEquipped = (itemId) => inventory.some(i => i.item_id === itemId && i.equipped);

  const buy = async (item) => {
    setBuying(item.id);
    try {
      const { data } = await api.post(`/api/shop/buy/${item.id}`);
      setTickets(data.tickets);
      setMsg(`✅ Purchased ${item.name}!`);
      load();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.error || 'Error'}`);
    } finally {
      setBuying(null);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const toggleEquip = async (item) => {
    const equipped = !isEquipped(item.id);
    try {
      await api.patch(`/api/shop/equip/${item.id}`, { equipped });
      setMsg(equipped ? `✅ ${item.name} equipped!` : `${item.name} unequipped`);
      load();
    } catch (err) {
      setMsg('❌ Error');
    } finally {
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const ownedItems = items.filter(i => isOwned(i.id));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 16, width: 700, height: 580, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: 'var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🎟️</span>
            <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: 15 }}>Ticket Shop</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700, color: '#ffd700' }}>
              🎟️ {tickets.toLocaleString()} tickets
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg-float)', border: 'none', color: 'var(--gray-3)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: 'var(--border)', flexShrink: 0 }}>
          <button onClick={() => setActiveTab('shop')} style={{ flex: 1, padding: '10px', background: activeTab === 'shop' ? 'var(--bg-float)' : 'none', border: 'none', borderBottom: activeTab === 'shop' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'shop' ? 'var(--white)' : 'var(--gray-3)', fontSize: 13, cursor: 'pointer', fontWeight: activeTab === 'shop' ? 600 : 400 }}>
            🛍️ Shop
          </button>
          <button onClick={() => setActiveTab('inventory')} style={{ flex: 1, padding: '10px', background: activeTab === 'inventory' ? 'var(--bg-float)' : 'none', border: 'none', borderBottom: activeTab === 'inventory' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'inventory' ? 'var(--white)' : 'var(--gray-3)', fontSize: 13, cursor: 'pointer', fontWeight: activeTab === 'inventory' ? 600 : 400 }}>
            🎒 My Items {ownedItems.length > 0 && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, borderRadius: 99, padding: '1px 5px', marginLeft: 4 }}>{ownedItems.length}</span>}
          </button>
          <button onClick={() => setActiveTab('earn')} style={{ flex: 1, padding: '10px', background: activeTab === 'earn' ? 'var(--bg-float)' : 'none', border: 'none', borderBottom: activeTab === 'earn' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'earn' ? 'var(--white)' : 'var(--gray-3)', fontSize: 13, cursor: 'pointer', fontWeight: activeTab === 'earn' ? 600 : 400 }}>
            💡 How to Earn
          </button>
        </div>

        {msg && <div style={{ padding: '8px 20px', background: msg.startsWith('✅') ? 'rgba(35,165,90,0.1)' : 'rgba(237,66,69,0.1)', fontSize: 13, color: msg.startsWith('✅') ? '#23a55a' : '#f23f43', flexShrink: 0 }}>{msg}</div>}

        {/* Shop Tab */}
        {activeTab === 'shop' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {loading && <p style={{ color: 'var(--gray-2)', textAlign: 'center' }}>Loading...</p>}
            {Object.entries(grouped).map(([type, typeItems]) => (
              <div key={type} style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-2)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>{TYPE_LABELS[type] || type}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {typeItems.map(item => (
                    <div key={item.id} style={{ background: isOwned(item.id) ? 'rgba(88,101,242,0.08)' : 'var(--bg-float)', border: isOwned(item.id) ? '1px solid rgba(88,101,242,0.3)' : 'var(--border-bright)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{item.emoji}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: item.type === 'username_color' ? item.value : 'var(--white)' }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-2)' }}>{item.description}</div>
                        </div>
                      </div>
                      {item.type === 'profile_border' && item.value !== 'rainbow' && (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${item.value}`, background: 'var(--bg-base)', margin: '0 auto' }} />
                      )}
                      {item.type === 'profile_border' && item.value === 'rainbow' && (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid transparent', background: 'linear-gradient(var(--bg-base), var(--bg-base)) padding-box, linear-gradient(45deg, #ff0000, #ff7700, #ffff00, #00ff00, #0000ff, #8b00ff) border-box', margin: '0 auto' }} />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ffd700' }}>🎟️ {item.price}</span>
                        {isOwned(item.id) ? (
                          <span style={{ fontSize: 11, color: '#23a55a', fontWeight: 600 }}>✓ Owned</span>
                        ) : (
                          <button onClick={() => buy(item)} disabled={buying === item.id || tickets < item.price} style={{ background: tickets >= item.price ? 'var(--accent)' : 'var(--bg-active)', color: tickets >= item.price ? '#fff' : 'var(--gray-2)', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: tickets >= item.price ? 'pointer' : 'not-allowed', opacity: buying === item.id ? 0.5 : 1 }}>
                            {buying === item.id ? '...' : 'Buy'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {ownedItems.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-2)' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🎒</div><p>No items yet — buy something from the shop!</p></div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {ownedItems.map(item => (
                <div key={item.id} style={{ background: isEquipped(item.id) ? 'rgba(88,101,242,0.1)' : 'var(--bg-float)', border: isEquipped(item.id) ? '1px solid var(--accent)' : 'var(--border-bright)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{item.emoji}</span>
                    <div style={{ fontSize: 13, fontWeight: 600, color: item.type === 'username_color' ? item.value : 'var(--white)' }}>{item.name}</div>
                  </div>
                  {item.type !== 'badge' && (
                    <button onClick={() => toggleEquip(item)} style={{ background: isEquipped(item.id) ? 'var(--danger-dim)' : 'var(--accent)', color: isEquipped(item.id) ? 'var(--danger)' : '#fff', border: isEquipped(item.id) ? '1px solid rgba(237,66,69,0.3)' : 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {isEquipped(item.id) ? 'Unequip' : 'Equip'}
                    </button>
                  )}
                  {item.type === 'badge' && (
                    <button onClick={() => toggleEquip(item)} style={{ background: isEquipped(item.id) ? 'var(--danger-dim)' : 'var(--accent)', color: isEquipped(item.id) ? 'var(--danger)' : '#fff', border: isEquipped(item.id) ? '1px solid rgba(237,66,69,0.3)' : 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {isEquipped(item.id) ? 'Remove Badge' : 'Show Badge'}
                    </button>
                  )}
                  {isEquipped(item.id) && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>✓ Equipped</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How to Earn Tab */}
        {activeTab === 'earn' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { game: '🎯 Aim Trainer', desc: 'Earn 1 ticket per 50 score points', example: 'Score 1000 → 20 tickets' },
              { game: '⌨️ Type Racer', desc: 'Earn 2 tickets per WPM', example: '60 WPM → 120 tickets' },
              { game: '⚡ Reaction Test', desc: 'Earn tickets based on speed', example: '<200ms → 50 | <300ms → 30 | <400ms → 15 | else → 5' },
            ].map(item => (
              <div key={item.game} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>{item.game}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-3)', marginBottom: 4 }}>{item.desc}</div>
                <div style={{ fontSize: 12, color: '#ffd700' }}>🎟️ {item.example}</div>
              </div>
            ))}
            <div style={{ background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.2)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: 4 }}>💡 Tips</div>
              <div style={{ fontSize: 12, color: 'var(--gray-3)', lineHeight: 1.6 }}>
                • Tickets are awarded when you beat your personal best score<br/>
                • Playing the same game multiple times only earns tickets on improvement<br/>
                • Higher scores = more tickets!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}