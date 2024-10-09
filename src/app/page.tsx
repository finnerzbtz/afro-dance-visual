'use client';  // Add this line at the top of the file

import dynamic from 'next/dynamic';

const Sketch = dynamic(() => import('../components/Sketch'), { ssr: false });

export default function Home() {
  return (
    <div>
      <Sketch />
    </div>
  );
}
