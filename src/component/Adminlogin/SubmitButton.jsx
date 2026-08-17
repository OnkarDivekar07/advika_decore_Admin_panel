// src/components/SubmitButton.js
import React from 'react';

const SubmitButton = ({ text, disabled }) => {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-busy={disabled || undefined}
      className="w-full flex justify-center py-4 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {text}
    </button>
  );
};

export default SubmitButton;
