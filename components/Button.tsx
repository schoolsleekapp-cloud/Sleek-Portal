import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  type = 'button', 
  disabled = false 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100",
    danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
    success: "bg-emerald-500 text-white hover:bg-emerald-600",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100"
  };
  return (
    <button 
      type={type} 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      onClick={onClick} 
      disabled={disabled}
    >
      {children}
    </button>
  );
};
