import json
from fastapi import APIRouter, Header
from pydantic import BaseModel

from app.core.groq_client import complete
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()


class PublicChatRequest(BaseModel):
    question: str
    history: list[dict] = []


def fetch_public_data() -> dict:
    try:
        supabase = get_supabase()
        college_rows = supabase.table("college_info").select("section, content").execute().data or []
        college_info = {row["section"]: row["content"] for row in college_rows}

        all_depts = supabase.table("departments").select("id, name").execute().data or []

        dept_rows = supabase.table("department_public_info").select(
            "about, student_count, courses, fees, placement_percentage, "
            "highest_package, average_package, achievements, facilities, departments(name)"
        ).eq("published", True).execute().data or []

        formatted_depts = []
        for d in dept_rows:
            fees_obj = d.get("fees") or {}
            toppers = fees_obj.get("toppers") if isinstance(fees_obj, dict) else []
            formatted_depts.append({
                "department_name": (d.get("departments") or {}).get("name", "Department"),
                "about": d.get("about", ""),
                "student_count": d.get("student_count", 0),
                "courses": d.get("courses", []),
                "fees": fees_obj,
                "toppers": toppers,
                "placement_percentage": d.get("placement_percentage"),
                "highest_package": d.get("highest_package"),
                "average_package": d.get("average_package"),
                "achievements": d.get("achievements") or [],
                "facilities": d.get("facilities") or []
            })

        return {
            "institution": "Dayananda Sagar Academy of Technology and Management (DSATM)",
            "campus_location": {
                "address": "Kanakapura Main Road, Opp. Art of Living International Centre, Udayapura, Bengaluru - 560082",
                "nearest_metro": "Silk Institute Metro Station (Green Line, ~3 km away)",
                "bmtc_buses": "211, 211-A, 216 stop directly at DSATM Gate",
                "admissions_helpline": "+91 80 2843 2999"
            },
            "college_info": college_info,
            "all_academic_departments": [d["name"] for d in all_depts if "name" in d],
            "published_departments": formatted_depts,
            "nearby_accommodations": [
                {"name": "Sri Sai Comforts PG", "distance": "300m", "rent": "₹6,500-9,500/mo", "contact": "+91 98451 22344"},
                {"name": "Sri Venkateshwara Luxury PG", "distance": "500m", "rent": "₹7,000-11,000/mo", "contact": "+91 99805 77890"},
                {"name": "Royal Orchid Girls PG", "distance": "400m", "rent": "₹7,500-10,000/mo", "contact": "+91 97412 33455"},
                {"name": "DSATM Campus Hostels", "distance": "Inside Campus", "contact": "+91 80 2843 2999"}
            ]
        }
    except Exception as e:
        print(f"Error fetching public RAG context: {e}")
        return {"college_info": {}, "published_departments": []}



@router.post("/public-chat")
async def public_chat(payload: PublicChatRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)

    data = fetch_public_data()

    system_prompt = """You are the official Public AI Assistant for Dayananda Sagar Academy of Technology and Management (DSATM).
Your job is to answer prospective students, parents, and visitors accurately using ONLY the live published RAG college and department data provided.
- Dynamic Departments: Different academic departments (MCA, CSE, ISE, AIML, ECE, EEE, ME, Civil, MBA, etc.) independently publish their profiles. Answer based strictly on the department requested.
- Unpublished / Deleted Data: If asked about a department not present in 'published_departments' (or if its info/toppers were deleted), clearly inform the user that this department has not published official public details yet.
- Toppers & Fees: Never cite sample or outdated student names (like Ananya Sharma or Rohan Verma) unless they are explicitly present in 'published_departments'. Always state the exact fees and rank holders from the context.
- Grounding: The GROUNDED RAG KNOWLEDGE BASE takes priority over any earlier conversation history.
- Maintain a warm, welcoming, and professional tone."""

    history_lines = []
    if payload.history:
        for item in payload.history[-6:]:
            role = item.get("role") or item.get("sender") or "user"
            content = item.get("content") or item.get("text") or ""
            if content.strip():
                history_lines.append(f"{role.capitalize()}: {content.strip()}")

    history_text = "\n".join(history_lines)
    conversation_section = f"\nPREVIOUS CONVERSATION MEMORY:\n{history_text}\n" if history_text else ""

    prompt = f"""GROUNDED RAG KNOWLEDGE BASE:
{json.dumps(data, default=str, indent=2)}

{conversation_section}
USER QUESTION: {payload.question}
"""

    answer = complete(prompt, system=system_prompt, max_tokens=800)
    return {"answer": answer}