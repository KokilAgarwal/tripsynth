import httpx
from app.config import settings


def web_search(query: str, max_results: int = 5) -> str:
    """Search the web via Tavily for travel info, attractions, and costs."""
    if not settings.tavily_api_key:
        return (
            f"[Demo mode] Web search unavailable. Using general knowledge for: {query}"
        )

    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=settings.tavily_api_key)
        response = client.search(query=query, max_results=max_results, search_depth="basic")
        results = response.get("results", [])
        if not results:
            return f"No search results found for: {query}"

        lines = []
        for r in results:
            title = r.get("title", "")
            content = r.get("content", "")
            url = r.get("url", "")
            lines.append(f"- {title}: {content[:300]}... ({url})")
        return "\n".join(lines)
    except Exception as e:
        return f"Search failed for '{query}': {e}"


def places_lookup(query: str, location: str = "") -> str:
    """Look up places via Google Places Text Search API."""
    if not settings.google_places_api_key:
        return (
            f"[Demo mode] Places lookup unavailable. Placeholder for '{query}' "
            f"near {location or 'destination'}."
        )

    try:
        search_text = f"{query} {location}".strip()
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params = {
            "query": search_text,
            "key": settings.google_places_api_key,
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        if data.get("status") != "OK" or not data.get("results"):
            return f"No places found for: {search_text}"

        lines = []
        for place in data["results"][:5]:
            name = place.get("name", "")
            address = place.get("formatted_address", "")
            rating = place.get("rating", "N/A")
            loc = place.get("geometry", {}).get("location", {})
            lat = loc.get("lat", "")
            lng = loc.get("lng", "")
            lines.append(
                f"- {name} | {address} | Rating: {rating} | Coords: {lat},{lng}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Places lookup failed for '{query}': {e}"
