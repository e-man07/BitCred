export function BtcIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="var(--btc)" />
      <path
        d="M21.6 14.3c.3-1.9-1.2-3-3.1-3.6l.6-2.5-1.5-.4-.6 2.4c-.4-.1-.8-.2-1.2-.3l.6-2.4-1.5-.4-.6 2.5c-.3-.1-.7-.2-1-.2v-.1l-2.1-.5-.4 1.6s1.1.3 1.1.3c.6.2.7.6.7.8l-1.7 6.9c-.1.1-.2.3-.6.2 0 0-1.1-.3-1.1-.3l-.7 1.7 2 .5c.4.1.7.2 1.1.3l-.6 2.5 1.5.4.6-2.5c.4.1.8.2 1.2.3l-.6 2.5 1.5.4.6-2.5c2.6.5 4.5.3 5.3-2.1.7-1.9 0-3-1.4-3.7 1-.2 1.7-.9 1.9-2.3zm-3.4 4.8c-.5 1.9-3.7.9-4.8.6l.9-3.5c1.1.3 4.4.8 3.9 2.9zm.5-4.9c-.4 1.7-3.2.8-4 .6l.8-3.2c.9.2 3.6.6 3.2 2.6z"
        fill="#0b0c0f"
      />
    </svg>
  );
}

export function EthIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="var(--eth)" />
      <path d="M16.1 6v7.9L22.6 17 16.1 6z" fill="#0b0c0f" fillOpacity="0.85" />
      <path d="M16.1 6 9.6 17l6.5-3.1V6z" fill="#0b0c0f" />
      <path d="M16.1 22.4V27l6.5-11.4-6.5 6.8z" fill="#0b0c0f" fillOpacity="0.85" />
      <path d="M16.1 27v-4.6l-6.5-6.8L16.1 27z" fill="#0b0c0f" />
      <path d="M16.1 21.1 22.6 17l-6.5-2.9v7z" fill="#0b0c0f" fillOpacity="0.6" />
      <path d="M9.6 17l6.5 4.1v-7L9.6 17z" fill="#0b0c0f" fillOpacity="0.8" />
    </svg>
  );
}
