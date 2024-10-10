import { useState, useEffect } from 'react';
import p5 from 'p5';

export const useP5 = (): typeof p5 | null => {
  const [p5Instance, setP5Instance] = useState<typeof p5 | null>(null);

  useEffect(() => {
    import('p5').then((p5Module) => {
      if (typeof window !== 'undefined') {
        (window as any).p5 = p5Module.default;
      }
      
      import('p5/lib/addons/p5.sound').then(() => {
        setP5Instance(() => p5Module.default);
      });
    });
  }, []);

  return p5Instance;
};