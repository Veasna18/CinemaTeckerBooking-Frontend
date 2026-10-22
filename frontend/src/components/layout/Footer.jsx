export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <h3>CinemaTaket</h3>
          <p>Your next movie night starts here.</p>
        </div>
        <p>© {new Date().getFullYear()} CinemaTaket. All rights reserved.</p>
      </div>
    </footer>
  );
}