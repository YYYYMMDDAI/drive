// ===== メモ入力コンポーネント =====

import type { ChangeEvent } from 'react';

interface MemoInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function MemoInput({ value, onChange }: MemoInputProps) {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="section">
      <h2 className="section-title">メモ</h2>
      <textarea
        className="input-field selectable"
        rows={4}
        placeholder="メモを入力..."
        value={value}
        onChange={handleChange}
      />
      <p className="section-description">
        入力内容は自動保存されます
      </p>
    </div>
  );
}
