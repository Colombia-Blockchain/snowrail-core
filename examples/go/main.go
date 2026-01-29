// SnowRail Go Client
//
// A simple Go client for interacting with SnowRail API.
//
// Usage:
//     go run examples/go/main.go
//
// Prerequisites:
//     go mod init snowrail-example
//     go mod tidy

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// ============================================================================
// Types
// ============================================================================

// ValidationRequest represents a URL validation request
type ValidationRequest struct {
	URL    string `json:"url"`
	Amount int    `json:"amount,omitempty"`
}

// ValidationResult represents the validation response
type ValidationResult struct {
	ID             string       `json:"id"`
	URL            string       `json:"url"`
	Timestamp      string       `json:"timestamp"`
	Duration       int          `json:"duration"`
	CanPay         bool         `json:"canPay"`
	TrustScore     int          `json:"trustScore"`
	Confidence     float64      `json:"confidence"`
	Risk           string       `json:"risk"`
	Decision       string       `json:"decision"`
	Checks         []CheckResult `json:"checks"`
	MaxAmount      *int         `json:"maxAmount,omitempty"`
	Warnings       []string     `json:"warnings,omitempty"`
	BlockedReasons []string     `json:"blockedReasons,omitempty"`
}

// CheckResult represents a single security check result
type CheckResult struct {
	Type       string                 `json:"type"`
	Category   string                 `json:"category"`
	Name       string                 `json:"name"`
	Passed     bool                   `json:"passed"`
	Score      int                    `json:"score"`
	Confidence float64                `json:"confidence"`
	Risk       string                 `json:"risk"`
	Details    map[string]interface{} `json:"details"`
}

// IntentRequest represents a payment intent creation request
type IntentRequest struct {
	URL       string `json:"url"`
	Amount    int    `json:"amount"`
	Sender    string `json:"sender"`
	Recipient string `json:"recipient"`
}

// IntentResponse represents the payment intent response
type IntentResponse struct {
	Intent struct {
		ID        string    `json:"id"`
		Status    string    `json:"status"`
		Amount    int       `json:"amount"`
		Currency  string    `json:"currency"`
		Token     string    `json:"token"`
		Chain     string    `json:"chain"`
		Sender    string    `json:"sender"`
		Recipient string    `json:"recipient"`
		ExpiresAt time.Time `json:"expiresAt"`
	} `json:"intent"`
	Validation struct {
		ID         string `json:"id"`
		TrustScore int    `json:"trustScore"`
		Decision   string `json:"decision"`
	} `json:"validation"`
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Treasury  string `json:"treasury"`
}

// ============================================================================
// Client
// ============================================================================

// SnowRailClient is a client for SnowRail API
type SnowRailClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

// NewClient creates a new SnowRail client
func NewClient(baseURL string) *SnowRailClient {
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}

	return &SnowRailClient{
		BaseURL: strings.TrimRight(baseURL, "/"),
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ValidateURL validates if a URL is safe to pay
func (c *SnowRailClient) ValidateURL(url string, amount int) (*ValidationResult, error) {
	reqBody := ValidationRequest{
		URL:    url,
		Amount: amount,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.HTTPClient.Post(
		c.BaseURL+"/v1/sentinel/validate",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	var result ValidationResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// CreateIntent creates a payment intent
func (c *SnowRailClient) CreateIntent(url string, amount int, sender, recipient string) (*IntentResponse, error) {
	reqBody := IntentRequest{
		URL:       url,
		Amount:    amount,
		Sender:    sender,
		Recipient: recipient,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.HTTPClient.Post(
		c.BaseURL+"/v1/payments/x402/intent",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	var result IntentResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// HealthCheck checks API server health
func (c *SnowRailClient) HealthCheck() (*HealthResponse, error) {
	resp, err := c.HTTPClient.Get(c.BaseURL + "/health")
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	var result HealthResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// ============================================================================
// Helper Functions
// ============================================================================

func printValidationResult(result *ValidationResult) {
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("VALIDATION RESULT")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("URL:         %s\n", result.URL)

	canPayIcon := "✗ NO"
	if result.CanPay {
		canPayIcon = "✓ YES"
	}
	fmt.Printf("Can Pay:     %s\n", canPayIcon)
	fmt.Printf("Trust Score: %d/100\n", result.TrustScore)
	fmt.Printf("Risk:        %s\n", strings.ToUpper(result.Risk))
	fmt.Printf("Decision:    %s\n", strings.ToUpper(result.Decision))
	fmt.Printf("Duration:    %dms\n", result.Duration)

	if len(result.BlockedReasons) > 0 {
		fmt.Println("\nBlocked Reasons:")
		for _, reason := range result.BlockedReasons {
			fmt.Printf("  - %s\n", reason)
		}
	}

	if len(result.Warnings) > 0 {
		fmt.Println("\nWarnings:")
		for _, warning := range result.Warnings {
			fmt.Printf("  - %s\n", warning)
		}
	}

	fmt.Println("\nSecurity Checks:")
	for _, check := range result.Checks {
		icon := "✗"
		if check.Passed {
			icon = "✓"
		}
		fmt.Printf("  %s %s: %d/100\n", icon, check.Name, check.Score)
	}

	fmt.Println(strings.Repeat("=", 60) + "\n")
}

// ============================================================================
// Main
// ============================================================================

func main() {
	fmt.Println("🔷 SnowRail Go Client Example\n")

	// Initialize client
	client := NewClient("http://localhost:3000")

	// Check server health
	fmt.Println("Checking API health...")
	health, err := client.HealthCheck()
	if err != nil {
		fmt.Printf("✗ API is not reachable: %v\n", err)
		fmt.Println("  Make sure the backend is running: pnpm backend:dev")
		os.Exit(1)
	}
	fmt.Printf("✓ API Status: %s\n", health.Status)
	fmt.Printf("  Treasury: %s\n\n", health.Treasury)

	// Example 1: Validate trusted URL
	fmt.Println("Example 1: Validating trusted URL...")
	fmt.Println("URL: https://api.stripe.com")

	result1, err := client.ValidateURL("https://api.stripe.com", 100)
	if err != nil {
		fmt.Printf("✗ Error: %v\n", err)
	} else {
		printValidationResult(result1)
	}

	// Example 2: Validate suspicious URL
	fmt.Println("\nExample 2: Validating suspicious URL...")
	fmt.Println("URL: http://free-money.xyz")

	result2, err := client.ValidateURL("http://free-money.xyz", 100)
	if err != nil {
		fmt.Printf("✗ Error: %v\n", err)
	} else {
		printValidationResult(result2)
	}

	// Example 3: Batch validation
	fmt.Println("\nExample 3: Batch validation...")
	urls := []string{
		"https://api.stripe.com",
		"https://api.github.com",
		"https://www.google.com",
		"http://suspicious-site.xyz",
	}

	type URLResult struct {
		URL        string
		TrustScore int
		CanPay     bool
	}

	results := make([]URLResult, 0, len(urls))
	fmt.Println("Validating multiple URLs:")

	for _, url := range urls {
		result, err := client.ValidateURL(url, 100)
		if err != nil {
			results = append(results, URLResult{URL: url, TrustScore: 0, CanPay: false})
		} else {
			results = append(results, URLResult{
				URL:        url,
				TrustScore: result.TrustScore,
				CanPay:     result.CanPay,
			})
		}
	}

	fmt.Printf("\n%-40s %-15s %s\n", "URL", "Trust Score", "Can Pay")
	fmt.Println(strings.Repeat("-", 70))

	for _, r := range results {
		icon := "✗"
		if r.CanPay {
			icon = "✓"
		}
		fmt.Printf("%-40s %d/100%-8s %s\n", r.URL, r.TrustScore, "", icon)
	}

	fmt.Println("\n✨ Examples completed!\n")
	fmt.Println("Next Steps:")
	fmt.Println("  - Integrate client into your Go app")
	fmt.Println("  - Add error handling and retries")
	fmt.Println("  - See docs/guides/INTEGRATION.md for more patterns")
}
