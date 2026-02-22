import React from 'react';
import { CompressionLevel, getCompressionDescription } from '../utils/compression';

interface CompressionSelectorProps {
  value: CompressionLevel;
  onChange: (level: CompressionLevel) => void;
}

const CompressionSelector: React.FC<CompressionSelectorProps> = ({ value, onChange }) => {
  const levels: CompressionLevel[] = ['none', 'low', 'medium', 'extreme'];
  const labels: Record<CompressionLevel, string> = {
    none: 'No Compression',
    low: 'Low Compression',
    medium: 'Medium Compression',
    extreme: 'Extreme Compression',
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Compression Level
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CompressionLevel)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {levels.map((level) => (
          <option key={level} value={level}>
            {labels[level]}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 italic">
        {getCompressionDescription(value)}
      </p>
    </div>
  );
};

export default CompressionSelector;
