import { loadFont as loadPlusJakartaSans } from '@remotion/google-fonts/PlusJakartaSans';
import { loadFont as loadOrbitron } from '@remotion/google-fonts/Orbitron';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadAnton } from '@remotion/google-fonts/Anton';
import { loadFont as loadRighteous } from '@remotion/google-fonts/Righteous';
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';
import type { LyricTemplate } from './types';

const SCRIM_BOTTOM =
  'linear-gradient(to top, rgba(4, 7, 14, 0.92) 0%, rgba(4, 7, 14, 0.62) 28%, rgba(4, 7, 14, 0.16) 54%, rgba(4, 7, 14, 0) 76%)';

export const skyKaraoke: LyricTemplate = {
  id: 'sky-karaoke',
  name: 'Sky Karaoke',
  description: 'Biru langit, scrim gelap di bawah',
  loadFont: () =>
    loadPlusJakartaSans('normal', { weights: ['800'], subsets: ['latin'] }).fontFamily,
  font: { weight: 800, letterSpacing: '-0.02em', lineHeight: 1.18 },
  fontSize: 68,
  colors: { active: '#38bdf8', sung: '#f8fafc', upcoming: 'rgba(248, 250, 252, 0.72)' },
  shadow: {
    active: (c) => `0 6px 28px ${c}8c, 0 3px 10px rgba(0, 0, 0, 0.92)`,
    idle: '0 4px 16px rgba(0, 0, 0, 0.9)',
  },
  scrim: SCRIM_BOTTOM,
  position: { vertical: 'bottom', offsetRatio: 210 / 1920, maxWidthRatio: 940 / 1080 },
  uppercase: false,
  animation: { enter: 'rise', activeScale: 1.12 },
  swatch: { bg: '#0b1220', text: '#f8fafc', accent: '#38bdf8' },
};

export const neonPulse: LyricTemplate = {
  id: 'neon-pulse',
  name: 'Neon Pulse',
  description: 'Magenta dan cyan, glow kuat',
  loadFont: () => loadOrbitron('normal', { weights: ['800'], subsets: ['latin'] }).fontFamily,
  font: { weight: 800, letterSpacing: '0.02em', lineHeight: 1.2 },
  fontSize: 58,
  colors: { active: '#ff2bd6', sung: '#67e8f9', upcoming: 'rgba(103, 232, 249, 0.5)' },
  shadow: {
    active: (c) => `0 0 12px ${c}, 0 0 34px ${c}, 0 0 70px ${c}99`,
    idle: '0 0 10px rgba(103, 232, 249, 0.55), 0 0 26px rgba(103, 232, 249, 0.3)',
  },
  scrim: 'linear-gradient(to top, rgba(10, 2, 24, 0.85) 0%, rgba(10, 2, 24, 0.45) 35%, rgba(10, 2, 24, 0) 70%)',
  position: { vertical: 'bottom', offsetRatio: 220 / 1920, maxWidthRatio: 940 / 1080 },
  uppercase: true,
  animation: { enter: 'pop', activeScale: 1.18 },
  swatch: { bg: '#12041f', text: '#67e8f9', accent: '#ff2bd6' },
};

export const cleanWhite: LyricTemplate = {
  id: 'clean-white',
  name: 'Clean White',
  description: 'Putih minimalis, shadow tipis',
  loadFont: () => loadInter('normal', { weights: ['700'], subsets: ['latin'] }).fontFamily,
  font: { weight: 700, letterSpacing: '-0.01em', lineHeight: 1.25 },
  fontSize: 60,
  colors: { active: '#ffffff', sung: 'rgba(255, 255, 255, 0.95)', upcoming: 'rgba(255, 255, 255, 0.5)' },
  shadow: {
    active: () => '0 2px 14px rgba(0, 0, 0, 0.7)',
    idle: '0 2px 12px rgba(0, 0, 0, 0.6)',
  },
  scrim: 'linear-gradient(to top, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0) 45%)',
  position: { vertical: 'bottom', offsetRatio: 230 / 1920, maxWidthRatio: 900 / 1080 },
  uppercase: false,
  animation: { enter: 'fade', activeScale: 1.04 },
  swatch: { bg: '#1e293b', text: '#ffffff', accent: '#ffffff' },
};

export const boldYellow: LyricTemplate = {
  id: 'bold-yellow',
  name: 'Bold Yellow',
  description: 'Kuning tebal dengan outline hitam',
  loadFont: () => loadAnton('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily,
  font: { weight: 400, letterSpacing: '0.01em', lineHeight: 1.15 },
  fontSize: 88,
  colors: { active: '#ffe600', sung: '#ffffff', upcoming: '#ffffff' },
  stroke: { width: 10, color: '#000000' },
  shadow: {
    active: () => '0 8px 0 rgba(0, 0, 0, 0.9)',
    idle: '0 6px 0 rgba(0, 0, 0, 0.9)',
  },
  scrim: null,
  position: { vertical: 'middle', offsetRatio: 0 / 1920, maxWidthRatio: 940 / 1080 },
  uppercase: true,
  animation: { enter: 'pop', activeScale: 1.14 },
  swatch: { bg: '#262626', text: '#ffffff', accent: '#ffe600' },
};

export const retroWave: LyricTemplate = {
  id: 'retro-wave',
  name: 'Retro Wave',
  description: 'Oranye dan ungu, huruf kapital',
  loadFont: () => loadRighteous('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily,
  font: { weight: 400, letterSpacing: '0.04em', lineHeight: 1.2 },
  fontSize: 64,
  colors: { active: '#ff8a3d', sung: '#f5d0fe', upcoming: 'rgba(245, 208, 254, 0.55)' },
  shadow: {
    active: (c) => `3px 3px 0 #7c3aed, 6px 6px 0 rgba(124, 58, 237, 0.5), 0 0 30px ${c}80`,
    idle: '3px 3px 0 rgba(124, 58, 237, 0.7)',
  },
  scrim: 'linear-gradient(to top, rgba(30, 6, 56, 0.85) 0%, rgba(30, 6, 56, 0.4) 38%, rgba(30, 6, 56, 0) 72%)',
  position: { vertical: 'bottom', offsetRatio: 200 / 1920, maxWidthRatio: 940 / 1080 },
  uppercase: true,
  animation: { enter: 'rise', activeScale: 1.1 },
  swatch: { bg: '#1e0638', text: '#f5d0fe', accent: '#ff8a3d' },
};

export const classicSub: LyricTemplate = {
  id: 'classic-sub',
  name: 'Classic Subtitle',
  description: 'Teks putih di kotak hitam transparan',
  loadFont: () => loadPoppins('normal', { weights: ['600'], subsets: ['latin'] }).fontFamily,
  font: { weight: 600, letterSpacing: '0', lineHeight: 1.3 },
  fontSize: 52,
  colors: { active: '#fde047', sung: '#ffffff', upcoming: 'rgba(255, 255, 255, 0.85)' },
  shadow: { active: () => 'none', idle: 'none' },
  scrim: null,
  box: { background: 'rgba(0, 0, 0, 0.62)', radius: 18, paddingX: 36, paddingY: 22 },
  position: { vertical: 'bottom', offsetRatio: 230 / 1920, maxWidthRatio: 900 / 1080 },
  uppercase: false,
  animation: { enter: 'fade', activeScale: 1.0 },
  swatch: { bg: '#334155', text: '#ffffff', accent: '#fde047' },
};
