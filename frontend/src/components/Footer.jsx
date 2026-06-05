// Footer.jsx
import React from 'react';
import logo from '../assets/logo.png';
import '../App.css';

export default function Footer() {
  return (
    <footer className="branding-footer">
      <a
        className="branding-link"
        href="https://your-website-url.com" // apna link / mailto
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src={logo}
          alt="Khyber Creative Studio"
          className="branding-logo"
        />
      </a>
    </footer>
  );
}