import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'purple' | 'secondary' | 'peach' | 'navy' | 'outline' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'group inline-flex items-center justify-center font-extrabold tracking-wide rounded-2xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer select-none whitespace-nowrap shrink-0 active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:hover:translate-y-0 disabled:hover:shadow-none focus-visible:outline-3 focus-visible:outline-[#7C65E8] focus-visible:outline-offset-2';

  const sizeStyles = {
    sm: 'text-xs sm:text-sm px-4 py-2 min-h-[42px] gap-2',
    md: 'text-sm sm:text-base px-5 py-2.5 min-h-[46px] gap-2',
    lg: 'text-base sm:text-lg px-7 py-3.5 min-h-[54px] gap-2.5 rounded-[18px]',
    xl: 'text-lg sm:text-xl px-8 py-4 min-h-[60px] gap-3 rounded-[20px]',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-b from-[#8670F0] to-[#725BE0] text-white border border-[#5B44C8] shadow-[0_6px_14px_-4px_rgba(124,101,232,0.42),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-3px_0_rgba(88,67,196,0.9)] hover:-translate-y-0.5 hover:from-[#8E79F4] hover:to-[#7963E5] hover:shadow-[0_10px_20px_-4px_rgba(124,101,232,0.5),inset_0_1px_0_rgba(255,255,255,0.34),inset_0_-3px_0_rgba(88,67,196,0.95)]',
    purple:
      'bg-gradient-to-b from-[#8670F0] to-[#725BE0] text-white border border-[#5B44C8] shadow-[0_6px_14px_-4px_rgba(124,101,232,0.42),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-3px_0_rgba(88,67,196,0.9)] hover:-translate-y-0.5 hover:from-[#8E79F4] hover:to-[#7963E5] hover:shadow-[0_10px_20px_-4px_rgba(124,101,232,0.5),inset_0_1px_0_rgba(255,255,255,0.34),inset_0_-3px_0_rgba(88,67,196,0.95)]',
    secondary:
      'bg-[#EEE9FF] text-[#5843C4] border-[1.5px] border-[#D4C9FB] shadow-[0_3px_10px_-3px_rgba(23,27,58,0.06),inset_0_-2px_0_rgba(212,201,251,0.9)] hover:bg-[#E4DCFF] hover:border-[#7C65E8] hover:-translate-y-0.5',
    peach:
      'bg-[#FFAE80] text-[#171B3A] border border-[#E88D58] hover:bg-[#FA9D68] shadow-[0_4px_12px_-3px_rgba(255,174,128,0.45),inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(218,125,73,0.8)] hover:-translate-y-0.5',
    navy:
      'bg-[#171B3A] text-white border border-[#0F1228] hover:bg-[#252C55] shadow-[0_4px_12px_-3px_rgba(23,27,58,0.25),inset_0_-2px_0_rgba(10,12,28,0.9)] hover:-translate-y-0.5',
    outline:
      'bg-white text-[#5843C4] border-[1.5px] border-[#D4C9FB] shadow-[0_3px_10px_-3px_rgba(23,27,58,0.06),inset_0_-2px_0_rgba(222,213,255,0.8)] hover:bg-[#FAF9FF] hover:border-[#7C65E8] hover:-translate-y-0.5',
    ghost:
      'bg-transparent text-[#171B3A] hover:bg-[#EEE9FF]/60 active:bg-[#EEE9FF]',
    success:
      'bg-[#65D7B2] text-[#171B3A] border border-[#42B892] hover:bg-[#53CCA5] shadow-[0_4px_12px_-3px_rgba(101,215,178,0.45),inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(48,168,129,0.85)] hover:-translate-y-0.5',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : icon && iconPosition === 'left' ? (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' ? (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </button>
  );
};
