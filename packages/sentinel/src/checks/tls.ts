/**
 * @snowrail/sentinel - TLS Certificate Check
 * Deep SSL/TLS certificate validation
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

import * as tls from 'tls';
import * as https from 'https';
import { BaseCheck } from './base';
import {
  CheckResult,
  CheckType,
  CheckCategory,
  RiskLevel,
  ValidationRequest,
  Evidence
} from '../types';

interface CertificateInfo {
  subject: Record<string, string>;
  issuer: Record<string, string>;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  fingerprint: string;
  fingerprint256: string;
  subjectAltNames: string[];
  isCA: boolean;
  keyUsage?: string[];
}

interface TLSAnalysis {
  protocol: string;
  cipher: string;
  certificate: CertificateInfo;
  chain: CertificateInfo[];
  grade: string;
  warnings: string[];
  vulnerabilities: string[];
}

export class TLSCheck extends BaseCheck {
  public readonly type = CheckType.TLS_CERTIFICATE;
  public readonly category = CheckCategory.IDENTITY;
  public readonly name = 'TLS Certificate Validation';
  public readonly description = 'Validates SSL/TLS certificate authenticity, chain, and configuration';

  private readonly TRUSTED_CAS = [
    "Let's Encrypt",
    'DigiCert',
    'Comodo',
    'GlobalSign',
    'GeoTrust',
    'Thawte',
    'Symantec',
    'GoDaddy',
    'Amazon',
    'Google Trust Services',
    'Cloudflare',
    'Sectigo'
  ];

  private readonly MIN_KEY_SIZE = 2048;
  private readonly PREFERRED_PROTOCOLS = ['TLSv1.3', 'TLSv1.2'];
  private readonly WEAK_CIPHERS = [
    'RC4',
    'DES',
    '3DES',
    'MD5',
    'NULL',
    'EXPORT',
    'anon'
  ];

  public async execute(request: ValidationRequest): Promise<CheckResult> {
    const url = this.parseUrl(request.url);
    if (!url) {
      return this.failure(0, 1, RiskLevel.CRITICAL, {
        error: 'Invalid URL format'
      });
    }

    if (url.protocol !== 'https:') {
      return this.failure(0, 1, RiskLevel.CRITICAL, {
        error: 'URL does not use HTTPS',
        protocol: url.protocol
      });
    }

    try {
      const analysis = await this.analyzeTLS(url.hostname, url.port ? parseInt(url.port) : 443);
      const score = this.calculateScore(analysis);
      const evidence = this.collectEvidence(analysis);

      if (score >= 70) {
        return this.success(score, 0.95, {
          grade: analysis.grade,
          protocol: analysis.protocol,
          cipher: analysis.cipher,
          issuer: analysis.certificate.issuer.O || analysis.certificate.issuer.CN,
          validUntil: analysis.certificate.validTo.toISOString(),
          daysRemaining: this.daysUntilExpiry(analysis.certificate.validTo),
          warnings: analysis.warnings
        }, evidence);
      } else {
        return this.failure(score, 0.9, this.scoreToRisk(score), {
          grade: analysis.grade,
          protocol: analysis.protocol,
          issues: analysis.vulnerabilities,
          warnings: analysis.warnings
        }, evidence);
      }
    } catch (error) {
      return this.failure(0, 0.5, RiskLevel.CRITICAL, {
        error: 'TLS connection failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async analyzeTLS(hostname: string, port: number): Promise<TLSAnalysis> {
    return new Promise((resolve, reject) => {
      const warnings: string[] = [];
      const vulnerabilities: string[] = [];

      const options = {
        host: hostname,
        port,
        servername: hostname,
        rejectUnauthorized: false, // We want to analyze even invalid certs
        requestCert: true
      };

      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate(true);
        const cipher = socket.getCipher();
        const protocol = socket.getProtocol();

        if (!cert || !cert.subject) {
          socket.destroy();
          reject(new Error('No certificate received'));
          return;
        }

        // Analyze certificate
        const certificate = this.parseCertificate(cert);
        const chain = this.parseChain(cert);

        // Check protocol
        if (!this.PREFERRED_PROTOCOLS.includes(protocol || '')) {
          warnings.push(`Outdated protocol: ${protocol}`);
        }

        // Check cipher
        if (cipher && this.WEAK_CIPHERS.some(w => cipher.name.includes(w))) {
          vulnerabilities.push(`Weak cipher: ${cipher.name}`);
        }

        // Check certificate validity
        const now = new Date();
        if (certificate.validFrom > now) {
          vulnerabilities.push('Certificate not yet valid');
        }
        if (certificate.validTo < now) {
          vulnerabilities.push('Certificate expired');
        }

        // Check expiry warning
        const daysToExpiry = this.daysUntilExpiry(certificate.validTo);
        if (daysToExpiry < 30 && daysToExpiry > 0) {
          warnings.push(`Certificate expires in ${daysToExpiry} days`);
        }

        // Check trusted CA
        const issuer = certificate.issuer.O || certificate.issuer.CN || '';
        const isTrustedCA = this.TRUSTED_CAS.some(ca => 
          issuer.toLowerCase().includes(ca.toLowerCase())
        );
        if (!isTrustedCA) {
          warnings.push(`Issuer not in common trusted CAs: ${issuer}`);
        }

        // Check authorization
        if (!socket.authorized) {
          const authError = socket.authorizationError;
          if (authError) {
            vulnerabilities.push(`Authorization error: ${authError}`);
          }
        }

        // Calculate grade
        const grade = this.calculateGrade(protocol, cipher, vulnerabilities.length, warnings.length);

        socket.destroy();
        resolve({
          protocol: protocol || 'unknown',
          cipher: cipher?.name || 'unknown',
          certificate,
          chain,
          grade,
          warnings,
          vulnerabilities
        });
      });

      socket.on('error', (err) => {
        reject(err);
      });

      socket.setTimeout(10000, () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }

  private parseCertificate(cert: tls.PeerCertificate): CertificateInfo {
    return {
      subject: cert.subject as Record<string, string>,
      issuer: cert.issuer as Record<string, string>,
      validFrom: new Date(cert.valid_from),
      validTo: new Date(cert.valid_to),
      serialNumber: cert.serialNumber,
      fingerprint: cert.fingerprint,
      fingerprint256: cert.fingerprint256,
      subjectAltNames: this.parseSubjectAltNames(cert.subjectaltname),
      isCA: cert.ca || false,
      keyUsage: cert.ext_key_usage
    };
  }

  private parseChain(cert: tls.DetailedPeerCertificate): CertificateInfo[] {
    const chain: CertificateInfo[] = [];
    let current = cert.issuerCertificate;
    const seen = new Set<string>();

    while (current && !seen.has(current.fingerprint256)) {
      seen.add(current.fingerprint256);
      chain.push(this.parseCertificate(current));
      current = current.issuerCertificate;
    }

    return chain;
  }

  private parseSubjectAltNames(san: string | undefined): string[] {
    if (!san) return [];
    return san.split(', ').map(s => s.replace(/^DNS:/, ''));
  }

  private daysUntilExpiry(validTo: Date): number {
    const now = new Date();
    const diff = validTo.getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private calculateGrade(
    protocol: string | null,
    cipher: tls.CipherNameAndProtocol | null,
    vulnCount: number,
    warnCount: number
  ): string {
    let score = 100;

    // Protocol scoring
    if (protocol === 'TLSv1.3') score += 10;
    else if (protocol === 'TLSv1.2') score += 0;
    else if (protocol === 'TLSv1.1') score -= 20;
    else if (protocol === 'TLSv1') score -= 40;
    else score -= 60;

    // Vulnerabilities
    score -= vulnCount * 25;

    // Warnings
    score -= warnCount * 5;

    // Map to grade
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 65) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  private calculateScore(analysis: TLSAnalysis): number {
    let score = 100;

    // Grade-based scoring
    const gradeScores: Record<string, number> = {
      'A+': 100, 'A': 95, 'B': 80, 'C': 65, 'D': 50, 'F': 20
    };
    score = gradeScores[analysis.grade] || 50;

    // Deduct for vulnerabilities
    score -= analysis.vulnerabilities.length * 15;

    // Deduct for warnings
    score -= analysis.warnings.length * 5;

    return Math.max(0, Math.min(100, score));
  }

  private collectEvidence(analysis: TLSAnalysis): Evidence[] {
    return [
      this.createEvidence('certificate', 'tls_handshake', {
        subject: analysis.certificate.subject,
        issuer: analysis.certificate.issuer,
        validFrom: analysis.certificate.validFrom,
        validTo: analysis.certificate.validTo,
        fingerprint256: analysis.certificate.fingerprint256
      }, true),
      this.createEvidence('certificate', 'tls_protocol', {
        protocol: analysis.protocol,
        cipher: analysis.cipher,
        grade: analysis.grade
      }, true)
    ];
  }
}
