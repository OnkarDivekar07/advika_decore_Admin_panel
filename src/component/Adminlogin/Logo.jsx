// src/components/Logo.js
import React from 'react';

const Logo = () => {
  return (
    <div className="flex justify-center mb-8">
      <img
        src="https://storage.googleapis.com/a1aa/image/4a04be74-8175-47c3-4642-bda8c554b9ad.jpg"
        alt="Admin panel logo, a stylized shield with a keyhole in the center, blue and white colors"
        className="w-24 h-24 object-contain"
        width="100"
        height="100"
      />
    </div>
  );
};

export default Logo;
