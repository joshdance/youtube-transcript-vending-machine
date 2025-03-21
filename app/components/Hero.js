'use client';

import React from 'react';

const Hero = () => {
  return (
    <header className="w-full max-w-4xl text-center mb-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">
        YouTube Transcript Vending Machine
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Enter a YouTube URL to get the video's transcript
      </p>
    </header>
  );
};

export default Hero; 