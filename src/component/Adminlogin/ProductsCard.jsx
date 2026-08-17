// src/components/ProductCard.jsx
import React from 'react';

const ProductCard = ({ imgSrc, altText, productName }) => {
  return (
    <div className="border rounded-lg p-3 bg-gray-50 flex flex-col items-center">
      <img src={imgSrc} alt={altText} className="rounded mb-3 w-full object-cover h-40" />
      <p className="font-medium text-gray-900 mb-1">{productName}</p>
      <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm w-full">Edit</button>
    </div>
  );
};

export default ProductCard;
