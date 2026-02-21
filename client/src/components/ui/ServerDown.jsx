import './ServerDown.css';

export default function ServerDown() {
  return (
    <div className="server-down">
      <img src="/favicon.png" alt="SadLounge" className="server-down-icon" />
      <h1>SadLounge</h1>
      <p>SadLounge is currently down and will be back up soon.</p>
      <p className="server-down-sub">Thanks for your patience.</p>
    </div>
  );
}