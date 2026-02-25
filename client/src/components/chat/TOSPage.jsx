import './TOSPage.css';

export default function TOSPage({ onClose, onAccept }) {
  return (
    <div className="tos-overlay" onClick={onClose}>
      <div className="tos-modal" onClick={e => e.stopPropagation()}>
        <div className="tos-header">
          <h2>Terms of Service</h2>
          <button className="tos-close" onClick={onClose}>✕</button>
        </div>
        <div className="tos-body">
          <p className="tos-intro">Welcome to SadnessChat. By using this platform you agree to the following rules.</p>

          <div className="tos-section">
            <h3>⚠️ Warnings</h3>
            <p>You may receive a warning for the following:</p>
            <ul>
              <li>Spamming messages or channels</li>
              <li>Being disrespectful or rude to other users</li>
              <li>Sharing inappropriate content</li>
              <li>Misusing the platform features</li>
              <li>Impersonating other users</li>
            </ul>
            <p>Warnings are issued by the admin and will appear as a notification when you log in.</p>
          </div>

          <div className="tos-section">
            <h3>🚫 Bannable Offenses</h3>
            <p>You will be permanently banned for:</p>
            <ul>
              <li>Harassment or bullying of any kind</li>
              <li>Sharing illegal or explicit content</li>
              <li>Attempting to hack or exploit the platform</li>
              <li>Creating multiple accounts to bypass a ban</li>
              <li>Threatening other users</li>
              <li>Repeated violations after warnings</li>
            </ul>
            <p>Banned users are immediately logged out and cannot log back in.</p>
          </div>

          <div className="tos-section">
            <h3>📋 General Rules</h3>
            <ul>
              <li>Be respectful to all users</li>
              <li>Do not share personal information of others</li>
              <li>Keep usernames appropriate (letters and numbers only)</li>
              <li>Do not abuse the Contact Owner feature</li>
              <li>The admin reserves the right to remove any content</li>
            </ul>
          </div>

          <div className="tos-section">
            <h3>📩 Appeals</h3>
            <p>If you believe you were banned unfairly, you may contact the owner through an alternative account. Appeals are reviewed on a case by case basis.</p>
          </div>

          <p className="tos-footer">These terms may be updated at any time. Continued use of SadnessChat means you accept any changes.</p>
        </div>

        <div className="tos-actions">
          <button className="btn-ghost" onClick={onClose}>Decline</button>
          {onAccept && (
            <button className="btn-primary" onClick={onAccept}>I Accept</button>
          )}
        </div>
      </div>
    </div>
  );
}