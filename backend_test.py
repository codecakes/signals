import requests
import sys
import time
from datetime import datetime

class PolymarketSignalAPITester:
    def __init__(self, base_url="https://probability-pulse.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout after {timeout}s")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "API Root",
            "GET", 
            "/",
            200
        )

    def test_market_discovery(self):
        """Test market discovery trigger"""
        return self.run_test(
            "Market Discovery Trigger",
            "POST",
            "/markets/discover",
            200
        )

    def test_get_markets(self):
        """Test getting markets"""
        success, response = self.run_test(
            "Get Markets",
            "GET",
            "/markets?limit=10",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} markets")
            if len(response) > 0:
                market = response[0]
                print(f"   Sample market: {market.get('question', 'N/A')[:50]}...")
                print(f"   Sample signals: {market.get('signals', [])}")
        
        return success, response

    def test_get_markets_by_signal(self):
        """Test getting markets filtered by signal"""
        signals = ["geopolitics", "macroeconomics", "crypto", "tech"]
        results = []
        
        for signal in signals:
            success, response = self.run_test(
                f"Get Markets for {signal}",
                "GET",
                f"/markets?signal={signal}&limit=5",
                200
            )
            
            if success and isinstance(response, list):
                print(f"   Found {len(response)} {signal} markets")
            
            results.append((success, signal, len(response) if success else 0))
        
        return all(r[0] for r in results), results

    def test_signals_summary(self):
        """Test signals summary endpoint"""
        success, response = self.run_test(
            "Signals Summary",
            "GET",
            "/signals/summary",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} signal summaries")
            for signal in response:
                print(f"   {signal.get('signal', 'unknown')}: "
                      f"{signal.get('market_count', 0)} markets, "
                      f"{signal.get('avg_probability', 0)*100:.1f}% avg probability")
        
        return success, response

    def test_signal_timeseries(self):
        """Test signal timeseries endpoints"""
        signals = ["geopolitics", "macroeconomics", "crypto", "tech"]
        results = []
        
        for signal in signals:
            success, response = self.run_test(
                f"Timeseries for {signal}",
                "GET",
                f"/signals/{signal}/timeseries?hours=24",
                200
            )
            
            if success and isinstance(response, list):
                print(f"   Found {len(response)} time series points for {signal}")
                if len(response) > 0:
                    latest = response[-1] if response else {}
                    print(f"   Latest probability: {latest.get('probability', 0)*100:.2f}%")
            
            results.append((success, signal, len(response) if success else 0))
            
        return all(r[0] for r in results), results

    def test_ai_explanation(self):
        """Test AI explanation generation"""
        signals = ["geopolitics", "crypto"]  # Test 2 signals to avoid too many LLM calls
        results = []
        
        for signal in signals:
            success, response = self.run_test(
                f"AI Explanation for {signal}",
                "POST",
                f"/signals/{signal}/explain",
                200,
                timeout=60  # AI calls can take longer
            )
            
            if success and isinstance(response, dict):
                print(f"   Generated explanation for {signal}")
                print(f"   Explanation length: {len(response.get('explanation', ''))} chars")
                print(f"   Key markets count: {len(response.get('key_markets', []))}")
            
            results.append(success)
            time.sleep(2)  # Add delay between AI calls
            
        return all(results), results

    def test_market_details(self):
        """Test market details endpoint"""
        # First get a market ID
        success, markets = self.test_get_markets()
        if not success or not markets:
            print("❌ Cannot test market details - no markets available")
            return False, {}
        
        market_id = markets[0]['id']
        return self.run_test(
            f"Market Details for {market_id}",
            "GET",
            f"/markets/{market_id}",
            200
        )

def main():
    print("🚀 Starting Polymarket Signal Intelligence API Tests")
    print("=" * 60)
    
    tester = PolymarketSignalAPITester()
    
    # Test sequence
    test_results = {}
    
    # 1. Basic connectivity
    test_results['root'] = tester.test_root_endpoint()
    
    # 2. Market discovery 
    print("\n🔄 Triggering market discovery (this starts background task)...")
    test_results['discovery'] = tester.test_market_discovery()
    
    # Wait a moment for discovery to populate some data
    print("\n⏳ Waiting 10 seconds for market discovery to populate data...")
    time.sleep(10)
    
    # 3. Market endpoints
    test_results['markets'] = tester.test_get_markets()
    test_results['markets_by_signal'] = tester.test_get_markets_by_signal()
    test_results['market_details'] = tester.test_market_details()
    
    # 4. Signal endpoints
    test_results['signals_summary'] = tester.test_signals_summary()
    test_results['timeseries'] = tester.test_signal_timeseries()
    
    # 5. AI functionality (test last due to potential latency)
    print("\n🤖 Testing AI explanation generation (may take 30+ seconds)...")
    test_results['ai_explanation'] = tester.test_ai_explanation()
    
    # Final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    print("=" * 60)
    
    # Detailed breakdown
    failed_tests = []
    for test_name, (success, _) in test_results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name:<20} | {status}")
        if not success:
            failed_tests.append(test_name)
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print(f"\n✅ All tests passed! API is functioning correctly.")
        return 0

if __name__ == "__main__":
    sys.exit(main())