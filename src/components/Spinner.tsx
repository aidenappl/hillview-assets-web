type SpinnerProps = { className?: string };

export default function Spinner({ className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`loader inline-block ${className}`}
    />
  );
}
