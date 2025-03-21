'use client';

import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-auto py-6 text-center text-gray-500 text-sm">
      Made with <span className="heart cursor-pointer select-none">❤️</span> by{' '}
      <a
        href="https://twitter.com/joshdance"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        Josh Dance
      </a>
      <style jsx>{`
        @keyframes heartbeat {
          0% { transform: scale(1); }
          25% { transform: scale(1.1); }
          50% { transform: scale(1); }
          75% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .heart:hover {
          display: inline-block;
          animation: heartbeat 1s ease-in-out infinite;
        }
      `}</style>
    </footer>
  );
};

export default Footer; 