export const THEMES = [
  {
    id: 'dark',
    name: '🌑 Dark',
    vars: {
      '--bg-void': '#060607',
      '--bg-deep': '#0d0d0f',
      '--bg-base': '#111114',
      '--bg-raised': '#18181c',
      '--bg-float': '#1e1e24',
      '--bg-hover': '#24242c',
      '--bg-active': '#2a2a34',
      '--accent': '#7a7a88',
      '--accent-dim': 'rgba(122,122,136,0.15)',
      '--accent-glow': 'rgba(122,122,136,0.08)',
    }
  },
  {
    id: 'midnight',
    name: '🌃 Midnight',
    vars: {
      '--bg-void': '#000005',
      '--bg-deep': '#05050f',
      '--bg-base': '#08081a',
      '--bg-raised': '#0e0e22',
      '--bg-float': '#13132a',
      '--bg-hover': '#1a1a34',
      '--bg-active': '#22223e',
      '--accent': '#5865f2',
      '--accent-dim': 'rgba(88,101,242,0.15)',
      '--accent-glow': 'rgba(88,101,242,0.08)',
    }
  },
  {
    id: 'forest',
    name: '🌲 Forest',
    vars: {
      '--bg-void': '#020806',
      '--bg-deep': '#060f09',
      '--bg-base': '#0a160d',
      '--bg-raised': '#101e13',
      '--bg-float': '#15261a',
      '--bg-hover': '#1c3022',
      '--bg-active': '#223a28',
      '--accent': '#23a55a',
      '--accent-dim': 'rgba(35,165,90,0.15)',
      '--accent-glow': 'rgba(35,165,90,0.08)',
    }
  },
  {
    id: 'ocean',
    name: '🌊 Ocean',
    vars: {
      '--bg-void': '#020608',
      '--bg-deep': '#050d12',
      '--bg-base': '#081318',
      '--bg-raised': '#0e1c22',
      '--bg-float': '#13242c',
      '--bg-hover': '#1a2f38',
      '--bg-active': '#203844',
      '--accent': '#3ba1cc',
      '--accent-dim': 'rgba(59,161,204,0.15)',
      '--accent-glow': 'rgba(59,161,204,0.08)',
    }
  },
  {
    id: 'sakura',
    name: '🌸 Sakura',
    vars: {
      '--bg-void': '#080508',
      '--bg-deep': '#100810',
      '--bg-base': '#150c18',
      '--bg-raised': '#1e1020',
      '--bg-float': '#261528',
      '--bg-hover': '#301c34',
      '--bg-active': '#3a2240',
      '--accent': '#eb459e',
      '--accent-dim': 'rgba(235,69,158,0.15)',
      '--accent-glow': 'rgba(235,69,158,0.08)',
    }
  },
  {
    id: 'crimson',
    name: '🔴 Crimson',
    vars: {
      '--bg-void': '#080203',
      '--bg-deep': '#100507',
      '--bg-base': '#16080a',
      '--bg-raised': '#200d0f',
      '--bg-float': '#281215',
      '--bg-hover': '#32181c',
      '--bg-active': '#3c1e22',
      '--accent': '#ed4245',
      '--accent-dim': 'rgba(237,66,69,0.15)',
      '--accent-glow': 'rgba(237,66,69,0.08)',
    }
  },
];

export function applyTheme(themeId, customBg = null) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, val]) => root.style.setProperty(key, val));

  let styleTag = document.getElementById('nihilistic-bg-style');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'nihilistic-bg-style';
    document.head.appendChild(styleTag);
  }
  if (customBg) {
    styleTag.textContent = `.main-panel { background-image: url(${customBg}) !important; background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; }`;
  } else {
    styleTag.textContent = '';
  }
}

export function loadSavedTheme() {
  const saved = localStorage.getItem('nihilisticchat_theme') || 'dark';
  const customBg = localStorage.getItem('nihilisticchat_bg') || null;
  applyTheme(saved, customBg);
  return { themeId: saved, customBg };
}

export function saveTheme(themeId, customBg = null) {
  localStorage.setItem('nihilisticchat_theme', themeId);
  if (customBg) localStorage.setItem('nihilisticchat_bg', customBg);
  else localStorage.removeItem('nihilisticchat_bg');
  applyTheme(themeId, customBg);
}