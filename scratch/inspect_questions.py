import os
from supabase import create_client

url = "https://qtixgkmsfzvwoowktnhv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0aXhna21zZnp2d29vd2t0bmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkxODY2NiwiZXhwIjoyMDkxNDk0NjY2fQ.CKSRCH39qF6DYFJlM-eGfbeUaEjZ1sryT0f_OAreO28"

supabase = create_client(url, key)

res = supabase.table("questions").select("text, options, branch, exam_name").eq("exam_name", "Initial Assessment").limit(20).execute()

for i, q in enumerate(res.data):
    print(f"[{i}] Branch: {q['branch']} | Title: {q['exam_name']}")
    print(f"    Text: {q['text']}")
    print(f"    Options: {q['options']}")
    print("-" * 20)
