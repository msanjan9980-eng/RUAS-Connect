import { motion } from 'framer-motion';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-white text-black hover:bg-accent shadow-lg",
    secondary: "bg-surface text-white border border-border hover:bg-border/50",
    danger: "bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/60",
    icon: "p-2 text-muted hover:text-white transition-colors"
  };

  return (
    <motion.button whileTap={{ scale: 0.98 }} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </motion.button>
  );
};