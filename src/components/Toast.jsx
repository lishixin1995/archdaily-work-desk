import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const timer = useRef(0);
  const show = useCallback((text) => {
    setMessage(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(''), 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast" role="status" aria-live="polite" hidden={!message}>{message}</div>
    </ToastContext.Provider>
  );
}
