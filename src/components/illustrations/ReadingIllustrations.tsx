import React from 'react';

// Golden Trophy with 3D depth and shine for the purple Level progress panel
export const Trophy3DIllustration: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="goldGrad" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFE066" />
        <stop offset="0.5" stopColor="#F5B324" />
        <stop offset="1" stopColor="#D98A09" />
      </linearGradient>
      <linearGradient id="goldCup" x1="30" y1="20" x2="70" y2="60" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFF275" />
        <stop offset="1" stopColor="#E5990B" />
      </linearGradient>
      <filter id="trophyShadow" x="10" y="5" width="80" height="90" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#4B3C9B" floodOpacity="0.3" />
      </filter>
    </defs>
    <g filter="url(#trophyShadow)">
      {/* Handles */}
      <path d="M28 28C16 28 16 46 28 48M72 28C84 28 84 46 72 48" stroke="url(#goldGrad)" strokeWidth="6" strokeLinecap="round" />
      {/* Base */}
      <path d="M35 78H65L68 88H32L35 78Z" fill="#3D2F7E" />
      <rect x="30" y="86" width="40" height="6" rx="3" fill="#2A1E63" />
      {/* Stem */}
      <path d="M46 60H54V78H46V60Z" fill="url(#goldGrad)" />
      {/* Cup Body */}
      <path d="M26 22H74V40C74 53.25 63.25 64 50 64C36.75 64 26 53.25 26 40V22Z" fill="url(#goldCup)" />
      {/* Star on Cup */}
      <path d="M50 32L52.5 38.5H59L53.5 42.5L55.5 49L50 45L44.5 49L46.5 42.5L41 38.5H47.5L50 32Z" fill="#FFFFFF" opacity="0.9" />
      {/* Shimmer Sparkles */}
      <circle cx="70" cy="18" r="2.5" fill="#FFFFFF" />
      <circle cx="78" cy="24" r="1.5" fill="#FFFFFF" />
      <circle cx="22" cy="18" r="2" fill="#FFFFFF" />
    </g>
  </svg>
);

// Welcome Reader Scene: Friendly child reading on a stack of colorful books with floating clouds & speech badges
export const WelcomeReaderIllustration: React.FC<{ className?: string }> = ({ className = 'w-full max-w-sm mx-auto' }) => (
  <svg viewBox="0 0 360 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Child happily reading on a stack of books">
    <defs>
      <linearGradient id="skyBlob" x1="40" y1="40" x2="320" y2="340" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EAF5F7" />
        <stop offset="1" stopColor="#DED5FF" />
      </linearGradient>
      <linearGradient id="book1" x1="70" y1="310" x2="270" y2="340" gradientUnits="userSpaceOnUse">
        <stop stopColor="#48BB78" />
        <stop offset="1" stopColor="#2F855A" />
      </linearGradient>
      <linearGradient id="book2" x1="80" y1="275" x2="260" y2="305" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFC38E" />
        <stop offset="1" stopColor="#ED8936" />
      </linearGradient>
      <linearGradient id="book3" x1="90" y1="240" x2="250" y2="270" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4299E1" />
        <stop offset="1" stopColor="#2B6CB0" />
      </linearGradient>
      <linearGradient id="book4" x1="100" y1="205" x2="240" y2="235" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9F7AEA" />
        <stop offset="1" stopColor="#6B46C1" />
      </linearGradient>
      <linearGradient id="openBookGrad" x1="130" y1="90" x2="230" y2="150" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFC38E" />
        <stop offset="1" stopColor="#F687B3" />
      </linearGradient>
      <filter id="softShadow" x="40" y="320" width="280" height="60" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation="8" />
      </filter>
    </defs>

    {/* Background Soft Blobs */}
    <ellipse cx="180" cy="200" rx="140" ry="140" fill="url(#skyBlob)" opacity="0.65" />
    <circle cx="70" cy="110" r="35" fill="#EAF5F7" opacity="0.8" />
    <circle cx="300" cy="140" r="45" fill="#F2EEFF" opacity="0.8" />

    {/* Floating Playful Badges from Reference */}
    {/* Peach Star Badge: 'Hi' */}
    <g transform="translate(265, 120)">
      <polygon points="25,0 32,15 48,15 35,26 40,42 25,32 10,42 15,26 2,15 18,15" fill="#FFC38E" />
      <text x="25" y="26" textAnchor="middle" fill="#171B37" fontSize="12" fontWeight="900" fontFamily="Nunito, sans-serif">Hi</text>
    </g>

    {/* Purple Cloud Star Badge: 'Hello' */}
    <g transform="translate(200, 290)">
      <rect x="0" y="0" width="75" height="42" rx="18" fill="#DED5FF" />
      <text x="37" y="26" textAnchor="middle" fill="#8274D8" fontSize="14" fontWeight="900" fontFamily="Nunito, sans-serif">Hello</text>
    </g>

    {/* Bottom Ground Shadow */}
    <ellipse cx="180" cy="355" rx="110" ry="14" fill="#8274D8" opacity="0.2" filter="url(#softShadow)" />

    {/* Stack of Books */}
    {/* Book 1 (Bottom - Mint/Green) */}
    <rect x="75" y="315" width="210" height="28" rx="8" fill="url(#book1)" />
    <rect x="85" y="321" width="190" height="16" rx="4" fill="#F7FAFC" />
    <line x1="100" y1="329" x2="260" y2="329" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="4 3" />

    {/* Book 2 (Peach/Orange) */}
    <rect x="85" y="280" width="190" height="26" rx="8" fill="url(#book2)" />
    <rect x="95" y="285" width="170" height="15" rx="4" fill="#FFFFFF" />

    {/* Book 3 (Soft Blue) */}
    <rect x="95" y="246" width="170" height="25" rx="8" fill="url(#book3)" />
    <rect x="105" y="251" width="150" height="14" rx="4" fill="#F7FAFC" />

    {/* Book 4 (Purple) */}
    <rect x="105" y="214" width="150" height="24" rx="8" fill="url(#book4)" />
    <rect x="115" y="219" width="130" height="13" rx="4" fill="#FFFFFF" />

    {/* Cute Young Reader Character */}
    {/* Legs hanging over books */}
    <rect x="150" y="195" width="14" height="45" rx="7" fill="#2B6CB0" />
    <rect x="176" y="195" width="14" height="45" rx="7" fill="#2B6CB0" />
    {/* White sneakers */}
    <rect x="144" y="235" width="22" height="12" rx="6" fill="#FFFFFF" />
    <rect x="174" y="235" width="22" height="12" rx="6" fill="#FFFFFF" />

    {/* Torso & Pink T-shirt */}
    <rect x="145" y="140" width="50" height="60" rx="16" fill="#ED64A6" />

    {/* Arms holding the open book */}
    <path d="M145 155L125 140L145 125" stroke="#F6AD55" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M195 155L215 140L195 125" stroke="#F6AD55" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />

    {/* Open Glowing Book in Hands */}
    <g transform="translate(130, 95)">
      {/* Left page */}
      <path d="M40 32C25 24 10 26 0 30L0 5C10 0 25 2 40 10V32Z" fill="#FFF5EA" />
      {/* Right page */}
      <path d="M40 32C55 24 70 26 80 30L80 5C70 0 55 2 40 10V32Z" fill="#FFFFFF" />
      {/* Book cover spine */}
      <path d="M0 30C12 26 28 24 40 32C52 24 68 26 80 30" stroke="#FFC38E" strokeWidth="6" strokeLinecap="round" />
      {/* Mini lines on pages */}
      <line x1="8" y1="12" x2="30" y2="15" stroke="#CBD5E0" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="19" x2="28" y2="22" stroke="#CBD5E0" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="15" x2="72" y2="12" stroke="#CBD5E0" strokeWidth="2" strokeLinecap="round" />
      <line x1="52" y1="22" x2="72" y2="19" stroke="#CBD5E0" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Head & Face */}
    {/* Neck */}
    <rect x="162" y="125" width="16" height="20" rx="6" fill="#F6AD55" />
    {/* Face */}
    <circle cx="170" cy="95" r="30" fill="#FBD38D" />
    {/* Cute Cheeks */}
    <ellipse cx="152" cy="105" rx="5" ry="3" fill="#FEB2B2" />
    <ellipse cx="188" cy="105" rx="5" ry="3" fill="#FEB2B2" />
    {/* Big Expressive Eyes */}
    <ellipse cx="158" cy="92" rx="4.5" ry="6.5" fill="#171B37" />
    <circle cx="159.5" cy="89.5" r="2" fill="#FFFFFF" />
    <ellipse cx="182" cy="92" rx="4.5" ry="6.5" fill="#171B37" />
    <circle cx="183.5" cy="89.5" r="2" fill="#FFFFFF" />
    {/* Happy Smile */}
    <path d="M164 105C166 110 174 110 176 105" stroke="#7B341E" strokeWidth="2.5" strokeLinecap="round" />

    {/* Hair with cute top buns / bear ears headband like reference */}
    <path d="M142 95C140 68 158 55 170 55C182 55 200 68 198 95C190 92 180 92 170 95C160 92 150 92 142 95Z" fill="#4A2810" />
    {/* Headband with buns */}
    <circle cx="146" cy="52" r="10" fill="#ED64A6" />
    <circle cx="146" cy="52" r="6" fill="#FBB6CE" />
    <circle cx="194" cy="52" r="10" fill="#ED64A6" />
    <circle cx="194" cy="52" r="6" fill="#FBB6CE" />
    <path d="M146 54C160 48 180 48 194 54" stroke="#D53F8C" strokeWidth="4" strokeLinecap="round" />

    {/* Reading Sparkles Floating */}
    <g transform="translate(170, 40)">
      <path d="M0 -8L2 -2L8 0L2 2L0 8L-2 2L-8 0L-2 -2Z" fill="#F6E05E" />
    </g>
    <g transform="translate(105, 120)">
      <path d="M0 -6L1.5 -1.5L6 0L1.5 1.5L0 6L-1.5 1.5L-6 0L-1.5 -1.5Z" fill="#FFC38E" />
    </g>
  </svg>
);

// Illustrated Circular Shortcut Icons for the 5 Skill categories matching reference
export const ShortcutIcon: React.FC<{
  type: 'sounds' | 'phonics' | 'sight-words' | 'stories' | 'discover';
  className?: string;
}> = ({ type, className = 'w-12 h-12' }) => {
  switch (type) {
    case 'sounds':
      return (
        <div className={`${className} rounded-full bg-[#EAF5F7] border-2 border-[#DED5FF] flex items-center justify-center p-2 text-[#8274D8] shadow-xs group-hover:scale-105 transition-transform`}>
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect x="10" y="8" width="12" height="18" rx="6" fill="#8274D8" />
            <path d="M6 18C6 24.6 11.4 30 18 30M18 30C24.6 30 30 24.6 30 18" stroke="#8274D8" strokeWidth="3" strokeLinecap="round" />
            <line x1="18" y1="30" x2="18" y2="36" stroke="#8274D8" strokeWidth="3" strokeLinecap="round" />
            <line x1="12" y1="36" x2="24" y2="36" stroke="#8274D8" strokeWidth="3" strokeLinecap="round" />
            <path d="M28 10C32 12 34 15 34 18" stroke="#FFC38E" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'phonics':
      return (
        <div className={`${className} rounded-full bg-[#F2EEFF] border-2 border-[#DED5FF] flex items-center justify-center p-2 text-[#8274D8] shadow-xs group-hover:scale-105 transition-transform`}>
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect x="7" y="15" width="14" height="14" rx="4" fill="#FFC38E" />
            <text x="14" y="26" textAnchor="middle" fill="#171B37" fontSize="11" fontWeight="900" fontFamily="Nunito">A</text>
            <rect x="19" y="9" width="14" height="14" rx="4" fill="#8274D8" />
            <text x="26" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="Nunito">B</text>
            <rect x="17" y="21" width="14" height="14" rx="4" fill="#DDF1E8" />
            <text x="24" y="32" textAnchor="middle" fill="#171B37" fontSize="11" fontWeight="900" fontFamily="Nunito">C</text>
          </svg>
        </div>
      );
    case 'sight-words':
      return (
        <div className={`${className} rounded-full bg-[#FFF5EA] border-2 border-[#FFC38E] flex items-center justify-center p-2 text-[#8274D8] shadow-xs group-hover:scale-105 transition-transform`}>
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <circle cx="18" cy="18" r="10" stroke="#8274D8" strokeWidth="3.5" fill="#FFFFFF" />
            <line x1="25.5" y1="25.5" x2="33" y2="33" stroke="#8274D8" strokeWidth="4" strokeLinecap="round" />
            <path d="M14 18L17 21L23 15" stroke="#FFC38E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="28" cy="10" r="2" fill="#FFC38E" />
          </svg>
        </div>
      );
    case 'stories':
      return (
        <div className={`${className} rounded-full bg-[#EAF5F7] border-2 border-[#DED5FF] flex items-center justify-center p-2 text-[#8274D8] shadow-xs group-hover:scale-105 transition-transform`}>
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <path d="M8 12C14 10 18 11 20 13C22 11 26 10 32 12V30C26 28 22 29 20 31C18 29 14 28 8 30V12Z" fill="#DED5FF" stroke="#8274D8" strokeWidth="2.5" strokeLinejoin="round" />
            <line x1="20" y1="13" x2="20" y2="31" stroke="#8274D8" strokeWidth="2.5" />
            <path d="M12 18H16M12 22H16M24 18H28M24 22H28" stroke="#8274D8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'discover':
      return (
        <div className={`${className} rounded-full bg-[#DDF1E8] border-2 border-[#C6E6D8] flex items-center justify-center p-2 text-[#171B37] shadow-xs group-hover:scale-105 transition-transform`}>
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <path d="M12 28L28 12M28 12L22 10M28 12L30 18" stroke="#171B37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="8" y1="32" x2="16" y2="24" stroke="#8274D8" strokeWidth="4" strokeLinecap="round" />
            <circle cx="10" cy="12" r="2" fill="#FFC38E" />
            <circle cx="32" cy="26" r="1.5" fill="#8274D8" />
          </svg>
        </div>
      );
  }
};

// Next Quest Banner Vignette (Kids reading together with companion mascot)
export const ReadingGroupVignette: React.FC<{ className?: string }> = ({ className = 'w-36 h-28' }) => (
  <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <ellipse cx="80" cy="105" rx="65" ry="10" fill="#8274D8" opacity="0.15" />
    {/* Mascot Orange Fruit / Character */}
    <circle cx="45" cy="65" r="24" fill="#FFC38E" />
    <path d="M45 41C48 30 58 35 56 43" stroke="#48BB78" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <circle cx="38" cy="62" r="3" fill="#171B37" />
    <circle cx="52" cy="62" r="3" fill="#171B37" />
    <path d="M41 72C43 75 47 75 49 72" stroke="#171B37" strokeWidth="2" strokeLinecap="round" />

    {/* Child 1 (Boy with book) */}
    <circle cx="85" cy="50" r="16" fill="#FBD38D" />
    <path d="M72 45C72 32 82 28 88 28C98 28 102 36 102 46" fill="#5A3A22" />
    <rect x="74" y="66" width="24" height="32" rx="8" fill="#4299E1" />
    <path d="M80 75H94V88H80Z" fill="#FFF5EA" stroke="#ED8936" strokeWidth="2" rx="2" />

    {/* Child 2 (Girl with graduation cap/star) */}
    <circle cx="120" cy="54" r="15" fill="#F6AD55" />
    <path d="M106 50C106 35 118 32 125 32C136 32 138 42 138 52" fill="#2C1810" />
    <rect x="110" y="69" width="22" height="30" rx="8" fill="#9F7AEA" />
    {/* Graduation / scholar hat */}
    <polygon points="120,24 136,30 120,36 104,30" fill="#171B37" />
    <circle cx="120" cy="30" r="2" fill="#FFC38E" />
    <line x1="120" y1="30" x2="134" y2="38" stroke="#FFC38E" strokeWidth="2" />
  </svg>
);
