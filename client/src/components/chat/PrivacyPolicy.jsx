import './TOSPage.css';

export default function PrivacyPolicy({ onClose }) {
  return (
    <div className="tos-overlay" onClick={onClose}>
      <div className="tos-modal" onClick={e => e.stopPropagation()}>
        <div className="tos-header">
          <h2>Privacy Policy</h2>
          <button className="tos-close" onClick={onClose}>✕</button>
        </div>
        <div className="tos-body">
          <p className="tos-date">Last updated: February 2026</p>

          <h3>1. Who We Are</h3>
          <p>SadnessChat is a free real-time chat platform. This Privacy Policy explains what data we collect, how we use it, and your rights regarding it.</p>

          <h3>2. Data We Collect</h3>
          <p>When you register and use SadnessChat, we collect the following information:</p>
          <ul>
            <li><strong>Username</strong> — your public display name</li>
            <li><strong>Password</strong> — stored securely as a hashed value, never in plain text</li>
            <li><strong>Birthday</strong> — used to verify you meet the minimum age requirement (13+)</li>
            <li><strong>Bio</strong> — optional text you choose to share on your profile</li>
            <li><strong>Avatar color and profile picture</strong> — your chosen appearance settings</li>
            <li><strong>Banner color</strong> — your profile banner preference</li>
            <li><strong>Messages</strong> — both direct messages and server channel messages you send</li>
            <li><strong>Status and custom status</strong> — your online presence information</li>
          </ul>

          <h3>3. How We Use Your Data</h3>
          <p>Your data is used solely to provide the SadnessChat service, including:</p>
          <ul>
            <li>Displaying your profile to other users</li>
            <li>Delivering messages in real time</li>
            <li>Maintaining your account settings and preferences</li>
            <li>Enforcing our Terms of Service and keeping the platform safe</li>
          </ul>

          <h3>4. Third Parties</h3>
          <p>We do not sell or share your personal data with any third parties, with one exception:</p>
          <ul>
            <li><strong>ImgBB</strong> — when you upload a profile picture or image in chat, that image is stored on ImgBB's servers. Please refer to <a href="https://imgbb.com/tos" target="_blank" rel="noopener noreferrer" style={{ color: '#5865f2' }}>ImgBB's Terms of Service</a> for their data handling policies.</li>
          </ul>

          <h3>5. Data Retention</h3>
          <p>Your data is retained for as long as your account exists. If you wish to delete your account and all associated data, please contact the platform owner directly via the Contact Owner option on the homepage.</p>

          <h3>6. Security</h3>
          <p>We take reasonable steps to protect your data. Passwords are hashed using bcrypt and are never stored or transmitted in plain text. However, no system is 100% secure and we cannot guarantee absolute security.</p>

          <h3>7. Children's Privacy</h3>
          <p>SadnessChat requires users to be at least 13 years old to register. We do not knowingly collect data from children under 13. If you believe a child under 13 has registered, please contact the platform owner.</p>

          <h3>8. Your Rights</h3>
          <p>You have the right to:</p>
          <ul>
            <li>Access the data we hold about you</li>
            <li>Request deletion of your account and data</li>
            <li>Update your profile information at any time via Settings</li>
          </ul>

          <h3>9. Changes to This Policy</h3>
          <p>We may update this Privacy Policy from time to time. Continued use of SadnessChat after changes means you accept the updated policy.</p>

          <h3>10. Contact</h3>
          <p>If you have any questions about this Privacy Policy, contact the platform owner via the Contact Owner option on the homepage.</p>
        </div>
        <div className="tos-footer">
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}