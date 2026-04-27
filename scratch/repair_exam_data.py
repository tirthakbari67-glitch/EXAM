import os
import re
from supabase import create_client

url = "https://qtixgkmsfzvwoowktnhv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0aXhna21zZnp2d29vd2t0bmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkxODY2NiwiZXhwIjoyMDkxNDk0NjY2fQ.CKSRCH39qF6DYFJlM-eGfbeUaEjZ1sryT0f_OAreO28"

supabase = create_client(url, key)

EXAM_NAME = "Options Trading & Pricing Assessment"

def repair_exam_data():
    print(f"Repairing exam data for '{EXAM_NAME}'...")
    
    # 1. Delete multiple types of garbage questions
    junk_patterns = [
        "%Paste it into a Google Doc%",
        "%Go to File > Download%",
        "%Copy the text below%",
        "%Options Trading & Pricing: MCQ Practice Set%",
        "%Section 1: Option Price Sensitivities%"
    ]
    
    total_deleted = 0
    for pattern in junk_patterns:
        res = supabase.table("questions").delete().eq("exam_name", EXAM_NAME).ilike("text", pattern).execute()
        total_deleted += len(res.data) if res.data else 0
        
    print(f"Deleted {total_deleted} garbage questions.")
    
    # 2. Fetch remaining questions
    res = supabase.table("questions").select("*").eq("exam_name", EXAM_NAME).execute()
    questions = res.data
    
    ans_pattern = re.compile(r"Answ\s*er[:\s]+([A-D])", re.IGNORECASE)
    section_pattern = re.compile(r"Section\s+\d+:.*", re.IGNORECASE)
    
    repaired_count = 0
    for q in questions:
        old_options = q["options"]
        new_options = []
        extracted_answer = q["correct_answer"]
        
        # Clean options and extract answer
        for opt in old_options:
            cleaned_opt = opt
            
            # Look for answer key in option (e.g., "Theta Answer: A")
            m = ans_pattern.search(cleaned_opt)
            if m:
                extracted_answer = m.group(1).upper()
                cleaned_opt = ans_pattern.sub("", cleaned_opt).strip()
                
            # Look for section header in option (e.g., "... Answer: B Section 2: The Greeks")
            cleaned_opt = section_pattern.sub("", cleaned_opt).strip()
            
            # Remove trailing periods/noise leftover
            cleaned_opt = re.sub(r"\s*[().:]+\s*$", "", cleaned_opt)
            
            new_options.append(cleaned_opt)
            
        # Clean question text if it has section headers remaining
        new_text = section_pattern.sub("", q["text"]).strip()
        # Clean up any leftover instruction prefixes (e.g. if a question starts with a header)
        new_text = re.sub(r"^Subject:\s*Financial Derivatives.*?\n", "", new_text, flags=re.IGNORECASE | re.DOTALL)
        
        # Update if changed
        if new_options != old_options or new_text != q["text"] or extracted_answer != q["correct_answer"]:
            supabase.table("questions").update({
                "text": new_text,
                "options": new_options,
                "correct_answer": extracted_answer
            }).eq("id", q["id"]).execute()
            repaired_count += 1
            
    print(f"Repaired {repaired_count} questions.")
    
    # 3. Update exam_config count
    res = supabase.table("questions").select("id", count="exact").eq("exam_name", EXAM_NAME).execute()
    total_q = res.count
    total_marks = total_q * 4
    
    supabase.table("exam_config").update({
        "total_questions": total_q,
        "total_marks": total_marks
    }).eq("exam_title", EXAM_NAME).execute()
    
    print(f"Exam config updated. Total questions: {total_q}")

if __name__ == "__main__":
    repair_exam_data()
