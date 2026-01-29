"""
SnowRail Python Client

A simple Python client for interacting with SnowRail API.

Usage:
    python examples/python/client.py

Prerequisites:
    pip install requests

Example:
    from client import SnowRailClient

    client = SnowRailClient()
    result = client.validate_url("https://api.stripe.com")
    print(f"Can pay: {result['canPay']}")
"""

import requests
from typing import Dict, Any, Optional
import sys


class SnowRailClient:
    """
    Python client for SnowRail Trust Layer API
    """

    def __init__(self, base_url: str = "http://localhost:3000"):
        """
        Initialize SnowRail client

        Args:
            base_url: API base URL (default: http://localhost:3000)
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'SnowRail-Python-Client/1.0'
        })

    def validate_url(self, url: str, amount: int = 100) -> Dict[str, Any]:
        """
        Validate if a URL is safe to pay

        Args:
            url: Target URL to validate
            amount: Payment amount (optional)

        Returns:
            Validation result with trustScore, canPay, risk, etc.

        Raises:
            requests.HTTPError: If API request fails
        """
        endpoint = f"{self.base_url}/v1/sentinel/validate"

        response = self.session.post(
            endpoint,
            json={"url": url, "amount": amount}
        )
        response.raise_for_status()

        return response.json()

    def create_intent(
        self,
        url: str,
        amount: int,
        sender: str,
        recipient: str
    ) -> Dict[str, Any]:
        """
        Create payment intent

        Args:
            url: Destination URL
            amount: Payment amount in USDC
            sender: Sender wallet address (0x...)
            recipient: Recipient wallet address (0x...)

        Returns:
            Intent data with id, status, expiresAt, etc.

        Raises:
            requests.HTTPError: If API request fails
        """
        endpoint = f"{self.base_url}/v1/payments/x402/intent"

        response = self.session.post(
            endpoint,
            json={
                "url": url,
                "amount": amount,
                "sender": sender,
                "recipient": recipient
            }
        )
        response.raise_for_status()

        return response.json()

    def get_authorization(self, intent_id: str) -> Dict[str, Any]:
        """
        Get EIP-712 authorization data for signing

        Args:
            intent_id: Intent ID from create_intent()

        Returns:
            Authorization data with domain, types, message

        Raises:
            requests.HTTPError: If API request fails
        """
        endpoint = f"{self.base_url}/v1/payments/x402/sign"

        response = self.session.post(
            endpoint,
            json={"intentId": intent_id}
        )
        response.raise_for_status()

        return response.json()

    def confirm_payment(
        self,
        intent_id: str,
        signature: str
    ) -> Dict[str, Any]:
        """
        Confirm payment on-chain

        Args:
            intent_id: Intent ID
            signature: EIP-712 signature from wallet

        Returns:
            Payment result with txHash, explorerUrl, receipt

        Raises:
            requests.HTTPError: If API request fails
        """
        endpoint = f"{self.base_url}/v1/payments/x402/confirm"

        response = self.session.post(
            endpoint,
            json={
                "intentId": intent_id,
                "signature": signature
            }
        )
        response.raise_for_status()

        return response.json()

    def get_intent_status(self, intent_id: str) -> Dict[str, Any]:
        """
        Get payment intent status

        Args:
            intent_id: Intent ID to check

        Returns:
            Intent status with paid flag and receipt if available

        Raises:
            requests.HTTPError: If API request fails
        """
        endpoint = f"{self.base_url}/v1/payments/x402/status/{intent_id}"

        response = self.session.get(endpoint)
        response.raise_for_status()

        return response.json()

    def health_check(self) -> Dict[str, Any]:
        """
        Check API server health

        Returns:
            Health status with sentinel and treasury info

        Raises:
            requests.HTTPError: If API request fails
        """
        endpoint = f"{self.base_url}/health"

        response = self.session.get(endpoint)
        response.raise_for_status()

        return response.json()


def print_validation_result(result: Dict[str, Any]) -> None:
    """Pretty print validation result"""
    print(f"\n{'='*60}")
    print("VALIDATION RESULT")
    print(f"{'='*60}")
    print(f"URL:         {result['url']}")
    print(f"Can Pay:     {'✓ YES' if result['canPay'] else '✗ NO'}")
    print(f"Trust Score: {result['trustScore']}/100")
    print(f"Risk:        {result['risk'].upper()}")
    print(f"Decision:    {result['decision'].upper()}")
    print(f"Duration:    {result['duration']}ms")

    if result.get('blockedReasons'):
        print(f"\nBlocked Reasons:")
        for reason in result['blockedReasons']:
            print(f"  - {reason}")

    if result.get('warnings'):
        print(f"\nWarnings:")
        for warning in result['warnings']:
            print(f"  - {warning}")

    print(f"\nSecurity Checks:")
    for check in result.get('checks', []):
        status = '✓' if check['passed'] else '✗'
        print(f"  {status} {check['name']}: {check['score']}/100")

    print(f"{'='*60}\n")


def main():
    """Example usage"""
    print("🐍 SnowRail Python Client Example\n")

    # Initialize client
    client = SnowRailClient(base_url="http://localhost:3000")

    # Check server health
    print("Checking API health...")
    try:
        health = client.health_check()
        print(f"✓ API Status: {health['status']}")
        print(f"  Treasury: {health.get('treasury', 'unknown')}\n")
    except requests.HTTPError as e:
        print(f"✗ API is not reachable: {e}")
        print("  Make sure the backend is running: pnpm backend:dev")
        sys.exit(1)

    # Example 1: Validate trusted URL
    print("Example 1: Validating trusted URL...")
    print("URL: https://api.stripe.com")

    try:
        result = client.validate_url("https://api.stripe.com", amount=100)
        print_validation_result(result)
    except requests.HTTPError as e:
        print(f"✗ Error: {e}")

    # Example 2: Validate suspicious URL
    print("\nExample 2: Validating suspicious URL...")
    print("URL: http://free-money.xyz")

    try:
        result = client.validate_url("http://free-money.xyz", amount=100)
        print_validation_result(result)
    except requests.HTTPError as e:
        print(f"✗ Error: {e}")

    # Example 3: Create payment intent (requires wallet addresses)
    print("\nExample 3: Creating payment intent...")
    print("(Skipping - requires wallet addresses)")
    print("See docs/api/ENDPOINTS.md for full payment flow\n")

    # Example 4: Batch validation
    print("\nExample 4: Batch validation...")
    urls = [
        "https://api.stripe.com",
        "https://api.github.com",
        "https://www.google.com",
        "http://suspicious-site.xyz"
    ]

    print("Validating multiple URLs:")
    results = []
    for url in urls:
        try:
            result = client.validate_url(url)
            results.append((url, result['trustScore'], result['canPay']))
        except requests.HTTPError:
            results.append((url, 0, False))

    # Sort by trust score
    results.sort(key=lambda x: x[1], reverse=True)

    print(f"\n{'URL':<40} {'Trust Score':<15} {'Can Pay'}")
    print("-" * 70)
    for url, score, can_pay in results:
        status = '✓' if can_pay else '✗'
        print(f"{url:<40} {score}/100{' ':<8} {status}")

    print("\n✨ Examples completed!\n")
    print("Next Steps:")
    print("  - Integrate client into your Python app")
    print("  - Add error handling and retries")
    print("  - See docs/guides/INTEGRATION.md for more patterns")


if __name__ == "__main__":
    main()
