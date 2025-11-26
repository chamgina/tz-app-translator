import React from 'react';

interface VisualizerProps {
  volume: number;
  color: string;
  label: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, color, label }) => {
  // Create 5 bars
  const bars = Array.from({ length: 5 });

  return (
    <div className="flex flex-col items-center gap-2">
        <div className="h-16 flex items-end gap-1.5">
        {bars.map((_, i) => {
            // Calculate a varied height based on volume and index to create a wave effect
            // We use a base minimum height + variable height based on volume
            let height = 10;
            if (volume > 0.01) {
                // Randomize slightly for organic feel
                const randomFactor = Math.random() * 0.5 + 0.5; 
                // Center bars are taller
                const shapeFactor = 1 - Math.abs(i - 2) * 0.2; 
                height = Math.max(10, volume * 100 * randomFactor * shapeFactor);
            }

            return (
            <div
                key={i}
                className={`w-3 rounded-full transition-all duration-75 ease-in-out ${color}`}
                style={{ height: `${height}%` }}
            />
            );
        })}
        </div>
        <span className="text-xs text-gray-500 font-medium tracking-wide">{label}</span>
    </div>
  );
};

export default Visualizer;