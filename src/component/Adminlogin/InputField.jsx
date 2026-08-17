// src/components/InputField.js
import React from 'react';

const InputField = ({ label, type, name, placeholder, iconClass, value, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={name}>
        {label}
      </label>
      <div className="relative rounded-md shadow-sm">
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          required
          value={value}
          onChange={onChange}
          className="block w-full pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-lg py-4 px-4"
        />
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <i className={`${iconClass} text-gray-400 text-lg`}></i>
        </div>
      </div>
    </div>
  );
};

export default InputField;
