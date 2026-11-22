export const Input = ({ label, id, error, ...props }) => {
  return (
    <div className="relative group w-full">
      <input
        id={id}
        className="w-full bg-transparent border-b border-border py-3 text-white placeholder-transparent focus:outline-none focus:border-accent transition-colors peer"
        placeholder={label}
        {...props}
      />
      <label
        htmlFor={id}
        className="absolute left-0 top-3 text-muted text-sm pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-xs peer-focus:text-accent peer-valid:-top-4 peer-valid:text-xs"
      >
        {label}
      </label>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};