'use client';

import React from 'react';
import Image from 'next/image';

const Hero = () => {
  return (
    <header className="w-full max-w-4xl text-center mb-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">
        YouTube Transcript Vending Machine
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Enter a YouTube URL to get the video&apos;s transcript
      </p>
      <div className="relative w-full max-w-sm mx-auto mt-6 aspect-[2/3]">
        <Image
          src="/images/vendingmachine1.jpeg"
          alt="YouTube transcript vending machine"
          fill
          className="object-cover rounded-xl shadow-lg"
          priority
        />
      </div>
    </header>
  );
};

export default Hero; 