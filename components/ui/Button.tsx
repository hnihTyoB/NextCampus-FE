import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 
  | 'primary'       // Brand Main
  | 'secondary'     // Secondary action
  | 'glass'         // Glassmorphism card style
  | 'outline'       // Border outline
  | 'ghost'         // Transparent ghost button
  | 'metal-silver'  // Silver metallic style
  | 'metal-blue'    // Blue futuristic steel
  | 'chrome-glow'   // Chrome with radiant glow
  | 'danger';       // Danger/delete state

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

function sanitizeLoadingChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)) {
      const className = child.props.className;
      if (typeof className === "string" && className.includes("animate-spin")) {
        return null;
      }
      if (child.props.children) {
        return React.cloneElement(child, {
          children: sanitizeLoadingChildren(child.props.children),
        });
      }
    }
    return child;
  });
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  fullWidth = false,
  disabled,
  ...props
}, ref) => {

  const baseStyles = 'relative inline-flex items-center justify-center font-semibold tracking-wide rounded-xl transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-40 select-none overflow-hidden';

  const sizeStyles: Record<ButtonSize, string> = {
    icon: 'h-10 w-10 p-0 text-sm rounded-xl shrink-0',
    sm: 'px-3 py-2 text-xs rounded-lg gap-1.5',
    md: 'px-5 py-3 text-sm rounded-xl gap-2',
    lg: 'px-7 py-4 text-base rounded-2xl gap-2.5',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-primary-main text-white shadow-soft hover:bg-primary-light hover:text-white',
    
    secondary: 'bg-card text-foreground border border-border hover:bg-card-hover hover:border-border-strong',

    outline: 'border border-border text-foreground bg-transparent hover:bg-card-hover hover:border-border-strong',

    ghost: 'text-muted hover:text-foreground hover:bg-card-hover',

    glass: 'bg-card text-foreground border border-border hover:bg-card-hover hover:border-border-strong shadow-glass backdrop-blur-md',
    
    'metal-silver': 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-transparent bg-clip-text shadow-md before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent hover:before:opacity-100 hover:border-white/40 [&>*]:metal-text',
    
    'metal-blue': 'bg-gradient-to-br from-primary-main/30 via-background to-primary-light/10 border border-primary-light/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-primary-light/60 hover:shadow-[0_0_15px_rgba(21,174,245,0.2)] [&>*]:metal-blue',
    
    'chrome-glow': 'bg-gradient-to-r from-white/15 via-white/5 to-white/15 border-y border-white/30 border-x border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(19,152,212,0.3)] metal-glow [&>*]:chrome-text',
    
    danger: 'bg-danger/20 text-danger border border-danger/40 hover:bg-danger hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.1)]',
  };

  const innerGapStyles: Record<ButtonSize, string> = {
    icon: 'gap-0',
    sm: 'gap-1.5',
    md: 'gap-2',
    lg: 'gap-2.5',
  };

  const widthStyle = fullWidth ? 'w-full flex' : '';

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {['metal-silver', 'metal-blue', 'chrome-glow'].includes(variant) && !disabled && (
        <span className="absolute inset-0 w-[200%] -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {loadingText ? <span>{loadingText}</span> : children ? <span>{sanitizeLoadingChildren(children)}</span> : null}
        </div>
      ) : (
        <span className={`flex items-center justify-center ${innerGapStyles[size]} w-full h-full`}>
          {children}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;