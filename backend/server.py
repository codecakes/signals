from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Polymarket API endpoints
GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Signal keyword definitions
SIGNAL_KEYWORDS = {
    "geopolitics": ["war", "invasion", "military", "conflict", "election", "coup", "sanction", "diplomat", "treaty"],
    "macroeconomics": ["fed", "rate", "inflation", "gdp", "recession", "unemployment", "economy", "central bank", "fiscal"],
    "crypto": ["bitcoin", "btc", "ethereum", "eth", "crypto", "defi", "blockchain", "token", "coinbase"],
    "tech": ["ai", "artificial intelligence", "regulation", "tech", "openai", "google", "meta", "apple", "microsoft"]
}

# Models
class Market(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    question: str
    category: Optional[str] = None
    end_date: Optional[str] = None
    volume: Optional[float] = 0.0
    liquidity: Optional[float] = 0.0
    outcomes: List[str] = []
    signals: List[str] = []
    metadata: Dict[str, Any] = {}

class SignalUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    signal: str
    market_id: str
    market_question: str
    probability: float
    volume: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    change_24h: Optional[float] = None

class SignalSummary(BaseModel):
    signal: str
    avg_probability: float
    market_count: int
    total_volume: float
    momentum: Optional[float] = None
    top_markets: List[Dict[str, Any]] = []

class EventExplanation(BaseModel):
    signal: str
    explanation: str
    key_markets: List[str]
    timestamp: datetime

# Polymarket API Client
class PolymarketClient:
    def __init__(self):
        self.gamma_api = GAMMA_API
        self.clob_api = CLOB_API
        
    async def get_markets(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Fetch markets from Gamma API"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.gamma_api}/markets",
                    params={"limit": limit, "offset": offset, "closed": False}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return []
    
    async def get_market_prices(self, condition_id: str) -> Dict:
        """Fetch market prices from CLOB API"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.clob_api}/prices",
                    params={"market": condition_id}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching prices for {condition_id}: {e}")
            return {}

polymarket_client = PolymarketClient()

# Signal derivation logic
def derive_signals(question: str, description: str = "") -> List[str]:
    """Derive signals from market metadata"""
    text = f"{question} {description}".lower()
    signals = []
    
    for signal, keywords in SIGNAL_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            signals.append(signal)
    
    return signals

# Background task for market discovery and ingestion
async def discover_and_ingest_markets():
    """Discover markets and store with signals"""
    logger.info("Starting market discovery...")
    
    markets_data = await polymarket_client.get_markets(limit=100)
    
    for market_data in markets_data:
        try:
            market_id = market_data.get("id") or market_data.get("condition_id") or str(uuid.uuid4())
            question = market_data.get("question", "")
            description = market_data.get("description", "")
            
            # Derive signals
            signals = derive_signals(question, description)
            
            if not signals:
                continue
            
            # Get outcomes and prices
            outcomes = []
            prices = []
            
            # Parse outcomes
            outcomes_str = market_data.get("outcomes", "[]")
            if isinstance(outcomes_str, str):
                import json as json_lib
                try:
                    outcomes = json_lib.loads(outcomes_str)
                except:
                    outcomes = []
            else:
                outcomes = outcomes_str
            
            # Parse outcome prices
            prices_str = market_data.get("outcomePrices", "[]")
            if isinstance(prices_str, str):
                try:
                    prices = json_lib.loads(prices_str)
                    prices = [float(p) for p in prices]
                except:
                    prices = []
            else:
                prices = prices_str
            
            # Create market document
            market_doc = {
                "id": market_id,
                "question": question,
                "category": market_data.get("groupItemTitle", ""),
                "end_date": market_data.get("endDate", ""),
                "volume": float(market_data.get("volume", 0)),
                "liquidity": float(market_data.get("liquidity", 0)),
                "outcomes": outcomes,
                "signals": signals,
                "metadata": market_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Upsert market
            await db.markets.update_one(
                {"id": market_id},
                {"$set": market_doc},
                upsert=True
            )
            
            # Store signal update
            if prices and len(prices) > 0:
                # Use first outcome probability (usually "Yes")
                probability = prices[0]
                
                # Get 24h change if available
                change_24h = None
                
                for signal in signals:
                    signal_update = {
                        "signal": signal,
                        "market_id": market_id,
                        "market_question": question,
                        "probability": probability,
                        "volume": float(market_data.get("volume", 0)),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "change_24h": change_24h
                    }
                    
                    await db.signal_updates.insert_one(signal_update)
            
            logger.info(f"Processed market: {question[:50]}... with signals: {signals}")
            
        except Exception as e:
            logger.error(f"Error processing market: {e}")
            continue
    
    logger.info(f"Market discovery complete. Processed {len(markets_data)} markets.")

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Polymarket Signal Intelligence API"}

@api_router.post("/markets/discover")
async def trigger_market_discovery(background_tasks: BackgroundTasks):
    """Trigger market discovery and ingestion"""
    background_tasks.add_task(discover_and_ingest_markets)
    return {"message": "Market discovery initiated"}

@api_router.get("/markets", response_model=List[Market])
async def get_markets(signal: Optional[str] = None, limit: int = 50):
    """Get markets, optionally filtered by signal"""
    query = {}
    if signal:
        query["signals"] = signal
    
    markets = await db.markets.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return markets

@api_router.get("/signals/summary")
async def get_signals_summary():
    """Get summary of all signals"""
    signals = ["geopolitics", "macroeconomics", "crypto", "tech"]
    summaries = []
    
    for signal in signals:
        # Get recent updates for this signal (last 24 hours, or all if less)
        one_day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        
        pipeline = [
            {
                "$match": {
                    "signal": signal,
                    "timestamp": {"$gte": one_day_ago.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": "$market_id",
                    "latest_probability": {"$last": "$probability"},
                    "latest_volume": {"$last": "$volume"},
                    "question": {"$last": "$market_question"}
                }
            }
        ]
        
        results = await db.signal_updates.aggregate(pipeline).to_list(None)
        
        if results:
            avg_prob = sum(r["latest_probability"] for r in results) / len(results)
            total_volume = sum(r["latest_volume"] for r in results)
            
            # Get top 3 markets by probability
            top_markets = sorted(results, key=lambda x: x["latest_probability"], reverse=True)[:3]
            top_markets_formatted = [
                {
                    "question": m["question"],
                    "probability": m["latest_probability"],
                    "volume": m["latest_volume"]
                }
                for m in top_markets
            ]
            
            summaries.append({
                "signal": signal,
                "avg_probability": round(avg_prob, 4),
                "market_count": len(results),
                "total_volume": round(total_volume, 2),
                "momentum": None,
                "top_markets": top_markets_formatted
            })
        else:
            summaries.append({
                "signal": signal,
                "avg_probability": 0.0,
                "market_count": 0,
                "total_volume": 0.0,
                "momentum": None,
                "top_markets": []
            })
    
    return summaries

@api_router.get("/signals/{signal}/timeseries")
async def get_signal_timeseries(signal: str, hours: int = 24):
    """Get time series data for a signal"""
    start_time = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    # Get all updates for this signal
    updates = await db.signal_updates.find(
        {
            "signal": signal,
            "timestamp": {"$gte": start_time.isoformat()}
        },
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    # Group by hour and average
    hourly_data = {}
    for update in updates:
        timestamp = update["timestamp"]
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        
        hour_key = timestamp.replace(minute=0, second=0, microsecond=0)
        
        if hour_key not in hourly_data:
            hourly_data[hour_key] = {"probabilities": [], "volumes": []}
        
        hourly_data[hour_key]["probabilities"].append(update["probability"])
        hourly_data[hour_key]["volumes"].append(update["volume"])
    
    # Calculate averages
    timeseries = []
    for hour, data in sorted(hourly_data.items()):
        avg_prob = sum(data["probabilities"]) / len(data["probabilities"])
        total_vol = sum(data["volumes"])
        
        timeseries.append({
            "timestamp": hour.isoformat(),
            "probability": round(avg_prob, 4),
            "volume": round(total_vol, 2),
            "market_count": len(data["probabilities"])
        })
    
    return timeseries

@api_router.post("/signals/{signal}/explain")
async def explain_signal(signal: str):
    """Generate AI explanation for signal movement"""
    try:
        # Get recent top markets for this signal
        markets = await db.markets.find(
            {"signals": signal},
            {"_id": 0, "question": 1, "volume": 1}
        ).sort("volume", -1).limit(5).to_list(5)
        
        if not markets:
            raise HTTPException(status_code=404, detail="No markets found for this signal")
        
        # Create prompt
        market_list = "\n".join([f"- {m['question']} (Volume: ${m['volume']:,.0f})" for m in markets])
        
        prompt = f"""You are a financial analyst. Based on these prediction markets in the {signal} category:

{market_list}

Provide a brief, analytical summary (2-3 sentences) of what these markets collectively indicate about the current {signal} landscape. Focus on key trends and implications."""
        
        # Use LLM
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"signal_explain_{signal}_{datetime.now().timestamp()}",
            system_message="You are a concise financial analyst specializing in prediction markets."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "signal": signal,
            "explanation": response,
            "key_markets": [m["question"] for m in markets],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating explanation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/markets/{market_id}")
async def get_market_details(market_id: str):
    """Get detailed information about a specific market"""
    market = await db.markets.find_one({"id": market_id}, {"_id": 0})
    
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    
    # Get recent updates
    updates = await db.signal_updates.find(
        {"market_id": market_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(50).to_list(50)
    
    return {
        "market": market,
        "recent_updates": updates
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Run initial market discovery on startup"""
    logger.info("Application starting up...")
    # Trigger initial discovery
    asyncio.create_task(discover_and_ingest_markets())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()