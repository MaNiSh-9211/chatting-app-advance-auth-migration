import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { Hero3DMain } from '../components/Hero3DMain';
import { MatrixBackground } from '../components/MatrixBackground';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const hero3dRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }
  }, [isAuthenticated, navigate]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Always track mouse for the background, even if not hovering directly on the hero
    setMousePos({
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <div
      ref={containerRef}
      className="landing-page"
      onMouseMove={handleMouseMove} // Track mouse globally in landing page for better background effect
    >
      {/* Background gradient element spanning full width */}
      <div className="hero-background-gradient"></div>

      <div className="landing-content">
        {/* 3D Main Element - BIG and IMPRESSIVE */}
        <div
          ref={hero3dRef}
          className="hero-3d-main-wrapper"
        >
          {/* Matrix Background - Behind the main hero */}
          <MatrixBackground mousePos={mousePos} />

          <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>
            <Hero3DMain mousePos={mousePos} />
          </div>

          <div className="hero-3d-text-overlay" style={{
            transform: `translate(calc(-50% + ${(mousePos.x - window.innerWidth / 2) * 0.03}px), calc(-50% + ${(mousePos.y - window.innerHeight / 2) * 0.03}px))`
          }}>
            BETWEEN US
            <span className="hero-3d-slogan">Connect. Chat. Share.</span>
          </div>
        </div>

        {/* Get Started Section */}
        <div className="get-started-section" style={{
          padding: '4rem 2rem',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          <h2 className="gradient-text" style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            marginBottom: '1.5rem',
            textShadow: '0 0 40px rgba(124, 58, 237, 0.5)',
          }}>
            Connect. Chat. Share.
          </h2>
          <p className="hero-subtitle">
            Connect with friends, share moments, and chat seamlessly.
            <br />
            Personal messages, group chats, and social features all in one place.
          </p>

          <div className="hero-buttons">
            <button
              className="btn-primary"
              onClick={() => navigate('/register')}
              style={{
                fontSize: '1.25rem',
                padding: '1.25rem 3.5rem',
                boxShadow: '0 15px 50px rgba(124, 58, 237, 0.5), 0 0 30px rgba(236, 72, 153, 0.3)',
              }}
            >
              🚀 Get Started Free
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate('/login')}
              style={{
                fontSize: '1.25rem',
                padding: '1.25rem 3.5rem',
              }}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="feature-grid" style={{ padding: '2rem', maxWidth: '1200px' }}>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Personal Chats</h3>
            <p>Private one-on-one conversations with your friends</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Group Chats</h3>
            <p>Create groups and chat with multiple people</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📸</div>
            <h3>Share Moments</h3>
            <p>Upload photos and share with reactions and comments</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Private</h3>
            <p>End-to-end encryption and privacy controls</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LandingPage;

