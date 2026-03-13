// ===== ネットワークステータス表示コンポーネント =====

import { useNetwork } from '../hooks';

export function NetworkStatus() {
  const { isOnline } = useNetwork();

  return (
    <div className={`network-status ${!isOnline ? 'visible' : ''}`}>
      オフライン - データはローカルに保存されます
    </div>
  );
}

export function NetworkBadge() {
  const { isOnline } = useNetwork();

  return (
    <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
      <span className="status-dot" />
      <span>{isOnline ? 'オンライン' : 'オフライン'}</span>
    </span>
  );
}
