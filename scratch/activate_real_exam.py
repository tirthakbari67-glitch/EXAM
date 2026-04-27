import os
from supabase import create_client

url = "https://qtixgkmsfzvwoowktnhv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0aXhna21zZnp2d29vd2t0bmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkxODY2NiwiZXhwIjoyMDkxNDk0NjY2fQ.CKSRCH39qF6DYFJlM-eGfbeUaEjZ1sryT0f_OAreO28"

supabase = create_client(url, key)

NEW_TITLE = "Options Trading & Pricing Assessment"

# 1. Deactivate existing
print("Deactivating old exams...")
supabase.table("exam_config").update({"is_active": False}).eq("is_active", True).execute()

# 2. Rename questions from 'rudr' to NEW_TITLE
print(f"Renaming questions from 'rudr' to '{NEW_TITLE}'...")
res = supabase.table("questions").update({"exam_name": NEW_TITLE}).eq("exam_name", "rudr").execute()
question_count = len(res.data)
print(f"Updated {question_count} questions.")

# 3. Create new config
if question_count > 0:
    print(f"Creating new config for '{NEW_TITLE}'...")
    total_marks = question_count * 4
    supabase.table("exam_config").insert({
        "exam_title": NEW_TITLE,
        "is_active": True,
        "duration_minutes": 60,
        "marks_per_question": 4,
        "negative_marks": -1.0,
        "total_questions": question_count,
        "total_marks": total_marks,
        "shuffle_questions": True,
        "shuffle_options": True,
        "max_attempts": 1,
        "show_answers_after": True
    }).execute()
    print("Activation complete.")
else:
    print("No questions found for 'rudr'. Activation aborted.")
