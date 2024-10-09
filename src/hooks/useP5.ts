import { useState, useEffect } from 'react';

export const useP5 = () => {
  const [p5, setP5] = useState<any>(null);

  useEffect(() => {
    import('p5').then((p5Module) => {
      // Manually set up the global p5 object
      if (typeof window !== 'undefined') {
        (window as any).p5 = p5Module.default;
      }
      
      // Now import p5.sound
      return import('p5/lib/addons/p5.sound').then(() => {
        setP5(() => p5Module.default);
      });
    });
  }, []);

  return p5;
};