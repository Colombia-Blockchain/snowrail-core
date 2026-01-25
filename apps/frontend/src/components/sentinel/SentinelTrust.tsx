/**
 * SENTINEL Trust Score Component
 * Premium visualization of trust validation results
 * 
 * @author Colombia Blockchain
 */

import React, { useState, useEffect } from 'react';

interface TrustCheckResult {
  url: string;
  canPay: boolean;
  trustScore: number;
  confidence: number;
  risk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  decision: 'APPROVE' | 'DENY' | 'REVIEW' | 'CONDITIONAL';
  checks: CheckResult[];
  maxAmount?: number;
  warnings?: string[];
}

interface CheckResult {
  type: string;
  category: string;
  passed: boolean;
  score: number;
  risk: string;
}

interface SentinelTrustProps {
  result?: TrustCheckResult;
  isLoading?: boolean;
  onCheck?: (url: string) => void;
  className?: string;
}

export function SentinelTrust({ result, isLoading, onCheck, className = '' }: SentinelTrustProps) {
  const [url, setUrl] = useState('');
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (result?.trustScore) {
      const target = result.trustScore;
      let current = 0;
      const timer = setInterval(() => {
        current += target / 60;
        if (current >= target) {
          setAnimatedScore(target);
          clearInterval(timer);
        } else {
          setAnimatedScore(Math.round(current));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [result?.trustScore]);

  const handleCheck = () => {
    if (url.trim() && onCheck) onCheck(url.trim());
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const getRiskStyle = (risk: string) => ({
    'NONE': { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    'LOW': { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    'MEDIUM': { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
    'HIGH': { bg: 'rgba(249,115,22,0.15)', text: '#f97316' },
    'CRITICAL': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' }
  }[risk] || { bg: 'rgba(234,179,8,0.15)', text: '#eab308' });

  const categoryIcons: Record<string, string> = {
    identity: '🔐', infrastructure: '🏗️', fiat: '💳', policy: '📋', reputation: '⭐'
  };

  return (
    <div className={`sentinel-trust ${className}`} style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={logoStyle}>🛡️</div>
        <div>
          <h3 style={titleStyle}>SENTINEL</h3>
          <span style={subtitleStyle}>Trust Validation Layer</span>
        </div>
      </div>

      {/* Input */}
      <div style={inputSectionStyle}>
        <div style={inputWrapperStyle}>
          <span>🔗</span>
          <input
            type="url"
            placeholder="Enter URL to validate..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCheck()}
            style={inputStyle}
          />
        </div>
        <button onClick={handleCheck} disabled={!url.trim() || isLoading} style={buttonStyle}>
          {isLoading ? '...' : 'Validate'}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={loadingStyle}>
          <div style={scanBarStyle}><div style={scanLineStyle} /></div>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Analyzing security...</p>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div style={resultsStyle}>
          {/* Score Circle */}
          <div style={scoreSectionStyle}>
            <div style={scoreCircleStyle}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" stroke="rgba(255,255,255,0.1)" />
                <circle
                  cx="50" cy="50" r="45" fill="none" strokeWidth="8" strokeLinecap="round"
                  style={{
                    stroke: getScoreColor(result.trustScore),
                    strokeDasharray: `${(animatedScore / 100) * 283} 283`,
                    transform: 'rotate(-90deg)', transformOrigin: '50% 50%',
                    transition: 'stroke-dasharray 1s ease-out'
                  }}
                />
              </svg>
              <div style={scoreValueStyle}>
                <span style={{ fontSize: 36, fontWeight: 700 }}>{animatedScore}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Trust Score</span>
              </div>
            </div>
            
            <div style={{
              ...decisionStyle,
              background: result.canPay ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              borderColor: result.canPay ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
              color: result.canPay ? '#22c55e' : '#ef4444'
            }}>
              {result.canPay ? '✅ Safe to Pay' : '❌ Payment Blocked'}
            </div>
          </div>

          {/* Metrics */}
          <div style={metricsStyle}>
            <div style={metricStyle}>
              <span style={metricLabelStyle}>Risk Level</span>
              <span style={{ ...metricBadgeStyle, ...getRiskStyle(result.risk) }}>
                {result.risk}
              </span>
            </div>
            <div style={metricStyle}>
              <span style={metricLabelStyle}>Confidence</span>
              <span style={metricValueStyle}>{Math.round(result.confidence * 100)}%</span>
            </div>
            {result.maxAmount && (
              <div style={metricStyle}>
                <span style={metricLabelStyle}>Max Amount</span>
                <span style={metricValueStyle}>${result.maxAmount.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Checks */}
          <div style={checksStyle}>
            <h4 style={checksTitleStyle}>Security Checks</h4>
            {result.checks.map((check, i) => (
              <div key={i} style={checkItemStyle}>
                <div style={checkHeaderStyle}>
                  <span>{categoryIcons[check.category] || '🔍'}</span>
                  <span style={{ flex: 1, textTransform: 'capitalize' }}>
                    {check.type.replace(/_/g, ' ')}
                  </span>
                  <span style={{
                    ...checkStatusStyle,
                    background: check.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                    color: check.passed ? '#22c55e' : '#ef4444'
                  }}>
                    {check.passed ? '✓' : '✗'}
                  </span>
                </div>
                <div style={checkBarStyle}>
                  <div style={{ ...checkProgressStyle, width: `${check.score}%`, background: getScoreColor(check.score) }} />
                </div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div style={warningsStyle}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#eab308' }}>⚠️ Warnings</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && (
        <div style={emptyStyle}>
          <div style={{ fontSize: 48, opacity: 0.5, marginBottom: 16 }}>🔒</div>
          <p>Enter a URL above to validate its security before making a payment.</p>
        </div>
      )}
    </div>
  );
}

// Inline styles
const containerStyle: React.CSSProperties = {
  width: '100%', maxWidth: 420,
  background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)',
  borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)',
  fontFamily: "'Inter', -apple-system, sans-serif",
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
  background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)'
};

const logoStyle: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 14,
  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
  boxShadow: '0 4px 12px rgba(34,197,94,0.3)'
};

const titleStyle: React.CSSProperties = { margin: 0, fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: 1 };
const subtitleStyle: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.5)' };

const inputSectionStyle: React.CSSProperties = {
  display: 'flex', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)'
};

const inputWrapperStyle: React.CSSProperties = {
  flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12
};

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
  color: '#fff', fontSize: 14, outline: 'none'
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 20px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', minWidth: 100
};

const loadingStyle: React.CSSProperties = { padding: '40px 20px', textAlign: 'center' };
const scanBarStyle: React.CSSProperties = {
  width: 200, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, margin: '0 auto 16px', overflow: 'hidden'
};
const scanLineStyle: React.CSSProperties = {
  width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
  animation: 'scan 1.5s ease-in-out infinite'
};

const resultsStyle: React.CSSProperties = { padding: 20 };
const scoreSectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24 };
const scoreCircleStyle: React.CSSProperties = { position: 'relative', width: 140, height: 140 };
const scoreValueStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  textAlign: 'center', display: 'flex', flexDirection: 'column', color: '#fff'
};
const decisionStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
  borderRadius: 20, border: '1px solid', fontSize: 14, fontWeight: 500
};

const metricsStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 };
const metricStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 12
};
const metricLabelStyle: React.CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' };
const metricBadgeStyle: React.CSSProperties = { padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 };
const metricValueStyle: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: '#fff' };

const checksStyle: React.CSSProperties = { marginBottom: 20 };
const checksTitleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' };
const checkItemStyle: React.CSSProperties = { padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 10 };
const checkHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, color: 'rgba(255,255,255,0.8)' };
const checkStatusStyle: React.CSSProperties = { width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 };
const checkBarStyle: React.CSSProperties = { height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' };
const checkProgressStyle: React.CSSProperties = { height: '100%', borderRadius: 2, transition: 'width 0.5s ease-out' };

const warningsStyle: React.CSSProperties = {
  padding: 12, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 12
};

const emptyStyle: React.CSSProperties = {
  padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14
};

export default SentinelTrust;
