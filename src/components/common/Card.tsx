import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'white' | 'lavender' | 'highlight';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'white',
  interactive = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    white: 'bg-white border-2 border-[#E2DAED] shadow-sm shadow-purple-900/5',
    lavender: 'bg-[#EDE7F6] border-2 border-[#D8CCE8]',
    highlight: 'bg-gradient-to-br from-white to-[#F6F3FC] border-2 border-[#C8B8E2] shadow-md shadow-purple-900/5',
  };

  const interactiveStyles = interactive
    ? 'transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#8B5CF6]/50 cursor-pointer'
    : '';

  return (
    <div
      className={`rounded-3xl p-6 sm:p-7 ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
